import { db } from "./database.mjs";
import { invokePlatformModel } from "./model-gateway.mjs";

const DEFAULT_PROFILES = {
  "ai-music-studio": {
    aliasesZh: ["生成一个歌", "生成一首歌", "做一首歌", "写歌", "作曲", "编曲", "音乐生成", "歌曲生成", "配乐", "伴奏", "BGM", "唱歌"],
    aliasesEn: ["make a song", "create music", "song generator", "compose music", "background music"],
    examples: ["帮我生成一首旅行主题的歌", "给视频做一段配乐", "写歌词并生成歌曲"],
    capabilities: ["音乐", "歌曲", "歌词", "旋律", "音频", "作曲", "演唱"],
    priority: 12,
  },
  "ai-outfit-changer": {
    aliasesZh: ["换衣服", "换装", "试衣", "穿搭", "服装替换", "证件照换衣"], aliasesEn: ["change clothes", "virtual try on", "outfit changer"],
    examples: ["把照片里的衣服换成西装"], capabilities: ["图片", "人物", "服装", "换装"], priority: 8,
  },
  "ai-fridge-recipe": {
    aliasesZh: ["冰箱食谱", "看冰箱做菜", "食材识别", "推荐菜谱", "今晚吃什么"], aliasesEn: ["fridge recipe", "recipe from ingredients"],
    examples: ["根据冰箱里的食材推荐晚餐"], capabilities: ["食材", "食谱", "做菜", "冰箱"], priority: 7,
  },
  "food-nutrition-analyzer": {
    aliasesZh: ["食物热量", "卡路里", "营养分析", "拍照识别食物", "减脂饮食"], aliasesEn: ["food calories", "nutrition analyzer"],
    examples: ["这份饭有多少卡路里"], capabilities: ["食物", "热量", "营养", "蛋白质"], priority: 7,
  },
  "sliding-ancestor-generator": {
    aliasesZh: ["滑动变祖器", "人物进化", "十帧变化", "形态进化", "照片演化"], aliasesEn: ["character evolution", "ancestor slider"],
    examples: ["把一张人物照片生成十个进化形态"], capabilities: ["图片", "进化", "时间轴", "连续帧"], priority: 6,
  },
  "mbti-personality-test": {
    aliasesZh: ["MBTI", "性格测试", "人格测试", "十六型人格"], aliasesEn: ["mbti", "personality test", "16 personalities"],
    examples: ["测一下我的人格类型"], capabilities: ["测试", "性格", "人格", "报告"], priority: 5,
  },
  "ai-writer": {
    aliasesZh: ["写文章", "写文案", "小红书文案", "公众号文章", "润色", "改写"], aliasesEn: ["write article", "copywriting", "rewrite"],
    examples: ["帮我写一篇小红书文案"], capabilities: ["文字", "写作", "文案", "文章"], priority: 5,
  },
  "seo-workbench": {
    aliasesZh: ["SEO", "网站优化", "关键词分析", "搜索排名"], aliasesEn: ["seo audit", "keyword research", "search ranking"],
    examples: ["分析网站 SEO 问题"], capabilities: ["网站", "SEO", "关键词", "排名"], priority: 4,
  },
};

const jsonArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []; } catch { return []; }
};
const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase()
  .replace(/[，。！？、,.!?;；:：'"“”‘’()（）\[\]{}]/g, " ")
  .replace(/(?:请|麻烦|能不能|可以|我想|我要|帮我|给我|一下|一个|一种|这个|工具)/g, " ")
  .replace(/\s+/g, " ").trim();
const compact = (value) => normalize(value).replace(/\s/g, "");
const bigrams = (value) => {
  const text = compact(value); const set = new Set();
  if (text.length < 2) { if (text) set.add(text); return set; }
  for (let i = 0; i < text.length - 1; i += 1) set.add(text.slice(i, i + 2));
  return set;
};
const dice = (left, right) => {
  const a = bigrams(left); const b = bigrams(right); if (!a.size || !b.size) return 0;
  let overlap = 0; for (const token of a) if (b.has(token)) overlap += 1;
  return (2 * overlap) / (a.size + b.size);
};
const profilePayload = (row = {}) => ({
  aliasesZh: jsonArray(row.aliasesZh ?? row.aliases_zh_json), aliasesEn: jsonArray(row.aliasesEn ?? row.aliases_en_json),
  exampleQueries: jsonArray(row.exampleQueries ?? row.example_queries_json), capabilities: jsonArray(row.capabilities ?? row.capabilities_json),
  exclusions: jsonArray(row.exclusions ?? row.exclusions_json), searchPriority: Number(row.searchPriority ?? row.search_priority ?? 0),
  enabled: row.enabled === undefined ? true : Boolean(row.enabled),
});

export function ensureDefaultToolSearchProfiles() {
  const insert = db.prepare(`INSERT INTO tool_search_profiles
    (tool_id, aliases_zh_json, aliases_en_json, example_queries_json, capabilities_json, exclusions_json, search_priority, enabled, created_at, updated_at)
    SELECT id, ?, ?, ?, ?, '[]', ?, 1, ?, ? FROM tools WHERE slug = ?
    ON CONFLICT(tool_id) DO NOTHING`);
  const timestamp = Date.now();
  for (const [slug, item] of Object.entries(DEFAULT_PROFILES)) insert.run(JSON.stringify(item.aliasesZh || []), JSON.stringify(item.aliasesEn || []), JSON.stringify(item.examples || []), JSON.stringify(item.capabilities || []), Number(item.priority || 0), timestamp, timestamp, slug);
}

export function searchProfileForTool(toolId) {
  const row = db.prepare(`SELECT aliases_zh_json, aliases_en_json, example_queries_json, capabilities_json,
    exclusions_json, search_priority, enabled, updated_at AS updatedAt FROM tool_search_profiles WHERE tool_id = ?`).get(toolId);
  return profilePayload(row || {});
}

export function saveToolSearchProfile(toolId, draft, actorId) {
  const profile = profilePayload(draft); const timestamp = Date.now();
  db.prepare(`INSERT INTO tool_search_profiles
    (tool_id, aliases_zh_json, aliases_en_json, example_queries_json, capabilities_json, exclusions_json, search_priority, enabled, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tool_id) DO UPDATE SET aliases_zh_json=excluded.aliases_zh_json, aliases_en_json=excluded.aliases_en_json,
      example_queries_json=excluded.example_queries_json, capabilities_json=excluded.capabilities_json,
      exclusions_json=excluded.exclusions_json, search_priority=excluded.search_priority, enabled=excluded.enabled,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .run(toolId, JSON.stringify(profile.aliasesZh), JSON.stringify(profile.aliasesEn), JSON.stringify(profile.exampleQueries), JSON.stringify(profile.capabilities), JSON.stringify(profile.exclusions), Math.max(-100, Math.min(100, profile.searchPriority)), profile.enabled ? 1 : 0, actorId || null, timestamp, timestamp);
  return searchProfileForTool(toolId);
}

function deterministicSearch(query, tools) {
  const normalized = normalize(query); const compactQuery = compact(query);
  if (!normalized) return [];
  const rows = db.prepare("SELECT * FROM tool_search_profiles WHERE enabled = 1").all();
  const profiles = new Map(rows.map((row) => [row.tool_id, profilePayload(row)]));
  return tools.map((tool) => {
    const profile = profiles.get(tool.id) || profilePayload();
    const aliases = [...profile.aliasesZh, ...profile.aliasesEn];
    const names = [tool.nameZh, tool.nameEn, tool.slug];
    const examples = profile.exampleQueries; const capabilities = profile.capabilities;
    if (profile.exclusions.some((term) => compactQuery.includes(compact(term)))) return null;
    let score = profile.searchPriority; let matchedBy = "semantic"; let matchedTerm = "";
    for (const value of names) {
      const candidate = compact(value); if (!candidate) continue;
      if (candidate === compactQuery) { score += 120; matchedBy = "name"; matchedTerm = value; }
      else if (candidate.includes(compactQuery) || compactQuery.includes(candidate)) { score += 72; matchedBy = "name"; matchedTerm = value; }
      score += dice(normalized, value) * 34;
    }
    for (const value of aliases) {
      const candidate = compact(value); if (!candidate) continue;
      if (candidate === compactQuery) { score += 135; matchedBy = "intent"; matchedTerm = value; }
      else if (candidate.includes(compactQuery) || compactQuery.includes(candidate)) { score += 88; matchedBy = "intent"; matchedTerm = value; }
      score += dice(normalized, value) * 28;
    }
    for (const value of capabilities) {
      const candidate = compact(value); if (candidate && compactQuery.includes(candidate)) { score += 38; matchedBy = "capability"; matchedTerm ||= value; }
    }
    for (const value of examples) score += dice(normalized, value) * 22;
    const description = `${tool.descriptionZh || ""} ${tool.descriptionEn || ""}`;
    if (compact(description).includes(compactQuery)) score += 32;
    score += dice(normalized, description) * 12;
    if (score < 14) return null;
    const reasonZh = matchedBy === "intent" ? `最符合“${matchedTerm}”的使用意图` : matchedBy === "capability" ? `具备你需要的“${matchedTerm}”能力` : matchedBy === "name" ? "工具名称与需求直接匹配" : "功能描述与你的需求相近";
    const reasonEn = matchedBy === "intent" ? `Best match for the “${matchedTerm}” intent` : matchedBy === "capability" ? `Supports the “${matchedTerm}” capability` : matchedBy === "name" ? "The tool name directly matches your request" : "Its capabilities are relevant to your request";
    return { slug: tool.slug, score: Math.round(score * 10) / 10, confidence: Math.min(.99, Math.max(.2, score / 145)), matchedBy, reasonZh, reasonEn };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
}

function parseModelJson(text) {
  const source = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(source); } catch { const match = source.match(/\{[\s\S]*\}/); if (!match) return null; try { return JSON.parse(match[0]); } catch { return null; } }
}

export async function intelligentToolSearch({ query, tools, allowModel = false, modelInvoker = invokePlatformModel }) {
  ensureDefaultToolSearchProfiles();
  const deterministic = deterministicSearch(query, tools);
  const top = deterministic[0];
  if (!allowModel || (top?.confidence >= .72 && (deterministic[1]?.score || 0) < top.score * .86)) return { results: deterministic, source: "hybrid", fallbackUsed: false };
  try {
    const candidates = tools.map((tool) => ({ slug: tool.slug, name: tool.nameZh, description: tool.descriptionZh, category: tool.category }));
    const response = await modelInvoker({ purpose: "managed_runtime", service: "marketplace_tool_router", timeoutMs: 6000,
      instruction: "你是工具路由器。只能从候选工具选择，返回严格 JSON：{\"results\":[{\"slug\":\"...\",\"confidence\":0到1,\"reasonZh\":\"一句话\",\"reasonEn\":\"one sentence\"}]}。最多5项，不要Markdown。",
      messages: [{ role: "user", content: `用户需求：${String(query).slice(0, 300)}\n候选工具：${JSON.stringify(candidates)}` }],
    });
    const parsed = parseModelJson(response?.text); const allowed = new Set(tools.map((tool) => tool.slug));
    const modelResults = Array.isArray(parsed?.results) ? parsed.results.filter((item) => allowed.has(item?.slug)).slice(0, 5).map((item, index) => ({ slug: item.slug, score: 100 - index, confidence: Math.max(0, Math.min(1, Number(item.confidence || .5))), matchedBy: "model", reasonZh: String(item.reasonZh || "AI 根据需求语义为你推荐"), reasonEn: String(item.reasonEn || "Recommended by semantic intent") })) : [];
    if (modelResults.length) return { results: modelResults, source: "model_rerank", fallbackUsed: true };
  } catch { /* A model outage must never break marketplace search. */ }
  return { results: deterministic, source: "hybrid", fallbackUsed: false };
}

ensureDefaultToolSearchProfiles();
