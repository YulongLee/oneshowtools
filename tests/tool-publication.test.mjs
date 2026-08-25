import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const testDataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-publication-"));
process.env.DATA_DIR = testDataDirectory;
process.env.APP_URL = "http://localhost";
const { handleApi } = await import(`../server/api.mjs?publication=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const request = (path, options = {}) => new Request(`http://localhost${path}`, options);

test("new installations publish the approved launch tools", async () => {
  const published = db.prepare("SELECT slug FROM tools WHERE active = 1 ORDER BY slug").all().map((tool) => tool.slug);
  assert.deepEqual(published, ["ai-music-studio", "ai-outfit-changer", "hang-la-tier-list-generator", "mbti-personality-test"]);

  const storefront = await (await handleApi(request("/api/tools"))).json();
  assert.deepEqual(storefront.tools.map((tool) => tool.slug).sort(), published);

  const offlineCatalog = await handleApi(request("/api/writing/catalog"));
  assert.equal(offlineCatalog.status, 404);
  assert.equal((await offlineCatalog.json()).error.code, "TOOL_NOT_PUBLISHED");

  const musicStatus = await handleApi(request("/api/music/status"));
  assert.equal(musicStatus.status, 200);
});

test("publication settings survive database reinitialization", async () => {
  db.prepare("UPDATE tools SET active = 1 WHERE slug = 'lyrics-generator'").run();
  const { initializeDatabase } = await import("../server/database.mjs");
  initializeDatabase();
  assert.equal(db.prepare("SELECT active FROM tools WHERE slug = 'lyrics-generator'").get().active, 1);
});

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});
