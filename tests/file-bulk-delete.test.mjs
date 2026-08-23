import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-file-bulk-delete-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";

const { db } = await import("../server/database.mjs");
const { hashToken } = await import("../server/security.mjs");
const { handleApi } = await import(`../server/api.mjs?bulk-delete=${Date.now()}`);

const userId = randomUUID();
const otherUserId = randomUUID();
const token = randomUUID();
const timestamp = Date.now();
const insertUser = db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, 'unused', 1, ?, ?)");
insertUser.run(userId, "Bulk delete user", `bulk-${userId}@example.com`, timestamp, timestamp);
insertUser.run(otherUserId, "Other user", `other-${otherUserId}@example.com`, timestamp, timestamp);
db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)")
  .run(randomUUID(), userId, hashToken(token), timestamp + 86400000, timestamp, timestamp);

const authenticated = (path, options = {}) => new Request(`http://localhost${path}`, {
  ...options,
  headers: { cookie: `ost_session=${token}`, "content-type": "application/json", ...(options.headers || {}) },
});

test("bulk deletion removes only selected files owned by the current account", async () => {
  const ownedIds = [randomUUID(), randomUUID(), randomUUID()];
  const otherId = randomUUID();
  const insert = db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, 'text/plain', 1, ?)");
  ownedIds.forEach((id, index) => insert.run(id, userId, `owned-${index}.txt`, `bulk/${id}.txt`, timestamp + index));
  insert.run(otherId, otherUserId, "other.txt", `bulk/${otherId}.txt`, timestamp);

  const response = await handleApi(authenticated("/api/files/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids: [ownedIds[0], ownedIds[1], ownedIds[1], otherId] }),
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(new Set(result.deletedIds), new Set(ownedIds.slice(0, 2)));
  assert.deepEqual(result.failedIds, []);
  assert.equal(result.skippedCount, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(userId).count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM files WHERE id = ? AND user_id = ?").get(otherId, otherUserId).count, 1);
});

test("bulk deletion rejects malformed or excessive selections", async () => {
  const malformed = await handleApi(authenticated("/api/files/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids: ["not-a-file-id"] }),
  }));
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_FILE_SELECTION");

  const excessive = await handleApi(authenticated("/api/files/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids: Array.from({ length: 101 }, () => randomUUID()) }),
  }));
  assert.equal(excessive.status, 400);
});

test("file deletion also removes its polymorphic favorite without affecting the account", async () => {
  const fileId = randomUUID();
  const favoriteId = randomUUID();
  db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, 'text/plain', 1, ?)")
    .run(fileId, userId, "favorite.txt", `bulk/${fileId}.txt`, timestamp);
  db.prepare("INSERT INTO user_favorites (id,user_id,item_type,item_id,collection_id,created_at,updated_at) VALUES (?,?,\'file\',?,NULL,?,?)")
    .run(favoriteId, userId, fileId, timestamp, timestamp);

  const response = await handleApi(authenticated(`/api/files/${fileId}`, { method: "DELETE" }));
  assert.equal(response.status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM files WHERE id = ?").get(fileId).count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM user_favorites WHERE id = ?").get(favoriteId).count, 0);
});

test.after(async () => {
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
