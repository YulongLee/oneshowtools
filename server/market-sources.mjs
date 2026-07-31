import { createHash } from "node:crypto";

const DAY_MS = 86_400_000;
const SOURCE_TIMEOUT_MS = 12_000;
const MAX_SIGNALS = 100;

export const MARKET_CATEGORIES = [
  { id: "Writing", terms: ["writing", "copywriting", "rewrite", "grammar", "文案", "写作", "润色"] },
  { id: "SEO", terms: ["seo", "keyword", "serp", "backlink", "搜索优化", "关键词"] },
  { id: "Marketing", terms: ["marketing", "campaign", "advertising", "lead generation", "营销", "广告", "获客"] },
  { id: "Developer", terms: ["developer", "coding", "code", "api", "github", "programming", "开发", "代码"] },
  { id: "Startup", terms: ["startup", "founder", "mvp", "saas", "entrepreneur", "创业", "商业计划"] },
  { id: "Productivity", terms: ["productivity", "workflow", "office", "pdf", "document", "meeting", "办公", "效率", "文档"] },
  { id: "Social", terms: ["social media", "instagram", "tiktok", "linkedin", "twitter", "社媒", "小红书"] },
  { id: "Data", terms: ["data", "analytics", "spreadsheet", "excel", "csv", "database", "数据", "表格"] },
  { id: "Search", terms: ["search", "research", "answer engine", "citation", "搜索", "研究", "引用"] },
  { id: "Image", terms: ["image", "photo", "background remover", "design", "图片", "图像", "设计"] },
  { id: "Video", terms: ["video", "subtitle", "clip", "youtube", "视频", "字幕", "剪辑"] },
  { id: "Audio", terms: ["audio", "speech", "voice", "podcast", "transcription", "音频", "语音", "播客"] },
  { id: "AI Agent", terms: ["ai agent", "agentic", "copilot", "autonomous agent", "智能体", "代理"] },
];

const SOURCE_DEFINITIONS = [
  { key: "hacker_news", label: "Hacker News", type: "community", credential: null },
  { key: "github_repositories", label: "GitHub Repositories", type: "product", credential: null },
  { key: "github_issues", label: "GitHub Issues", type: "pain", credential: null },
  { key: "dev_community", label: "DEV Community", type: "community", credential: null },
  { key: "stack_exchange", label: "Stack Exchange", type: "pain", credential: null },
  { key: "v2ex", label: "V2EX", type: "cn_community", credential: null },
  { key: "sspai", label: "少数派", type: "cn_productivity", credential: null },
  { key: "kr36", label: "36氪", type: "cn_startup", credential: null },
  { key: "ithome", label: "IT之家", type: "cn_technology", credential: null },
  { key: "infoq_cn", label: "InfoQ 中文", type: "cn_developer", credential: null },
  { key: "gitee", label: "Gitee", type: "cn_product", credential: "GITEE_ACCESS_TOKEN" },
  { key: "product_hunt", label: "Product Hunt", type: "product", credential: "PRODUCT_HUNT_TOKEN" },
  { key: "youtube", label: "YouTube", type: "social", credential: "YOUTUBE_API_KEY" },
  { key: "search_console", label: "Google Search Console", type: "first_party_search", credential: "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN" },
  { key: "reddit", label: "Reddit", type: "community", credential: "REDDIT_ACCESS_TOKEN" },
  { key: "google_ads", label: "Google Ads Keyword Planner", type: "search_demand", credential: "GOOGLE_ADS_DEVELOPER_TOKEN" },
  { key: "google_trends", label: "Google Trends API", type: "search_trend", credential: "GOOGLE_TRENDS_ALPHA_ACCESS", adapter: false },
];

