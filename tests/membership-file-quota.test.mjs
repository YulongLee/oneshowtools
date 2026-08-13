import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-membership-quota-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.ADMIN_MFA_ENFORCED = "false";

const { db } = await import("../server/database.mjs");
const { effectiveMembership } = await import("../server/membership.mjs");
const { assertUserFileCapacity, userFileQuota } = await import("../server/file-quota.mjs");

const timestamp = Date.now();
const userId = randomUUID();
db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, 'Quota user', ?, 'unused', 1, ?, ?)")
  .run(userId, `quota-${userId}@example.com`, timestamp, timestamp);

test("membership controls the enforced per-user file quota", () => {
  assert.equal(effectiveMembership(userId).code, "free");
  assert.equal(userFileQuota(userId).limit, 100);

  db.prepare(`
    INSERT INTO user_membership_overrides
      (user_id, plan_id, status, expires_at, assigned_by, reason, created_at, updated_at)
    VALUES (?, 'plan_pro', 'active', ?, NULL, 'commercial upgrade', ?, ?)
  `).run(userId, timestamp + 86400000, timestamp, timestamp);
  assert.equal(effectiveMembership(userId).code, "pro-monthly");
  assert.equal(userFileQuota(userId).limit, 500);
  assert.doesNotThrow(() => assertUserFileCapacity(userId, 500));
});

test("database insert guard applies the active membership quota", () => {
  const insert = db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, 'text/plain', 1, ?)");
  for (let index = 0; index < 500; index += 1) insert.run(randomUUID(), userId, `${index}.txt`, `${randomUUID()}.txt`, timestamp);
  assert.throws(() => insert.run(randomUUID(), userId, "overflow.txt", `${randomUUID()}.txt`, timestamp), /USER_FILE_LIMIT_REACHED/);
});

test("expired admin membership falls back to the free quota", () => {
  db.prepare("DELETE FROM files WHERE user_id = ?").run(userId);
  db.prepare("UPDATE user_membership_overrides SET expires_at = ? WHERE user_id = ?").run(timestamp - 1, userId);
  assert.equal(effectiveMembership(userId).code, "free");
  assert.equal(userFileQuota(userId).limit, 100);
});

test.after(async () => {
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
