import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_SEO_ENDPOINTS = "true";

const { seoCatalog, seoDataSourceStatus, generateSeo } = await import("../server/seo-engine.mjs");
const { safeSeoUrl } = await import("../server/seo-fetch.mjs");
const { db } = await import("../server/database.mjs");
const { seoSpecialists, filterCatalogForSpecialist } = await import("../server/seo-specialists.mjs");
const { runToolAction } = await import("../server/tool-actions.mjs");

test("SEO workbench exposes evidence-aware modules and fifteen specialist products", () => {
  const catalog = seoCatalog();
  assert.equal(catalog.modules.length, 8);
  assert.equal(catalog.modules.reduce((sum, module) => sum + module.templates.length, 0), 49);
  assert.equal(catalog.specialists.length, 15);
  assert.equal(seoSpecialists.length, 15);
  assert.equal(catalog.specialists.every((specialist) => specialist.totalCapabilities > 0), true);
  const backlink = catalog.modules.find((module) => module.id === "backlink-analysis");
  assert.equal(backlink.templates.every((template) => template.available === false), true);
  const audit = catalog.modules.find((module) => module.id === "website-audit");
  assert.equal(audit.templates.every((template) => template.available === true), true);
  const ranking = catalog.modules.find((module) => module.id === "rank-tracking").templates.find((template) => template.id === "keyword-ranking");
  const engine = ranking.fields.find((field) => field.id === "searchEngine");
  assert.deepEqual(engine.options.map((option) => option.value), ["google", "baidu"]);
  assert.equal(ranking.resultType, "ranking");
  assert.equal(catalog.modules.find((module) => module.id === "content-optimization").templates.find((template) => template.id === "meta-title").resultType, "content");
  assert.equal(catalog.modules.find((module) => module.id === "seo-report").templates.find((template) => template.id === "weekly-report").resultType, "report");
});

test("each specialist catalog exposes only its contracted capabilities", () => {
  const catalog = seoCatalog();
  for (const specialist of seoSpecialists) {
    const filtered = filterCatalogForSpecialist(catalog, specialist.slug);
    const exposed = filtered.modules.flatMap((module) => module.templates.map((template) => template.id));
    assert.deepEqual(new Set(exposed), new Set(specialist.templateIds));
    assert.equal(filtered.specialist.slug, specialist.slug);
  }
});

