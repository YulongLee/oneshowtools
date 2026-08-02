import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { fetchSeoResource } from "./seo-fetch.mjs";

const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const text = (value, max = 80_000) => String(value ?? "").trim().slice(0, max);
const required = (value, code = "TEXT_REQUIRED") => {
  const result = text(value);
  if (!result) throw fail(code);
  return result;
};
const pretty = (value) => JSON.stringify(value, null, 2);

function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function objectToXml(value, root = "root") {
  if (Array.isArray(value)) return value.map((item) => objectToXml(item, "item")).join("\n");
  if (value && typeof value === "object") {
    const children = Object.entries(value).map(([key, child]) => objectToXml(child, key)).join("");
    return `<${root}>${children}</${root}>`;
  }
  return `<${root}>${xmlEscape(value ?? "")}</${root}>`;
}

function xmlToObject(xml) {
  const tokens = String(xml).replace(/<\?xml[\s\S]*?\?>/gi, "").match(/<[^>]+>|[^<]+/g) || [];
  const root = { name: "__root", children: [] };
  const stack = [root];
  for (const token of tokens) {
    if (/^<\//.test(token)) {
      if (stack.length === 1) throw fail("XML_INVALID");
      stack.pop();
    } else if (/^</.test(token) && !/^<!--/.test(token)) {
      const match = token.match(/^<\s*([\w:.-]+)/);
      if (!match) continue;
      const node = { name: match[1], children: [], text: "" };
      stack.at(-1).children.push(node);
      if (!/\/>$/.test(token)) stack.push(node);
    } else if (token.trim()) stack.at(-1).text += token.trim();
  }
  if (stack.length !== 1 || root.children.length !== 1) throw fail("XML_INVALID");
  const convert = (node) => {
    if (!node.children.length) return node.text;
    const output = {};
    for (const child of node.children) {
      const value = convert(child);
      if (Object.hasOwn(output, child.name)) output[child.name] = Array.isArray(output[child.name]) ? [...output[child.name], value] : [output[child.name], value];
      else output[child.name] = value;
    }
    return output;
  };
  const node = root.children[0];
  return { [node.name]: convert(node) };
}

function parseStructured(value, format) {
  try {
    if (format === "json") return JSON.parse(value);
    if (format === "yaml") return parseYaml(value);
    if (format === "xml") return xmlToObject(value);
  } catch (error) {
    if (error.code) throw error;
    throw fail(`${String(format).toUpperCase()}_INVALID`);
  }
  throw fail("FORMAT_NOT_SUPPORTED");
}

function stringifyStructured(value, format) {
  if (format === "json") return pretty(value);
  if (format === "yaml") return stringifyYaml(value, { indent: 2, lineWidth: 100 }).trim();
  if (format === "xml") {
    const entries = Object.entries(value && typeof value === "object" ? value : { root: value });
    return `<?xml version="1.0" encoding="UTF-8"?>\n${entries.map(([key, item]) => objectToXml(item, key)).join("\n")}`;
  }
  throw fail("FORMAT_NOT_SUPPORTED");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64").toString("utf8");
}

function jwtDecode(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw fail("JWT_INVALID");
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return {
      header,
      payload,
      signaturePresent: Boolean(parts[2]),
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      expired: payload.exp ? payload.exp <= now : null,
      warning: "Decoded locally by the OneShowTools service. Signature has not been verified.",
    };
  } catch { throw fail("JWT_INVALID"); }
}

function safePattern(pattern) {
  if (pattern.length > 240) throw fail("REGEX_TOO_LONG");
  if (/\([^)]*[+*][^)]*\)[+*{]|(?:\.\*|\.\+).*(?:\.\*|\.\+)/.test(pattern)) throw fail("REGEX_UNSAFE", 422);
  return pattern;
}

function lineDiff(before, after) {
  const a = before.split("\n").slice(0, 500);
  const b = after.split("\n").slice(0, 500);
  const matrix = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  const rows = [];
  let i = 0; let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { rows.push(`  ${a[i]}`); i += 1; j += 1; }
    else if (j < b.length && (i === a.length || matrix[i][j + 1] >= matrix[i + 1][j])) { rows.push(`+ ${b[j]}`); j += 1; }
    else { rows.push(`- ${a[i]}`); i += 1; }
  }
  return rows.join("\n");
}

function normalizeUrl(value) {
  try {
    const url = new URL(required(value, "URL_REQUIRED"));
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.href;
  } catch { throw fail("URL_INVALID"); }
}

