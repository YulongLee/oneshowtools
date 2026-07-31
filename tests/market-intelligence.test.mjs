import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "oneshow-market-intelligence-"));
process.env.MARKET_INTELLIGENCE_MODEL = "kimi/kimi-k3";
const {
  generateMarketIntelligenceReport, getMarketIntelligenceReport,
  listMarketIntelligenceReports, marketIntelligenceStatus, shouldRunDailyMarketReport,
} = await import("../server/market-intelligence.mjs");

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
    async run({ model, outputSchema }) {
      selectedModel = model;
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
  assert.deepEqual(marketIntelligenceStatus(executor), {
    enabled: true, configured: true, ready: true, model: "kimi/kimi-k3", schedule: "08:00", timezone: "Asia/Shanghai",
  });
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
