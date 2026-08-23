import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-projects-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
const { db } = await import("../server/database.mjs");
const { hashToken } = await import("../server/security.mjs");
const { handleApi } = await import(`../server/api.mjs?projects=${Date.now()}`);
const userId = randomUUID(); const token = randomUUID(); const now = Date.now();
db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,'unused',1,?,?)")
  .run(userId, "Project user", `project-${userId}@example.com`, now, now);
db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)")
  .run(randomUUID(), userId, hashToken(token), now + 86400000, now, now);
const call = async (path, method = "GET", payload) => {
  const response = await handleApi(new Request(`http://localhost${path}`, { method, headers: { cookie: `ost_session=${token}`, "content-type": "application/json" }, ...(payload ? { body: JSON.stringify(payload) } : {}) }));
  return { response, json: await response.json() };
};

test("workspace projects have an independent CRUD lifecycle", async () => {
  const created = await call("/api/projects", "POST", { name: "新品发布", description: "集中整理任务和文件" });
  assert.equal(created.response.status, 201);
  assert.equal(created.json.project.status, "active");
  const id = created.json.project.id;
  const updated = await call(`/api/projects/${id}`, "PATCH", { status: "completed", name: "新品发布计划" });
  assert.equal(updated.json.project.status, "completed");
  assert.equal((await call("/api/projects")).json.projects[0].name, "新品发布计划");
  assert.equal((await call(`/api/projects/${id}`, "DELETE")).response.status, 200);
  assert.equal((await call("/api/projects")).json.projects.length, 0);
});

test("account preferences persist on the server and are validated", async () => {
  const saved = await call("/api/account/preferences", "PATCH", { timezone: "UTC", dateFormat: "DD/MM/YYYY", pageSize: "50", notifications: false, productUpdates: true });
  assert.equal(saved.response.status, 200);
  const loaded = await call("/api/account/preferences");
  assert.deepEqual(loaded.json.preferences, { timezone: "UTC", dateFormat: "DD/MM/YYYY", pageSize: "50", notifications: false, productUpdates: true });
});

test.after(async () => { db.close(); await rm(dataDirectory, { recursive: true, force: true }); });
