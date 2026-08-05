import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";

const owner = "platform:singing-cover";
const provider = "myvocal";
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const providerError = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const keyHint = (value) => {
  const key = clean(value, 2048);
  return key.length > 4 ? `••••${key.slice(-4)}` : "••••";
};

function safeBaseUrl(value) {
  let url;
  try { url = new URL(clean(value || "https://api.myvocal.ai", 500)); } catch { throw providerError("SINGING_BASE_URL_INVALID", 422); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw providerError("SINGING_BASE_URL_INVALID", 422);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw providerError("SINGING_BASE_URL_INVALID", 422);
  }
  return url.toString().replace(/\/$/, "");
}
export function safeSingingOutputUrl(value) {
  let url;
  try { url = new URL(clean(value, 2000)); } catch { throw providerError("SINGING_COVER_OUTPUT_INVALID", 502); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw providerError("SINGING_COVER_OUTPUT_INVALID", 502);
  return url;
}

function row() { return db.prepare("SELECT * FROM singing_provider_configs WHERE provider = ?").get(provider); }
function credentialRow(config) {
  return { user_id: owner, id: provider, credential_version: config.credential_version, key_ciphertext: config.key_ciphertext, key_iv: config.key_iv, key_tag: config.key_tag };
}
function publicConfig(config = row()) {
  if (!config) return { provider, configured: false, enabled: false, baseUrl: "https://api.myvocal.ai", keyHint: null, creditCost: 80, lastTestStatus: null, lastTestLatencyMs: null, lastTestedAt: null, updatedAt: null };
  return { provider, configured: true, enabled: config.status === "active", baseUrl: config.base_url, keyHint: config.key_hint, creditCost: config.credit_cost, lastTestStatus: config.last_test_status, lastTestLatencyMs: config.last_test_latency_ms, lastTestedAt: config.last_tested_at, updatedAt: config.updated_at };
}
export function singingProviderConfiguration() { return publicConfig(); }
export function singingProviderCredentials() {
  const config = row();
  if (!config || config.status !== "active") return null;
  return { ...publicConfig(config), apiKey: decryptCredential(credentialRow(config)) };
}

function normalize(data, existing) {
  const baseUrl = safeBaseUrl(data.baseUrl || existing?.base_url || "https://api.myvocal.ai");
  const apiKey = clean(data.apiKey, 2048);
  const creditCost = Math.max(1, Math.min(10000, Number(data.creditCost || existing?.credit_cost || 80)));
  const status = data.status === "disabled" ? "disabled" : "active";
  if (!apiKey && !existing) throw providerError("SINGING_API_KEY_REQUIRED", 422);
  return { baseUrl, apiKey, creditCost, status };
}

async function providerJson(response) {
  const payload = await response.json().catch(() => ({}));
  if ([401, 403].includes(response.status) || Number(payload?.code) === -1 && /key|auth|token/i.test(clean(payload?.message, 300))) throw providerError("SINGING_PROVIDER_AUTH_FAILED", 422);
  if (!response.ok || Number(payload?.code) !== 1) throw providerError("SINGING_PROVIDER_REJECTED", response.status >= 500 ? 502 : 422, response.status >= 500);
  return payload;
}

async function verify(input, apiKey, fetchImpl = fetch) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchImpl(`${input.baseUrl}/sound_clone/api/v1/user/info`, { headers: { accessKey: apiKey }, signal: AbortSignal.timeout(15_000) });
  } catch { throw providerError("SINGING_PROVIDER_UNREACHABLE", 502); }
  await providerJson(response);
  return { status: "healthy", latencyMs: Date.now() - startedAt };
}
export async function testSingingProviderConfiguration(data, fetchImpl = fetch) {
  const existing = row(); const input = normalize(data, existing);
  return verify(input, input.apiKey || decryptCredential(credentialRow(existing)), fetchImpl);
}
export async function saveSingingProviderConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row(); const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  const tested = await verify(input, apiKey, fetchImpl);
  const version = existing ? existing.credential_version + (input.apiKey ? 1 : 0) : 1;
  const encrypted = input.apiKey ? encryptCredential(apiKey, owner, provider, version) : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`INSERT INTO singing_provider_configs
    (provider, base_url, key_ciphertext, key_iv, key_tag, key_hint, credential_version, status, credit_cost, last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET base_url=excluded.base_url, key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv, key_tag=excluded.key_tag, key_hint=excluded.key_hint, credential_version=excluded.credential_version, status=excluded.status, credit_cost=excluded.credit_cost, last_test_status=excluded.last_test_status, last_test_latency_ms=excluded.last_test_latency_ms, last_tested_at=excluded.last_tested_at, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .run(provider, input.baseUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag, input.apiKey ? keyHint(apiKey) : existing.key_hint, version, input.status, input.creditCost, tested.status, tested.latencyMs, timestamp, actorUserId, existing?.created_at || timestamp, timestamp);
  return publicConfig();
}

export async function createSingingVoice({ name, files, callbackUrl }, fetchImpl = fetch) {
  const config = singingProviderCredentials();
  if (!config) throw providerError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  const form = new FormData();
  for (const file of files) form.append("files", new Blob([file.buffer], { type: file.mimeType }), file.fileName);
  form.append("name", clean(name, 32)); form.append("callbackUrl", callbackUrl);
  let response;
  try { response = await fetchImpl(`${config.baseUrl}/sound_clone/api/v1/voices/vc`, { method: "POST", headers: { accessKey: config.apiKey }, body: form, signal: AbortSignal.timeout(60_000) }); }
  catch { throw providerError("SINGING_VOICE_UPLOAD_FAILED", 502, true); }
  const payload = await providerJson(response);
  return { webhookId: clean(payload?.data?.webhookId, 200) };
}

export async function createSingingCover({ voiceId, title, file, callbackUrl }, fetchImpl = fetch) {
  const config = singingProviderCredentials();
  if (!config) throw providerError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  const form = new FormData();
  form.append("files", new Blob([file.buffer], { type: file.mimeType }), file.fileName);
  form.append("voiceId", clean(voiceId, 200)); form.append("title", clean(title, 32)); form.append("callbackUrl", callbackUrl);
  let response;
  try { response = await fetchImpl(`${config.baseUrl}/sound_clone/api/v1/cover`, { method: "POST", headers: { accessKey: config.apiKey }, body: form, signal: AbortSignal.timeout(60_000) }); }
  catch { throw providerError("SINGING_COVER_SUBMIT_FAILED", 502, true); }
  const payload = await providerJson(response);
  return { webhookId: clean(payload?.data?.webhookId, 200) };
}

export async function querySingingCover(coverId, fetchImpl = fetch) {
  const config = singingProviderCredentials();
  if (!config) throw providerError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  const response = await fetchImpl(`${config.baseUrl}/sound_clone/api/v1/cover/query`, { method: "POST", headers: { accessKey: config.apiKey, "content-type": "application/json" }, body: JSON.stringify({ ids: [clean(coverId, 200)] }), signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!response) throw providerError("SINGING_COVER_QUERY_FAILED", 502, true);
  const payload = await providerJson(response);
  const item = Array.isArray(payload?.data) ? payload.data.find((entry) => String(entry.id) === String(coverId)) || payload.data[0] : null;
  let url;
  try { url = safeSingingOutputUrl(item?.url); } catch (error) {
    if (!item?.url) throw providerError("SINGING_COVER_OUTPUT_PENDING", 409, true);
    throw error;
  }
  return { url: url.toString() };
}

export async function deleteSingingVoice(providerVoiceId, fetchImpl = fetch) {
  const config = singingProviderCredentials();
  if (!config) throw providerError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  const response = await fetchImpl(`${config.baseUrl}/sound_clone/api/v1/voices/${encodeURIComponent(clean(providerVoiceId, 200))}`, { method: "DELETE", headers: { accessKey: config.apiKey, "content-type": "application/json" }, signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!response) throw providerError("SINGING_VOICE_DELETE_FAILED", 502, true);
  await providerJson(response);
  return { ok: true };
}