test("specialist execution is billed to its own product and rejects capability crossover", async (t) => {
  const userId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO users (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at) VALUES (?, 'Agent Test', ?, 'hash', 'zh-CN', 1, 'active', ?, ?)")
    .run(userId, `${userId}@example.test`, now, now);
  db.prepare("INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES (?, ?, 'welcome', 200, '测试积分', 'Test credits', 'user', ?, ?)")
    .run(randomUUID(), userId, userId, now);
  t.after(() => db.prepare("DELETE FROM users WHERE id = ?").run(userId));

  const row = db.prepare("SELECT id, slug, name_zh AS nameZh, name_en AS nameEn, credit_cost AS creditCost, runtime_kind AS runtimeKind FROM tools WHERE slug = 'seo-technical-agent'").get();
  assert.ok(row);
  await assert.rejects(
    () => runToolAction(new Request("http://localhost/api/tool-actions/seo-technical-agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: "seo-article-draft", values: {}, modelConnectionId: "managed" }) }), { id: userId, locale: "zh-CN" }, row),
    (error) => error.code === "SEO_AGENT_CAPABILITY_NOT_ALLOWED" && error.status === 403,
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE user_id = ?").get(userId).count, 0);
});

test("SEO website audit crawls real HTML evidence and returns an explainable score", async (t) => {
  const server = createServer((request, response) => {
    if (request.url === "/robots.txt") return response.end("User-agent: *\nSitemap: http://127.0.0.1:0/sitemap.xml");
    if (request.url === "/sitemap.xml") { response.setHeader("content-type", "application/xml"); return response.end("<urlset></urlset>"); }
    response.setHeader("content-type", "text/html");
    response.end("<!doctype html><html><head><title>Short</title></head><body><h1>Evidence page</h1><img src='/hero.png'><a href='/about'>About</a></body></html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const result = await generateSeo({ user: { id: "seo-test" }, connectionId: null, payload: { templateId: "canonical", locale: "zh-CN", values: { website: `http://127.0.0.1:${port}/` } } });
  assert.equal(result.output.mode, "seo-evidence");
  assert.equal(result.output.dataSource, "crawl");
  assert.equal(result.output.presentation.type, "audit");
  assert.ok(result.output.presentation.cards.length >= 2);
  assert.ok(result.output.presentation.issues.length >= 1);
  assert.match(result.output.markdown, /实时网站抓取/);
  assert.ok(result.output.score < 100);
  assert.equal(result.seoRun.templateId, "canonical");
});

test("SEO crawler blocks embedded credentials", async () => {
  await assert.rejects(() => safeSeoUrl("https://user:pass@example.com"), { code: "SEO_URL_BLOCKED" });
});

test("technical SEO templates return capability-specific evidence instead of one generic report", async (t) => {
  let origin;
  const server = createServer((request, response) => {
    if (request.url === "/robots.txt") return response.end(`User-agent: *\nDisallow: /private\nSitemap: ${origin}/sitemap.xml`);
    if (request.url === "/sitemap.xml") { response.setHeader("content-type", "application/xml"); return response.end(`<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/about</loc></url></urlset>`); }
    if (request.url === "/missing") { response.statusCode = 404; return response.end("missing"); }
    response.setHeader("content-type", "text/html");
    if (request.url === "/about") return response.end(`<html><head><title>About Example Company</title><link rel="canonical" href="${origin}/about"></head><body><h1>About</h1></body></html>`);
    response.end(`<html><head><title>Example Company Home Page</title></head><body><h1>Home</h1><img src="/hero.jpg"><a href="/missing">Missing</a><a href="/about">About</a></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  origin = `http://127.0.0.1:${server.address().port}`;

  const robots = await generateSeo({ user: { id: "seo-specific" }, connectionId: null, payload: { templateId: "robots-txt", locale: "zh-CN", values: { website: origin } } });
  const sitemap = await generateSeo({ user: { id: "seo-specific" }, connectionId: null, payload: { templateId: "sitemap", locale: "zh-CN", values: { website: origin } } });
  const images = await generateSeo({ user: { id: "seo-specific" }, connectionId: null, payload: { templateId: "image-optimization", locale: "zh-CN", values: { website: origin } } });
  const links = await generateSeo({ user: { id: "seo-specific" }, connectionId: null, payload: { templateId: "broken-links", locale: "zh-CN", values: { website: origin } } });

  assert.match(robots.output.markdown, /User-agent 分组/);
  assert.equal(robots.output.structured.details.robots.sitemaps.length, 1);
  assert.match(sitemap.output.markdown, /URL 数量/);
  assert.equal(sitemap.output.structured.details.sitemaps[0].locations.length, 2);
  assert.match(images.output.markdown, /缺少 alt/);
  assert.equal(images.output.structured.details.images[0].missingAlt, 1);
  assert.match(links.output.markdown, /HTTP 404/);
  assert.equal(links.output.structured.details.links.some((item) => item.status === 404), true);
  assert.notEqual(robots.output.markdown, sitemap.output.markdown);
});

test("Search Console configuration does not falsely unlock arbitrary SERP tools", () => {
  const status = seoDataSourceStatus({ GOOGLE_SEARCH_CONSOLE_SITE_URL: "https://example.com/", GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: "token" });
  assert.equal(status.labels.searchConsole, true);
  assert.equal(status["serp-provider"], false);
});

test("SERP provider output records a real rank snapshot for later trend reports", async (t) => {
  const originalFetch = globalThis.fetch;
  const previousLogin = process.env.DATAFORSEO_LOGIN;
  const previousPassword = process.env.DATAFORSEO_PASSWORD;
  process.env.DATAFORSEO_LOGIN = "test-login";
  process.env.DATAFORSEO_PASSWORD = "test-password";
  globalThis.fetch = async () => new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.01, result: [{ items: [{ type: "organic", url: "https://example.com/ranking-page", rank_absolute: 4 }] }] }] }), { status: 200, headers: { "content-type": "application/json" } });
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousLogin == null) delete process.env.DATAFORSEO_LOGIN; else process.env.DATAFORSEO_LOGIN = previousLogin;
    if (previousPassword == null) delete process.env.DATAFORSEO_PASSWORD; else process.env.DATAFORSEO_PASSWORD = previousPassword;
  });

  const result = await generateSeo({ user: { id: "rank-user" }, connectionId: null, payload: { templateId: "keyword-ranking", locale: "zh-CN", values: { website: "https://example.com", keywords: "AI tools", country: "United States", language: "English" } } });
  assert.match(result.output.markdown, /本次排名：4/);
  assert.equal(result.rankSnapshots.length, 1);
  assert.equal(result.rankSnapshots[0].rank, 4);
  assert.equal(result.output.dataQuality, "provider-observed");
  assert.equal(result.output.presentation.type, "ranking");
  assert.equal(result.output.presentation.rows[0].rank, 4);
  assert.equal(result.rankSnapshots[0].searchEngine, "google");
  assert.equal(result.rankSnapshots[0].device, "desktop");
});

test("Baidu ranking uses the asynchronous provider flow and stores an isolated snapshot", async (t) => {
  const originalFetch = globalThis.fetch;
  const previousLogin = process.env.DATAFORSEO_LOGIN;
  const previousPassword = process.env.DATAFORSEO_PASSWORD;
  process.env.DATAFORSEO_LOGIN = "test-login";
  process.env.DATAFORSEO_PASSWORD = "test-password";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/task_post")) {
      return new Response(JSON.stringify({ status_code: 20000, cost: 0.001, tasks: [{ id: "baidu-task", status_code: 20100, cost: 0.001 }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "baidu-task", status_code: 20000, result: [{ items: [{ type: "organic", url: "https://example.cn/page", title: "示例结果", rank_absolute: 3 }] }] }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousLogin == null) delete process.env.DATAFORSEO_LOGIN; else process.env.DATAFORSEO_LOGIN = previousLogin;
    if (previousPassword == null) delete process.env.DATAFORSEO_PASSWORD; else process.env.DATAFORSEO_PASSWORD = previousPassword;
  });

  const result = await generateSeo({ user: { id: "baidu-rank-user" }, connectionId: null, payload: { templateId: "keyword-ranking", locale: "zh-CN", values: { website: "https://example.cn", keywords: "面试题", searchEngine: "baidu", country: "中国", device: "mobile" } } });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /serp\/baidu\/organic\/task_post$/);
  assert.match(calls[1].url, /task_get\/advanced\/baidu-task$/);
  const posted = JSON.parse(calls[0].options.body)[0];
  assert.equal(posted.language_name, "Chinese (Simplified)");
  assert.equal(posted.device, "mobile");
  assert.equal(posted.os, "android");
  assert.equal(posted.get_website_url, true);
  assert.match(result.output.markdown, /本次排名：3/);
  assert.equal(result.output.dataSource, "dataforseo-baidu-serp");
  assert.equal(result.rankSnapshots[0].searchEngine, "baidu");
  assert.equal(result.rankSnapshots[0].device, "mobile");
});

