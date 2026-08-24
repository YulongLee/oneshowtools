import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = await mkdtemp(join(tmpdir(), "oneshow-model-test-"));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_MODEL_ENDPOINTS = "true";
process.env.MODEL_CONNECTIONS_ENABLED = "true";
process.env.ONESHOW_MODEL_EXECUTION_ENABLED = "true";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const observedRequests = [];
const provider = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const payload = JSON.parse(raw);
  const promptText = JSON.stringify(payload.messages || payload.input || "");
  observedRequests.push({
    url: request.url,
    authorization: request.headers.authorization || null,
    apiKey: request.headers["x-api-key"] || null,
    anthropicVersion: request.headers["anthropic-version"] || null,
    workspaceId: request.headers["x-dashscope-workspace"] || null,
  });
  response.setHeader("content-type", "application/json");
  if (promptText.includes("lyrics_request")) {
    response.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ title: "雨后的站台", hook: "下一站，我会成为自己的光", lyricsMarkdown: "[Verse 1]\n雨落在空荡的站台\n我把旧名字留在身后\n\n[Pre-Chorus]\n列车穿过沉默的夜\n心跳替我说出口\n\n[Chorus]\n下一站，我会成为自己的光\n不再回头，不再躲藏\n\n[Bridge]\n天亮以前，再勇敢一次", creativeNote: "由告别走向自我确认，副歌适合逐层抬升。", checks: ["叙事推进清晰"] }) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 120, completion_tokens: 90 },
    }));
    return;
  }
  response.end(JSON.stringify(request.url.endsWith("/v1/messages") ? {
    content: [{ type: "text", text: `ok:${payload.model}` }],
    usage: { input_tokens: 4, output_tokens: 2 },
    stop_reason: "end_turn",
  } : {
    choices: [{ message: { content: `ok:${payload.model}` }, finish_reason: "stop" }],
    usage: { prompt_tokens: 4, completion_tokens: 2 },
  }));
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const address = provider.address();
const providerBaseUrl = `http://127.0.0.1:${address.port}`;
process.env.ONESHOW_MODEL_API_KEY = "managed-secret-key";
process.env.ONESHOW_MODEL_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
process.env.ONESHOW_MODEL_ID = "internal-model-id";
process.env.DASHSCOPE_COMPATIBLE_BASE_URL = `http://127.0.0.1:${address.port}/v1`;

const {
  createModelConnection,
  decryptCredential,
  invokeModel,
  invokePlatformModel,
  listModelConnections,
  listPlatformModelConfigurations,
  listToolModelPreferences,
  resolveModelRequestTimeout,
  runtimeSummary,
  savePlatformModelConfiguration,
  setToolModelPreference,
  toolModelCapability,
  toolModelSelection,
  updateModelConnection,
  validateModelConnection,
} = await import("../server/model-gateway.mjs");
const { db } = await import("../server/database.mjs");
const { refundTask } = await import("../server/runtime.mjs");
const { generateWriting, writingCatalog } = await import("../server/writing-engine.mjs");
const { generateLyrics } = await import("../server/lyrics-engine.mjs");