const TRUST_SCORES = {
  search_console: 92, stack_exchange: 80, github_issues: 80, product_hunt: 76,
  google_ads: 88, gitee: 76, v2ex: 74, infoq_cn: 72, sspai: 70, kr36: 68, ithome: 66,
  github_repositories: 72, youtube: 70, hacker_news: 68, reddit: 66, dev_community: 60,
};
const PAIN_PATTERN = /\b(need|wish|problem|pain|difficult|hard to|how (?:do|can)|alternative|missing|request|help|automate|manual|time[- ]consuming|can't|cannot)\b|需求|希望|问题|麻烦|困难|替代|自动化|手动|耗时/i;
const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"]);
const CN_RELEVANCE_PATTERN = /人工智能|\bAI\b|大模型|智能体|自动化|效率|办公|写作|文案|SEO|营销|获客|开发|编程|代码|创业|SaaS|社交媒体|数据|搜索|图片|图像|视频|音频|语音|工具|软件|应用|工作流|模型|Agent/i;

const clean = (value, maximum = 600) => String(value || "").replace(/<[^>]*>/g, " ").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, maximum);
const isoDate = (value) => {
  if (!value) return null;
  const parsed = typeof value === "number" && value < 10_000_000_000 ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const localeFor = (text) => /[\u3400-\u9fff]/.test(text) ? "zh-CN" : "en";

function canonicalUrl(raw) {
  try {
    const url = new URL(String(raw || ""));
    if (url.protocol !== "https:") return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}

export function detectMarketCategory(value, hint = null) {
  if (MARKET_CATEGORIES.some((category) => category.id === hint)) return hint;
  const text = String(value || "").toLowerCase();
  let best = { id: "Productivity", matches: 0 };
  for (const category of MARKET_CATEGORIES) {
    const matches = category.terms.reduce((count, term) => count + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
    if (matches > best.matches) best = { id: category.id, matches };
  }
  return best.id;
}

function fingerprint(title, url) {
  const normalizedTitle = clean(title, 240).toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, " ").trim();
  let hostPath = url;
  try { const parsed = new URL(url); hostPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase(); } catch {}
  return createHash("sha256").update(`${normalizedTitle}|${hostPath}`).digest("hex").slice(0, 24);
}

function qualityScore(sourceKey, item, now) {
  const publishedAt = isoDate(item.publishedAt);
  const age = publishedAt ? Math.max(0, now - new Date(publishedAt).getTime()) : 365 * DAY_MS;
  const recency = age <= 7 * DAY_MS ? 10 : age <= 30 * DAY_MS ? 6 : age <= 90 * DAY_MS ? 2 : 0;
  const engagement = Math.min(12, Math.round(Math.log10(Math.max(0, Number(item.engagement || 0)) + 1) * 5));
  const pain = PAIN_PATTERN.test(`${item.title || ""} ${item.description || ""}`) ? 8 : 0;
  return Math.min(100, (TRUST_SCORES[sourceKey] || 55) + recency + engagement + pain);
}

function normalizeSignal(definition, item, now) {
  const title = clean(item.title, 240);
  const url = canonicalUrl(item.url);
  if (!title || !url) return null;
  const description = clean(item.description, 600);
  return {
    sourceKey: definition.key,
    source: definition.label,
    sourceType: definition.type,
    signalKind: item.signalKind || definition.type,
    category: detectMarketCategory(`${title} ${description}`, item.category),
    locale: localeFor(`${title} ${description}`),
    title, url, description,
    publishedAt: isoDate(item.publishedAt),
    engagement: Math.max(0, Number(item.engagement || 0)),
    qualityScore: qualityScore(definition.key, item, now),
    fingerprint: fingerprint(title, url),
  };
}

async function fetchJson(url, { fetchImpl, headers = {}, method = "GET", body = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method, body, signal: controller.signal,
      headers: { "user-agent": "OneShowTools-Market-Intelligence/2.0", ...headers },
    });
    if (!response.ok) throw Object.assign(new Error(`SOURCE_HTTP_${response.status}`), { code: `SOURCE_HTTP_${response.status}` });
    return response.json();
  } finally { clearTimeout(timer); }
}

