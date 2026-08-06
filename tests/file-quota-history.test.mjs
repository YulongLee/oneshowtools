import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-file-quota-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";

const { db } = await import("../server/database.mjs");
const { hashToken } = await import("../server/security.mjs");
const { handleApi } = await import(`../server/api.mjs?quota=${Date.now()}`);
const { assertUserFileCapacity, userFileQuota } = await import(`../server/file-quota.mjs?quota=${Date.now()}`);

const userId = randomUUID();
const token = randomUUID();
const timestamp = Date.now();
db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, 'Quota user', ?, 'unused', 1, ?, ?)")
  .run(userId, `quota-${userId}@example.com`, timestamp, timestamp);
db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)")
  .run(randomUUID(), userId, hashToken(token), timestamp + 86400000, timestamp, timestamp);

const authenticated = (path, options = {}) => new Request(`http://localhost${path}`, {
  ...options,
  headers: { cookie: `ost_session=${token}`, ...(options.headers || {}) },
});

test("completed tool history exposes its owner-scoped result file", async () => {
  const taskId = randomUUID();
  const fileId = randomUUID();
  const tool = db.prepare("SELECT id FROM tools WHERE slug = 'ai-outfit-changer'").get();
  db.prepare("INSERT INTO tasks (id, user_id, tool_id, status, input_json, output_json, credit_cost, created_at, updated_at, completed_at) VALUES (?, ?, ?, 'completed', ?, ?, 30, ?, ?, ?)")
    .run(taskId, userId, tool.id, JSON.stringify({ outfitMode: "reference" }), JSON.stringify({ mode: "ai", resultFileId: fileId }), timestamp, timestamp, timestamp);
  db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, 'outfit.png', ?, 'image/png', 321, ?)")
    .run(fileId, userId, `quota/${fileId}.png`, timestamp);
  db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(taskId, fileId);

  const response = await handleApi(authenticated("/api/tasks"));
  assert.equal(response.status, 200);
  const history = (await response.json()).tasks.find((item) => item.id === taskId);
  assert.equal(history.input.outfitMode, "reference");
  assert.equal(history.file.id, fileId);
  assert.equal(history.file.downloadUrl, `/api/files/${fileId}/download`);
});

test("every account is capped at 100 retained files", async () => {
  const insert = db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, 'text/plain', 1, ?)");
  for (let index = 1; index < 100; index += 1) {
    const id = randomUUID();
    insert.run(id, userId, `file-${index}.txt`, `quota/${id}.txt`, timestamp + index);
  }
  assert.deepEqual(userFileQuota(userId), { used: 100, limit: 100, remaining: 0 });
  assert.throws(() => assertUserFileCapacity(userId), (error) => error.code === "USER_FILE_LIMIT_REACHED" && error.status === 409);
  assert.throws(() => insert.run(randomUUID(), userId, "overflow.txt", "quota/overflow.txt", timestamp + 101), /USER_FILE_LIMIT_REACHED/);

  const listResponse = await handleApi(authenticated("/api/files"));
  const list = await listResponse.json();
  assert.deepEqual(list.quota, { used: 100, limit: 100, remaining: 0 });

  const form = new FormData();
  form.append("file", new File(["blocked"], "blocked.txt", { type: "text/plain" }));
  const uploadResponse = await handleApi(authenticated("/api/files", { method: "POST", body: form }));
  assert.equal(uploadResponse.status, 409);
  assert.equal((await uploadResponse.json()).error.code, "USER_FILE_LIMIT_REACHED");
});

test.after(async () => {
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