function addUser(email) {
  const id = randomUUID();
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at)
    VALUES (?, 'Runtime tester', ?, 'unused', 1, ?, ?)
  `).run(id, email, timestamp, timestamp);
  return id;
}

test("model requests support a longer capability-specific timeout with safety bounds", () => {
  assert.equal(resolveModelRequestTimeout(null, {}), 45_000);
  assert.equal(resolveModelRequestTimeout(120_000, {}), 120_000);
  assert.equal(resolveModelRequestTimeout(1_000, {}), 5_000);
  assert.equal(resolveModelRequestTimeout(900_000, {}), 180_000);
  assert.equal(resolveModelRequestTimeout(null, { MODEL_REQUEST_TIMEOUT_MS: "not-a-number" }), 45_000);
});

test("managed runtime returns a provider-neutral result and redacted status", async () => {
  const userId = addUser("managed@example.com");
  const result = await invokeModel({
    userId,
    connectionId: "managed",
    instruction: "Test",
    text: "Hello",
  });
  assert.equal(result.text, "ok:internal-model-id");
  assert.equal(result.route, "managed");
  const publicStatus = JSON.stringify(runtimeSummary(userId));
  assert.match(publicStatus, /OneShowModel/);
  assert.doesNotMatch(publicStatus, /internal-model-id|managed-secret-key|127\.0\.0\.1/);
  assert.deepEqual(runtimeSummary(userId).supportedTemplates.map((item) => item.id), ["openai", "anthropic"]);
});

test("AI writing exposes 7 modules and 49 templates, then performs draft and review calls", async () => {
  const catalog = writingCatalog();
  assert.equal(catalog.modules.length, 7);
  assert.equal(catalog.modules.reduce((sum, module) => sum + module.templates.length, 0), 49);
  assert.doesNotMatch(JSON.stringify(catalog), /Template rules|never invent|hidden prompts/i);
  const userId = addUser("writer@example.com");
  const before = observedRequests.length;
  const generated = await generateWriting({
    user: { id: userId, locale: "zh-CN" },
    connectionId: "managed",
    payload: {
      templateId: "blog-post",
      values: { topic: "小团队如何选择 AI 工具", audience: "独立开发者", keywords: "AI工具,效率" },
      outputLanguage: "zh-CN",
      length: "short",
      tone: "professional",
      customInstructions: "给出三个可执行建议",
    },
  });
  assert.equal(generated.output.mode, "ai-reviewed");
  assert.equal(generated.output.templateId, "blog-post");
  assert.equal(generated.output.route, "managed");
  assert.ok(generated.output.review.score >= 0);
  assert.equal(observedRequests.length - before, 2);
  assert.doesNotMatch(JSON.stringify(generated), /managed-secret-key/);
});

test("lyrics generator creates structured, reviewed lyrics without exposing model credentials", async () => {
  const userId = addUser("lyrics@example.com");
  const generated = await generateLyrics({
    user: { id: userId, locale: "zh-CN" },
    connectionId: "managed",
    payload: {
      mode: "original", topic: "雨夜告别过去，重新出发", language: "简体中文",
      genre: "流行", mood: "克制后坚定", perspective: "第一人称", structure: "pop",
    },
  });
  assert.equal(generated.output.title, "雨后的站台");
  assert.match(generated.output.lyricsMarkdown, /\[Chorus\]/);
  assert.ok(generated.output.checks.includes("歌曲结构完整"));
  assert.equal(generated.output.route, "managed");
  assert.doesNotMatch(JSON.stringify(generated), /managed-secret-key|internal-model-id/);
});

test("customer credentials are encrypted, masked, owner-scoped, and tamper evident", () => {
  const ownerId = addUser("owner@example.com");
  const otherId = addUser("other@example.com");
  const connection = createModelConnection(ownerId, {
    name: "My model",
    providerTemplate: "openai",
    baseUrl: providerBaseUrl,
    modelId: "qwen-plus",
    apiKey: "customer-super-secret-1234",
  });
  assert.equal(connection.keyHint, "••••1234");
  assert.doesNotMatch(JSON.stringify(connection), /customer-super-secret/);

  const stored = db.prepare("SELECT * FROM user_model_connections WHERE id = ?").get(connection.id);
  assert.notEqual(stored.key_ciphertext, "customer-super-secret-1234");
  assert.equal(decryptCredential(stored), "customer-super-secret-1234");
  assert.throws(
    () => updateModelConnection(otherId, connection.id, { name: "stolen" }),
    /MODEL_CONNECTION_NOT_FOUND/,
  );
  db.prepare("UPDATE user_model_connections SET key_tag = ? WHERE id = ?").run(
    Buffer.alloc(16, 1).toString("base64"),
    connection.id,
  );
  const tampered = db.prepare("SELECT * FROM user_model_connections WHERE id = ?").get(connection.id);
  assert.throws(() => decryptCredential(tampered), /MODEL_CREDENTIAL_INVALID/);
  assert.equal(listModelConnections(otherId).length, 0);
});

test("draft credentials can be tested without being persisted", async () => {
  const userId = addUser("draft-test@example.com");
  const result = await validateModelConnection({
    name: "Draft connection",
    providerTemplate: "openai",
    baseUrl: providerBaseUrl,
    modelId: "qwen-plus",
    apiKey: "draft-secret-key-1234",
  });
  assert.equal(result.status, "healthy");
  assert.equal(listModelConnections(userId).length, 0);
  assert.doesNotMatch(JSON.stringify(runtimeSummary(userId)), /draft-secret-key/);
});

test("OpenAI-compatible endpoints are validated, stored, and used", async () => {
  const userId = addUser("custom-endpoint@example.com");
  const baseUrl = `http://127.0.0.1:${address.port}/custom/v1`;
  const draft = await validateModelConnection({
    name: "Private compatible model",
    providerTemplate: "openai",
    baseUrl,
    modelId: "private-model",
    apiKey: "private-secret-key-1234",
  });
  assert.equal(draft.status, "healthy");

  const connection = createModelConnection(userId, {
    name: "Private compatible model",
    providerTemplate: "openai",
    baseUrl,
    modelId: "private-model",
    apiKey: "private-secret-key-1234",
  });
  assert.equal(connection.baseUrl, baseUrl);
  const result = await invokeModel({
    userId,
    connectionId: connection.id,
    instruction: "Test",
    text: "Hello",
  });
  assert.equal(result.text, "ok:private-model");
  assert.doesNotMatch(JSON.stringify(runtimeSummary(userId)), /private-secret-key/);
});

