import { createHash } from "node:crypto";
import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";

const owner = "platform:model_studio_workspace";
const id = "default";
const validationTtlMs = 10 * 60 * 1000;
const recentValidations = new Map();
const workspaceError = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const clean = (value, max = 1000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const row = () => db.prepare("SELECT * FROM model_studio_workspace_configs WHERE id = 'default'").get();
const credentialRow = (config) => ({ ...config, id, user_id: owner });

function normalizeApiKey(value) {
  let key = clean(value, 2048);
  const assignment = key.match(/^(?:DASHSCOPE|BAILIAN|MODEL_STUDIO)_API_KEY\s*=\s*(.+)$/i);
  if (assignment) key = assignment[1].trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
  if (key && /\s/.test(key)) throw workspaceError("MODEL_STUDIO_API_KEY_INVALID", 422);
  return key;
}

function baseUrl(region, endpointMode, workspaceId) {
  if (endpointMode === "public") return region === "ap-southeast-1" ? "https://dashscope-intl.aliyuncs.com/api/v1" : "https://dashscope.aliyuncs.com/api/v1";
  if (!/^ws-[a-z0-9-]{8,80}$/i.test(workspaceId)) throw workspaceError("MODEL_STUDIO_WORKSPACE_ID_INVALID", 422);
  return `https://${workspaceId}.${region}.maas.aliyuncs.com/api/v1`;
}

function normalize(data, existing = row()) {
  const region = ["cn-beijing", "ap-southeast-1"].includes(data.region) ? data.region : (existing?.region || "cn-beijing");
  const endpointMode = ["public", "workspace"].includes(data.endpointMode) ? data.endpointMode : (existing?.endpoint_mode || "public");
  const workspaceId = clean(data.workspaceId || existing?.workspace_id, 100);
  const apiKey = normalizeApiKey(data.apiKey);
  if (!apiKey && !existing) throw workspaceError("MODEL_STUDIO_API_KEY_REQUIRED", 422);
  return {
    name: clean(data.name || existing?.name || "阿里云百炼默认工作空间", 120), region, endpointMode, workspaceId,
    baseUrl: baseUrl(region, endpointMode, workspaceId), apiKey,
    status: data.status === "disabled" ? "disabled" : "active",
  };
}

function publicConfig(config = row()) {
  if (!config) return {
    configured: false, enabled: false, name: "阿里云百炼默认工作空间", region: "cn-beijing",
    workspaceId: process.env.DASHSCOPE_WORKSPACE_ID || "", endpointMode: "public",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1", keyHint: null, lastTestStatus: null,
  };
  return {
    configured: true, enabled: config.status === "active", name: config.name, region: config.region,
    workspaceId: config.workspace_id || "", endpointMode: config.endpoint_mode, baseUrl: config.base_url,
    keyHint: config.key_hint, lastTestStatus: config.last_test_status,
    lastTestLatencyMs: config.last_test_latency_ms, lastTestedAt: config.last_tested_at, updatedAt: config.updated_at,
  };
}

function fingerprint(config, apiKey) {
  return createHash("sha256").update(JSON.stringify([config.region, config.endpointMode, config.workspaceId, config.baseUrl, apiKey])).digest("hex");
}

async function probe(config, apiKey, fetchImpl = fetch) {
  const startedAt = Date.now();
  const response = await fetchImpl(`${config.baseUrl}/services/aigc/multimodal-generation/generation`, {
    method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", ...(config.endpointMode === "public" && config.workspaceId ? { "X-DashScope-WorkSpace": config.workspaceId } : {}) },
    body: JSON.stringify({ model: "__oneshowtools_auth_probe__", input: { messages: [{ role: "user", content: [{ text: "connection probe" }] }] } }),
    signal: AbortSignal.timeout(20_000),
  }).catch((error) => { throw workspaceError(error?.name === "TimeoutError" ? "MODEL_STUDIO_TIMEOUT" : "MODEL_STUDIO_UNREACHABLE", 502, true); });
  const payload = await response.json().catch(() => ({}));
  const code = clean(payload?.code || payload?.error?.code, 160);
  const message = clean(payload?.message || payload?.error?.message, 500).toLowerCase();
  if ([401, 403].includes(response.status) || /invalid.*key|auth|unauthorized|鉴权|认证/.test(`${code} ${message}`.toLowerCase())) {
    if (/endpoint\.accessdenied|workspace endpoint access denied/.test(`${code} ${message}`.toLowerCase())) throw workspaceError("MODEL_STUDIO_WORKSPACE_ACCESS_DENIED", 422);
    throw workspaceError("MODEL_STUDIO_AUTH_FAILED", 422);
  }
  if (response.status === 429) throw workspaceError("MODEL_STUDIO_RATE_LIMITED", 429, true);
  if (response.status >= 500) throw workspaceError("MODEL_STUDIO_UNAVAILABLE", 502, true);
  // The deliberately invalid model must be rejected after authentication. A 400 InvalidParameter response is healthy.
  if (response.status >= 400 && !/model.*(not exist|not found)|invalidparameter/.test(`${code} ${message}`.toLowerCase())) throw workspaceError("MODEL_STUDIO_REJECTED", 422);
  const result = { status: "healthy", latencyMs: Date.now() - startedAt, testedAt: Date.now(), baseUrl: config.baseUrl };
  recentValidations.set(fingerprint(config, apiKey), result);
  return result;
}

export function modelStudioWorkspaceConfiguration() { return publicConfig(); }

export function modelStudioWorkspaceCredentials() {
  const config = row();
  if (!config || config.status !== "active") return null;
  return { ...publicConfig(config), apiKey: decryptCredential(credentialRow(config)) };
}

export async function testModelStudioWorkspaceConfiguration(data, fetchImpl = fetch) {
  const existing = row();
  const config = normalize(data, existing);
  const apiKey = config.apiKey || decryptCredential(credentialRow(existing));
  return probe(config, apiKey, fetchImpl);
}

export async function saveModelStudioWorkspaceConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  const tested = recentValidations.get(fingerprint(input, apiKey));
  const result = tested && Date.now() - tested.testedAt <= validationTtlMs ? tested : await probe(input, apiKey, fetchImpl);
  const version = existing ? existing.credential_version + (input.apiKey ? 1 : 0) : 1;
  const encrypted = input.apiKey ? encryptCredential(apiKey, owner, id, version) : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`INSERT INTO model_studio_workspace_configs
    (id,name,region,workspace_id,endpoint_mode,base_url,key_ciphertext,key_iv,key_tag,key_hint,credential_version,status,last_test_status,last_test_latency_ms,last_tested_at,updated_by,created_at,updated_at)
    VALUES ('default',?,?,?,?,?,?,?,?,?,?,?,'healthy',?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,region=excluded.region,workspace_id=excluded.workspace_id,endpoint_mode=excluded.endpoint_mode,base_url=excluded.base_url,key_ciphertext=excluded.key_ciphertext,key_iv=excluded.key_iv,key_tag=excluded.key_tag,key_hint=excluded.key_hint,credential_version=excluded.credential_version,status=excluded.status,last_test_status=excluded.last_test_status,last_test_latency_ms=excluded.last_test_latency_ms,last_tested_at=excluded.last_tested_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at
  `).run(input.name,input.region,input.workspaceId||null,input.endpointMode,input.baseUrl,encrypted.ciphertext,encrypted.iv,encrypted.tag,`••••${apiKey.slice(-4)}`,version,input.status,result.latencyMs,result.testedAt,actorUserId,existing?.created_at||timestamp,timestamp);
  db.prepare(`INSERT OR IGNORE INTO image_provider_configs (
    purpose,adapter,base_url,model_id,key_ciphertext,key_iv,key_tag,key_hint,credential_version,status,credit_cost,
    last_test_status,last_test_latency_ms,last_tested_at,updated_by,created_at,updated_at,credential_source
  ) VALUES ('image_text_ocr','dashscope',?,'qwen-vl-ocr-latest',?,?,?,?,1,'active',1,'inherited',NULL,NULL,?, ?,?,'workspace')`)
    .run(input.baseUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag, `••••${apiKey.slice(-4)}`, actorUserId, timestamp, timestamp);
  const runtimeStatus = input.status === "active" ? "ready" : "configuration_required";
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-edit' AND EXISTS (SELECT 1 FROM image_provider_configs WHERE purpose='image_editing' AND credential_source='workspace' AND status='active')").run(runtimeStatus);
  db.prepare("UPDATE tools SET runtime_status = ? WHERE runtime_kind = 'platform-image-upscale' AND EXISTS (SELECT 1 FROM image_provider_configs WHERE purpose IN ('image_upscaling','image_editing') AND credential_source='workspace' AND status='active')").run(runtimeStatus);
  return publicConfig();
}
