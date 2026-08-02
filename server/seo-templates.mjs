const field = (id, zh, en, type = "text", required = false, placeholderZh = "", placeholderEn = "", extra = {}) => ({ id, label: { zh, en }, type, required, placeholder: { zh: placeholderZh, en: placeholderEn }, ...extra });
const website = field("website", "网站 URL", "Website URL", "url", true, "https://example.com", "https://example.com");
const topic = field("topic", "主题", "Topic", "text", true, "例如：AI 写作工具", "For example: AI writing tools");
const keywords = field("keywords", "关键词", "Keywords", "tags", true, "用逗号分隔", "Separate with commas");
const country = field("country", "目标国家/地区", "Country / region", "text", false, "中国、美国…", "China, United States…");
const language = field("language", "目标语言", "Language", "text", false, "简体中文", "English");
const searchEngine = field("searchEngine", "搜索引擎", "Search engine", "select", true, "", "", {
  defaultValue: "google",
  options: [
    { value: "google", label: { zh: "Google（全球市场）", en: "Google (global markets)" } },
    { value: "baidu", label: { zh: "百度（中国大陆）", en: "Baidu (Mainland China)" } },
  ],
});
const device = field("device", "搜索设备", "Search device", "select", true, "", "", {
  defaultValue: "desktop",
  options: [
    { value: "desktop", label: { zh: "电脑端", en: "Desktop" } },
    { value: "mobile", label: { zh: "移动端", en: "Mobile" } },
  ],
});
const content = field("content", "文章内容", "Content", "textarea", true, "粘贴需要分析的正文…", "Paste the content to analyze…");
const competitors = field("competitors", "竞争网站", "Competitor URLs", "textarea", true, "每行一个 URL，最多 3 个", "One URL per line, up to 3");
const audience = field("audience", "目标用户", "Target audience", "text", true, "例如：中小企业营销负责人", "For example: marketing leaders at small businesses");
const goal = field("goal", "业务目标", "Business goal", "text", true, "例如：获得产品试用注册", "For example: generate product trial sign-ups");
const performanceData = field("performanceData", "真实表现数据", "Observed performance data", "textarea", true, "粘贴 GSC、GA4、百度统计或排名导出数据，并保留字段名…", "Paste an export from GSC, GA4, Baidu Analytics, or rank tracking with field names intact…");
const t = (id, zh, en, descriptionZh, descriptionEn, fields, mode, source, rules = []) => ({ id, label: { zh, en }, description: { zh: descriptionZh, en: descriptionEn }, fields, mode, source, rules });
const m = (id, zh, en, icon, accent, descriptionZh, descriptionEn, templates) => ({ id, label: { zh, en }, icon, accent, description: { zh: descriptionZh, en: descriptionEn }, templates });

