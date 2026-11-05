import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CORE_TOOLS, TARGET_KEYWORDS, injectSeoDocument, llmsText, pageSeo, sitemapXml } from "../shared/public-seo.mjs";

test("homepage SEO targets the canonical OneShowTools domain and twenty mapped keywords", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(source, /gameforcast\.top/);
  assert.match(source, /https:\/\/oneshowtools\.com\//);
  assert.equal(TARGET_KEYWORDS.length, 20);
  assert.equal(new Set(TARGET_KEYWORDS).size, 20);
  const page = pageSeo("/", CORE_TOOLS);
  assert.match(page.title, /在线 AI 工具箱/);
});

test("server-rendered homepage exposes crawlable content, links, social metadata and JSON-LD", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const html = injectSeoDocument(source, "/", CORE_TOOLS);
  assert.match(html, /<h1>在线 AI 工具箱/);
  assert.match(html, /href="\/tools\/food-nutrition-analyzer"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"@type":"ItemList"/);
});

test("each core tool receives unique metadata, a canonical URL and WebApplication schema", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const titles = new Set();
  for (const tool of CORE_TOOLS) {
    const html = injectSeoDocument(source, `/tools/${tool.slug}`, CORE_TOOLS);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    assert.ok(title);
    assert.equal(titles.has(title), false, `duplicate title for ${tool.slug}`);
    titles.add(title);
    assert.match(html, new RegExp(`canonical" href="https://oneshowtools\\.com/tools/${tool.slug}`));
    assert.match(html, /"@type":"WebApplication"/);
    assert.match(html, new RegExp(`<h1>${tool.nameZh.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("sitemap, robots and llms discovery files expose public pages without old-domain references", async () => {
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const llms = await readFile(new URL("../public/llms.txt", import.meta.url), "utf8");
  assert.match(sitemap, /product-kill-line-analyzer/);
  assert.match(sitemap, /value-ranking-tool/);
  assert.match(robots, /Sitemap: https:\/\/oneshowtools\.com\/sitemap\.xml/);
  assert.match(robots, /User-agent: GPTBot\nAllow: \//);
  assert.match(robots, /User-agent: CCBot\nDisallow: \//);
  assert.match(llms, /^# OneShowTools/m);
  assert.match(llms, /## 核心工具/);
  assert.match(llmsText(CORE_TOOLS, true), /## 关键事实/);
  assert.equal(sitemapXml(CORE_TOOLS).includes("gameforcast.top"), false);
});
