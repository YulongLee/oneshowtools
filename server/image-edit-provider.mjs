import sharp from "sharp";
import { createHash } from "node:crypto";
import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";
import { modelStudioWorkspaceCredentials } from "./model-studio-workspace.mjs";

const purposes = new Set(["image_editing", "image_upscaling", "image_text_ocr"]);
const recentValidations = new Map();
const validationTtlMs = 10 * 60 * 1000;
const owner = (purpose) => `platform:${purpose}`;
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
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
  image_editing: { adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0", creditCost: 30 },
  image_upscaling: { adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0", creditCost: 20 },
  image_text_ocr: { adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-vl-ocr-latest", creditCost: 1 },
};

function validationKey(purpose, config, apiKey) {
  return createHash("sha256").update(JSON.stringify([
    purpose, config.adapter, config.baseUrl, config.modelId, apiKey,
  ])).digest("hex");
}

function rememberValidation(purpose, config, apiKey, result) {
  const timestamp = Date.now();
  for (const [key, value] of recentValidations) if (timestamp - value.testedAt > validationTtlMs) recentValidations.delete(key);
  if (recentValidations.size >= 32) recentValidations.delete(recentValidations.keys().next().value);
  recentValidations.set(validationKey(purpose, config, apiKey), result);
}

function recentValidation(purpose, config, apiKey) {
  const result = recentValidations.get(validationKey(purpose, config, apiKey));
  if (!result || Date.now() - result.testedAt > validationTtlMs) return null;
  return result;
}

function publicConfig(purpose, config = row(purpose)) {
  const fallback = defaults[purpose];
  if (!config) return { purpose, configured: false, enabled: false, ...fallback, credentialSource: "direct", keyHint: null, lastTestStatus: null, lastTestLatencyMs: null, lastTestedAt: null, updatedAt: null };
  return {
    purpose, configured: true, enabled: config.status === "active", adapter: config.adapter,
    baseUrl: config.base_url, modelId: config.model_id, keyHint: config.key_hint, credentialSource: config.credential_source || "direct",
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
  if (config.credential_source === "workspace") {
    const workspace = modelStudioWorkspaceCredentials();
    if (!workspace) return null;
    return { ...publicConfig(credentialPurpose, config), requestedPurpose: purpose, adapter: "dashscope", baseUrl: workspace.baseUrl, apiKey: workspace.apiKey, workspaceId: workspace.workspaceId, endpointMode: workspace.endpointMode };
  }
  return { ...publicConfig(credentialPurpose, config), requestedPurpose: purpose, apiKey: decryptCredential(credentialRow(config, credentialPurpose)) };
}

function normalize(purpose, data, existing = row(purpose)) {
  const credentialSource = data.credentialSource === "workspace" ? "workspace" : (data.credentialSource === "direct" ? "direct" : (existing?.credential_source || "direct"));
  const adapter = purpose === "image_text_ocr" ? "dashscope" : credentialSource === "workspace" ? "dashscope" : (["dashscope", "openai"].includes(data.adapter) ? data.adapter : (existing?.adapter || defaults[purpose].adapter));
  const fallback = defaults[purpose];
  const workspace = credentialSource === "workspace" ? modelStudioWorkspaceCredentials() : null;
  if (credentialSource === "workspace" && !workspace) throw providerError("MODEL_STUDIO_WORKSPACE_NOT_CONFIGURED", 422);
  const baseUrl = safeBaseUrl(workspace?.baseUrl || data.baseUrl || existing?.base_url || fallback.baseUrl);
  const modelId = clean(data.modelId || existing?.model_id || fallback.modelId, 120);
  const apiKey = clean(data.apiKey, 2048);
  const status = data.status === "disabled" ? "disabled" : "active";
  const creditCost = Math.max(1, Math.min(10000, Number(data.creditCost || existing?.credit_cost || fallback.creditCost)));
  if (!modelId || !/^[\w./:-]+$/.test(modelId)) throw providerError("IMAGE_MODEL_INVALID", 422);
  if (credentialSource === "direct" && !apiKey && (!existing || existing.credential_source === "workspace")) throw providerError("IMAGE_API_KEY_REQUIRED", 422);
  return {
    purpose, adapter, baseUrl, modelId, apiKey, status, creditCost, credentialSource, workspace,
    workspaceId: workspace?.workspaceId || "",
    endpointMode: workspace?.endpointMode || "public",
  };
}

function resolvedApiKey(purpose, input, existing) {
  if (input.credentialSource === "workspace") return input.workspace.apiKey;
  return input.apiKey || decryptCredential(credentialRow(existing, purpose));
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
  const providerCode = clean(payload?.code || payload?.error?.code || "", 160);
  const message = clean(payload?.message || payload?.error?.message || providerCode, 500).toLowerCase();
  const providerMessage = `${providerCode} ${message}`.toLowerCase();
  if (/model.*(not found|not exist|unavailable|access|denied)|not.*authorized.*model|permission.*model|未开通|模型.*无权限/.test(providerMessage)) return providerError("IMAGE_PROVIDER_MODEL_UNAVAILABLE", 422);
  if ([401, 403].includes(status) || /api.?key|auth|token|unauthorized|invalidapikey|鉴权|认证/.test(message)) return providerError("IMAGE_PROVIDER_AUTH_FAILED", 422);
  if (status === 429 && /allocationquota|insufficient_quota|quota exceeded|current quota|额度/.test(`${providerCode} ${message}`.toLowerCase())) return providerError("IMAGE_PROVIDER_QUOTA_EXCEEDED", 429, true);
  if (status === 429) return providerError("IMAGE_PROVIDER_RATE_LIMITED", 429, true);
  if (status === 404) return providerError("IMAGE_PROVIDER_MODEL_UNAVAILABLE", 422);
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

async function invoke(config, apiKey, inputs, prompt, fetchImpl = fetch, negativePrompt = "") {
  const normalized = await Promise.all((Array.isArray(inputs) ? inputs : [inputs]).slice(0, 3).map((input) => normalizedInput(input.buffer, input.mimeType)));
  const startedAt = Date.now();
  let body;
  const headers = { authorization: `Bearer ${apiKey}` };
  if (config.adapter === "dashscope") {
    const preciseMultiImageEdit = normalized.length > 1;
    headers["content-type"] = "application/json";
    if (config.endpointMode === "public" && config.workspaceId) headers["X-DashScope-WorkSpace"] = config.workspaceId;
    body = JSON.stringify({
      model: config.modelId,
      input: { messages: [{ role: "user", content: [
        ...normalized.map((image) => ({ image: `data:${image.mimeType};base64,${image.buffer.toString("base64")}` })),
        { text: clean(prompt, 6000) },
      ] }] },
      parameters: {
        prompt_extend: !preciseMultiImageEdit,
        watermark: false,
        n: 1,
        ...(preciseMultiImageEdit ? { negative_prompt: clean(negativePrompt, 3000) || "reference person's face, identity, skin, hair, body, pose, hands, legs or background; swapping image roles; replacing the target person; changed target face; changed target pose; changed target body shape; two people; second person; duplicated person; collage; split screen; before-and-after layout; source thumbnails; unchanged original outfit; wrong garment; missing garment details; mixed clothing from both images; floating garment; broken fabric; distorted anatomy; extra limbs; fused hands; invented text; invented logo; watermark" } : {}),
      },
    });
  } else {
    const form = new FormData();
    form.append("model", config.modelId);
    form.append("prompt", clean(prompt, 6000));
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

function ocrText(payload) {
  const content = payload?.output?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => item?.text || "").join("\n");
  return clean(payload?.choices?.[0]?.message?.content || payload?.output?.text || "", 100_000);
}

function parseOcrDetections(raw, width, height) {
  const fenced = String(raw || "").match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || String(raw || "");
  const jsonText = fenced.slice(fenced.indexOf("["), fenced.lastIndexOf("]") + 1);
  let items;
  try { items = JSON.parse(jsonText); } catch { return []; }
  if (!Array.isArray(items)) return [];
  return items.slice(0, 300).map((item) => {
    const box = Array.isArray(item?.bbox) ? item.bbox : [item?.bbox?.x, item?.bbox?.y, Number(item?.bbox?.x) + Number(item?.bbox?.width), Number(item?.bbox?.y) + Number(item?.bbox?.height)];
    let [x0, y0, x1, y1] = box.map(Number);
    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    if (Math.max(x0, y0, x1, y1) <= 1) { x0 *= width; x1 *= width; y0 *= height; y1 *= height; }
    const x = clamp(x0, 0, width - 1); const y = clamp(y0, 0, height - 1);
    const boxWidth = clamp(x1 - x0, 0, width - x); const boxHeight = clamp(y1 - y0, 0, height - y);
    const text = clean(item?.text, 500);
    if (!text || boxWidth < 4 || boxHeight < 4) return null;
    return {
      text, confidence: clamp(item?.confidence ?? .9, 0, 1),
      bbox: { x, y, width: boxWidth, height: boxHeight }, rotation: clamp(item?.rotation, -180, 180),
      style: {
        fontFamily: ["serif", "sans"].includes(item?.style?.fontFamily) ? item.style.fontFamily : "auto",
        fontSize: clamp(item?.style?.fontSize || boxHeight * .78, 8, 300),
        color: /^#[0-9a-f]{6}$/i.test(item?.style?.color) ? item.style.color : "#17264d",
        bold: Boolean(item?.style?.bold), align: ["left", "center", "right"].includes(item?.style?.align) ? item.style.align : "center",
      },
    };
  }).filter(Boolean);
}

async function invokeOcr(config, apiKey, input, fetchImpl = fetch) {
  const originalMetadata = await sharp(input.buffer).metadata();
  const normalized = await normalizedInput(input.buffer, input.mimeType);
  const metadata = await sharp(normalized.buffer).metadata();
  const startedAt = Date.now();
  const response = await fetchImpl(`${config.baseUrl}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", ...(config.endpointMode === "public" && config.workspaceId ? { "X-DashScope-WorkSpace": config.workspaceId } : {}) },
    body: JSON.stringify({
      model: config.modelId,
      input: { messages: [{ role: "user", content: [
        { image: `data:${normalized.mimeType};base64,${normalized.buffer.toString("base64")}` },
        { text: `识别图片中所有可见文字。图片宽 ${metadata.width} 像素、高 ${metadata.height} 像素。只输出 JSON 数组，每项格式为 {"text":"文字","bbox":[左,上,右,下],"confidence":0.95,"rotation":0,"style":{"fontFamily":"sans或serif","fontSize":32,"color":"#RRGGBB","bold":false,"align":"left或center或right"}}。坐标必须使用当前图片的像素坐标，不要输出解释。` },
      ] }] },
      parameters: { max_tokens: 8192 },
    }),
    signal: AbortSignal.timeout(90_000),
  }).catch((cause) => { throw providerError(cause?.name === "TimeoutError" ? "IMAGE_TEXT_OCR_TIMEOUT" : "IMAGE_PROVIDER_UNREACHABLE", 502, true); });
  const payload = await response.json().catch(() => ({}));
  const failure = providerFailure(payload, response.status);
  if (failure) throw failure;
  const detections = parseOcrDetections(ocrText(payload), metadata.width, metadata.height);
  if (!detections.length) throw providerError("IMAGE_TEXT_OCR_EMPTY", 422);
  const scaleX = Number(originalMetadata.width || metadata.width) / metadata.width;
  const scaleY = Number(originalMetadata.height || metadata.height) / metadata.height;
  return { detections: detections.map((item) => ({ ...item, bbox: {
    x: item.bbox.x * scaleX, y: item.bbox.y * scaleY,
    width: item.bbox.width * scaleX, height: item.bbox.height * scaleY,
  }, style: { ...item.style, fontSize: item.style.fontSize * scaleY } })), latencyMs: Date.now() - startedAt };
}

export async function testImageEditProviderConfiguration(purpose, data, fetchImpl = fetch) {
  assertPurpose(purpose);
  const existing = row(purpose);
  const config = normalize(purpose, data, existing);
  const apiKey = resolvedApiKey(purpose, config, existing);
  const sample = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#edf4ff" } }).composite([{ input: Buffer.from('<svg width="512" height="512"><text x="80" y="270" font-size="72">TEST 123</text></svg>') }]).png().toBuffer();
  const output = purpose === "image_text_ocr"
    ? await invokeOcr(config, apiKey, { buffer: sample, mimeType: "image/png" }, fetchImpl)
    : await invoke(config, apiKey, { buffer: sample, mimeType: "image/png" }, "Keep the composition. Improve clarity and use a clean professional white background.", fetchImpl);
  const result = { status: "healthy", latencyMs: output.latencyMs, testedAt: Date.now() };
  rememberValidation(purpose, config, apiKey, result);
  return result;
}

export async function saveImageEditProviderConfiguration(purpose, data, actorUserId = null, fetchImpl = fetch) {
  assertPurpose(purpose);
  const existing = row(purpose);
  const input = normalize(purpose, data, existing);
  const apiKey = resolvedApiKey(purpose, input, existing);
  const tested = recentValidation(purpose, input, apiKey) || await testImageEditProviderConfiguration(purpose, input, fetchImpl);
  const changedCredential = Boolean(input.apiKey) || input.credentialSource === "workspace" || existing?.credential_source !== input.credentialSource;
  const version = existing ? existing.credential_version + (changedCredential ? 1 : 0) : 1;
  const encrypted = changedCredential ? encryptCredential(input.credentialSource === "workspace" ? "workspace-managed" : apiKey, owner(purpose), purpose, version) : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO image_provider_configs
    (purpose, adapter, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint, credential_version, status, credit_cost, last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at, credential_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purpose) DO UPDATE SET adapter=excluded.adapter, base_url=excluded.base_url, model_id=excluded.model_id,
      key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv, key_tag=excluded.key_tag, key_hint=excluded.key_hint,
      credential_version=excluded.credential_version, status=excluded.status, credit_cost=excluded.credit_cost,
      last_test_status=excluded.last_test_status, last_test_latency_ms=excluded.last_test_latency_ms,
      last_tested_at=excluded.last_tested_at, updated_by=excluded.updated_by, updated_at=excluded.updated_at, credential_source=excluded.credential_source
  `).run(purpose, input.adapter, input.baseUrl, input.modelId, encrypted.ciphertext, encrypted.iv, encrypted.tag,
    input.credentialSource === "workspace" ? input.workspace.keyHint : (input.apiKey ? keyHint(apiKey) : existing.key_hint), version, input.status, input.creditCost,
    tested.latencyMs, tested.testedAt, actorUserId, existing?.created_at || timestamp, timestamp, input.credentialSource);
  if (purpose === "image_editing") {
    db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-edit'").run(input.status === "active" ? "ready" : "configuration_required");
    const upscale = row("image_upscaling");
    if (!upscale) db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale'").run(input.status === "active" ? "ready" : "configuration_required");
  } else if (purpose === "image_upscaling") {
    db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale'").run(input.status === "active" ? "ready" : "configuration_required");
  }
  return publicConfig(purpose);
}

export async function editPlatformImage({ purpose = "image_editing", buffer, mimeType, images, prompt, negativePrompt = "", fetchImpl = fetch }) {
  const config = credentials(assertPurpose(purpose));
  if (!config) throw providerError(purpose === "image_upscaling" ? "IMAGE_UPSCALING_NOT_CONFIGURED" : "IMAGE_EDITING_NOT_CONFIGURED", 503);
  return invoke(config, config.apiKey, images?.length ? images : { buffer, mimeType }, prompt, fetchImpl, negativePrompt);
}

export async function recognizePlatformImageText({ buffer, mimeType = "image/png", fetchImpl = fetch }) {
  const config = credentials("image_text_ocr");
  if (!config) throw providerError("IMAGE_TEXT_OCR_NOT_CONFIGURED", 503);
  return (await invokeOcr(config, config.apiKey, { buffer, mimeType }, fetchImpl)).detections;
}
