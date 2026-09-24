import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const testDataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-kill-line-"));
process.env.DATA_DIR = testDataDirectory;
process.env.APP_URL = "http://localhost";
const { db } = await import(`../server/database.mjs?kill-line=${Date.now()}`);

test.after(async () => { await rm(testDataDirectory, { recursive: true, force: true }); });

test("product kill line is seeded as an administrator-only testing tool", () => {
  const tool = db.prepare("SELECT id, active, runtime_status, credit_cost, runtime_kind FROM tools WHERE slug = 'product-kill-line-analyzer'").get();
  assert.deepEqual({ ...tool }, { id: "tool_product_kill_line", active: 0, runtime_status: "ready", credit_cost: 0, runtime_kind: "builtin-kill-line" });
  const version = db.prepare("SELECT lifecycle_state, visibility FROM tool_versions WHERE tool_id = ? ORDER BY version DESC LIMIT 1").get(tool.id);
  assert.deepEqual({ ...version }, { lifecycle_state: "testing", visibility: "private" });
  const setting = JSON.parse(db.prepare("SELECT value_json FROM platform_settings WHERE key = 'tool_product_kill_line_testing_v1'").get().value_json);
  assert.equal(setting.adminOnly, true);
});

test("kill line workspace contains the commercial P0 analysis flow", async () => {
  const source = await readFile(new URL("../src/KillLineAnalyzer.jsx", import.meta.url), "utf8");
  for (const contract of ["AI 面试助手", "linear", "log", "manual", "formula", "功能评分", "演示模式", "聚焦", "导出高清 PNG", "导出可编辑 SVG", "示例数据，仅用于功能演示"]) assert.match(source, new RegExp(contract));
  assert.match(source, /demoProducts[\s\S]*OfferBiye/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY/);
});

test("products can be hidden from the curve without deleting their data", async () => {
  const source = await readFile(new URL("../src/KillLineAnalyzer.jsx", import.meta.url), "utf8");
  assert.match(source, /visible:\s*true/);
  assert.match(source, /filter\(\(product\) => product\.visible !== false\)/);
  assert.match(source, /从图表隐藏/);
  assert.match(source, /显示到图表/);
  assert.match(source, /EyeSlash/);
});

test("nearby product markers are spread apart and retain their true-coordinate anchors", async () => {
  const source = await readFile(new URL("../src/KillLineAnalyzer.jsx", import.meta.url), "utf8");
  assert.match(source, /function spreadChartPoints/);
  assert.match(source, /minDistance = 76/);
  assert.match(source, /kill-point-leader/);
  assert.match(source, /kill-point-anchor/);
});

test("kill line uses its dedicated marketplace icon", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const icon = await readFile(new URL("../public/tool-icons-v2/product-kill-line-analyzer-v1.png", import.meta.url));
  assert.match(appSource, /product-kill-line-analyzer-v1\.png/);
  assert.equal(icon.subarray(1, 4).toString(), "PNG");
  assert.ok(icon.length > 10_000);
});