test("OpenAI-compatible connections preserve a user supplied base URL and model", async () => {
  const userId = addUser("openai-compatible@example.com");
  const baseUrl = `http://127.0.0.1:${address.port}/deepseek-compatible`;
  const draft = await validateModelConnection({
    name: "My DeepSeek",
    providerTemplate: "openai",
    baseUrl,
    modelId: "deepseek-v4-flash",
    apiKey: "deepseek-user-key-1234",
  });
  assert.equal(draft.status, "healthy");

  const connection = createModelConnection(userId, {
    name: "My DeepSeek",
    providerTemplate: "openai",
    baseUrl,
    modelId: "deepseek-v4-flash",
    apiKey: "deepseek-user-key-1234",
  });
  assert.equal(connection.baseUrl, baseUrl);
  const result = await invokeModel({
    userId,
    connectionId: connection.id,
    instruction: "Test",
    text: "Hello",
  });
  assert.equal(result.text, "ok:deepseek-v4-flash");
});

test("Anthropic-compatible connections use the Anthropic request and response protocol", async () => {
  const userId = addUser("anthropic-compatible@example.com");
  const baseUrl = `${providerBaseUrl}/anthropic`;
  const draft = await validateModelConnection({
    name: "Anthropic-compatible model",
    providerTemplate: "anthropic",
    baseUrl,
    modelId: "deepseek-v4-flash",
    apiKey: "anthropic-user-key-1234",
  });
  assert.equal(draft.status, "healthy");
  const connection = createModelConnection(userId, {
    name: "Anthropic-compatible model",
    providerTemplate: "anthropic",
    baseUrl,
    modelId: "deepseek-v4-flash",
    apiKey: "anthropic-user-key-1234",
  });
  const result = await invokeModel({
    userId,
    connectionId: connection.id,
    instruction: "Test",
    text: "Hello",
  });
  assert.equal(result.text, "ok:deepseek-v4-flash");
  const request = observedRequests.at(-1);
  assert.equal(request.url, "/anthropic/v1/messages");
  assert.equal(request.apiKey, "anthropic-user-key-1234");
  assert.equal(request.anthropicVersion, "2023-06-01");
  assert.equal(request.authorization, null);
});

test("custom endpoint input rejects unsafe or malformed URLs before saving", async () => {
  await assert.rejects(
    async () => validateModelConnection({
      name: "Unsafe endpoint",
      providerTemplate: "openai",
      baseUrl: "file:///etc/passwd",
      modelId: "private-model",
      apiKey: "private-secret-key-1234",
    }),
    /INVALID_MODEL_ENDPOINT/,
  );
});

test("managed model remains the default when personal connections exist", async () => {
  const userId = addUser("managed-default@example.com");
  createModelConnection(userId, {
    name: "Personal model",
    providerTemplate: "openai",
    baseUrl: providerBaseUrl,
    modelId: "qwen-plus",
    apiKey: "personal-secret-key-1234",
    isDefault: true,
  });
  const result = await invokeModel({
    userId,
    instruction: "Test",
    text: "Hello",
  });
  assert.equal(result.route, "managed");
  assert.equal(result.text, "ok:internal-model-id");
});

