import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

process.env.NODE_ENV = "test";
process.env.ALLOW_TEST_SEO_ENDPOINTS = "true";

const { seoCatalog, generateSeo } = await import("../server/seo-engine.mjs");
const { safeSeoUrl } = await import("../server/seo-fetch.mjs");

test("SEO workbench exposes seven evidence-aware modules and locks unavailable provider tools", () => {
  const catalog = seoCatalog();
  assert.equal(catalog.modules.length, 7);
  assert.equal(catalog.modules.reduce((sum, module) => sum + module.templates.length, 0), 44);
  const backlink = catalog.modules.find((module) => module.id === "backlink-analysis");
  assert.equal(backlink.templates.every((template) => template.available === false), true);
  const audit = catalog.modules.find((module) => module.id === "website-audit");
  assert.equal(audit.templates.every((template) => template.available === true), true);
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
  assert.match(result.output.markdown, /实时网站抓取/);
  assert.ok(result.output.score < 100);
  assert.equal(result.seoRun.templateId, "canonical");
});

test("SEO crawler blocks embedded credentials", async () => {
  await assert.rejects(() => safeSeoUrl("https://user:pass@example.com"), { code: "SEO_URL_BLOCKED" });
});
