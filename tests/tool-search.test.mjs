import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "oneshow-tool-search-"));
const { db } = await import("../server/database.mjs");
const { ensureDefaultToolSearchProfiles, intelligentToolSearch, saveToolSearchProfile, searchProfileForTool } = await import("../server/tool-search.mjs");
const tools = db.prepare(`SELECT id, slug, name_zh AS nameZh, name_en AS nameEn, description_zh AS descriptionZh,
  description_en AS descriptionEn, category FROM tools WHERE slug IN ('ai-music-studio','ai-outfit-changer','ai-fridge-recipe')`).all();

test("natural-language song intent ranks AI Music Studio first without model cost", async () => {
  let modelCalls = 0;
  const result = await intelligentToolSearch({ query: "我想生成一个歌", tools, allowModel: false, modelInvoker: async () => { modelCalls += 1; } });
  assert.equal(result.results[0].slug, "ai-music-studio");
  assert.equal(result.results[0].matchedBy, "intent");
  assert.match(result.results[0].reasonZh, /使用意图/);
  assert.equal(modelCalls, 0);
});

test("administrator search profile persists and is not reset by defaults", () => {
  const tool = tools.find((item) => item.slug === "ai-music-studio");
  saveToolSearchProfile(tool.id, { aliasesZh: ["做赛博朋克歌曲"], aliasesEn: [], exampleQueries: [], capabilities: ["音乐"], exclusions: [], searchPriority: 33, enabled: true }, null);
  ensureDefaultToolSearchProfiles();
  const saved = searchProfileForTool(tool.id);
  assert.deepEqual(saved.aliasesZh, ["做赛博朋克歌曲"]);
  assert.equal(saved.searchPriority, 33);
});

test("low-confidence submit can use model reranking but rejects unknown tools", async () => {
  const result = await intelligentToolSearch({ query: "完成我的特别创意", tools, allowModel: true, modelInvoker: async () => ({ text: JSON.stringify({ results: [
    { slug: "not-a-real-tool", confidence: 1, reasonZh: "错误候选" },
    { slug: "ai-outfit-changer", confidence: .82, reasonZh: "适合图片创意", reasonEn: "Suitable for visual creation" },
  ] }) }) });
  assert.equal(result.source, "model_rerank");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].slug, "ai-outfit-changer");
});

test("model outage degrades to deterministic search instead of breaking marketplace", async () => {
  const result = await intelligentToolSearch({ query: "换衣服", tools, allowModel: true, modelInvoker: async () => { throw new Error("offline"); } });
  assert.equal(result.results[0].slug, "ai-outfit-changer");
  assert.equal(result.source, "hybrid");
});
