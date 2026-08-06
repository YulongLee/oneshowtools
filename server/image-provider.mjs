import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";
import { modelStudioWorkspaceCredentials } from "./model-studio-workspace.mjs";

const purpose = "music_cover";
const owner = "platform:image";
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const imageError = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const keyHint = (value) => `••••${clean(value, 2048).slice(-4)}`;

function row() {
  return db.prepare("SELECT * FROM image_provider_configs WHERE purpose = ?").get(purpose);
}

function credentialRow(config) {
  return { ...config, id: purpose, user_id: owner };
}

function safeBaseUrl(value) {
  let url;
  try { url = new URL(clean(value, 500)); } catch { throw imageError("IMAGE_BASE_URL_INVALID", 422); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw imageError("IMAGE_BASE_URL_INVALID", 422);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw imageError("IMAGE_BASE_URL_INVALID", 422);
  return url.toString().replace(/\/$/, "");
}

function publicConfig(config = row()) {
  if (!config) return {
    purpose, configured: false, enabled: false, adapter: "openai", baseUrl: "https://api.openai.com/v1",
    modelId: "gpt-image-1", keyHint: null, credentialSource: "direct", creditCost: 10, lastTestStatus: null,
    lastTestLatencyMs: null, lastTestedAt: null, updatedAt: null,
  };
  return {
    purpose, configured: true, enabled: config.status === "active", adapter: config.adapter,
    baseUrl: config.base_url, modelId: config.model_id, keyHint: config.key_hint,
    credentialSource: config.credential_source || "direct",
    creditCost: config.credit_cost, lastTestStatus: config.last_test_status,
    lastTestLatencyMs: config.last_test_latency_ms, lastTestedAt: config.last_tested_at,
    updatedAt: config.updated_at,
  };
}

export function imageProviderConfiguration() {
  return publicConfig();
}

function credentials() {
  const config = row();
  if (!config || config.status !== "active") return null;
  if (config.credential_source === "workspace") {
    const workspace = modelStudioWorkspaceCredentials();
    if (!workspace) return null;
    return { ...publicConfig(config), adapter: "dashscope", baseUrl: workspace.baseUrl, apiKey: workspace.apiKey };
  }
  return { ...publicConfig(config), apiKey: decryptCredential(credentialRow(config)) };
}

function normalize(data, existing = row()) {
  const credentialSource = data.credentialSource === "workspace" ? "workspace" : (data.credentialSource === "direct" ? "direct" : (existing?.credential_source || "direct"));
  const workspace = credentialSource === "workspace" ? modelStudioWorkspaceCredentials() : null;
  if (credentialSource === "workspace" && !workspace) throw imageError("MODEL_STUDIO_WORKSPACE_NOT_CONFIGURED", 422);
  const adapter = credentialSource === "workspace" ? "dashscope" : (data.adapter === "minimax" ? "minimax" : "openai");
  const defaults = adapter === "minimax"
    ? { baseUrl: "https://api.minimaxi.com", modelId: "image-01" }
    : adapter === "dashscope"
      ? { baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0" }
      : { baseUrl: "https://api.openai.com/v1", modelId: "gpt-image-1" };
  const baseUrl = safeBaseUrl(workspace?.baseUrl || data.baseUrl || existing?.base_url || defaults.baseUrl);
  const modelId = clean(data.modelId || existing?.model_id || defaults.modelId, 120);
  const apiKey = clean(data.apiKey, 2048);
  const status = data.status === "disabled" ? "disabled" : "active";
  const creditCost = Math.max(1, Math.min(10000, Number(data.creditCost || existing?.credit_cost || 10)));
  if (!modelId || !/^[\w./:-]+$/.test(modelId)) throw imageError("IMAGE_MODEL_INVALID", 422);
  if (credentialSource === "direct" && !apiKey && (!existing || existing.credential_source === "workspace")) throw imageError("IMAGE_API_KEY_REQUIRED", 422);
  return { adapter, baseUrl, modelId, apiKey, status, creditCost, credentialSource, workspace };
}

function endpoint(config) {
  if (config.adapter === "dashscope") return `${config.baseUrl}/services/aigc/multimodal-generation/generation`;
  if (config.adapter === "minimax") return `${config.baseUrl}${config.baseUrl.endsWith("/v1") ? "" : "/v1"}/image_generation`;
  return `${config.baseUrl}${config.baseUrl.endsWith("/v1") ? "" : "/v1"}/images/generations`;
}

function requestBody(config, prompt) {
  if (config.adapter === "dashscope") return {
    model: config.modelId,
    input: { messages: [{ role: "user", content: [{ text: prompt }] }] },
    parameters: { prompt_extend: true, watermark: false, n: 1, size: "1024*1024" },
  };
  return config.adapter === "minimax"
    ? { model: config.modelId, prompt, aspect_ratio: "1:1", response_format: "url", n: 1, prompt_optimizer: true }
    : { model: config.modelId, prompt, size: "1024x1024", n: 1, response_format: "b64_json" };
}

function responseFailure(payload, status) {
  const providerStatus = Number(payload?.base_resp?.status_code || 0);
  const providerCode = clean(payload?.code || payload?.error?.code || "", 160);
  const message = clean(payload?.base_resp?.status_msg || payload?.message || payload?.error?.message || "", 300).toLowerCase();
  if (/model.*(not found|not exist|unavailable|access|denied)|not.*authorized.*model|permission.*model|未开通|模型.*无权限/.test(`${providerCode} ${message}`.toLowerCase())) return imageError("IMAGE_PROVIDER_MODEL_UNAVAILABLE", 422);
  if ([401, 403].includes(status) || /api.?key|auth|token|unauthorized|鉴权|认证/.test(message)) return imageError("IMAGE_PROVIDER_AUTH_FAILED", 422);
  if (providerStatus) return imageError("IMAGE_PROVIDER_REJECTED", 422);
  if (status === 429) return imageError("IMAGE_PROVIDER_RATE_LIMITED", 429, true);
  if (status >= 500) return imageError("IMAGE_PROVIDER_UNAVAILABLE", 502, true);
  return null;
}

async function imageBytes(payload, fetchImpl) {
  const base64 = payload?.data?.[0]?.b64_json || payload?.data?.image_base64?.[0];
  if (base64) return Buffer.from(base64, "base64");
  const source = payload?.output?.choices?.[0]?.message?.content?.find?.((item) => item.image)?.image
    || payload?.data?.[0]?.url || payload?.data?.image_urls?.[0];
  let url;
  try { url = new URL(source); } catch { throw imageError("IMAGE_PROVIDER_EMPTY_OUTPUT", 502); }
  if (url.protocol !== "https:") throw imageError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!response?.ok) throw imageError("IMAGE_DOWNLOAD_FAILED", 502, true);
  return Buffer.from(await response.arrayBuffer());
}

async function generate(config, apiKey, prompt, fetchImpl = fetch) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchImpl(endpoint(config), {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(requestBody(config, clean(prompt, 1500))),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw imageError("IMAGE_PROVIDER_TIMEOUT", 504, true);
    throw imageError("IMAGE_PROVIDER_UNREACHABLE", 502, true);
  }
  const payload = await response.json().catch(() => ({}));
  const failure = responseFailure(payload, response.status);
  if (failure) throw failure;
  if (!response.ok) throw imageError("IMAGE_PROVIDER_REJECTED", 422);
  const buffer = await imageBytes(payload, fetchImpl);
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) throw imageError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  return { buffer, mimeType: "image/png", extension: "png", latencyMs: Date.now() - startedAt };
}

