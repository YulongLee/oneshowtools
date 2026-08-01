import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_SEO_ENDPOINTS = "true";

const { db } = await import("../server/database.mjs");
const { handleSeoAgent, runSeoAgentScan } = await import("../server/seo-agent.mjs");

const req = (path, options = {}) => new Request(`http://localhost${path}`, {
  ...options,
  headers: { "content-type": "application/json", ...(options.headers || {}) },
});

test("SEO Agent persists a real crawl, evidence-based opportunities, credits, tasks, and draft actions", async (t) => {
  let origin = "";
  const site = createServer((request, response) => {
    if (request.url === "/robots.txt") return response.end(`User-agent: *\nSitemap: ${origin}/sitemap.xml`);
    if (request.url === "/sitemap.xml") {
      response.setHeader("content-type", "application/xml");
      return response.end(`<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/guide</loc></url></urlset>`);
    }
    response.setHeader("content-type", "text/html");
    if (request.url === "/guide") return response.end("<html><head><title>Guide</title></head><body><h1>SEO Guide</h1><img src='/guide.jpg'></body></html>");
    response.end("<html><head><title>Home</title></head><body><h1>OneShow</h1><a href='/guide'>Guide</a></body></html>");
  });
  await new Promise((resolve) => site.listen(0, "127.0.0.1", resolve));
  t.after(() => site.close());
  origin = `http://127.0.0.1:${site.address().port}`;

  const userId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO users (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at) VALUES (?, 'Agent Test', ?, 'hash', 'zh-CN', 1, 'active', ?, ?)")
    .run(userId, `${userId}@example.test`, now, now);
  db.prepare("INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES (?, ?, 'welcome', 200, '测试积分', 'Test credits', 'user', ?, ?)")
    .run(randomUUID(), userId, userId, now);
  t.after(() => db.prepare("DELETE FROM users WHERE id = ?").run(userId));
  const user = { id: userId, locale: "zh-CN" };

  const created = await handleSeoAgent(req("/api/seo-agent/projects", {
    method: "POST",
    body: JSON.stringify({ name: "Test Site", siteUrl: origin }),
  }), user, "/api/seo-agent/projects");
  assert.equal(created.status, 201);
  const project = (await created.json()).project;

  const scan = await runSeoAgentScan(project.id, user.id);
  assert.equal(scan.coverage.pagesParsed, 2);
  assert.ok(scan.healthScore < 100);
  assert.ok(scan.opportunities >= 2);

  const dashboard = await (await handleSeoAgent(req("/api/seo-agent"), user, "/api/seo-agent")).json();
  assert.equal(dashboard.activeProject.latestScan.status, "completed");
  assert.equal(dashboard.opportunities.some((item) => item.kind === "meta_description"), true);
  assert.equal(dashboard.opportunities[0].evidence.source, "live-crawl");
  assert.equal(dashboard.capabilities.gsc, false);

  const opportunity = dashboard.opportunities.find((item) => item.kind === "meta_description");
  const approved = await handleSeoAgent(req(`/api/seo-agent/opportunities/${opportunity.id}/approve`, { method: "POST" }), user, `/api/seo-agent/opportunities/${opportunity.id}/approve`);
  assert.equal(approved.status, 201);
  const action = (await approved.json()).action;
  assert.equal(action.status, "draft_ready");
  assert.ok(action.after.changes.length >= 2);
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id = ?").get(action.taskId).status, "completed");
  assert.equal(Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance), 200 - opportunity.creditCost);
});

test("SEO Agent automation policy is persisted and bounded", async () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO users (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at) VALUES (?, 'Policy Test', ?, 'hash', 'zh-CN', 1, 'active', ?, ?)")
    .run(userId, `${userId}@example.test`, now, now);
  db.prepare("INSERT INTO seo_agent_projects (id, user_id, name, site_url, site_origin, created_at, updated_at) VALUES (?, ?, 'Policy', 'https://example.com/', 'https://example.com', ?, ?)")
    .run(projectId, userId, now, now);
  const response = await handleSeoAgent(req(`/api/seo-agent/projects/${projectId}/automation`, {
    method: "PATCH",
    body: JSON.stringify({ mode: "auto_low_risk", dailyCreditLimit: 42, scanHour: 6, scanMinute: 15 }),
  }), { id: userId }, `/api/seo-agent/projects/${projectId}/automation`);
  assert.equal(response.status, 200);
  const project = (await response.json()).project;
  assert.equal(project.automationMode, "auto_low_risk");
  assert.equal(project.dailyCreditLimit, 42);
  assert.equal(project.scanHour, 6);
  assert.equal(project.scanMinute, 15);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
});
