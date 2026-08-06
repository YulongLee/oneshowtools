import sharp from "sharp";
import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";

const purposes = new Set(["image_editing", "image_upscaling"]);
const owner = (purpose) => `platform:${purpose}`;
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const providerError = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const keyHint = (value) => `••••${clean(value, 2048).slice(-4)}`;

function assertPurpose(purpose) {
  if (!purposes.has(purpose)) throw providerError("IMAGE_PROVIDER_PURPOSE_INVALID", 404);
  return purpose;
}

function row(purpose) {
  return db.prepare("SELECT * FROM image_provider_configs WHERE purpose = ?").get(assertPurpose(purpose));
}

function credentialRow(config, purpose) {
  return { ...config, id: purpose, user_id: owner(purpose) };
}

function safeBaseUrl(value) {
  let url;
  try { url = new URL(clean(value, 500)); } catch { throw providerError("IMAGE_BASE_URL_INVALID", 422); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw providerError("IMAGE_BASE_URL_INVALID", 422);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw providerError("IMAGE_BASE_URL_INVALID", 422);
  return url.toString().replace(/\/$/, "");
}

const defaults = {
  image_editing: { adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-3.0-pro", creditCost: 30 },
  image_upscaling: { adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-3.0-pro", creditCost: 20 },
};

function publicConfig(purpose, config = row(purpose)) {
  const fallback = defaults[purpose];
  if (!config) return { purpose, configured: false, enabled: false, ...fallback, keyHint: null, lastTestStatus: null, lastTestLatencyMs: null, lastTestedAt: null, updatedAt: null };
  return {
    purpose, configured: true, enabled: config.status === "active", adapter: config.adapter,
    baseUrl: config.base_url, modelId: config.model_id, keyHint: config.key_hint,
    creditCost: config.credit_cost, lastTestStatus: config.last_test_status,
    lastTestLatencyMs: config.last_test_latency_ms, lastTestedAt: config.last_tested_at,
    updatedAt: config.updated_at,
  };
}

export function imageEditProviderConfiguration(purpose) {
  return publicConfig(assertPurpose(purpose));
}

function credentials(purpose) {
  const config = row(purpose) || (purpose === "image_upscaling" ? row("image_editing") : null);
  if (!config || config.status !== "active") return null;
  const credentialPurpose = config.purpose;
  return { ...publicConfig(credentialPurpose, config), requestedPurpose: purpose, apiKey: decryptCredential(credentialRow(config, credentialPurpose)) };
}

function normalize(purpose, data, existing = row(purpose)) {
  const adapter = ["dashscope", "openai"].includes(data.adapter) ? data.adapter : (existing?.adapter || defaults[purpose].adapter);
  const fallback = defaults[purpose];
  const baseUrl = safeBaseUrl(data.baseUrl || existing?.base_url || fallback.baseUrl);
  const modelId = clean(data.modelId || existing?.model_id || fallback.modelId, 120);
  const apiKey = clean(data.apiKey, 2048);
  const status = data.status === "disabled" ? "disabled" : "active";
  const creditCost = Math.max(1, Math.min(10000, Number(data.creditCost || existing?.credit_cost || fallback.creditCost)));
  if (!modelId || !/^[\w./:-]+$/.test(modelId)) throw providerError("IMAGE_MODEL_INVALID", 422);
  if (!apiKey && !existing) throw providerError("IMAGE_API_KEY_REQUIRED", 422);
  return { purpose, adapter, baseUrl, modelId, apiKey, status, creditCost };
}

async function normalizedInput(buffer, mimeType = "image/png") {
  if (!buffer?.length) throw providerError("IMAGE_REQUIRED", 400);
  if (buffer.length > 25 * 1024 * 1024) throw providerError("IMAGE_TOO_LARGE", 413);
  const output = await sharp(buffer).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer().catch(() => null);
  if (!output) throw providerError("IMAGE_INVALID", 422);
  return { buffer: output, mimeType: mimeType.startsWith("image/") ? "image/png" : "image/png" };
}

function endpoint(config) {
  if (config.adapter === "dashscope") return `${config.baseUrl}/services/aigc/multimodal-generation/generation`;
  return `${config.baseUrl}${config.baseUrl.endsWith("/v1") ? "" : "/v1"}/images/edits`;
}

function providerFailure(payload, status) {
  const message = clean(payload?.message || payload?.error?.message || payload?.code || "", 500).toLowerCase();
  if ([401, 403].includes(status) || /api.?key|auth|token|unauthorized|invalidapikey|鉴权|认证/.test(message)) return providerError("IMAGE_PROVIDER_AUTH_FAILED", 422);
  if (status === 429) return providerError("IMAGE_PROVIDER_RATE_LIMITED", 429, true);
  if (status >= 500) return providerError("IMAGE_PROVIDER_UNAVAILABLE", 502, true);
  if (status >= 400 || payload?.code) return providerError("IMAGE_PROVIDER_REJECTED", 422);
  return null;
}

function publicOutputUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw providerError("IMAGE_PROVIDER_EMPTY_OUTPUT", 502); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw providerError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw providerError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  return url;
}

async function outputBytes(payload, fetchImpl) {
  const base64 = payload?.data?.[0]?.b64_json;
  if (base64) return Buffer.from(base64, "base64");
  const source = payload?.output?.choices?.[0]?.message?.content?.find?.((item) => item.image)?.image || payload?.data?.[0]?.url;
  const url = publicOutputUrl(source);
  const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!response?.ok) throw providerError("IMAGE_DOWNLOAD_FAILED", 502, true);
  return Buffer.from(await response.arrayBuffer());
}

async function invoke(config, apiKey, inputs, prompt, fetchImpl = fetch) {
  const normalized = await Promise.all((Array.isArray(inputs) ? inputs : [inputs]).slice(0, 3).map((input) => normalizedInput(input.buffer, input.mimeType)));
  const startedAt = Date.now();
  let body;
  const headers = { authorization: `Bearer ${apiKey}` };
  if (config.adapter === "dashscope") {
    headers["content-type"] = "application/json";
    body = JSON.stringify({
      model: config.modelId,
      input: { messages: [{ role: "user", content: [
        ...normalized.map((image) => ({ image: `data:${image.mimeType};base64,${image.buffer.toString("base64")}` })),
        { text: clean(prompt, 3000) },
      ] }] },
      parameters: { prompt_extend: true, watermark: false, n: 1 },
    });
  } else {
    const form = new FormData();
    form.append("model", config.modelId);
    form.append("prompt", clean(prompt, 3000));
    normalized.forEach((image, index) => form.append("image[]", new Blob([image.buffer], { type: image.mimeType }), `source-${index + 1}.png`));
    form.append("size", "1536x1024");
    form.append("quality", "high");
    body = form;
  }
  let response;
  try {
    response = await fetchImpl(endpoint(config), { method: "POST", headers, body, signal: AbortSignal.timeout(240_000) });
  } catch (error) {
    if (error?.name === "TimeoutError") throw providerError("IMAGE_PROVIDER_TIMEOUT", 504, true);
    throw providerError("IMAGE_PROVIDER_UNREACHABLE", 502, true);
  }
  const payload = await response.json().catch(() => ({}));
  const failure = providerFailure(payload, response.status);
  if (failure) throw failure;
  const buffer = await outputBytes(payload, fetchImpl);
  if (!buffer.length || buffer.length > 30 * 1024 * 1024) throw providerError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  const png = await sharp(buffer).png().toBuffer().catch(() => null);
  if (!png) throw providerError("IMAGE_PROVIDER_OUTPUT_INVALID", 502);
  return { buffer: png, mimeType: "image/png", extension: "png", latencyMs: Date.now() - startedAt };
}

export async function testImageEditProviderConfiguration(purpose, data, fetchImpl = fetch) {
  assertPurpose(purpose);
  const existing = row(purpose);
  const config = normalize(purpose, data, existing);
  const apiKey = config.apiKey || decryptCredential(credentialRow(existing, purpose));
  const sample = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#edf4ff" } }).png().toBuffer();
  const output = await invoke(config, apiKey, { buffer: sample, mimeType: "image/png" }, "Keep the composition. Improve clarity and use a clean professional white background.", fetchImpl);
  return { status: "healthy", latencyMs: output.latencyMs, testedAt: Date.now() };
}

export async function saveImageEditProviderConfiguration(purpose, data, actorUserId = null, fetchImpl = fetch) {
  assertPurpose(purpose);
  const existing = row(purpose);
  const input = normalize(purpose, data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing, purpose));
  const tested = await testImageEditProviderConfiguration(purpose, input, fetchImpl);
  const version = existing ? existing.credential_version + (input.apiKey ? 1 : 0) : 1;
  const encrypted = input.apiKey ? encryptCredential(apiKey, owner(purpose), purpose, version) : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO image_provider_configs
    (purpose, adapter, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint, credential_version, status, credit_cost, last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?, ?, ?, ?, ?)
    ON CONFLICT(purpose) DO UPDATE SET adapter=excluded.adapter, base_url=excluded.base_url, model_id=excluded.model_id,
      key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv, key_tag=excluded.key_tag, key_hint=excluded.key_hint,
      credential_version=excluded.credential_version, status=excluded.status, credit_cost=excluded.credit_cost,
      last_test_status=excluded.last_test_status, last_test_latency_ms=excluded.last_test_latency_ms,
      last_tested_at=excluded.last_tested_at, updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(purpose, input.adapter, input.baseUrl, input.modelId, encrypted.ciphertext, encrypted.iv, encrypted.tag,
    input.apiKey ? keyHint(apiKey) : existing.key_hint, version, input.status, input.creditCost,
    tested.latencyMs, tested.testedAt, actorUserId, existing?.created_at || timestamp, timestamp);
  if (purpose === "image_editing") {
    db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-edit'").run(input.status === "active" ? "ready" : "configuration_required");
    const upscale = row("image_upscaling");
    if (!upscale) db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale'").run(input.status === "active" ? "ready" : "configuration_required");
  } else {
    db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale'").run(input.status === "active" ? "ready" : "configuration_required");
  }
  return publicConfig(purpose);
}

export async function editPlatformImage({ purpose = "image_editing", buffer, mimeType, images, prompt, fetchImpl = fetch }) {
  const config = credentials(assertPurpose(purpose));
  if (!config) throw providerError(purpose === "image_upscaling" ? "IMAGE_UPSCALING_NOT_CONFIGURED" : "IMAGE_EDITING_NOT_CONFIGURED", 503);
  return invoke(config, config.apiKey, images?.length ? images : { buffer, mimeType }, prompt, fetchImpl);
}