function schemaPayload(payload) {
  const type = ["Article", "Product", "Organization", "BreadcrumbList"].includes(payload.schemaType) ? payload.schemaType : "Article";
  const url = normalizeUrl(payload.url);
  const name = required(payload.name, "NAME_REQUIRED");
  const description = text(payload.description, 500);
  let schema = { "@context": "https://schema.org", "@type": type, name, url };
  if (description) schema.description = description;
  if (type === "Article") schema = { ...schema, headline: name, author: { "@type": "Person", name: text(payload.author, 120) || "Editorial Team" }, datePublished: payload.datePublished || new Date().toISOString().slice(0, 10) };
  if (type === "Product") schema = { ...schema, sku: text(payload.sku, 120) || undefined, brand: text(payload.brand, 120) ? { "@type": "Brand", name: text(payload.brand, 120) } : undefined };
  if (type === "Organization") schema.logo = text(payload.logo, 1000) || undefined;
  if (type === "BreadcrumbList") schema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: name.split("> ").map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.trim(), item: index === 0 ? new URL(url).origin : url })) };
  schema = JSON.parse(JSON.stringify(schema));
  return `<script type="application/ld+json">\n${pretty(schema)}\n</script>`;
}

function metaTitle(payload) {
  const keyword = required(payload.keyword, "KEYWORD_REQUIRED");
  const brand = text(payload.brand, 80);
  const candidates = [...new Set([`${keyword}：完整指南与实用方法`, `${keyword} - ${brand || "专业工具与解决方案"}`, `如何做好${keyword}？步骤、技巧与案例`])];
  return candidates.map((item, index) => `${index + 1}. ${item}\n   ${item.length} 字 · ${item.length >= 24 && item.length <= 32 ? "推荐长度" : "建议控制在 24–32 个中文字符"}`).join("\n\n");
}

function metaDescription(payload) {
  const keyword = required(payload.keyword, "KEYWORD_REQUIRED");
  const benefit = text(payload.benefit, 180) || "了解核心方法、实用步骤与常见问题";
  const description = `围绕${keyword}，${benefit}。立即查看完整指南，快速获得可执行的解决方案。`;
  return `${description}\n\n长度：${description.length} 个中文字符 · 建议根据实际搜索摘要控制在约 70–90 个中文字符，并确保与页面内容一致。`;
}

function robots(payload) {
  const origin = new URL(normalizeUrl(payload.website)).origin;
  const disallow = text(payload.disallow, 4000).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).map((item) => item.startsWith("/") ? item : `/${item}`);
  const allow = text(payload.allow, 4000).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).map((item) => item.startsWith("/") ? item : `/${item}`);
  return [`User-agent: *`, ...allow.map((item) => `Allow: ${item}`), ...disallow.map((item) => `Disallow: ${item}`), "", `Sitemap: ${text(payload.sitemap, 1000) || `${origin}/sitemap.xml`}`].join("\n");
}

async function sitemapCheck(payload, fetchImpl) {
  const website = normalizeUrl(payload.website);
  const input = new URL(website);
  const sitemapUrl = /\.xml(?:$|\?)/i.test(input.pathname) ? website : `${input.origin}/sitemap.xml`;
  const resource = await fetchSeoResource(sitemapUrl, { accept: "application/xml,text/xml,text/plain,*/*", ...(fetchImpl ? { fetchImpl } : {}) });
  const urls = [...resource.text.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)].map((match) => match[1].replace(/&amp;/g, "&").trim());
  const valid = urls.filter((value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } });
  const duplicates = valid.length - new Set(valid).size;
  return {
    text: `Sitemap：${resource.url}\nHTTP 状态：${resource.status}\nURL 总数：${urls.length}\n有效 URL：${valid.length}\n重复 URL：${duplicates}\n无效 URL：${urls.length - valid.length}\n\n${valid.slice(0, 20).map((url, index) => `${index + 1}. ${url}`).join("\n")}`,
    status: resource.status,
    urlCount: urls.length,
    duplicateCount: duplicates,
    invalidCount: urls.length - valid.length,
  };
}

const aiPrompts = {
  "xiaohongshu-copy": (p, locale) => locale === "en"
    ? `Create a Xiaohongshu-ready Chinese post about: ${required(p.topic)}. Audience: ${text(p.audience) || "general consumers"}. Tone: ${text(p.tone) || "natural and useful"}. Return 3 title options, the complete post with readable short paragraphs, 5-8 relevant hashtags, and a factual self-check. Do not invent personal experience or unverifiable claims.`
    : `围绕“${required(p.topic)}”生成可直接发布的小红书文案。目标人群：${text(p.audience) || "普通用户"}；语气：${text(p.tone) || "自然、有用、不夸张"}。请输出 3 个标题、完整正文（短段落、易读）、5-8 个相关标签，以及事实自检。不得虚构亲身体验、效果承诺或无法验证的数据。`,
  "content-repurposer": (p, locale) => locale === "en"
    ? `Repurpose the supplied source into platform-native versions for ${text(p.platforms) || "X, LinkedIn, Instagram"}. Preserve facts and intent. For each platform, provide a complete ready-to-publish version and note key adaptation choices. Source:\n${required(p.source)}`
    : `将下面的原始内容改写为适合“${text(p.platforms) || "小红书、公众号、LinkedIn、X"}”的平台原生版本。保留事实与核心观点，不虚构信息。每个平台输出一份可直接发布的完整内容，并简要说明适配逻辑。原始内容：\n${required(p.source)}`,
};