async function fetchText(url, { fetchImpl, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { "user-agent": "OneShowTools-Market-Intelligence/2.0", ...headers } });
    if (!response.ok) throw Object.assign(new Error(`SOURCE_HTTP_${response.status}`), { code: `SOURCE_HTTP_${response.status}` });
    const text = await response.text();
    if (text.length > 2_000_000) throw Object.assign(new Error("SOURCE_RESPONSE_TOO_LARGE"), { code: "SOURCE_RESPONSE_TOO_LARGE" });
    return text;
  } finally { clearTimeout(timer); }
}

function decodeXml(value) {
  return clean(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&apos;/g, "'"), 1200);
}

function rssTag(item, names) {
  for (const name of names) {
    const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function parseRss(xml) {
  const items = [...String(xml || "").matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 80);
  return items.map((match) => {
    const item = match[1];
    const href = item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    return {
      title: rssTag(item, ["title"]),
      url: href || rssTag(item, ["link", "guid"]),
      description: rssTag(item, ["description", "summary", "content:encoded", "content"]),
      publishedAt: rssTag(item, ["pubDate", "published", "updated", "dc:date"]),
      signalKind: "cn_editorial",
    };
  }).filter((item) => item.title && item.url && CN_RELEVANCE_PATTERN.test(`${item.title} ${item.description}`));
}

async function googleAccessToken(fetchImpl, env) {
  if (env.GOOGLE_OAUTH_ACCESS_TOKEN || env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) return env.GOOGLE_OAUTH_ACCESS_TOKEN || env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
  const payload = new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: "refresh_token" });
  const data = await fetchJson("https://oauth2.googleapis.com/token", { fetchImpl, method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: payload.toString() });
  if (!data.access_token) throw Object.assign(new Error("SOURCE_OAUTH_FAILED"), { code: "SOURCE_OAUTH_FAILED" });
  return data.access_token;
}