test("backlink providers do not require keyword fields", async (t) => {
  const originalFetch = globalThis.fetch;
  const previousLogin = process.env.DATAFORSEO_LOGIN;
  const previousPassword = process.env.DATAFORSEO_PASSWORD;
  process.env.DATAFORSEO_LOGIN = "test-login";
  process.env.DATAFORSEO_PASSWORD = "test-password";
  globalThis.fetch = async (url, options = {}) => {
    assert.match(String(url), /backlinks\/summary\/live$/);
    const posted = JSON.parse(options.body)[0];
    assert.equal(posted.target, "example.com");
    return new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.001, result: [{ backlinks: 12, referring_domains: 4 }] }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousLogin == null) delete process.env.DATAFORSEO_LOGIN; else process.env.DATAFORSEO_LOGIN = previousLogin;
    if (previousPassword == null) delete process.env.DATAFORSEO_PASSWORD; else process.env.DATAFORSEO_PASSWORD = previousPassword;
  });

  const result = await generateSeo({ user: { id: "backlink-user" }, connectionId: null, payload: { templateId: "backlink-overview", locale: "zh-CN", values: { website: "https://example.com" } } });
  assert.match(result.output.markdown, /外链总数 \| 12/);
  assert.equal(result.output.dataSource, "dataforseo");
  assert.equal(result.output.presentation.type, "scorecard");
  assert.equal(result.output.presentation.cards.find((item) => item.label === "外链总数").value, 12);
});

