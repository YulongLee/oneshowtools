import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { db, initializeDatabase } from "../server/database.mjs";
import { FORTUNE_CAT_PRICE, fortuneCatPrice, fortuneCatPublicProduct } from "../server/fortune-cat.mjs";
import { fortuneCatReleaseObject } from "../server/object-storage.mjs";

initializeDatabase();

test("fortune cat is seeded as an administrator-only testing product", () => {
  const tool = db.prepare("SELECT slug, credit_cost AS creditCost, active, runtime_kind AS runtimeKind FROM tools WHERE slug = 'fortune-cat'").get();
  const version = db.prepare("SELECT lifecycle_state AS lifecycleState, visibility FROM tool_versions WHERE tool_id = 'tool_fortune_cat' ORDER BY version DESC LIMIT 1").get();
  assert.deepEqual({ ...tool }, { slug: "fortune-cat", creditCost: 1000, active: 0, runtimeKind: "desktop-product" });
  assert.deepEqual({ ...version }, { lifecycleState: "testing", visibility: "private" });
});

test("fortune cat checkout and product page share the 1000-credit lifetime price", () => {
  db.prepare("UPDATE tools SET credit_cost = ? WHERE slug = 'fortune-cat'").run(FORTUNE_CAT_PRICE);
  assert.equal(fortuneCatPrice(), 1000);
  const product = fortuneCatPublicProduct();
  assert.equal(product.priceCredits, 1000);
  assert.equal(product.entitlement, "lifetime");
  assert.equal(product.privacy, "salary-local-only");
});

test("fortune cat release objects use private product-specific paths", () => {
  assert.deepEqual(fortuneCatReleaseObject("windows", "0.1.0-test", { OSS_PREFIX: "oneshowtools" }), {
    platform: "windows", version: "0.1.0-test", fileName: "zhaocai-gungun-0.1.0-test-windows-setup.exe",
    mimeType: "application/vnd.microsoft.portable-executable", objectKey: "oneshowtools/releases/fortune-cat/0.1.0-test/zhaocai-gungun-0.1.0-test-windows-setup.exe",
  });
  assert.throws(() => fortuneCatReleaseObject("ios"), /DOWNLOAD_PLATFORM_INVALID/);
});

test("fortune cat desktop source keeps salary local and exposes working controls", async () => {
  const [main, renderer, asset] = await Promise.all([
    readFile(new URL("../apps/fortune-cat/src/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/fortune-cat/src/renderer.tsx", import.meta.url), "utf8"),
    stat(new URL("../apps/fortune-cat/public/zhaocai-gungun-desktop.png", import.meta.url)),
  ]);
  assert.match(main, /salary-config\.bin/);
  assert.match(main, /safeStorage/);
  assert.match(main, /backgroundColor:\s*"#00000000"/);
  assert.doesNotMatch(main, /api\([^\n]*monthlySalary/);
  assert.doesNotMatch(main, /body:\s*\{[^}]*monthlySalary/s);
  assert.match(renderer, /今日已赚/);
  assert.match(renderer, /保存并应用/);
  assert.match(renderer, /摸摸招财滚滚/);
  assert.match(renderer, /fortune-burst/);
  assert.match(renderer, /document\.body\.classList\.add/);
  assert.ok(asset.size > 100_000);
});