async function redditAccessToken(fetchImpl, env) {
  if (env.REDDIT_ACCESS_TOKEN) return env.REDDIT_ACCESS_TOKEN;
  const basic = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const payload = new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.REDDIT_REFRESH_TOKEN });
  const data = await fetchJson("https://www.reddit.com/api/v1/access_token", { fetchImpl, method: "POST", headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" }, body: payload.toString() });
  if (!data.access_token) throw Object.assign(new Error("SOURCE_OAUTH_FAILED"), { code: "SOURCE_OAUTH_FAILED" });
  return data.access_token;
}

const collectors = {
  async hacker_news({ fetchImpl, now }) {
    const since = Math.floor((now - 30 * DAY_MS) / 1000);
    const queries = MARKET_CATEGORIES.map((category) => ({ category: category.id, query: `AI ${category.id.toLowerCase()} tool` }));
    const pages = await Promise.all(queries.map(({ query }) => fetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${since}&hitsPerPage=6`, { fetchImpl })));
    return pages.flatMap((data, index) => (data.hits || []).map((hit) => ({
      title: hit.title, url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      description: hit.story_text, publishedAt: hit.created_at,
      engagement: Number(hit.points || 0) + Number(hit.num_comments || 0) * 2,
      category: queries[index].category,
    })));
  },
  async github_repositories({ fetchImpl, now, env }) {
    const created = new Date(now - 30 * DAY_MS).toISOString().slice(0, 10);
    const headers = { accept: "application/vnd.github+json", ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) };
    const data = await fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(`AI tool created:>${created}`)}&sort=stars&order=desc&per_page=30`, { fetchImpl, headers });
    return (data.items || []).map((repo) => ({ title: repo.full_name, url: repo.html_url, description: repo.description, publishedAt: repo.created_at, engagement: repo.stargazers_count, signalKind: "product" }));
  },
  async github_issues({ fetchImpl, now, env }) {
    const created = new Date(now - 45 * DAY_MS).toISOString().slice(0, 10);
    const headers = { accept: "application/vnd.github+json", ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) };
    const data = await fetchJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`is:issue is:open created:>${created} (AI OR automation) in:title,body`)}&sort=comments&order=desc&per_page=30`, { fetchImpl, headers });
    return (data.items || []).filter((issue) => !issue.pull_request).map((issue) => ({ title: issue.title, url: issue.html_url, description: issue.body, publishedAt: issue.created_at, engagement: Number(issue.comments || 0) * 3 + Number(issue.reactions?.total_count || 0), signalKind: "pain" }));
  },
  async dev_community({ fetchImpl }) {
    const tags = ["ai", "productivity", "webdev", "marketing"];
    const pages = await Promise.all(tags.map((tag) => fetchJson(`https://dev.to/api/articles?tag=${tag}&per_page=12&top=30`, { fetchImpl, headers: { accept: "application/json" } })));
    return pages.flatMap((data) => (Array.isArray(data) ? data : []).map((article) => ({ title: article.title, url: article.url, description: article.description, publishedAt: article.published_at, engagement: Number(article.public_reactions_count || 0) + Number(article.comments_count || 0) * 2 })));
  },
  async stack_exchange({ fetchImpl, now }) {
    const fromdate = Math.floor((now - 60 * DAY_MS) / 1000);
    const sites = ["stackoverflow", "superuser", "webapps"];
    const pages = await Promise.all(sites.map((site) => fetchJson(`https://api.stackexchange.com/2.3/search/advanced?site=${site}&q=${encodeURIComponent("AI automation tool")}&fromdate=${fromdate}&order=desc&sort=activity&pagesize=25`, { fetchImpl })));
    return pages.flatMap((data) => (data.items || []).map((question) => ({
      title: question.title, url: question.link, description: (question.tags || []).join(", "), publishedAt: question.creation_date,
      engagement: Number(question.score || 0) + Number(question.answer_count || 0) * 3 + Math.log10(Number(question.view_count || 0) + 1) * 3,
      signalKind: "pain",
    })));
  },
  async v2ex({ fetchImpl, env }) {
    const pages = env.V2EX_ACCESS_TOKEN
      ? await Promise.all(["ideas", "create", "programmer", "share"].map((node) => fetchJson(`https://www.v2ex.com/api/v2/nodes/${node}/topics?p=1`, { fetchImpl, headers: { authorization: `Bearer ${env.V2EX_ACCESS_TOKEN}` } })))
      : await Promise.all([
        fetchJson("https://www.v2ex.com/api/topics/hot.json", { fetchImpl }),
        fetchJson("https://www.v2ex.com/api/topics/latest.json", { fetchImpl }),
      ]);
    const unique = new Map();
    const topics = pages.flatMap((page) => Array.isArray(page) ? page : page.result || page.data || page.topics || []);
    for (const topic of topics) {
      const title = topic.title || "";
      const description = topic.content_rendered || topic.content || "";
      if (!CN_RELEVANCE_PATTERN.test(`${title} ${description}`)) continue;
      unique.set(topic.id, { title, url: topic.url || `https://www.v2ex.com/t/${topic.id}`, description, publishedAt: topic.created, engagement: Number(topic.replies || 0) * 3, signalKind: "pain" });
    }
    return [...unique.values()];
  },
  async sspai({ fetchImpl }) { return parseRss(await fetchText("https://sspai.com/feed", { fetchImpl })); },
  async kr36({ fetchImpl }) { return parseRss(await fetchText("https://36kr.com/feed", { fetchImpl })); },
  async ithome({ fetchImpl }) { return parseRss(await fetchText("https://www.ithome.com/rss/", { fetchImpl })); },
  async infoq_cn({ fetchImpl }) { return parseRss(await fetchText("https://www.infoq.cn/feed", { fetchImpl })); },
  async gitee({ fetchImpl, env }) {
    const queries = ["AI工具", "大模型", "智能体", "自动化"];
    const pages = await Promise.all(queries.map((query) => fetchJson(`https://gitee.com/api/v5/search/repositories?q=${encodeURIComponent(query)}&page=1&per_page=20&access_token=${encodeURIComponent(env.GITEE_ACCESS_TOKEN)}`, { fetchImpl, headers: { accept: "application/json" } })));
    return pages.flatMap((items) => (Array.isArray(items) ? items : []).map((repo) => ({
      title: repo.full_name || repo.name, url: repo.html_url, description: repo.description,
      publishedAt: repo.created_at || repo.updated_at, engagement: Number(repo.stargazers_count || repo.stars_count || 0), signalKind: "cn_product",
    })));
  },
  async product_hunt({ fetchImpl, now, env }) {
    const query = `query MarketPosts($first: Int!, $postedAfter: DateTime!) { posts(first: $first, postedAfter: $postedAfter, order: VOTES) { nodes { name tagline url createdAt votesCount commentsCount topics(first: 5) { nodes { name } } } } }`;
    const data = await fetchJson("https://api.producthunt.com/v2/api/graphql", {
      fetchImpl, method: "POST", headers: { authorization: `Bearer ${env.PRODUCT_HUNT_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { first: 30, postedAfter: new Date(now - 30 * DAY_MS).toISOString() } }),
    });
    if (data.errors?.length) throw Object.assign(new Error("SOURCE_GRAPHQL_ERROR"), { code: "SOURCE_GRAPHQL_ERROR" });
    return (data.data?.posts?.nodes || []).map((post) => ({ title: post.name, url: post.url, description: `${post.tagline || ""} ${(post.topics?.nodes || []).map((topic) => topic.name).join(", ")}`, publishedAt: post.createdAt, engagement: Number(post.votesCount || 0) + Number(post.commentsCount || 0) * 2, signalKind: "product" }));
  },
  async youtube({ fetchImpl, now, env }) {
    const publishedAfter = new Date(now - 30 * DAY_MS).toISOString();
    const queries = ["best AI writing tools", "AI SEO marketing tools", "AI productivity automation tools", "AI image video tools", "AI developer agent tools"];
    const pages = await Promise.all(queries.map((query) => fetchJson(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=10&relevanceLanguage=en&publishedAfter=${encodeURIComponent(publishedAfter)}&q=${encodeURIComponent(query)}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`, { fetchImpl })));
    const videos = pages.flatMap((page) => page.items || []);
    const ids = [...new Set(videos.map((video) => video.id?.videoId).filter(Boolean))];
    const stats = ids.length ? await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`, { fetchImpl }) : { items: [] };
    const statistics = new Map((stats.items || []).map((item) => [item.id, item.statistics || {}]));
    return videos.map((video) => { const stat = statistics.get(video.id.videoId) || {}; return { title: video.snippet?.title, url: `https://www.youtube.com/watch?v=${video.id.videoId}`, description: video.snippet?.description, publishedAt: video.snippet?.publishedAt, engagement: Math.log10(Number(stat.viewCount || 0) + 1) * 10 + Number(stat.likeCount || 0) / 100 + Number(stat.commentCount || 0), signalKind: "social" }; });
  },
  async search_console({ fetchImpl, now, env }) {
    if (!env.GOOGLE_SEARCH_CONSOLE_SITE_URL) throw Object.assign(new Error("SOURCE_SITE_NOT_CONFIGURED"), { code: "SOURCE_SITE_NOT_CONFIGURED" });
    const endDate = new Date(now - 3 * DAY_MS).toISOString().slice(0, 10);
    const startDate = new Date(now - 33 * DAY_MS).toISOString().slice(0, 10);
    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env.GOOGLE_SEARCH_CONSOLE_SITE_URL)}/searchAnalytics/query`;
    const accessToken = await googleAccessToken(fetchImpl, env);
    const data = await fetchJson(endpoint, { fetchImpl, method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ startDate, endDate, dimensions: ["query", "page"], rowLimit: 100, dataState: "final" }) });
    return (data.rows || []).map((row) => ({ title: `Search demand: ${row.keys?.[0] || "Unknown query"}`, url: row.keys?.[1], description: `Impressions ${row.impressions || 0}; clicks ${row.clicks || 0}; CTR ${Number(row.ctr || 0).toFixed(4)}; position ${Number(row.position || 0).toFixed(1)}`, publishedAt: endDate, engagement: Number(row.impressions || 0) + Number(row.clicks || 0) * 10, signalKind: "first_party_search" }));
  },
  async reddit({ fetchImpl, now, env }) {
    const after = Math.floor((now - 30 * DAY_MS) / 1000);
    const accessToken = await redditAccessToken(fetchImpl, env);
    const subreddits = ["SaaS", "productivity", "artificial", "Entrepreneur"];
    const pages = await Promise.all(subreddits.map((subreddit) => fetchJson(`https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent("AI tool automation")}&restrict_sr=1&sort=top&t=month&limit=20`, { fetchImpl, headers: { authorization: `Bearer ${accessToken}` } })));
    return pages.flatMap((page) => (page.data?.children || []).map(({ data: post }) => ({ title: post.title, url: `https://www.reddit.com${post.permalink}`, description: post.selftext, publishedAt: post.created_utc || after, engagement: Number(post.score || 0) + Number(post.num_comments || 0) * 2, signalKind: "pain" })));
  },
  async google_ads({ fetchImpl, now, env }) {
    const accessToken = await googleAccessToken(fetchImpl, env);
    const version = env.GOOGLE_ADS_API_VERSION || "v25";
    const customerId = String(env.GOOGLE_ADS_CUSTOMER_ID).replace(/\D/g, "");
    const headers = {
      authorization: `Bearer ${accessToken}`, "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN,
      "content-type": "application/json", ...(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? { "login-customer-id": String(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID).replace(/\D/g, "") } : {}),
    };
    const keywords = MARKET_CATEGORIES.flatMap((category) => category.terms.filter((term) => !/[\u3400-\u9fff]/.test(term)).slice(0, 2));
    const body = {
      language: `languageConstants/${env.GOOGLE_ADS_LANGUAGE_ID || "1000"}`,
      geoTargetConstants: [`geoTargetConstants/${env.GOOGLE_ADS_GEO_TARGET_ID || "2840"}`],
      includeAdultKeywords: false, keywordPlanNetwork: "GOOGLE_SEARCH",
      keywordSeed: { keywords },
    };
    const data = await fetchJson(`https://googleads.googleapis.com/${version}/customers/${customerId}:generateKeywordIdeas`, { fetchImpl, method: "POST", headers, body: JSON.stringify(body) });
    return (data.results || []).slice(0, 100).map((idea) => ({
      title: `Search demand: ${idea.text}`, url: "https://ads.google.com/aw/keywordplanner/home",
      description: `Average monthly searches ${idea.keywordIdeaMetrics?.avgMonthlySearches || 0}; competition ${idea.keywordIdeaMetrics?.competition || "UNSPECIFIED"}; competition index ${idea.keywordIdeaMetrics?.competitionIndex || 0}`,
      publishedAt: now, engagement: Number(idea.keywordIdeaMetrics?.avgMonthlySearches || 0), signalKind: "search_demand",
    }));
  },
};