test("admin platform model configuration is encrypted, redacted, tested, and used", async () => {
  const userId = addUser("platform-model@example.com");
  const saved = await savePlatformModelConfiguration("managed_runtime", {
    name: "OneShowModel",
    providerTemplate: "openai",
    baseUrl: `${providerBaseUrl}/v1`,
    modelId: "admin-managed-model",
    workspaceId: "ws-test-runtime",
    apiKey: "platform-secret-key-9876",
  }, userId);
  assert.equal(saved.source, "admin");
  assert.equal(saved.keyHint, "••••9876");
  assert.equal(saved.lastTestStatus, "healthy");
  assert.doesNotMatch(JSON.stringify(listPlatformModelConfigurations()), /platform-secret-key/);

  const stored = db.prepare("SELECT * FROM platform_model_configs WHERE purpose = 'managed_runtime'").get();
  assert.notEqual(stored.key_ciphertext, "platform-secret-key-9876");
  assert.equal(decryptCredential({ ...stored, id: stored.purpose, user_id: `platform:${stored.purpose}` }), "platform-secret-key-9876");

  const result = await invokeModel({ userId, instruction: "Test", text: "Hello" });
  assert.equal(result.text, "ok:admin-managed-model");
  assert.equal(observedRequests.at(-1).workspaceId, "ws-test-runtime");
});

test("OneShow Home uses its own encrypted platform route and records the invocation", async () => {
  const actorId = addUser("oneshow-home-model@example.com");
  const saved = await savePlatformModelConfiguration("oneshow_home_chat", {
    name: "OneShow Home Buddy",
    providerTemplate: "openai",
    baseUrl: `${providerBaseUrl}/v1`,
    modelId: "buddy-chat-model",
    apiKey: "buddy-secret-key-9876",
  }, actorId);
  assert.equal(saved.purpose, "oneshow_home_chat");
  assert.equal(saved.keyHint, "••••9876");

  const result = await invokePlatformModel({
    purpose: "oneshow_home_chat",
    service: "oneshow-home-api",
    instruction: "You are Milo.",
    messages: [{ role: "user", content: "Hello" }],
  });
  assert.equal(result.text, "ok:buddy-chat-model");
  assert.equal(result.modelId, "buddy-chat-model");
  const invocation = db.prepare("SELECT * FROM platform_model_invocations WHERE id = ?").get(result.invocationId);
  assert.equal(invocation.status, "completed");
  assert.equal(invocation.service, "oneshow-home-api");
});

test("each model-backed tool stores an owner-scoped model preference", () => {
  db.prepare("UPDATE tools SET active = 1 WHERE id IN ('tool_polish', 'tool_sitemap_checker', 'tool_compress')").run();
  const ownerId = addUser("tool-model-owner@example.com");
  const otherId = addUser("tool-model-other@example.com");
  const connection = createModelConnection(ownerId, {
    name: "Tool model",
    providerTemplate: "openai",
    baseUrl: providerBaseUrl,
    modelId: "qwen-plus",
    apiKey: "tool-secret-key-1234",
  });
  const preference = setToolModelPreference(ownerId, "tool_polish", connection.id);
  assert.equal(preference.modelConnectionId, connection.id);
  assert.equal(toolModelSelection(ownerId, "tool_polish"), connection.id);
  assert.equal(listToolModelPreferences(ownerId).tool_polish, connection.id);
  assert.equal(toolModelSelection(otherId, "tool_polish"), "managed");
  const seoPreference = setToolModelPreference(ownerId, "tool_sitemap_checker", connection.id);
  assert.equal(seoPreference.modelConnectionId, connection.id);
  assert.equal(toolModelSelection(ownerId, "tool_sitemap_checker"), connection.id);
  assert.deepEqual(toolModelCapability("builtin-seo"), {
    modelRequired: true,
    modelFamily: "text",
    userConfigurable: true,
  });
  assert.deepEqual(toolModelCapability("builtin-music"), {
    modelRequired: true,
    modelFamily: "music",
    userConfigurable: false,
  });
  assert.throws(
    () => setToolModelPreference(otherId, "tool_polish", connection.id),
    /MODEL_CONNECTION_NOT_FOUND/,
  );
  assert.throws(
    () => setToolModelPreference(ownerId, "tool_compress", connection.id),
    /TOOL_MODEL_NOT_CONFIGURABLE/,
  );
});

test("task refund settlement is idempotent", () => {
  const userId = addUser("refund@example.com");
  const taskId = randomUUID();
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO tasks (id, user_id, tool_id, status, input_json, credit_cost, created_at, updated_at)
    VALUES (?, ?, 'tool_polish', 'failed', '{}', 3, ?, ?)
  `).run(taskId, userId, timestamp, timestamp);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  refundTask(task);
  refundTask(task);
  const refunds = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
    FROM credit_ledger WHERE reference_type = 'task' AND reference_id = ? AND type = 'refund'
  `).get(taskId);
  assert.equal(refunds.count, 1);
  assert.equal(refunds.amount, 3);
});

test.after(() => new Promise((resolve) => provider.close(resolve)));