export const utilityToolSlugs = new Set([
  "json-formatter", "data-format-converter", "jwt-decoder", "timestamp-converter", "base64-url-codec", "regex-tester", "text-diff",
  "meta-title-generator", "meta-description-generator", "schema-generator", "serp-preview", "robots-generator", "sitemap-checker",
  "xiaohongshu-copy", "content-repurposer",
]);

export async function processUtilityTool({ slug, payload, locale = "zh-CN", modelText, fetchImpl }) {
  let output;
  if (slug === "json-formatter") {
    let value;
    try { value = JSON.parse(required(payload.source, "JSON_REQUIRED")); }
    catch (error) { if (error.code) throw error; throw fail("JSON_INVALID"); }
    output = { text: payload.mode === "minify" ? JSON.stringify(value) : pretty(value), valid: true };
  } else if (slug === "data-format-converter") {
    const value = parseStructured(required(payload.source), payload.inputFormat || "json");
    output = { text: stringifyStructured(value, payload.outputFormat || "yaml"), inputFormat: payload.inputFormat || "json", outputFormat: payload.outputFormat || "yaml" };
  } else if (slug === "jwt-decoder") {
    const decoded = jwtDecode(required(payload.token, "JWT_REQUIRED"));
    output = { text: pretty(decoded), ...decoded };
  }
  else if (slug === "timestamp-converter") {
    const raw = required(payload.value, "TIMESTAMP_REQUIRED");
    const numeric = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
    const date = numeric === null ? new Date(raw) : new Date(numeric < 1e12 ? numeric * 1000 : numeric);
    if (Number.isNaN(date.getTime())) throw fail("TIMESTAMP_INVALID");
    output = { text: `ISO 8601: ${date.toISOString()}\nUnix 秒: ${Math.floor(date.getTime() / 1000)}\nUnix 毫秒: ${date.getTime()}\n中国时间: ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "full", timeStyle: "long", timeZone: "Asia/Shanghai" }).format(date)}\nUTC: ${date.toUTCString()}` };
  } else if (slug === "base64-url-codec") {
    const source = required(payload.source);
    const operation = payload.operation || "base64-encode";
    const actions = { "base64-encode": () => Buffer.from(source, "utf8").toString("base64"), "base64-decode": () => Buffer.from(source, "base64").toString("utf8"), "url-encode": () => encodeURIComponent(source), "url-decode": () => decodeURIComponent(source) };
    if (!actions[operation]) throw fail("OPERATION_NOT_SUPPORTED");
    try { output = { text: actions[operation](), operation }; } catch { throw fail("DECODE_FAILED"); }
  } else if (slug === "regex-tester") {
    const pattern = safePattern(required(payload.pattern, "REGEX_REQUIRED"));
    let expression;
    try {
      const flags = String(payload.flags || "g").replace(/[^dgimsuvy]/g, "");
      expression = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
    } catch { throw fail("REGEX_INVALID"); }
    const source = text(payload.source, 20_000);
    const matches = [...source.matchAll(expression)].slice(0, 200).map((match) => ({ match: match[0], index: match.index, groups: match.slice(1) }));
    output = { text: `${matches.length} 个匹配\n\n${matches.map((item, index) => `${index + 1}. [${item.index}] ${item.match}${item.groups.length ? `\n   分组：${JSON.stringify(item.groups)}` : ""}`).join("\n") || "未找到匹配"}`, matchCount: matches.length, matches };
  } else if (slug === "text-diff") output = { text: lineDiff(text(payload.before), text(payload.after)), format: "unified-lines" };
  else if (slug === "meta-title-generator") output = { text: metaTitle(payload) };
  else if (slug === "meta-description-generator") output = { text: metaDescription(payload) };
  else if (slug === "schema-generator") output = { text: schemaPayload(payload), format: "json-ld" };
  else if (slug === "serp-preview") {
    const title = required(payload.title, "TITLE_REQUIRED"); const description = required(payload.description, "DESCRIPTION_REQUIRED"); const url = normalizeUrl(payload.url);
    output = { text: `${title}\n${url}\n${description}\n\n标题长度：${title.length} · 描述长度：${description.length}`, preview: { title, description, url }, titleLength: title.length, descriptionLength: description.length };
  } else if (slug === "robots-generator") output = { text: robots(payload), format: "robots.txt" };
  else if (slug === "sitemap-checker") output = await sitemapCheck(payload, fetchImpl);
  else if (aiPrompts[slug]) {
    const result = await modelText(aiPrompts[slug](payload, locale), text(payload.source || payload.topic, 30_000), slug);
    if (!result) throw fail("ONESH​OW_MODEL_UNAVAILABLE".replace("\u200b", ""), 503);
    output = { text: result.text, mode: "ai", route: result.route };
  } else throw fail("TOOL_ACTION_NOT_SUPPORTED", 404);

  const sensitive = ["jwt-decoder", "base64-url-codec"].includes(slug);
  return {
    output,
    safeInput: sensitive ? { operation: payload.operation || slug, sensitiveInputStored: false } : Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "modelConnectionId").map(([key, value]) => [key, text(value, 10_000)])),
  };
}
