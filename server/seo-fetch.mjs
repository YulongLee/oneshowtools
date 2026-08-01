import dns from "node:dns/promises";
import { isIP } from "node:net";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "OneShowTools-SEO-Audit/1.0 (+https://oneshowtools.com)";
const fail = (code, status = 422) => Object.assign(new Error(code), { code, status });

function privateAddress(address) {
  const value = String(address).toLowerCase();
  if (["::", "::1", "0.0.0.0"].includes(value) || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("::ffff:")) return privateAddress(value.slice(7));
  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

export async function safeSeoUrl(raw) {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch { throw fail("SEO_INVALID_URL", 400); }
  const test = process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_SEO_ENDPOINTS === "true";
  if (url.username || url.password) throw fail("SEO_URL_BLOCKED", 400);
  if (!["http:", "https:"].includes(url.protocol)) throw fail("SEO_HTTP_REQUIRED", 400);
  const defaultPort = url.protocol === "https:" ? 443 : 80;
  if (!test && ![80, 443].includes(Number(url.port || defaultPort))) throw fail("SEO_URL_BLOCKED", 400);
  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw fail("SEO_HOST_NOT_FOUND", 422);
  if (!test && addresses.some(({ address }) => privateAddress(address))) throw fail("SEO_URL_BLOCKED", 400);
  url.hash = "";
  return url;
}

async function boundedText(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) throw fail("SEO_RESPONSE_TOO_LARGE", 422);
  const raw = await response.arrayBuffer();
  if (raw.byteLength > MAX_BYTES) throw fail("SEO_RESPONSE_TOO_LARGE", 422);
  return new TextDecoder("utf-8").decode(raw);
}

export async function fetchSeoResource(rawUrl, { method = "GET", accept = "text/html,application/xhtml+xml,text/plain,application/xml", fetchImpl = fetch } = {}) {
  let current = await safeSeoUrl(rawUrl);
  const redirects = [];
  for (let step = 0; step <= MAX_REDIRECTS; step += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(current, { method, redirect: "manual", signal: controller.signal, headers: { accept, "user-agent": USER_AGENT } });
    } catch (cause) {
      if (cause?.name === "AbortError") throw fail("SEO_FETCH_TIMEOUT", 504);
      throw fail("SEO_FETCH_FAILED", 502);
    } finally { clearTimeout(timer); }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || step === MAX_REDIRECTS) throw fail("SEO_REDIRECT_LIMIT", 422);
      const next = await safeSeoUrl(new URL(location, current).href);
      redirects.push({ from: current.href, to: next.href, status: response.status });
      current = next;
      continue;
    }
    return { url: current.href, status: response.status, headers: Object.fromEntries(response.headers.entries()), redirects, text: method === "HEAD" ? "" : await boundedText(response) };
  }
  throw fail("SEO_REDIRECT_LIMIT", 422);
}

const clean = (value, max = 4000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
const absolute = (href, base) => { if (typeof href !== "string" || !href.trim()) return ""; try { return new URL(href, base).href.split("#")[0]; } catch { return ""; } };

export function parseSeoPage(resource, evidenceId = "P1") {
  const $ = cheerio.load(resource.text || "");
  $("script,style,noscript,template,svg").remove();
  const title = clean($("title").first().text(), 240);
  const description = clean($("meta[name='description']").attr("content"), 500);
  const headings = $("h1,h2,h3").slice(0, 40).map((_, node) => ({ level: node.tagName.toUpperCase(), text: clean($(node).text(), 240) })).get();
  const images = $("img").slice(0, 100).map((_, node) => ({ src: absolute($(node).attr("src"), resource.url), alt: clean($(node).attr("alt"), 240), loading: clean($(node).attr("loading"), 20), width: Number($(node).attr("width") || 0) || null, height: Number($(node).attr("height") || 0) || null })).get();
  const links = $("a[href]").slice(0, 250).map((_, node) => ({ url: absolute($(node).attr("href"), resource.url), text: clean($(node).text(), 160), rel: clean($(node).attr("rel"), 100) })).get().filter((item) => /^https?:/.test(item.url));
  const bodyText = clean($("body").text(), 80_000);
  return {
    evidenceId, requestedUrl: resource.redirects[0]?.from || resource.url, finalUrl: resource.url, status: resource.status, redirects: resource.redirects,
    title, description, canonical: absolute($("link[rel='canonical']").attr("href"), resource.url), robots: clean($("meta[name='robots']").attr("content"), 200),
    lang: clean($("html").attr("lang"), 30), viewport: clean($("meta[name='viewport']").attr("content"), 200), headings, images, links,
    h1Count: headings.filter((item) => item.level === "H1").length, wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    textSample: bodyText.slice(0, 12_000), contentHash: createHash("sha256").update(bodyText.slice(0, 50_000)).digest("hex").slice(0, 20),
  };
}

export async function fetchSeoPage(url, evidenceId = "P1", fetchImpl = fetch) {
  const resource = await fetchSeoResource(url, { fetchImpl });
  const type = resource.headers["content-type"] || "";
  if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw fail("SEO_HTML_REQUIRED", 422);
  return parseSeoPage(resource, evidenceId);
}

function xmlLocations(xml) {
  return [...String(xml || "").matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)].map((match) => clean(match[1].replace(/&amp;/g, "&"), 2000)).filter(Boolean);
}

