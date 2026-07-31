import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "oneshow-market-intelligence-"));
process.env.MARKET_INTELLIGENCE_MODEL = "kimi/kimi-k3";
const {
  askMarketIntelligence, generateMarketIntelligenceReport, getMarketIntelligenceConversation, getMarketIntelligenceReport,
  listMarketIntelligenceReports, marketIntelligenceStatus, shouldRunDailyMarketReport,
} = await import("../server/market-intelligence.mjs");
const { db } = await import("../server/database.mjs");

const evidence = {
  signals: [
    { id: "E1", source: "GitHub", title: "AI research workflow", url: "https://github.com/example/research", description: "Repeated research work", engagement: 120 },
    { id: "E2", source: "Hacker News", title: "Need a citation helper", url: "https://news.ycombinator.com/item?id=1", description: "People need traceable summaries", engagement: 80 },
  ],
  failures: [],
};

test("market intelligence persists a traceable Codex report without exposing credentials", async () => {
  let selectedModel;
  const executor = {
    status: () => ({ enabled: true, configured: true, ready: true }),
    async run({ model, mode, outputSchema }) {
      selectedModel = model;
      assert.equal(mode, "analysis");
      assert.equal(outputSchema.type, "object");
      return { finalResponse: JSON.stringify({
        summaryZh: "研究与引用整理需求正在增加。",
        summaryEn: "Demand for research and citation workflows is increasing.",
        opportunities: [{
          titleZh: "带引用的研究摘要", titleEn: "Cited research brief", category: "Search",
          decision: "new", problem: "资料分散", solution: "输出带来源摘要", priorityScore: 88,
          demandScore: 90, fitScore: 92, competitionScore: 70, effortScore: 78,
          evidenceIds: ["E1", "E2"], nextStep: "先验证三种研究任务模板",
        }],
      }) };
    },
  };
  const timestamp = Date.UTC(2026, 6, 31, 2);
  const report = await generateMarketIntelligenceReport({ timestamp, executor, collectSignals: async () => evidence });
  assert.equal(selectedModel, "kimi/kimi-k3");
  assert.equal(report.status, "completed");
  assert.equal(report.sourceCount, 2);
  assert.equal(report.opportunities[0].evidenceIds.length, 2);
  assert.equal(getMarketIntelligenceReport(report.reportDate).id, report.id);
  assert.equal(listMarketIntelligenceReports()[0].status, "completed");
  assert.equal(shouldRunDailyMarketReport(timestamp), false);
  assert.doesNotMatch(JSON.stringify(report), /api[_-]?key|secret/i);
  const status = marketIntelligenceStatus(executor);
  assert.deepEqual({ ...status, sources: undefined }, {
    enabled: true, configured: true, ready: true, model: "kimi/kimi-k3", fallbackModel: null, schedule: "08:00", timezone: "Asia/Shanghai", sources: undefined,
  });
  assert.ok(status.sources.length >= 9);
  assert.equal(status.sources.find((source) => source.key === "stack_exchange").status, "ready");
  assert.equal(status.sources.find((source) => source.key === "youtube").status, "configuration_required");
});

test("market intelligence refuses to publish unsupported recommendations", async () => {
  const executor = {
    status: () => ({ enabled: true, configured: true, ready: true }),
    async run() { return { finalResponse: JSON.stringify({ summaryZh: "无", summaryEn: "None", opportunities: [{
      titleZh: "无证据工具", titleEn: "Unsupported", category: "Data", decision: "new", problem: "x", solution: "y",
      priorityScore: 99, demandScore: 99, fitScore: 99, competitionScore: 99, effortScore: 99,
      evidenceIds: ["UNKNOWN", "E1"], nextStep: "不要开发",
    }] }) }; },
  };
  const report = await generateMarketIntelligenceReport({ timestamp: Date.UTC(2026, 7, 1, 2), executor, collectSignals: async () => evidence });
  assert.equal(report.opportunityCount, 0);
  assert.deepEqual(report.opportunities, []);
});

test("market intelligence records the actual fallback model when preferred access is denied", async () => {
  process.env.MARKET_INTELLIGENCE_FALLBACK_MODEL = "deepseek-v4-flash";
  const calls = [];
  const executor = {
    status: () => ({ enabled: true, configured: true, ready: true }),
    async run({ model }) {
      calls.push(model);
      if (model === "kimi/kimi-k3") throw Object.assign(new Error("denied"), { code: "CODEX_PROVIDER_MODEL_ACCESS_DENIED" });
      return { finalResponse: JSON.stringify({ summaryZh: "已使用备用模型。", summaryEn: "Fallback used.", opportunities: [] }) };
    },
  };
  try {
    const report = await generateMarketIntelligenceReport({ timestamp: Date.UTC(2026, 7, 2, 2), executor, collectSignals: async () => evidence });
    assert.deepEqual(calls, ["kimi/kimi-k3", "deepseek-v4-flash"]);
    assert.equal(report.model, "deepseek-v4-flash");
    assert.equal(report.status, "completed");
  } finally { delete process.env.MARKET_INTELLIGENCE_FALLBACK_MODEL; }
});

test("market intelligence supports evidence-grounded Chinese follow-up conversations", async () => {
  const actorUserId = "market-chat-admin";
  const timestamp = Date.UTC(2026, 7, 3, 2);
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at) VALUES (?, '市场管理员', 'market-chat@example.com', 'test', 'zh-CN', 1, 'active', ?, ?)`)
    .run(actorUserId, timestamp, timestamp);
  let chatPrompt = "";
  const executor = {
    status: () => ({ enabled: true, configured: true, ready: true }),
    async run({ prompt, outputSchema }) {
      if (outputSchema.properties.answerZh) {
        chatPrompt = prompt;
        return { finalResponse: JSON.stringify({
          answerZh: "这个需求更适合需要整理研究资料的中文内容团队。建议先验证上传资料、提取重点和生成带引用摘要三个步骤。",
          evidenceIds: ["E1", "UNKNOWN"],
          suggestedQuestions: ["这个工具的最小版本应该如何收费？"],
        }) };
      }
      return { finalResponse: JSON.stringify({ summaryZh: "中文研究工具需求正在增加。", summaryEn: "Demand is increasing.", opportunities: [{
        titleZh: "中文研究摘要", titleEn: "Chinese research brief", category: "Search", decision: "new",
        problem: "团队整理资料耗时。", solution: "生成带来源的中文摘要。", priorityScore: 85, demandScore: 86, fitScore: 90,
        competitionScore: 65, effortScore: 82, evidenceIds: ["E1", "E2"], nextStep: "访谈五名中文内容开发者。",
      }] }) };
    },
  };
  const report = await generateMarketIntelligenceReport({ timestamp, executor, collectSignals: async () => evidence });
  const conversation = await askMarketIntelligence({ reportId: report.id, actorUserId, question: "这个需求最适合哪些用户？", executor, timestamp: timestamp + 1000 });
  assert.match(chatPrompt, /必须使用清晰、具体的简体中文回答/);
  assert.equal(conversation.messages.length, 2);
  assert.equal(conversation.messages[1].role, "assistant");
  assert.deepEqual(conversation.messages[1].evidenceIds, ["E1"]);
  assert.match(conversation.messages[1].content, /中文内容团队/);
  assert.equal(getMarketIntelligenceConversation(report.id, actorUserId).messages.length, 2);
});