export const seoModules = [
  m("keyword-research", "关键词研究", "Keyword Research", "MagnifyingGlass", "blue", "发现、分类并排序值得覆盖的搜索任务", "Discover, classify, and prioritize search tasks", [
    t("keyword-discovery", "关键词发现", "Keyword Discovery", "从产品与主题扩展关键词种子", "Expand keyword seeds from a product and topic", [field("product", "产品名称", "Product", "text", true), website, topic, country, language], "model", "model", ["generate diverse keyword families"]),
    t("long-tail-keyword", "长尾关键词", "Long-tail Keywords", "发现更具体的长尾搜索表达", "Find specific long-tail searches", [topic, country, language], "model", "model"),
    t("keyword-cluster", "关键词聚类", "Keyword Clusters", "按搜索任务和页面意图聚类", "Cluster by search task and page intent", [keywords, country, language], "model", "model"),
    t("search-intent", "搜索意图分析", "Search Intent", "识别信息、商业、交易与导航意图", "Classify informational, commercial, transactional, and navigational intent", [keywords, country, language], "model", "model"),
    t("question-keywords", "问题关键词", "Question Keywords", "发现用户会直接提出的问题", "Discover questions users are likely to ask", [topic, country, language], "model", "model"),
    t("keyword-opportunity", "机会关键词", "Keyword Opportunities", "结合真实搜索数据寻找机会", "Find opportunities using measured search data", [website, topic, searchEngine, country, language, device], "provider", "keyword-provider"),
    t("keyword-difficulty", "关键词难度", "Keyword Difficulty", "基于 SERP 与关键词数据评估难度", "Estimate difficulty from SERP and keyword data", [keywords, searchEngine, country, language, device], "provider", "keyword-provider"),
  ]),
  m("content-optimization", "内容优化", "Content Optimization", "Article", "green", "从搜索意图到页面结构优化已有内容", "Optimize existing content from intent through page structure", [
    t("seo-score", "SEO 评分", "SEO Score", "依据可解释检查项评估内容", "Score content with explainable checks", [content, keywords, language], "hybrid", "model"),
    t("meta-title", "Meta Title", "Meta Title", "生成准确、可点击的标题建议", "Create accurate, compelling title options", [content, keywords, language], "hybrid", "model"),
    t("meta-description", "Meta Description", "Meta Description", "生成匹配页面价值的描述", "Create descriptions that match page value", [content, keywords, language], "hybrid", "model"),
    t("heading-optimization", "标题层级优化", "Heading Optimization", "优化 H1–H3 信息结构", "Improve H1–H3 information hierarchy", [content, keywords, language], "hybrid", "model"),
    t("readability", "可读性", "Readability", "改善段落、句子和可扫描性", "Improve paragraphs, sentences, and scannability", [content, language], "hybrid", "model"),
    t("faq-suggestion", "FAQ 建议", "FAQ Suggestions", "补充与搜索意图相关的问题", "Add questions relevant to search intent", [content, keywords, language], "hybrid", "model"),
    t("internal-link", "内链建议", "Internal Link Suggestions", "结合网站页面提出内链位置", "Suggest internal links from crawled pages", [website, content, keywords], "crawl-model", "direct"),
    t("external-link", "外链建议", "External Link Suggestions", "识别需要权威依据的陈述", "Identify claims that need authoritative sources", [content, keywords], "hybrid", "model"),
  ]),
  m("website-audit", "网站诊断", "Website Audit", "Pulse", "orange", "真实抓取页面并检查技术 SEO 健康度", "Crawl real pages and inspect technical SEO health", [
    t("site-audit", "整站诊断", "Site Audit", "抓取有限页面并生成健康报告", "Crawl a bounded page sample and create a health report", [website], "crawl", "direct"),
    t("robots-txt", "Robots.txt", "Robots.txt", "检查 robots 文件与 Sitemap 声明", "Inspect robots rules and sitemap declarations", [website], "crawl", "direct"),
    t("sitemap", "Sitemap", "Sitemap", "发现并检查站点地图", "Discover and inspect sitemaps", [website], "crawl", "direct"),
    t("canonical", "Canonical", "Canonical", "检查规范网址注解", "Inspect canonical annotations", [website], "crawl", "direct"),
    t("image-optimization", "图片优化", "Image Optimization", "检查 alt、尺寸与懒加载", "Check alt text, dimensions, and lazy loading", [website], "crawl", "direct"),
    t("broken-links", "失效链接", "Broken Links", "验证页面中的链接响应", "Verify response status for page links", [website], "crawl", "direct"),
    t("redirect-check", "重定向检查", "Redirect Check", "记录完整重定向链", "Record the full redirect chain", [website], "crawl", "direct"),
    t("duplicate-content", "重复内容", "Duplicate Content", "在抓取样本中检测标题与正文重复", "Detect duplicate titles and text in the crawl sample", [website], "crawl", "direct"),
    t("mobile-friendly", "移动端友好", "Mobile Friendly", "检查 viewport，并可结合 PageSpeed", "Check viewport and optionally PageSpeed", [website], "crawl", "direct"),
  ]),
  m("rank-tracking", "排名监控", "Rank Tracking", "TrendUp", "violet", "记录真实 SERP 或 Search Console 位置变化", "Track observed SERP or Search Console position changes", [
    t("keyword-ranking", "关键词排名", "Keyword Ranking", "查询指定地区的真实结果位置", "Query an observed rank for a location", [website, keywords, searchEngine, country, language, device], "provider", "serp-provider"),
    t("serp-monitor", "SERP 监控", "SERP Monitor", "保存 SERP 快照用于后续比较", "Save SERP snapshots for comparison", [website, keywords, searchEngine, country, language, device], "provider", "serp-provider"),
    t("ranking-history", "排名历史", "Ranking History", "读取已保存的真实历史快照", "Read persisted rank observations", [website, keywords, searchEngine, country, language, device], "history", "history"),
    t("ranking-trend", "排名趋势", "Ranking Trend", "计算历史排名变化趋势", "Calculate trends from saved observations", [website, keywords, searchEngine, country, language, device], "history", "history"),
  ]),
  m("backlink-analysis", "外链分析", "Backlink Analysis", "Link", "cyan", "使用专业索引分析站外链接", "Analyze inbound links with a maintained backlink index", [
    ...[["backlink-overview","外链概览","Backlink Overview"],["broken-backlinks","失效外链","Broken Backlinks"],["lost-backlinks","丢失外链","Lost Backlinks"],["new-backlinks","新增外链","New Backlinks"],["anchor-text","锚文本","Anchor Text"]].map(([id,zh,en]) => t(id, zh, en, `${zh}报告`, `${en} report`, [website], "provider", "backlink-provider")),
    t("link-gap", "外链差距", "Link Gap", "比较自己与竞品的引荐域名", "Compare referring domains with competitors", [website, competitors], "provider", "backlink-provider"),
  ]),
  m("competitor-analysis", "竞争对手分析", "Competitor Analysis", "Binoculars", "pink", "基于真实页面与可选搜索数据分析差距", "Compare real pages with optional search data", [
    t("competitor-content", "竞品内容", "Competitor Content", "抓取竞品页面并比较主题结构", "Crawl competitor pages and compare topic structure", [website, competitors, topic], "crawl-model", "direct"),
    t("content-gap", "内容差距", "Content Gap", "从抓取样本发现未覆盖的搜索任务", "Find uncovered search tasks in crawl samples", [website, competitors, topic], "crawl-model", "direct"),
    ...[["competitor-keywords","竞品关键词","Competitor Keywords"],["keyword-gap","关键词差距","Keyword Gap"],["serp-comparison","SERP 对比","SERP Comparison"]].map(([id,zh,en]) => t(id, zh, en, `${zh}需要关键词或 SERP 数据源`, `${en} requires keyword or SERP data`, [website, competitors, topic, searchEngine, country, language, device], "provider", "keyword-provider")),
  ]),
  m("agent-production", "SEO 生产与运营", "SEO Production & Operations", "FileText", "purple", "将研究结果转化为可交付的内容、发布包和持续优化方案", "Turn research into deliverable content, publishing handoffs, and continuous improvement plans", [
    t("content-brief", "SEO 内容 Brief", "SEO Content Brief", "生成包含意图、结构、证据要求和验收标准的写作 Brief", "Create a writing brief with intent, structure, evidence needs, and acceptance criteria", [topic, keywords, audience, goal, country, language], "model", "model", ["separate facts from hypotheses", "include acceptance criteria"]),
    t("seo-article-draft", "SEO 文章初稿", "SEO Article Draft", "生成结构完整、可编辑且不虚构事实的 Markdown 初稿", "Create a complete, editable Markdown draft without fabricated facts", [topic, keywords, audience, goal, language, field("contentLength", "内容长度", "Content length", "select", true, "", "", { defaultValue: "standard", options: [{ value: "short", label: { zh: "精简", en: "Short" } }, { value: "standard", label: { zh: "标准", en: "Standard" } }, { value: "long", label: { zh: "深度", en: "In-depth" } }] }), field("tone", "写作语气", "Tone", "text", false, "专业、清晰", "Professional and clear")], "model", "model", ["return usable markdown", "flag claims requiring sources"]),
    t("publishing-handoff", "发布交付包", "Publishing Handoff", "生成供用户自行发布的内容、Meta、内链和 CMS 操作清单", "Create content, metadata, internal-link, and CMS checklists for user-managed publishing", [website, field("targetUrl", "目标页面 URL", "Target page URL", "url", false, "https://example.com/page", "https://example.com/page"), content, keywords, language], "model", "model", ["never claim content was published", "include verification checklist"]),
    t("analytics-insights", "SEO 数据解读", "SEO Analytics Insights", "基于用户提供的真实导出数据识别趋势、异常和下一步行动", "Use user-provided exports to identify trends, anomalies, and next actions", [website, performanceData, goal, language], "model", "model", ["never invent missing dates or metrics", "label insufficient samples"]),
    t("content-refresh", "内容更新方案", "Content Refresh Plan", "结合原文和真实表现数据生成修改清单与复测指标", "Create a change list and remeasurement plan from original content and observed performance", [website, content, keywords, performanceData, audience, goal, language], "model", "model", ["preserve valid content", "show before and after plan", "define remeasurement window"]),
  ]),
  m("seo-report", "SEO 报告", "SEO Reports", "FileText", "purple", "汇总已经完成的真实分析记录", "Summarize completed, real analysis runs", [
    ...[["seo-summary","SEO 摘要","SEO Summary"],["weekly-report","周报","Weekly Report"],["monthly-report","月报","Monthly Report"],["keyword-report","关键词报告","Keyword Report"],["website-report","网站报告","Website Report"]].map(([id,zh,en]) => t(id, zh, en, "从历史任务生成 Markdown 与 HTML 报告", "Generate Markdown and HTML from task history", [field("website", "网站（可选）", "Website (optional)", "url")], "report", "history")),
  ]),
];

