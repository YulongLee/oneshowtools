import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { isIP } from "node:net";
import { promises as dns } from "node:dns";
import { db } from "./database.mjs";

export const MANAGED_MODEL_ALIAS = "OneShowModel";
const userConfigurableRuntimeKinds = new Set(["openai", "builtin-seo"]);
const modelRuntimeFamilies = Object.freeze({
  openai: "text",
  "builtin-seo": "text",
  "builtin-music": "music",
  "platform-image-edit": "image",
  "platform-image-upscale": "image",
  "platform-food-vision": "vision",
});
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 45_000;
const userProtocols = new Set(["openai", "anthropic"]);
const endpointPolicies = Object.freeze({
  openai: {
    label: "OpenAI compatible",
    protocol: "openai",
    baseUrl: null,
    public: true,
  },
  anthropic: {
    label: "Anthropic compatible",
    protocol: "anthropic",
    baseUrl: null,
    public: true,
  },
  deepseek: {
    label: "DeepSeek",
    protocol: "openai",
    baseUrl: process.env.DEEPSEEK_COMPATIBLE_BASE_URL || "https://api.deepseek.com",
    displayUrl: "https://api.deepseek.com",
  },
  dashscope: {
    label: "DashScope compatible",
    protocol: "openai",
    baseUrl: process.env.DASHSCOPE_COMPATIBLE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    displayUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  openrouter: {
    label: "OpenRouter",
    protocol: "openai",
    baseUrl: process.env.OPENROUTER_COMPATIBLE_BASE_URL || "https://openrouter.ai/api/v1",
    displayUrl: "https://openrouter.ai/api/v1",
  },
  custom: {
    label: "Custom OpenAI-compatible endpoint",
    protocol: "openai",
    baseUrl: null,
    requiresBaseUrl: true,
  },
});

const gatewayError = (code, status = 502, retryable = false) =>
  Object.assign(new Error(code), { code, status, retryable });

export function toolModelCapability(runtimeKind) {
  const kind = String(runtimeKind || "");
  return {
    modelRequired: Boolean(modelRuntimeFamilies[kind]),
    modelFamily: modelRuntimeFamilies[kind] || null,
    userConfigurable: userConfigurableRuntimeKinds.has(kind),
  };
}

function enabled(name, fallback = false) {
  const value = process.env[name];
  return value == null ? fallback : value === "true";
}

export function gatewayFlags() {
  const legacyManaged = Boolean(process.env.OPENAI_API_KEY);
  const storedManaged = db.prepare("SELECT 1 AS configured FROM platform_model_configs WHERE purpose = 'managed_runtime' AND status = 'active'").get();
  return {
    managedConfigured: Boolean(storedManaged || process.env.ONESHOW_MODEL_API_KEY || legacyManaged),
    managedExecutionEnabled: enabled("ONESHOW_MODEL_EXECUTION_ENABLED", false),
    byokEnabled: enabled("MODEL_CONNECTIONS_ENABLED", false) && Boolean(process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY),
    workerEnabled: enabled("DURABLE_WORKER_ENABLED", true),
  };
}

function encryptionKey() {
  const value = String(process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY || "");
  let key;
  if (/^[0-9a-f]{64}$/i.test(value)) key = Buffer.from(value, "hex");
  else {
    try {
      key = Buffer.from(value, "base64");
    } catch {
      key = Buffer.alloc(0);
    }
  }
  if (key.length !== 32) throw gatewayError("MODEL_CREDENTIAL_STORAGE_UNAVAILABLE", 503);
  return key;
}

function aad(userId, connectionId, version) {
  return Buffer.from(`oneshowtools:${userId}:${connectionId}:${version}`, "utf8");
}

export function encryptCredential(apiKey, userId, connectionId, version) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(aad(userId, connectionId, version));
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCredential(row) {
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.key_iv, "base64"));
    decipher.setAAD(aad(row.user_id, row.id, row.credential_version));
    decipher.setAuthTag(Buffer.from(row.key_tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(row.key_ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw gatewayError("MODEL_CREDENTIAL_INVALID", 422);
  }
}

function keyHint(apiKey) {
  const compact = String(apiKey).trim();
  return compact.length > 4 ? `••••${compact.slice(-4)}` : "••••";
}

const platformPurposes = new Set(["managed_runtime", "market_intelligence", "oneshow_home_chat", "food_nutrition"]);

function platformPurposeName(purpose) {
  if (purpose === "managed_runtime") return MANAGED_MODEL_ALIAS;
  if (purpose === "oneshow_home_chat") return "OneShow Home Buddy";
  if (purpose === "food_nutrition") return "Food Nutrition Vision";
  return "Market Intelligence";
}

function normalizeWorkspaceId(value) {
  const workspaceId = String(value || "").trim();
  if (workspaceId && (workspaceId.length > 120 || !/^[A-Za-z0-9_-]+$/.test(workspaceId))) {
    throw gatewayError("INVALID_MODEL_WORKSPACE", 400);
  }
  return workspaceId || null;
}

function platformModelRow(purpose) {
  if (!platformPurposes.has(purpose)) throw gatewayError("INVALID_PLATFORM_MODEL_PURPOSE", 400);
  return db.prepare("SELECT * FROM platform_model_configs WHERE purpose = ?").get(purpose) || null;
}

function platformCredentialRow(row) {
  return row && {
    ...row,
    id: row.purpose,
    user_id: `platform:${row.purpose}`,
  };
}

function serializePlatformModel(row, purpose) {
  if (!row) return {
    purpose,
    source: "environment",
    name: platformPurposeName(purpose),
    providerTemplate: "openai",
    baseUrl: purpose === "managed_runtime"
      ? process.env.ONESHOW_MODEL_BASE_URL || "https://api.openai.com/v1"
      : purpose === "oneshow_home_chat"
      ? process.env.ONESHOW_HOME_CHAT_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"
      : purpose === "food_nutrition"
      ? process.env.FOOD_NUTRITION_MODEL_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"
      : process.env.CODEX_BASE_URL || process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    modelId: purpose === "managed_runtime"
      ? process.env.ONESHOW_MODEL_ID || process.env.OPENAI_MODEL || null
      : purpose === "oneshow_home_chat"
      ? process.env.ONESHOW_HOME_CHAT_MODEL || null
      : purpose === "food_nutrition"
      ? process.env.FOOD_NUTRITION_MODEL_ID || "qwen3.6-flash"
      : process.env.MARKET_INTELLIGENCE_MODEL || null,
    workspaceId: ["market_intelligence", "food_nutrition"].includes(purpose) ? process.env.DASHSCOPE_WORKSPACE_ID || null : null,
    keyHint: null,
    configured: purpose === "managed_runtime"
      ? Boolean(process.env.ONESHOW_MODEL_API_KEY || process.env.OPENAI_API_KEY)
      : purpose === "oneshow_home_chat"
      ? Boolean(process.env.ONESHOW_HOME_CHAT_API_KEY)
      : purpose === "food_nutrition"
      ? Boolean(process.env.FOOD_NUTRITION_MODEL_API_KEY)
      : Boolean(process.env.DASHSCOPE_API_KEY || process.env.OFFERSTEADY_DASHSCOPE_API_KEY),
    status: "environment",
    lastTestStatus: null,
    lastTestLatencyMs: null,
    lastTestedAt: null,
  };
  return {
    purpose: row.purpose,
    source: "admin",
    name: row.name,
    providerTemplate: row.provider_template,
    baseUrl: row.base_url,
    modelId: row.model_id,
    workspaceId: row.workspace_id || null,
    keyHint: row.key_hint,
    configured: row.status === "active",
    status: row.status,
    lastTestStatus: row.last_test_status,
    lastTestLatencyMs: row.last_test_latency_ms,
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPlatformModelConfigurations() {
  return ["managed_runtime", "market_intelligence", "oneshow_home_chat", "food_nutrition"].map((purpose) => serializePlatformModel(platformModelRow(purpose), purpose));
}

export function platformModelConfiguration(purpose) {
  return serializePlatformModel(platformModelRow(purpose), purpose);
}

function serializeConnection(row) {
  return {
    id: row.id,
    name: row.name,
    providerTemplate: row.provider_template,
    baseUrl: row.endpoint_url || endpointPolicies[row.provider_template]?.displayUrl || null,
    modelId: row.model_id,
    keyHint: row.key_hint,
    status: row.status,
    isDefault: Boolean(row.is_default),
    lastTestStatus: row.last_test_status,
    lastTestLatencyMs: row.last_test_latency_ms,
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function seedPolicies() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO model_endpoint_policies (code, label, base_url, enabled, created_at)
    VALUES (?, ?, ?, 1, ?)
  `);
  const timestamp = Date.now();
  for (const [code, policy] of Object.entries(endpointPolicies)) {
    insert.run(code, policy.label, policy.baseUrl || "user-defined", timestamp);
  }
}
seedPolicies();

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 500) throw gatewayError("INVALID_MODEL_ENDPOINT", 400);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw gatewayError("INVALID_MODEL_ENDPOINT", 400);
  }
  const testHttp = process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_MODEL_ENDPOINTS === "true";
  if ((url.protocol !== "https:" && !(testHttp && url.protocol === "http:"))
    || url.username || url.password || url.search || url.hash) {
    throw gatewayError("INVALID_MODEL_ENDPOINT", 400);
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  return url.href.replace(/\/$/, "");
}

function validConnectionInput(data, requireKey = true) {
  const name = String(data.name || "").trim();
  const providerTemplate = String(data.providerTemplate || "");
  const modelId = String(data.modelId || "").trim();
  const apiKey = String(data.apiKey || "").trim();
  if (!name || name.length > 80) throw gatewayError("INVALID_CONNECTION_NAME", 400);
  if (!userProtocols.has(providerTemplate)) throw gatewayError("UNSUPPORTED_PROVIDER_TEMPLATE", 400);
  if (!modelId || modelId.length > 120 || !/^[\w./:-]+$/.test(modelId)) {
    throw gatewayError("INVALID_MODEL_ID", 400);
  }
  if (requireKey && (apiKey.length < 8 || apiKey.length > 2048)) throw gatewayError("INVALID_API_KEY", 400);
  const baseUrl = normalizeBaseUrl(data.baseUrl);
  return { name, providerTemplate, modelId, apiKey, baseUrl };
}

export function listModelConnections(userId) {
  return db.prepare(`
    SELECT connections.*, endpoints.base_url AS endpoint_url
    FROM user_model_connections AS connections
    LEFT JOIN user_model_connection_endpoints AS endpoints ON endpoints.connection_id = connections.id
    WHERE connections.user_id = ? AND connections.status != 'deleted'
    ORDER BY connections.is_default DESC, connections.created_at DESC
  `).all(userId).map(serializeConnection);
}

export function createModelConnection(userId, data) {
  if (!gatewayFlags().byokEnabled) throw gatewayError("MODEL_CONNECTIONS_UNAVAILABLE", 503);
  const input = validConnectionInput(data);
  const id = randomUUID();
  const version = 1;
  const encrypted = encryptCredential(input.apiKey, userId, id, version);
  const timestamp = Date.now();
  const isDefault = Boolean(data.isDefault);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (isDefault) db.prepare("UPDATE user_model_connections SET is_default = 0 WHERE user_id = ?").run(userId);
    db.prepare(`
      INSERT INTO user_model_connections (
        id, user_id, name, provider_template, model_id, key_ciphertext, key_iv, key_tag,
        key_hint, credential_version, status, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      id, userId, input.name, input.providerTemplate, input.modelId, encrypted.ciphertext,
      encrypted.iv, encrypted.tag, keyHint(input.apiKey), version, isDefault ? 1 : 0,
      timestamp, timestamp,
    );
    if (input.baseUrl) {
      db.prepare(`
        INSERT INTO user_model_connection_endpoints (connection_id, base_url, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(id, input.baseUrl, timestamp, timestamp);
    }
    db.prepare(`
      INSERT INTO model_credential_versions (id, connection_id, version, event, key_hint, created_at)
      VALUES (?, ?, ?, 'created', ?, ?)
    `).run(randomUUID(), id, version, keyHint(input.apiKey), timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return serializeConnection(ownedConnection(userId, id));
}

export function updateModelConnection(userId, connectionId, data) {
  const row = ownedConnection(userId, connectionId);
  const name = data.name == null ? row.name : String(data.name).trim();
  const modelId = data.modelId == null ? row.model_id : String(data.modelId).trim();
  const status = data.status == null ? row.status : String(data.status);
  if (!name || name.length > 80) throw gatewayError("INVALID_CONNECTION_NAME", 400);
  if (!modelId || modelId.length > 120 || !/^[\w./:-]+$/.test(modelId)) throw gatewayError("INVALID_MODEL_ID", 400);
  if (!["active", "disabled"].includes(status)) throw gatewayError("INVALID_CONNECTION_STATUS", 400);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (data.isDefault && status === "active") {
      db.prepare("UPDATE user_model_connections SET is_default = 0 WHERE user_id = ?").run(userId);
    }
    db.prepare(`
      UPDATE user_model_connections SET name = ?, model_id = ?, status = ?,
        is_default = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(name, modelId, status, data.isDefault && status === "active" ? 1 : row.is_default, Date.now(), connectionId, userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return serializeConnection(ownedConnection(userId, connectionId));
}

export function rotateModelCredential(userId, connectionId, apiKey) {
  const row = ownedConnection(userId, connectionId);
  const key = String(apiKey || "").trim();
  if (key.length < 8 || key.length > 2048) throw gatewayError("INVALID_API_KEY", 400);
  const version = row.credential_version + 1;
  const encrypted = encryptCredential(key, userId, connectionId, version);
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      UPDATE user_model_connections SET key_ciphertext = ?, key_iv = ?, key_tag = ?,
        key_hint = ?, credential_version = ?, last_test_status = NULL,
        last_test_latency_ms = NULL, last_tested_at = NULL, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(encrypted.ciphertext, encrypted.iv, encrypted.tag, keyHint(key), version, timestamp, connectionId, userId);
    db.prepare(`
      INSERT INTO model_credential_versions (id, connection_id, version, event, key_hint, created_at)
      VALUES (?, ?, ?, 'rotated', ?, ?)
    `).run(randomUUID(), connectionId, version, keyHint(key), timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return serializeConnection(ownedConnection(userId, connectionId));
}

export function deleteModelConnection(userId, connectionId) {
  const row = ownedConnection(userId, connectionId);
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      UPDATE user_model_connections SET status = 'deleted', is_default = 0,
        key_ciphertext = '', key_iv = '', key_tag = '', deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(timestamp, timestamp, connectionId, userId);
    db.prepare(`
      INSERT OR IGNORE INTO model_credential_versions (id, connection_id, version, event, key_hint, created_at)
      VALUES (?, ?, ?, 'revoked', ?, ?)
    `).run(randomUUID(), connectionId, row.credential_version, row.key_hint, timestamp);
    db.prepare(`
      UPDATE user_tool_model_preferences
      SET route_kind = 'managed', model_connection_id = NULL, updated_at = ?
      WHERE user_id = ? AND model_connection_id = ?
    `).run(timestamp, userId, connectionId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ownedConnection(userId, connectionId, activeOnly = false) {
  const row = db.prepare(`
    SELECT connections.*, endpoints.base_url AS endpoint_url
    FROM user_model_connections AS connections
    LEFT JOIN user_model_connection_endpoints AS endpoints ON endpoints.connection_id = connections.id
    WHERE connections.id = ? AND connections.user_id = ?
      AND connections.status ${activeOnly ? "= 'active'" : "!= 'deleted'"}
  `).get(connectionId, userId);
  if (!row) throw gatewayError("MODEL_CONNECTION_NOT_FOUND", 404);
  return row;
}

function blockedAddress(address) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0.0.0.0" || normalized.startsWith("fe80:")
    || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) return blockedAddress(normalized.slice(7));
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

async function assertSafeEndpoint(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw gatewayError("INVALID_MODEL_ENDPOINT", 400);
  }
  const testEndpoint = process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_MODEL_ENDPOINTS === "true";
  if (url.username || url.password || (!testEndpoint && ![443].includes(Number(url.port || 443)))) throw gatewayError("MODEL_ENDPOINT_BLOCKED", 400);
  if (url.protocol !== "https:" && !(testEndpoint && url.protocol === "http:")) throw gatewayError("MODEL_ENDPOINT_BLOCKED", 400);
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!testEndpoint && addresses.some(({ address }) => blockedAddress(address))) throw gatewayError("MODEL_ENDPOINT_BLOCKED", 400);
  return url;
}

function normalizePayload(payload, protocol) {
  const text = protocol === "anthropic"
    ? payload?.content?.find((item) => item?.type === "text")?.text
    : payload?.choices?.[0]?.message?.content
      ?? payload?.output_text
      ?? payload?.output?.flatMap((item) => item?.content || []).find((item) => item?.text)?.text;
  if (typeof text !== "string") throw gatewayError("MODEL_INVALID_RESPONSE", 502);
  return {
    text,
    usage: {
      inputTokens: payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? null,
      outputTokens: payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? null,
    },
    finishReason: payload?.choices?.[0]?.finish_reason ?? payload?.stop_reason ?? null,
  };
}

function modelRequest(safeBase, protocol, apiKey, modelId, instruction, text, workspaceId = null, messages = null) {
  const root = safeBase.href.replace(/\/$/, "");
  if (protocol === "anthropic") {
    const suffix = safeBase.pathname.replace(/\/$/, "").endsWith("/v1") ? "messages" : "v1/messages";
    return {
      endpoint: new URL(`${root}/${suffix}`),
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: {
        model: modelId,
        max_tokens: Math.min(Math.max(Number(process.env.MODEL_MAX_OUTPUT_TOKENS || 4096), 64), 8192),
        system: instruction,
        messages: messages || [{ role: "user", content: text }],
      },
    };
  }
  return {
    endpoint: new URL(`${root}/chat/completions`),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(workspaceId ? { "X-DashScope-WorkSpace": workspaceId } : {}),
    },
    body: {
      model: modelId,
      messages: [{ role: "system", content: instruction }, ...(messages || [{ role: "user", content: text }])],
    },
  };
}

export function resolveModelRequestTimeout(timeoutMs = null, env = process.env) {
  const configuredTimeout = Number(timeoutMs ?? env.MODEL_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Math.min(180_000, Math.max(5_000, Number.isFinite(configuredTimeout) ? configuredTimeout : DEFAULT_TIMEOUT_MS));
}

async function requestModel({ baseUrl, protocol = "openai", apiKey, modelId, workspaceId = null, instruction, text, messages = null, signal, timeoutMs = null }) {
  const controller = new AbortController();
  const requestTimeout = resolveModelRequestTimeout(timeoutMs);
  const timeout = setTimeout(() => controller.abort(), requestTimeout);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const safeBase = await assertSafeEndpoint(baseUrl);
    const request = modelRequest(safeBase, protocol, apiKey, modelId, instruction, text, workspaceId, messages);
    const response = await fetch(request.endpoint, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    if (response.status >= 300 && response.status < 400) throw gatewayError("MODEL_REDIRECT_BLOCKED", 502);
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw gatewayError("MODEL_AUTH_FAILED", 422);
      if ([400, 404].includes(response.status)) throw gatewayError("MODEL_OR_ENDPOINT_INVALID", 422);
      if ([402].includes(response.status)) throw gatewayError("MODEL_QUOTA_EXCEEDED", 422);
      if (response.status === 429) throw gatewayError("MODEL_RATE_LIMITED", 429, true);
      throw gatewayError("MODEL_UPSTREAM_UNAVAILABLE", 502, response.status >= 500);
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_RESPONSE_BYTES) throw gatewayError("MODEL_RESPONSE_TOO_LARGE", 502);
    const raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_RESPONSE_BYTES) throw gatewayError("MODEL_RESPONSE_TOO_LARGE", 502);
    return normalizePayload(JSON.parse(raw), protocol);
  } catch (error) {
    if (error?.name === "AbortError") throw gatewayError("MODEL_TIMEOUT", 504, true);
    if (error?.code) throw error;
    throw gatewayError("MODEL_UPSTREAM_UNAVAILABLE", 502, true);
  } finally {
    clearTimeout(timeout);
  }
}

function validPlatformInput(purpose, data, existing = null) {
  if (!platformPurposes.has(purpose)) throw gatewayError("INVALID_PLATFORM_MODEL_PURPOSE", 400);
  const apiKey = String(data.apiKey || "").trim();
  const input = validConnectionInput({
    name: data.name || existing?.name || platformPurposeName(purpose),
    providerTemplate: data.providerTemplate || existing?.provider_template || "openai",
    baseUrl: data.baseUrl || existing?.base_url,
    modelId: data.modelId || existing?.model_id,
    apiKey: apiKey || (existing ? "stored-credential" : ""),
  }, !existing);
  return {
    ...input,
    apiKey,
    workspaceId: normalizeWorkspaceId(data.workspaceId ?? existing?.workspace_id),
    status: data.status === "disabled" ? "disabled" : "active",
  };
}

async function testPlatformInput(purpose, data) {
  const existing = platformModelRow(purpose);
  const input = validPlatformInput(purpose, data, existing);
  const apiKey = input.apiKey || (existing ? decryptCredential(platformCredentialRow(existing)) : "");
  const startedAt = Date.now();
  try {
    await requestModel({
      baseUrl: input.baseUrl,
      protocol: input.providerTemplate,
      apiKey,
      modelId: input.modelId,
      workspaceId: input.workspaceId,
      instruction: "Return only the word OK.",
      text: "Health check",
    });
    return { status: "healthy", latencyMs: Date.now() - startedAt, input, apiKey };
  } catch (error) {
    const status = ["MODEL_AUTH_FAILED", "MODEL_RATE_LIMITED", "MODEL_TIMEOUT", "MODEL_OR_ENDPOINT_INVALID", "MODEL_QUOTA_EXCEEDED", "MODEL_ENDPOINT_BLOCKED", "INVALID_MODEL_ENDPOINT"].includes(error.code)
      ? error.code.toLowerCase() : "unavailable";
    return { status, latencyMs: Date.now() - startedAt, input, apiKey };
  }
}

export async function testPlatformModelConfiguration(purpose, data) {
  const result = await testPlatformInput(purpose, data);
  return { status: result.status, latencyMs: result.latencyMs };
}

export async function savePlatformModelConfiguration(purpose, data, actorUserId = null) {
  const existing = platformModelRow(purpose);
  const tested = await testPlatformInput(purpose, data);
  if (!new Set(["healthy", "model_rate_limited"]).has(tested.status)) {
    throw gatewayError("PLATFORM_MODEL_TEST_FAILED", 422);
  }
  const version = existing ? existing.credential_version + (tested.input.apiKey ? 1 : 0) : 1;
  const encrypted = tested.input.apiKey
    ? encryptCredential(tested.apiKey, `platform:${purpose}`, purpose, version)
    : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO platform_model_configs (
      purpose, name, provider_template, base_url, model_id, workspace_id,
      key_ciphertext, key_iv, key_tag, key_hint, credential_version, status,
      last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purpose) DO UPDATE SET
      name=excluded.name, provider_template=excluded.provider_template, base_url=excluded.base_url,
      model_id=excluded.model_id, workspace_id=excluded.workspace_id,
      key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv, key_tag=excluded.key_tag,
      key_hint=excluded.key_hint, credential_version=excluded.credential_version, status=excluded.status,
      last_test_status=excluded.last_test_status, last_test_latency_ms=excluded.last_test_latency_ms,
      last_tested_at=excluded.last_tested_at, updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(
    purpose, tested.input.name, tested.input.providerTemplate, tested.input.baseUrl, tested.input.modelId, tested.input.workspaceId,
    encrypted.ciphertext, encrypted.iv, encrypted.tag, tested.input.apiKey ? keyHint(tested.input.apiKey) : existing.key_hint,
    version, tested.input.status, tested.status, tested.latencyMs, timestamp, actorUserId, existing?.created_at || timestamp, timestamp,
  );
  return platformModelConfiguration(purpose);
}

export function platformModelRoute(purpose) {
  const row = platformModelRow(purpose);
  if (!row || row.status !== "active") return null;
  return {
    protocol: row.provider_template,
    baseUrl: row.base_url,
    apiKey: decryptCredential(platformCredentialRow(row)),
    modelId: row.model_id,
    workspaceId: row.workspace_id || null,
  };
}

export async function invokePlatformModel({ purpose, service = "unknown", instruction, messages, signal, timeoutMs = null }) {
  const route = platformModelRoute(purpose);
  if (!route) throw gatewayError("PLATFORM_MODEL_UNAVAILABLE", 503, true);
  const normalizedMessages = Array.isArray(messages) ? messages.slice(-24).map((message) => ({
    role: message?.role === "assistant" ? "assistant" : "user",
    content: String(message?.content || "").trim().slice(0, 12_000),
  })).filter((message) => message.content) : [];
  if (!normalizedMessages.length) throw gatewayError("INVALID_MODEL_MESSAGES", 400);
  const invocationId = randomUUID();
  const startedAt = Date.now();
  db.prepare(`INSERT INTO platform_model_invocations (id, purpose, service, status, model_id, started_at)
    VALUES (?, ?, ?, 'running', ?, ?)`)
    .run(invocationId, purpose, String(service).slice(0, 80), route.modelId, startedAt);
  try {
    const result = await requestModel({
      ...route,
      instruction: String(instruction || "").slice(0, 12_000),
      text: normalizedMessages.at(-1).content,
      messages: normalizedMessages,
      signal,
      timeoutMs,
    });
    db.prepare(`UPDATE platform_model_invocations SET status = 'completed', input_tokens = ?, output_tokens = ?,
      latency_ms = ?, completed_at = ? WHERE id = ?`)
      .run(result.usage.inputTokens, result.usage.outputTokens, Date.now() - startedAt, Date.now(), invocationId);
    return { ...result, modelId: route.modelId, invocationId };
  } catch (error) {
    db.prepare(`UPDATE platform_model_invocations SET status = 'failed', error_class = ?, latency_ms = ?,
      completed_at = ? WHERE id = ?`)
      .run(error.code || "MODEL_REQUEST_FAILED", Date.now() - startedAt, Date.now(), invocationId);
    throw error;
  }
}

export async function invokePlatformVisionModel({ purpose, service = "unknown", instruction, prompt, imageDataUrl, signal, timeoutMs = null }) {
  const route = platformModelRoute(purpose);
  if (!route) throw gatewayError("PLATFORM_MODEL_UNAVAILABLE", 503, true);
  const image = String(imageDataUrl || "");
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || image.length > 10_000_000) throw gatewayError("INVALID_MODEL_IMAGE", 400);
  const text = String(prompt || "").trim().slice(0, 16_000);
  if (!text) throw gatewayError("INVALID_MODEL_MESSAGES", 400);
  const content = route.protocol === "anthropic"
    ? [{ type: "image", source: { type: "base64", media_type: match[1], data: match[2] } }, { type: "text", text }]
    : [{ type: "text", text }, { type: "image_url", image_url: { url: image } }];
  const invocationId = randomUUID();
  const startedAt = Date.now();
  db.prepare(`INSERT INTO platform_model_invocations (id, purpose, service, status, model_id, started_at)
    VALUES (?, ?, ?, 'running', ?, ?)`)
    .run(invocationId, purpose, String(service).slice(0, 80), route.modelId, startedAt);
  try {
    const result = await requestModel({
      ...route,
      instruction: String(instruction || "").slice(0, 12_000),
      text,
      messages: [{ role: "user", content }],
      signal,
      timeoutMs,
    });
    db.prepare(`UPDATE platform_model_invocations SET status = 'completed', input_tokens = ?, output_tokens = ?,
      latency_ms = ?, completed_at = ? WHERE id = ?`)
      .run(result.usage.inputTokens, result.usage.outputTokens, Date.now() - startedAt, Date.now(), invocationId);
    return { ...result, modelId: route.modelId, invocationId };
  } catch (error) {
    db.prepare(`UPDATE platform_model_invocations SET status = 'failed', error_class = ?, latency_ms = ?,
      completed_at = ? WHERE id = ?`)
      .run(error.code || "MODEL_REQUEST_FAILED", Date.now() - startedAt, Date.now(), invocationId);
    throw error;
  }
}

function resolveRoute(userId, connectionId) {
  if (connectionId && connectionId !== "managed") {
    const row = ownedConnection(userId, connectionId, true);
    const policy = endpointPolicies[row.provider_template];
    if (!policy) throw gatewayError("MODEL_CONNECTION_UNAVAILABLE", 422);
    return {
      routeKind: "user_connection",
      connectionId: row.id,
      protocol: policy.protocol || "openai",
      baseUrl: row.endpoint_url || policy.baseUrl,
      apiKey: decryptCredential(row),
      modelId: row.model_id,
    };
  }
  const stored = platformModelRoute("managed_runtime");
  const flags = gatewayFlags();
  if (!flags.managedConfigured || !flags.managedExecutionEnabled) {
    throw gatewayError("ONESH​OW_MODEL_UNAVAILABLE".replace("\u200b", ""), 503, true);
  }
  return {
    routeKind: "managed",
    connectionId: null,
    protocol: stored?.protocol || "openai",
    baseUrl: stored?.baseUrl || process.env.ONESHOW_MODEL_BASE_URL || "https://api.openai.com/v1",
    apiKey: stored?.apiKey || process.env.ONESHOW_MODEL_API_KEY || process.env.OPENAI_API_KEY,
    modelId: stored?.modelId || process.env.ONESHOW_MODEL_ID || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    workspaceId: stored?.workspaceId || null,
  };
}

export async function invokeModel({
  userId,
  taskId = null,
  capability = "text",
  instruction,
  text,
  connectionId = null,
  signal,
  timeoutMs = null,
}) {
  const route = resolveRoute(userId, connectionId);
  const invocationId = randomUUID();
  const startedAt = Date.now();
  db.prepare(`
    INSERT INTO model_invocations
      (id, task_id, user_id, route_kind, connection_id, capability, status, started_at)
    VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
  `).run(invocationId, taskId, userId, route.routeKind, route.connectionId, capability, startedAt);
  try {
    const result = await requestModel({ ...route, instruction, text, signal, timeoutMs });
    db.prepare(`
      UPDATE model_invocations SET status = 'completed', input_tokens = ?, output_tokens = ?,
        latency_ms = ?, completed_at = ? WHERE id = ?
    `).run(result.usage.inputTokens, result.usage.outputTokens, Date.now() - startedAt, Date.now(), invocationId);
    return { ...result, route: route.routeKind, invocationId };
  } catch (error) {
    db.prepare(`
      UPDATE model_invocations SET status = 'failed', error_class = ?, latency_ms = ?,
        completed_at = ? WHERE id = ?
    `).run(error.code || "MODEL_REQUEST_FAILED", Date.now() - startedAt, Date.now(), invocationId);
    throw error;
  }
}

export async function invokeVisionModel({
  userId,
  taskId = null,
  capability = "vision",
  instruction,
  prompt,
  imageDataUrl,
  connectionId = null,
  signal,
  timeoutMs = null,
}) {
  if (!userId) throw gatewayError("MODEL_USER_REQUIRED", 400);
  const route = resolveRoute(userId, connectionId);
  const image = String(imageDataUrl || "");
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || image.length > 10_000_000) throw gatewayError("INVALID_MODEL_IMAGE", 400);
  const text = String(prompt || "").trim().slice(0, 16_000);
  if (!text) throw gatewayError("INVALID_MODEL_MESSAGES", 400);
  const content = route.protocol === "anthropic"
    ? [{ type: "image", source: { type: "base64", media_type: match[1], data: match[2] } }, { type: "text", text }]
    : [{ type: "text", text }, { type: "image_url", image_url: { url: image } }];
  const invocationId = randomUUID();
  const startedAt = Date.now();
  db.prepare(`
    INSERT INTO model_invocations
      (id, task_id, user_id, route_kind, connection_id, capability, status, started_at)
    VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
  `).run(invocationId, taskId, userId, route.routeKind, route.connectionId, capability, startedAt);
  try {
    const result = await requestModel({
      ...route,
      instruction: String(instruction || "").slice(0, 12_000),
      text,
      messages: [{ role: "user", content }],
      signal,
      timeoutMs,
    });
    db.prepare(`
      UPDATE model_invocations SET status = 'completed', input_tokens = ?, output_tokens = ?,
        latency_ms = ?, completed_at = ? WHERE id = ?
    `).run(result.usage.inputTokens, result.usage.outputTokens, Date.now() - startedAt, Date.now(), invocationId);
    return { ...result, route: route.routeKind, modelId: route.modelId, invocationId };
  } catch (error) {
    db.prepare(`
      UPDATE model_invocations SET status = 'failed', error_class = ?, latency_ms = ?,
        completed_at = ? WHERE id = ?
    `).run(error.code || "MODEL_REQUEST_FAILED", Date.now() - startedAt, Date.now(), invocationId);
    throw error;
  }
}

export async function testModelConnection(userId, connectionId) {
  const row = ownedConnection(userId, connectionId, true);
  const startedAt = Date.now();
  let status = "healthy";
  try {
    await requestModel({
      baseUrl: row.endpoint_url || endpointPolicies[row.provider_template].baseUrl,
      protocol: endpointPolicies[row.provider_template].protocol || "openai",
      apiKey: decryptCredential(row),
      modelId: row.model_id,
      instruction: "Return only the word OK.",
      text: "Health check",
    });
  } catch (error) {
    status = ["MODEL_AUTH_FAILED", "MODEL_RATE_LIMITED", "MODEL_TIMEOUT", "MODEL_OR_ENDPOINT_INVALID", "MODEL_QUOTA_EXCEEDED", "MODEL_ENDPOINT_BLOCKED", "INVALID_MODEL_ENDPOINT"].includes(error.code)
      ? error.code.toLowerCase()
      : "unavailable";
  }
  const latency = Date.now() - startedAt;
  db.prepare(`
    UPDATE user_model_connections SET last_test_status = ?, last_test_latency_ms = ?,
      last_tested_at = ?, updated_at = ? WHERE id = ? AND user_id = ?
  `).run(status, latency, Date.now(), Date.now(), connectionId, userId);
  return { status, latencyMs: latency };
}

export async function validateModelConnection(data) {
  if (!gatewayFlags().byokEnabled) throw gatewayError("MODEL_CONNECTIONS_UNAVAILABLE", 503);
  const input = validConnectionInput(data);
  const startedAt = Date.now();
  try {
    await requestModel({
      baseUrl: input.baseUrl || endpointPolicies[input.providerTemplate].baseUrl,
      protocol: endpointPolicies[input.providerTemplate].protocol,
      apiKey: input.apiKey,
      modelId: input.modelId,
      instruction: "Return only the word OK.",
      text: "Health check",
    });
    return { status: "healthy", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      status: ["MODEL_AUTH_FAILED", "MODEL_RATE_LIMITED", "MODEL_TIMEOUT", "MODEL_OR_ENDPOINT_INVALID", "MODEL_QUOTA_EXCEEDED", "MODEL_ENDPOINT_BLOCKED", "INVALID_MODEL_ENDPOINT"].includes(error.code)
        ? error.code.toLowerCase()
        : "unavailable",
      latencyMs: Date.now() - startedAt,
    };
  }
}

export function listToolModelPreferences(userId) {
  const rows = db.prepare(`
    SELECT tool_id, route_kind, model_connection_id
    FROM user_tool_model_preferences WHERE user_id = ?
  `).all(userId);
  return Object.fromEntries(rows.map((row) => [
    row.tool_id,
    row.route_kind === "user_connection" && row.model_connection_id
      ? row.model_connection_id
      : "managed",
  ]));
}

export function setToolModelPreference(userId, toolId, modelConnectionId) {
  const tool = db.prepare("SELECT id, runtime_kind FROM tools WHERE id = ? AND active = 1").get(toolId);
  if (!tool) throw gatewayError("TOOL_NOT_FOUND", 404);
  if (!toolModelCapability(tool.runtime_kind).userConfigurable) throw gatewayError("TOOL_MODEL_NOT_CONFIGURABLE", 422);
  const selection = String(modelConnectionId || "managed");
  if (selection !== "managed") ownedConnection(userId, selection, true);
  db.prepare(`
    INSERT INTO user_tool_model_preferences
      (user_id, tool_id, route_kind, model_connection_id, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, tool_id) DO UPDATE SET
      route_kind = excluded.route_kind,
      model_connection_id = excluded.model_connection_id,
      updated_at = excluded.updated_at
  `).run(
    userId,
    toolId,
    selection === "managed" ? "managed" : "user_connection",
    selection === "managed" ? null : selection,
    Date.now(),
  );
  return { toolId, modelConnectionId: selection };
}

export function toolModelSelection(userId, toolId, requested = null) {
  if (requested) {
    const selection = String(requested);
    if (selection !== "managed") ownedConnection(userId, selection, true);
    return selection;
  }
  return listToolModelPreferences(userId)[toolId] || "managed";
}

export function runtimeSummary(userId) {
  const flags = gatewayFlags();
  return {
    managed: {
      id: "oneshow-model",
      name: MANAGED_MODEL_ALIAS,
      configured: flags.managedConfigured && flags.managedExecutionEnabled,
      status: flags.managedConfigured && flags.managedExecutionEnabled ? "ready" : "unavailable",
    },
    byokEnabled: flags.byokEnabled,
    supportedTemplates: Object.entries(endpointPolicies).filter(([, policy]) => policy.public).map(([id, policy]) => ({
      id,
      name: policy.label,
      requiresBaseUrl: Boolean(policy.requiresBaseUrl),
      defaultBaseUrl: policy.displayUrl || null,
    })),
    connections: flags.byokEnabled ? listModelConnections(userId) : [],
  };
}
