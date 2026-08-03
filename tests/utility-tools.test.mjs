import assert from "node:assert/strict";
import test from "node:test";
import { processUtilityTool, utilityToolSlugs } from "../server/utility-tools.mjs";

const run = (slug, payload, extra = {}) => processUtilityTool({ slug, payload, locale: "zh-CN", modelText: async () => ({ text: "模型生成结果", route: "managed" }), ...extra });

test("all utility and acquisition tools are registered", () => {
  assert.equal(utilityToolSlugs.size, 23);
});

test("formats JSON and converts JSON to YAML and XML", async () => {
  const formatted = await run("json-formatter", { source: '{"ok":true}', mode: "format" });
  assert.match(formatted.output.text, /"ok": true/);
  const yaml = await run("data-format-converter", { source: '{"name":"OneShow"}', inputFormat: "json", outputFormat: "yaml" });
  assert.match(yaml.output.text, /name: OneShow/);
  const xml = await run("data-format-converter", { source: "name: OneShow", inputFormat: "yaml", outputFormat: "xml" });
  assert.match(xml.output.text, /<name>OneShow<\/name>/);
});

test("decodes JWT without retaining token", async () => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "none" })}.${encode({ sub: "user-1", exp: 4102444800 })}.signature`;
  const result = await run("jwt-decoder", { token });
  assert.equal(result.output.payload.sub, "user-1");
  assert.equal(result.safeInput.sensitiveInputStored, false);
  assert.doesNotMatch(JSON.stringify(result.safeInput), /user-1/);
});

test("converts timestamps and Base64 or URL content", async () => {
  const timestamp = await run("timestamp-converter", { value: "0" });
  assert.match(timestamp.output.text, /1970-01-01T00:00:00.000Z/);
  const encoded = await run("base64-url-codec", { source: "OneShow工具", operation: "base64-encode" });
  const decoded = await run("base64-url-codec", { source: encoded.output.text, operation: "base64-decode" });
  assert.equal(decoded.output.text, "OneShow工具");
  assert.equal(decoded.safeInput.sensitiveInputStored, false);
});

test("tests safe regexes and rejects risky expressions", async () => {
  const result = await run("regex-tester", { pattern: "(foo)-(\\d+)", flags: "i", source: "foo-42" });
  assert.equal(result.output.matchCount, 1);
  assert.deepEqual(result.output.matches[0].groups, ["foo", "42"]);
  await assert.rejects(() => run("regex-tester", { pattern: "(a+)+$", source: "aaaa" }), (error) => error.code === "REGEX_UNSAFE");
});

test("generates a line diff", async () => {
  const result = await run("text-diff", { before: "a\nb", after: "a\nc" });
  assert.match(result.output.text, /- b/);
  assert.match(result.output.text, /\+ c/);
});

test("creates distinct SEO outputs", async () => {
  const title = await run("meta-title-generator", { keyword: "AI SEO", brand: "OneShowSEO" });
  assert.match(title.output.text, /AI SEO/);
  const description = await run("meta-description-generator", { keyword: "PDF 压缩", benefit: "快速减小文件体积" });
  assert.match(description.output.text, /快速减小文件体积/);
  const schema = await run("schema-generator", { schemaType: "Article", name: "SEO 指南", url: "https://example.com/seo", author: "李玉龙" });
  assert.match(schema.output.text, /application\/ld\+json/);
  assert.match(schema.output.text, /"@type": "Article"/);
  const serp = await run("serp-preview", { title: "OneShowTools", description: "AI 小工具平台", url: "https://oneshowtools.com" });
  assert.equal(serp.output.preview.title, "OneShowTools");
  const robots = await run("robots-generator", { website: "https://example.com", disallow: "/admin", allow: "/", sitemap: "" });
  assert.match(robots.output.text, /Disallow: \/admin/);
  assert.match(robots.output.text, /Sitemap: https:\/\/example.com\/sitemap.xml/);
});

test("checks a live sitemap response with bounded fetching", async () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/a</loc></url><url><loc>not-a-url</loc></url></urlset>`;
  const result = await run("sitemap-checker", { website: "https://example.com/sitemap.xml" }, { fetchImpl: async () => new Response(xml, { status: 200, headers: { "content-type": "application/xml" } }) });
  assert.equal(result.output.urlCount, 3);
  assert.equal(result.output.duplicateCount, 1);
  assert.equal(result.output.invalidCount, 1);
});

test("AI acquisition tools require and return actual model output", async () => {
  const xhs = await run("xiaohongshu-copy", { topic: "AI 工具", audience: "开发者", tone: "专业干货" });
  assert.equal(xhs.output.text, "模型生成结果");
  assert.equal(xhs.output.mode, "ai");
  const repurposed = await run("content-repurposer", { source: "一段原始文章", platforms: "小红书、LinkedIn" });
  assert.equal(repurposed.output.route, "managed");
});

test("generates QR images and counts Chinese and English text", async () => {
  const qr = await run("qr-code-generator", { content: "https://oneshowtools.com", size: "320", errorCorrection: "Q" });
  assert.equal(qr.mimeType, "image/png");
  assert.equal(qr.buffer.subarray(1, 4).toString(), "PNG");
  const stats = await run("text-statistics", { source: "你好 OneShow Tools。\n\n第二段。" });
  assert.equal(stats.output.paragraphs, 2);
  assert.ok(stats.output.words >= 6);
});

test("converts, cleans, and exports CSV data", async () => {
  const converted = await run("csv-json-converter", { source: 'name,note\nOneShow,"AI, tools"', direction: "csv-to-json", delimiter: "comma" });
  assert.deepEqual(JSON.parse(converted.output.text), [{ name: "OneShow", note: "AI, tools" }]);
  const reverse = await run("csv-json-converter", { source: '[{"name":"OneShow","count":2}]', direction: "json-to-csv", delimiter: "comma" });
  assert.match(reverse.output.text, /name,count/);
  const cleaned = await run("csv-cleaner", { source: "name,value\n A ,1\n A ,1\nB,2", delimiter: "comma", trimCells: "yes", deduplicate: "yes" });
  assert.equal(cleaned.output.duplicatesRemoved, 1);
  assert.match(cleaned.output.text, /A,1/);
  const excel = await run("csv-to-excel", { source: "name,value\nA,1", delimiter: "comma" });
  assert.equal(excel.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(excel.buffer.subarray(0, 2).toString(), "PK");
});

test("converts Markdown and HTML, cleans rich text, and builds UTM links", async () => {
  const html = await run("markdown-html-converter", { source: "# Title\n\n- One\n- Two", direction: "markdown-to-html" });
  assert.match(html.output.text, /<h1>Title<\/h1>/);
  assert.match(html.output.text, /<ul>/);
  const markdown = await run("markdown-html-converter", { source: "<h2>Title</h2><p><strong>Hello</strong></p>", direction: "html-to-markdown" });
  assert.match(markdown.output.text, /## Title/);
  const clean = await run("rich-text-cleaner", { source: "<p>Hello&nbsp; world</p><script>bad()</script>" });
  assert.equal(clean.output.text, "Hello world");
  const utm = await run("utm-builder", { url: "https://example.com/path?x=1", source: "wechat", medium: "social", campaign: "launch", term: "", content: "cover-a" });
  assert.match(utm.output.url, /utm_source=wechat/);
  assert.match(utm.output.url, /utm_campaign=launch/);
});
