import assert from "node:assert/strict";
import test from "node:test";
import { collectMarketSignals, detectMarketCategory, marketSourceCatalog } from "../server/market-sources.mjs";

test("market signals are normalized, deduplicated, classified, and source-balanced", async () => {
  const fetchImpl = async (url) => {
    const target = String(url);
    if (target.includes("hn.algolia.com")) { const query = new URL(target).searchParams.get("query"); return Response.json({ hits: [{ objectID: query, title: `Need an ${query} workflow`, url: `https://example.com/${encodeURIComponent(query)}?utm_source=test`, story_text: "Manual work is time-consuming", created_at: "2026-07-30T00:00:00Z", points: 20, num_comments: 5 }] }); }
    if (target.includes("search/repositories")) return Response.json({ items: [{ full_name: "demo/seo-tool", html_url: "https://github.com/demo/seo-tool", description: "AI keyword research", created_at: "2026-07-29T00:00:00Z", stargazers_count: 40 }] });
    if (target.includes("search/issues")) return Response.json({ items: [{ title: "Need to automate PDF meeting notes", html_url: "https://github.com/demo/app/issues/1", body: "This manual workflow is difficult", created_at: "2026-07-28T00:00:00Z", comments: 8 }] });
    if (target.includes("dev.to")) return Response.json([{ title: "AI data analysis workflow", url: "https://dev.to/demo/data", description: "Analyze CSV files", published_at: "2026-07-27T00:00:00Z", public_reactions_count: 12, comments_count: 2 }]);
    if (target.includes("stackexchange.com")) return Response.json({ items: [{ title: "How can I automate spreadsheet cleanup?", link: "https://stackoverflow.com/questions/1/demo", tags: ["excel", "automation"], creation_date: 1785283200, score: 4, answer_count: 3, view_count: 200 }] });
    if (target.includes("v2ex.com/api/topics")) return Response.json([{ id: 9, title: "想找一个自动整理文档的 AI 工具", url: "https://www.v2ex.com/t/9", content: "手工整理很耗时", created: 1785283200, replies: 6 }]);
    if (["sspai.com/feed", "36kr.com/feed", "ithome.com/rss", "infoq.cn/feed"].some((part) => target.includes(part))) return new Response(`<?xml version="1.0"?><rss><channel><item><title>新的 AI 办公自动化工具</title><link>${target.split("?")[0]}article-1</link><description>帮助开发者处理文档和数据</description><pubDate>Thu, 30 Jul 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
    throw new Error(`Unexpected URL ${target}`);
  };
  const result = await collectMarketSignals({ fetchImpl, now: Date.UTC(2026, 6, 31), env: {} });
  assert.equal(result.failures.length, 0);
  assert.equal(result.health.filter((source) => source.status === "healthy").length, 10);
  assert.equal(result.health.find((source) => source.key === "youtube").status, "configuration_required");
  assert.ok(result.signals.length >= 5);
  assert.equal(new Set(result.signals.map((signal) => signal.fingerprint)).size, result.signals.length);
  assert.ok(result.signals.every((signal) => signal.id.startsWith("E") && signal.qualityScore > 0));
  assert.ok(result.coverage.some((entry) => entry.category === "Video" && entry.count > 0));
  assert.ok(result.signals.some((signal) => signal.locale === "zh-CN"));
});

test("market source catalog exposes real authorization state without secrets", () => {
  const catalog = marketSourceCatalog({ YOUTUBE_API_KEY: "secret", PRODUCT_HUNT_TOKEN: "secret" });
  assert.equal(catalog.find((source) => source.key === "youtube").status, "ready");
  assert.equal(catalog.find((source) => source.key === "search_console").status, "configuration_required");
  assert.doesNotMatch(JSON.stringify(catalog), /secret/);
  assert.equal(detectMarketCategory("remove image background automatically"), "Image");
});
