import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const testDataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-value-ranking-"));
process.env.DATA_DIR = testDataDirectory;
process.env.APP_URL = "http://localhost";
const { db } = await import(`../server/database.mjs?value-ranking=${Date.now()}`);

test.after(async () => { await rm(testDataDirectory, { recursive: true, force: true }); });

test("value ranking tool is seeded as a published free tool", () => {
  const tool = db.prepare("SELECT id, active, runtime_status, credit_cost, runtime_kind FROM tools WHERE slug = 'value-ranking-tool'").get();
  assert.deepEqual({ ...tool }, { id: "tool_value_ranking", active: 1, runtime_status: "ready", credit_cost: 0, runtime_kind: "builtin-value-ranking" });
  const version = db.prepare("SELECT lifecycle_state, visibility FROM tool_versions WHERE tool_id = ? ORDER BY version DESC LIMIT 1").get(tool.id);
  assert.deepEqual({ ...version }, { lifecycle_state: "published", visibility: "public" });
  const setting = JSON.parse(db.prepare("SELECT value_json FROM platform_settings WHERE key = 'tool_value_ranking_publication_v1'").get().value_json);
  assert.equal(setting.published, true);
});

test("value ranking uses a deterministic price-per-hour calculation", async () => {
  const source = await readFile(new URL("../src/ValueRankingTool.jsx", import.meta.url), "utf8");
  assert.match(source, /return total >= 0 && hours > 0 \? total \/ hours : null/);
  assert.match(source, /sort\(\(a, b\) => a\.hourly - b\.hourly\)/);
  assert.match(source, /总价 ÷ 可使用小时数/);
});

test("value ranking supports dozens of products, bulk import, recording, and export", async () => {
  const source = await readFile(new URL("../src/ValueRankingTool.jsx", import.meta.url), "utf8");
  for (const contract of ["slice(0, 100)", "批量导入", "录制演示", "下载榜单", "html2canvas", "presentationSpeed", "EyeSlash"]) assert.match(source, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("value ranking has a dedicated marketplace icon and route", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const icon = await readFile(new URL("../public/tool-icons-v2/value-ranking-tool.svg", import.meta.url), "utf8");
  assert.match(app, /value-ranking-tool\.svg/);
  assert.match(app, /tool\.slug === "value-ranking-tool"/);
  assert.match(icon, /<svg/);
});