test("SEO reports use persisted runs and ranking trends use only persisted rank snapshots", async (t) => {
  const userId = randomUUID();
  const taskId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO users (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at) VALUES (?, 'SEO Test', ?, 'hash', 'zh-CN', 1, 'active', ?, ?)").run(userId, `${userId}@example.test`, now, now);
  t.after(() => db.prepare("DELETE FROM users WHERE id = ?").run(userId));
  db.prepare("INSERT INTO tasks (id, user_id, tool_id, status, input_json, output_json, credit_cost, created_at, updated_at, completed_at) VALUES (?, ?, 'tool_seo', 'completed', '{}', '{}', 0, ?, ?, ?)").run(taskId, userId, now, now, now);
  db.prepare("INSERT INTO seo_runs (task_id, user_id, module_id, template_id, website, data_source, data_quality, score, report_markdown, structured_json, model_route, created_at) VALUES (?, ?, 'website-audit', 'canonical', 'https://example.com', 'crawl', 'observed', 82, '# Existing report', '{}', NULL, ?)").run(taskId, userId, now);
  db.prepare("INSERT INTO seo_rank_snapshots (id, user_id, website, keyword, country, language, rank, result_url, source, observed_at) VALUES (?, ?, 'https://example.com', 'AI tools', 'United States', 'English', 8, 'https://example.com/old', 'dataforseo-serp', ?)").run(randomUUID(), userId, now - 86400000);
  db.prepare("INSERT INTO seo_rank_snapshots (id, user_id, website, keyword, country, language, rank, result_url, source, observed_at) VALUES (?, ?, 'https://example.com', 'AI tools', 'United States', 'English', 4, 'https://example.com/new', 'dataforseo-serp', ?)").run(randomUUID(), userId, now);

  const report = await generateSeo({ user: { id: userId }, connectionId: null, payload: { templateId: "seo-summary", locale: "zh-CN", values: { website: "https://example.com" } } });
  const trend = await generateSeo({ user: { id: userId }, connectionId: null, payload: { templateId: "ranking-trend", locale: "zh-CN", values: { website: "https://example.com", keywords: "AI tools" } } });
  assert.match(report.output.markdown, /已完成分析：1 次/);
  assert.match(report.output.html, /<!doctype html>/);
  assert.equal(report.output.presentation.type, "report");
  assert.equal(trend.output.presentation.type, "ranking");
  assert.equal(trend.output.presentation.rows[0].latestRank, 4);
  assert.equal(report.output.structured.summary.latestScore, 82);
  assert.match(trend.output.markdown, /\| AI tools \| 4 \| 8 \| \+4 \|/);
  assert.equal(trend.output.dataSource, "rank-snapshots");
});