export async function inspectSite(rawUrl, { maxPages = 5, checkLinks = true, fetchImpl = fetch } = {}) {
  const rootUrl = await safeSeoUrl(rawUrl);
  const root = await fetchSeoPage(rootUrl.href, "P1", fetchImpl);
  const origin = new URL(root.finalUrl).origin;
  let robots = { url: `${origin}/robots.txt`, status: null, text: "", sitemaps: [] };
  try {
    const resource = await fetchSeoResource(robots.url, { accept: "text/plain,*/*", fetchImpl });
    robots = { url: resource.url, status: resource.status, text: clean(resource.text, 30_000), sitemaps: [...resource.text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1]) };
  } catch (error) { robots.errorCode = error.code; }
  const sitemapCandidates = [...new Set([...robots.sitemaps, `${origin}/sitemap.xml`])].slice(0, 3);
  const sitemaps = [];
  for (const candidate of sitemapCandidates) {
    try {
      const resource = await fetchSeoResource(candidate, { accept: "application/xml,text/xml,text/plain,*/*", fetchImpl });
      sitemaps.push({ url: resource.url, status: resource.status, locations: xmlLocations(resource.text).slice(0, 1000) });
    } catch (error) { sitemaps.push({ url: candidate, status: null, errorCode: error.code, locations: [] }); }
  }
  const discovered = [...new Set(sitemaps.flatMap((item) => item.locations).filter((url) => { try { return new URL(url).origin === origin; } catch { return false; } }))];
  const internalFromRoot = root.links.map((item) => item.url).filter((url) => { try { return new URL(url).origin === origin; } catch { return false; } });
  const pageUrls = [...new Set([root.finalUrl, ...discovered, ...internalFromRoot])].slice(0, Math.max(1, Math.min(10, maxPages)));
  const pages = [root];
  for (const url of pageUrls.slice(1)) {
    try { pages.push(await fetchSeoPage(url, `P${pages.length + 1}`, fetchImpl)); }
    catch (error) { pages.push({ evidenceId: `P${pages.length + 1}`, requestedUrl: url, finalUrl: url, status: null, errorCode: error.code, headings: [], images: [], links: [] }); }
  }
  const checkedLinks = [];
  if (checkLinks) {
    const candidates = [...new Set(pages.flatMap((page) => page.links || []).map((item) => item.url))].slice(0, 20);
    for (const url of candidates) {
      try { const result = await fetchSeoResource(url, { method: "HEAD", accept: "*/*", fetchImpl }); checkedLinks.push({ url, status: result.status, finalUrl: result.url }); }
      catch (error) { checkedLinks.push({ url, status: null, errorCode: error.code }); }
    }
  }
  return { requestedUrl: rawUrl, origin, coverage: { pagesAttempted: pageUrls.length, pagesParsed: pages.filter((p) => p.status).length, linksChecked: checkedLinks.length, sitemapUrlsFound: discovered.length }, robots, sitemaps, pages, checkedLinks };
}

export async function inspectPageSpeed(rawUrl, fetchImpl = fetch) {
  const url = await safeSeoUrl(rawUrl);
  const endpoint = new URL("https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url.href);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["performance", "seo", "accessibility", "best-practices"]) endpoint.searchParams.append("category", category);
  if (process.env.GOOGLE_PAGESPEED_API_KEY) endpoint.searchParams.set("key", process.env.GOOGLE_PAGESPEED_API_KEY);
  try {
    const response = await fetchImpl(endpoint, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) return { available: false, errorCode: `PAGESPEED_${response.status}` };
    const data = await response.json();
    const categories = data.lighthouseResult?.categories || {};
    return { available: true, fetchedAt: data.analysisUTCTimestamp || new Date().toISOString(), scores: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, Math.round(Number(value.score || 0) * 100)])) };
  } catch { return { available: false, errorCode: "PAGESPEED_UNAVAILABLE" }; }
}
