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

const provider = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const payload = JSON.parse(raw);
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({
    choices: [{ message: { content: `ok:${payload.model}` }, finish_reason: "stop" }],
    usage: { prompt_tokens: 4, completion_tokens: 2 },
  }));
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const address = provider.address();
process.env.ONESHOW_MODEL_API_KEY = "managed-secret-key";
process.env.ONESHOW_MODEL_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
process.env.ONESHOW_MODEL_ID = "internal-model-id";
process.env.DASHSCOPE_COMPATIBLE_BASE_URL = `http://127.0.0.1:${address.port}/v1`;

const {
  createModelConnection,
  decryptCredential,
  invokeModel,
  listModelConnections,
  listToolModelPreferences,
  runtimeSummary,
  setToolModelPreference,
  toolModelSelection,
  updateModelConnection,
  validateModelConnection,
} = await import("../server/model-gateway.mjs");
const { db } = await import("../server/database.mjs");
const { refundTask } = await import("../server/runtime.mjs");

function addUser(email) {
  const id = randomUUID();
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at)
    VALUES (?, 'Runtime tester', ?, 'unused', 1, ?, ?)
  `).run(id, email, timestamp, timestamp);
  return id;
}

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
});

test("customer credentials are encrypted, masked, owner-scoped, and tamper evident", () => {
  const ownerId = addUser("owner@example.com");
  const otherId = addUser("other@example.com");
  const connection = createModelConnection(ownerId, {
    name: "My model",
    providerTemplate: "dashscope",
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
    providerTemplate: "dashscope",
    modelId: "qwen-plus",
    apiKey: "draft-secret-key-1234",
  });
  assert.equal(result.status, "healthy");
  assert.equal(listModelConnections(userId).length, 0);
  assert.doesNotMatch(JSON.stringify(runtimeSummary(userId)), /draft-secret-key/);
});

test("managed model remains the default when personal connections exist", async () => {
  const userId = addUser("managed-default@example.com");
  createModelConnection(userId, {
    name: "Personal model",
    providerTemplate: "dashscope",
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

test("each model-backed tool stores an owner-scoped model preference", () => {
  const ownerId = addUser("tool-model-owner@example.com");
  const otherId = addUser("tool-model-other@example.com");
  const connection = createModelConnection(ownerId, {
    name: "Tool model",
    providerTemplate: "dashscope",
    modelId: "qwen-plus",
    apiKey: "tool-secret-key-1234",
  });
  const preference = setToolModelPreference(ownerId, "tool_polish", connection.id);
  assert.equal(preference.modelConnectionId, connection.id);
  assert.equal(toolModelSelection(ownerId, "tool_polish"), connection.id);
  assert.equal(listToolModelPreferences(ownerId).tool_polish, connection.id);
  assert.equal(toolModelSelection(otherId, "tool_polish"), "managed");
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
