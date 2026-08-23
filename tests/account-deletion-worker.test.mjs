import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-deletion-"));
process.env.DATA_DIR = dataDirectory;
process.env.OBJECT_STORAGE_PROVIDER = "local";
const { db } = await import("../server/database.mjs");
const { processDueAccountDeletions } = await import(`../server/jobs.mjs?deletion=${Date.now()}`);

test("due account deletion removes the account and all database-owned data", async () => {
  const userId = randomUUID(); const now = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,'unused',1,?,?)")
    .run(userId, "Delete me", `delete-${userId}@example.com`, now, now);
  db.prepare("INSERT INTO deletion_requests (id,user_id,status,execute_after,created_at) VALUES (?,?,'pending',?,?)")
    .run(randomUUID(), userId, now - 1, now - 1000);
  assert.equal(await processDueAccountDeletions(), 1);
  assert.equal(db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId), undefined);
});

test.after(async () => { db.close(); await rm(dataDirectory, { recursive: true, force: true }); });