function configured(definition, env) {
  const googleOAuth = Boolean(env.GOOGLE_OAUTH_ACCESS_TOKEN || env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REFRESH_TOKEN));
  if (definition.key === "search_console") return Boolean(env.GOOGLE_SEARCH_CONSOLE_SITE_URL && googleOAuth);
  if (definition.key === "google_ads") return Boolean(env.GOOGLE_ADS_DEVELOPER_TOKEN && env.GOOGLE_ADS_CUSTOMER_ID && googleOAuth);
  if (definition.key === "reddit") return Boolean(env.REDDIT_ACCESS_TOKEN || (env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET && env.REDDIT_REFRESH_TOKEN));
  return !definition.credential || Boolean(env[definition.credential]);
}

export function marketSourceCatalog(env = process.env) {
  return SOURCE_DEFINITIONS.map((definition) => ({
    key: definition.key, label: definition.label, type: definition.type,
    configured: configured(definition, env),
    status: definition.adapter === false ? (definition.key === "google_trends" ? "early_access_required" : "adapter_planned") : (configured(definition, env) ? "ready" : "configuration_required"),
  }));
}

function selectBalanced(signals) {
  const sorted = [...signals].sort((a, b) => b.qualityScore - a.qualityScore || b.engagement - a.engagement);
  const selected = [];
  const selectedFingerprints = new Set();
  const sourceCounts = new Map();
  const categoryCounts = new Map();
  const add = (signal) => {
    if (selectedFingerprints.has(signal.fingerprint)) return false;
    if ((sourceCounts.get(signal.sourceKey) || 0) >= 16) return false;
    if ((categoryCounts.get(signal.category) || 0) >= 12) return false;
    selected.push(signal);
    selectedFingerprints.add(signal.fingerprint);
    sourceCounts.set(signal.sourceKey, (sourceCounts.get(signal.sourceKey) || 0) + 1);
    categoryCounts.set(signal.category, (categoryCounts.get(signal.category) || 0) + 1);
    return true;
  };
  for (const category of MARKET_CATEGORIES) {
    const best = sorted.find((signal) => signal.category === category.id);
    if (best) add(best);
  }
  for (const signal of sorted) {
    add(signal);
    if (selected.length >= MAX_SIGNALS) break;
  }
  return selected.map((signal, index) => ({ ...signal, id: `E${index + 1}` }));
}

