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
  assert.deepEqual(published, ["ai-music-studio", "ai-outfit-changer", "hang-la-tier-list-generator", "interview-assistant", "mbti-personality-test", "stock-pet", "word-immersion"]);

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

test("word immersion is publicly listed and still requires login for private reading data", async () => {
  const storefront = await (await handleApi(request("/api/tools"))).json();
  const wordIn = storefront.tools.find((tool) => tool.slug === "word-immersion");
  assert.equal(wordIn.publicationState, "published");
  assert.equal(wordIn.lifecycleState, "published");
  const response = await handleApi(request("/api/word-immersion/documents"));
  assert.equal(response.status, 401);
});

test("ordinary members can access WordIn and later administrator changes survive restart", async () => {
  const { hashToken } = await import("../server/security.mjs");
  const stamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES ('wordin-member','Member','wordin-member@example.test','unused',1,?,?)").run(stamp, stamp);
  db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES ('wordin-session','wordin-member',?,?,?,?)").run(hashToken("wordin-test-session"), stamp + 60000, stamp, stamp);
  const memberRequest = () => request("/api/word-immersion/documents", { headers: { cookie: "ost_session=wordin-test-session" } });
  assert.equal((await handleApi(memberRequest())).status, 200);
  db.prepare("UPDATE tools SET active=0 WHERE slug='word-immersion'").run();
  const { initializeDatabase } = await import("../server/database.mjs");
  initializeDatabase();
  assert.equal(db.prepare("SELECT active FROM tools WHERE slug='word-immersion'").get().active, 0);
  assert.equal((await handleApi(memberRequest())).status, 404);
  db.prepare("UPDATE tools SET active=1 WHERE slug='word-immersion'").run();
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
