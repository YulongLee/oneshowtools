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
  assert.deepEqual(published, ["ai-music-studio", "ai-outfit-changer", "hang-la-tier-list-generator", "interview-assistant", "mbti-personality-test", "stock-pet"]);

  const storefront = await (await handleApi(request("/api/tools"))).json();
  assert.deepEqual(storefront.tools.map((tool) => tool.slug).sort(), published);

  const offlineCatalog = await handleApi(request("/api/writing/catalog"));
  assert.equal(offlineCatalog.status, 404);
  assert.equal((await offlineCatalog.json()).error.code, "TOOL_NOT_PUBLISHED");

  const musicStatus = await handleApi(request("/api/music/status"));
  assert.equal(musicStatus.status, 200);
  const musicStatusBody = await musicStatus.json();
  assert.equal(musicStatusBody.lyrics.slug, "lyrics-generator");
  assert.equal(typeof musicStatusBody.lyrics.creditCost, "number");
  assert.equal(published.includes("lyrics-generator"), false);
});

test("career marketplace entry opens the official independent interview product", async () => {
  const storefront = await (await handleApi(request("/api/tools"))).json();
  const tool = storefront.tools.find((item) => item.slug === "interview-assistant");
  assert.deepEqual(
    {
      category: tool?.category,
      runtimeKind: tool?.runtimeKind,
      runtimeStatus: tool?.runtimeStatus,
      runtimeUrl: tool?.runtimeUrl,
      creditCost: tool?.creditCost,
      featuredRank: tool?.featuredRank,
    },
    {
      category: "career",
      runtimeKind: "external-link",
      runtimeStatus: "ready",
      runtimeUrl: "https://mianshiwen.cn/",
      creditCost: 0,
      featuredRank: 6,
    },
  );
});

test("stock pet product page and checkout share the operator-managed tool price", async () => {
  db.prepare("UPDATE tools SET credit_cost = 2000 WHERE slug = 'stock-pet'").run();
  const timestamp = Date.now();
  const userId = "stock-price-user";
  db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, 'Stock price tester', ?, 'unused', 1, ?, ?)")
    .run(userId, "stock-price@example.test", timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES ('stock-price-grant', ?, 'grant', 2500, '测试积分', 'Test credits', 'test', ?, ?)")
    .run(userId, userId, timestamp);
  const { stockPetPrice, stockPetPublicProduct, unlockStockPet } = await import("../server/stock-pet.mjs");
  assert.equal(stockPetPrice(), 2000);
  assert.equal(stockPetPublicProduct().priceCredits, 2000);
  const license = unlockStockPet(userId);
  assert.equal(license.entitlement.creditCost, 2000);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id = ?").get(userId).balance, 500);
});

test("publication settings survive database reinitialization", async () => {
  db.prepare("UPDATE tools SET active = 1 WHERE slug = 'lyrics-generator'").run();
  const { initializeDatabase } = await import("../server/database.mjs");
  initializeDatabase();
  assert.equal(db.prepare("SELECT active FROM tools WHERE slug = 'lyrics-generator'").get().active, 1);
});

test("marketplace featured placement is ordered, public, and survives reinitialization", async () => {
  const configured = { toolSlugs: ["stock-pet", "ai-music-studio", "mbti-personality-test"] };
  db.prepare("UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'marketplace.featured_tools'")
    .run(JSON.stringify(configured), Date.now());

  const storefront = await (await handleApi(request("/api/tools"))).json();
  const featured = storefront.tools.filter((tool) => tool.featuredRank).sort((a, b) => a.featuredRank - b.featuredRank);
  assert.deepEqual(featured.map((tool) => tool.slug), configured.toolSlugs);

  const { initializeDatabase } = await import("../server/database.mjs");
  initializeDatabase();
  assert.deepEqual(
    JSON.parse(db.prepare("SELECT value_json FROM platform_settings WHERE key = 'marketplace.featured_tools'").get().value_json),
    configured,
  );
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
