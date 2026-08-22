import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-favorites-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";

const { db } = await import("../server/database.mjs");
const { hashToken } = await import("../server/security.mjs");
const { handleApi } = await import(`../server/api.mjs?favorites=${Date.now()}`);

const userId = randomUUID();
const otherUserId = randomUUID();
const token = randomUUID();
const timestamp = Date.now();
const insertUser = db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,'unused',1,?,?)");
insertUser.run(userId, "Favorite user", `favorite-${userId}@example.com`, timestamp, timestamp);
insertUser.run(otherUserId, "Other user", `other-${otherUserId}@example.com`, timestamp, timestamp);
db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)")
  .run(randomUUID(), userId, hashToken(token), timestamp + 86400000, timestamp, timestamp);

const authenticated = (path, options = {}) => new Request(`http://localhost${path}`, {
  ...options,
  headers: { cookie: `ost_session=${token}`, "content-type": "application/json", ...(options.headers || {}) },
});
const requestJson = async (path, method = "GET", payload) => {
  const response = await handleApi(authenticated(path, { method, ...(payload ? { body: JSON.stringify(payload) } : {}) }));
  return { response, json: await response.json() };
};

test("favorites library stores tools, prompts, files and collections per account", async () => {
  const tool = db.prepare("SELECT id FROM tools WHERE active = 1 LIMIT 1").get();
  assert.ok(tool?.id);
  const fileId = randomUUID();
  db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(fileId, userId, "result.png", `favorites/${fileId}.png`, "image/png", 10, timestamp);
  const taskId = randomUUID();
  db.prepare("INSERT INTO tasks (id,user_id,tool_id,status,input_json,credit_cost,created_at,updated_at) VALUES (?,?,?,'completed',?,0,?,?)")
    .run(taskId, userId, tool.id, JSON.stringify({ prompt: "商业海报提示词" }), timestamp, timestamp);

  for (const [itemType, itemId] of [["tool", tool.id], ["prompt", taskId], ["material", fileId]]) {
    const { response } = await requestJson("/api/favorites", "POST", { itemType, itemId });
    assert.equal(response.status, 201);
  }
  const created = await requestJson("/api/favorite-collections", "POST", { name: "创作素材" });
  assert.equal(created.response.status, 201);
  const folder = created.json.collections.find((item) => item.name === "创作素材");
  const material = created.json.favorites.find((item) => item.itemType === "material");
  assert.ok(folder?.id);
  const moved = await requestJson(`/api/favorites/${material.id}`, "PATCH", { collectionId: folder.id });
  assert.equal(moved.json.favorites.find((item) => item.id === material.id).collectionId, folder.id);
  assert.deepEqual(moved.json.counts, { tool: 1, file: 0, prompt: 1, material: 1 });

  const missing = await requestJson("/api/favorites", "POST", { itemType: "file", itemId: randomUUID() });
  assert.equal(missing.response.status, 404);
  const removed = await requestJson(`/api/favorites/${material.id}`, "DELETE");
  assert.equal(removed.response.status, 200);
  assert.equal(removed.json.counts.material, 0);
});

test.after(async () => {
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