export function seoResultType(moduleId, templateId) {
  if (moduleId === "seo-report") return "report";
  if (moduleId === "website-audit") return "audit";
  if (moduleId === "rank-tracking") return "ranking";
  if (moduleId === "backlink-analysis") return templateId === "backlink-overview" ? "scorecard" : "backlinks";
  if (moduleId === "competitor-analysis") return "comparison";
  if (moduleId === "content-optimization") return templateId === "seo-score" ? "scorecard" : "content";
  if (moduleId === "agent-production") return templateId === "analytics-insights" ? "report" : "content";
  return "keywords";
}

export const seoTemplateMap = new Map(seoModules.flatMap((module) => module.templates.map((template) => [template.id, { ...template, resultType: seoResultType(module.id, template.id), module }])));

export function publicSeoCatalog(status = {}) {
  const sourceReady = (source) => source === "direct" || source === "model" || source === "history" || Boolean(status[source]);
  return {
    version: "2026-08-01",
    dataSources: status,
    modules: seoModules.map(({ templates, ...module }) => ({
      ...module,
      templates: templates.map(({ rules, ...template }) => ({ ...template, resultType: seoResultType(module.id, template.id), available: sourceReady(template.source), requirement: sourceReady(template.source) ? null : template.source })),
    })),
  };
}