export async function testImageProviderConfiguration(data, fetchImpl = fetch) {
  const existing = row();
  const config = normalize(data, existing);
  const apiKey = config.credentialSource === "workspace" ? config.workspace.apiKey : (config.apiKey || decryptCredential(credentialRow(existing)));
  const output = await generate(config, apiKey, "Minimal abstract album cover, cobalt blue gradient, no text", fetchImpl);
  return { status: "healthy", latencyMs: output.latencyMs, testedAt: Date.now() };
}

export async function saveImageProviderConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.credentialSource === "workspace" ? input.workspace.apiKey : (input.apiKey || decryptCredential(credentialRow(existing)));
  const tested = await testImageProviderConfiguration(input, fetchImpl);
  const changedCredential = Boolean(input.apiKey) || input.credentialSource === "workspace" || existing?.credential_source !== input.credentialSource;
  const version = existing ? existing.credential_version + (changedCredential ? 1 : 0) : 1;
  const encrypted = changedCredential ? encryptCredential(input.credentialSource === "workspace" ? "workspace-managed" : apiKey, owner, purpose, version) : {
    ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag,
  };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO image_provider_configs
    (purpose, adapter, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint,
      credential_version, status, credit_cost, last_test_status, last_test_latency_ms,
      last_tested_at, updated_by, created_at, updated_at, credential_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purpose) DO UPDATE SET adapter=excluded.adapter, base_url=excluded.base_url,
      model_id=excluded.model_id, key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv,
      key_tag=excluded.key_tag, key_hint=excluded.key_hint, credential_version=excluded.credential_version,
      status=excluded.status, credit_cost=excluded.credit_cost, last_test_status=excluded.last_test_status,
      last_test_latency_ms=excluded.last_test_latency_ms, last_tested_at=excluded.last_tested_at,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at, credential_source=excluded.credential_source
  `).run(purpose, input.adapter, input.baseUrl, input.modelId, encrypted.ciphertext, encrypted.iv,
    encrypted.tag, input.credentialSource === "workspace" ? input.workspace.keyHint : (input.apiKey ? keyHint(apiKey) : existing.key_hint), version, input.status,
    input.creditCost, tested.latencyMs, tested.testedAt, actorUserId, existing?.created_at || timestamp, timestamp, input.credentialSource);
  return publicConfig();
}

export async function generateMusicCover(prompt, fetchImpl = fetch) {
  const config = credentials();
  if (!config) throw imageError("IMAGE_PROVIDER_NOT_CONFIGURED", 503);
  return generate(config, config.apiKey, prompt, fetchImpl);
}
