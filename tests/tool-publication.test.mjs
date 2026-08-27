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
  assert.deepEqual(published, ["ai-music-studio", "ai-outfit-changer", "hang-la-tier-list-generator", "mbti-personality-test", "stock-pet"]);

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

test("operator-managed tool and billing settings survive database reinitialization", async () => {
  db.prepare(`
    UPDATE tools SET name_zh = ?, name_en = ?, description_zh = ?, description_en = ?,
      category = ?, icon = ?, credit_cost = ?, active = ? WHERE slug = 'stock-pet'
  `).run(
    "运营名称", "Operator name", "运营简介", "Operator description",
    "startup", "OperatorIcon", 2345, 0,
  );
  db.prepare(`
    UPDATE plans SET name_zh = ?, name_en = ?, amount_minor = ?, recurring_credits = ?,
      file_limit = ?, active = ? WHERE code = 'pro-monthly'
  `).run("运营套餐", "Operator plan", 4567, 9876, 765, 0);

  const { initializeDatabase } = await import("../server/database.mjs");
  initializeDatabase();

  assert.deepEqual(
    { ...db.prepare(`
      SELECT name_zh, name_en, description_zh, description_en, category, icon, credit_cost, active
      FROM tools WHERE slug = 'stock-pet'
    `).get() },
    {
      name_zh: "运营名称", name_en: "Operator name", description_zh: "运营简介",
      description_en: "Operator description", category: "startup", icon: "OperatorIcon",
      credit_cost: 2345, active: 0,
    },
  );
  assert.deepEqual(
    { ...db.prepare(`
      SELECT name_zh, name_en, amount_minor, recurring_credits, file_limit, active
      FROM plans WHERE code = 'pro-monthly'
    `).get() },
    {
      name_zh: "运营套餐", name_en: "Operator plan", amount_minor: 4567,
      recurring_credits: 9876, file_limit: 765, active: 0,
    },
  );
});

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});