export async function collectMarketSignals({ fetchImpl = fetch, now = Date.now(), env = process.env } = {}) {
  const all = [];
  const health = [];
  const runnable = SOURCE_DEFINITIONS.filter((definition) => definition.adapter !== false);
  await Promise.all(runnable.map(async (definition) => {
    const startedAt = Date.now();
    if (!configured(definition, env)) {
      health.push({ key: definition.key, label: definition.label, type: definition.type, status: "configuration_required", configured: false, itemCount: 0, durationMs: 0, errorCode: null, collectedAt: now });
      return;
    }
    try {
      const items = await collectors[definition.key]({ fetchImpl, now, env });
      const normalized = items.map((item) => normalizeSignal(definition, item, now)).filter(Boolean);
      all.push(...normalized);
      health.push({ key: definition.key, label: definition.label, type: definition.type, status: normalized.length ? "healthy" : "empty", configured: true, itemCount: normalized.length, durationMs: Date.now() - startedAt, errorCode: null, collectedAt: now });
    } catch (error) {
      health.push({ key: definition.key, label: definition.label, type: definition.type, status: "failed", configured: true, itemCount: 0, durationMs: Date.now() - startedAt, errorCode: error?.code || (error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_UNAVAILABLE"), collectedAt: now });
    }
  }));
  for (const definition of SOURCE_DEFINITIONS.filter((item) => item.adapter === false)) {
    const catalog = marketSourceCatalog(env).find((item) => item.key === definition.key);
    health.push({ ...catalog, itemCount: 0, durationMs: 0, errorCode: null, collectedAt: now });
  }
  const unique = new Map();
  for (const signal of all) {
    const existing = unique.get(signal.fingerprint);
    if (!existing || signal.qualityScore > existing.qualityScore) unique.set(signal.fingerprint, signal);
  }
  const signals = selectBalanced([...unique.values()]);
  const failures = health.filter((item) => item.status === "failed").map((item) => ({ source: item.label, sourceKey: item.key, error: item.errorCode }));
  const coverage = MARKET_CATEGORIES.map((category) => ({ category: category.id, count: signals.filter((signal) => signal.category === category.id).length }));
  return { signals, failures, health: health.sort((a, b) => a.label.localeCompare(b.label)), coverage };
}
