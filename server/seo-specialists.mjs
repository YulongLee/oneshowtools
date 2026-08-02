export const seoSpecialists = [
  {
    id: "tool_seo_market_research_agent", slug: "seo-market-research-agent", icon: "ChartBar", creditCost: 18, runtimeKind: "builtin-seo",
    nameZh: "市场研究 Agent", nameEn: "Market Research Agent",
    descriptionZh: "基于真实关键词、SERP 与竞品数据判断市场需求、竞争格局和进入机会。",
    descriptionEn: "Evaluate demand, competition, and market-entry opportunities with observed keyword, SERP, and competitor data.",
    templateIds: ["keyword-opportunity", "competitor-keywords", "keyword-gap", "serp-comparison"],
  },
  {
    id: "tool_seo_keyword_research_agent", slug: "seo-keyword-research-agent", icon: "MagnifyingGlass", creditCost: 12,
    nameZh: "关键词研究 Agent", nameEn: "Keyword Research Agent",
    descriptionZh: "发现、扩展、分类并排序关键词，支持中国与全球搜索市场。",
    descriptionEn: "Discover, expand, classify, and prioritize keywords for Chinese and global search markets.",
    templateIds: ["keyword-discovery", "long-tail-keyword", "keyword-cluster", "search-intent", "question-keywords", "keyword-opportunity", "keyword-difficulty"],
  },
  {
    id: "tool_seo_serp_agent", slug: "seo-serp-analysis-agent", icon: "Binoculars", creditCost: 15, runtimeKind: "builtin-seo",
    nameZh: "SERP 分析 Agent", nameEn: "SERP Analysis Agent",
    descriptionZh: "分析 Google 或百度真实搜索结果、排名位置和竞争页面。",
    descriptionEn: "Analyze observed Google or Baidu results, ranking positions, and competing pages.",
    templateIds: ["keyword-ranking", "serp-monitor", "serp-comparison"],
  },
  {
    id: "tool_seo_competitor_agent", slug: "seo-competitor-agent", icon: "Binoculars", creditCost: 16,
    nameZh: "竞品分析 Agent", nameEn: "Competitor Agent",
    descriptionZh: "比较竞品内容、关键词覆盖和 SERP 表现，输出可验证的差距清单。",
    descriptionEn: "Compare competitor content, keyword coverage, and SERP presence to produce evidence-backed gaps.",
    templateIds: ["competitor-content", "content-gap", "competitor-keywords", "keyword-gap", "serp-comparison"],
  },
  {
    id: "tool_seo_topic_cluster_agent", slug: "seo-topic-cluster-agent", icon: "ShareNetwork", creditCost: 10,
    nameZh: "主题规划 Agent", nameEn: "Topic Cluster Agent",
    descriptionZh: "将关键词按意图聚类，规划支柱页、子主题和页面映射。",
    descriptionEn: "Cluster keywords by intent and plan pillar pages, subtopics, and page mappings.",
    templateIds: ["keyword-cluster", "search-intent", "content-gap"],
  },
  {
    id: "tool_seo_content_brief_agent", slug: "seo-content-brief-agent", icon: "FileText", creditCost: 10,
    nameZh: "内容规划 Agent", nameEn: "Content Brief Agent",
    descriptionZh: "把关键词、用户意图和业务目标整理成可直接交付给作者的 SEO Brief。",
    descriptionEn: "Turn keywords, intent, and business goals into an SEO brief ready for a writer.",
    templateIds: ["content-brief"],
  },
  {
    id: "tool_seo_writer_agent", slug: "seo-writer-agent", icon: "NotePencil", creditCost: 16,
    nameZh: "SEO 写作 Agent", nameEn: "AI Writer Agent",
    descriptionZh: "依据关键词、受众和写作要求生成可编辑的 SEO Markdown 初稿。",
    descriptionEn: "Create an editable SEO Markdown draft from keywords, audience, and writing requirements.",
    templateIds: ["seo-article-draft"],
  },
  {
    id: "tool_seo_on_page_agent", slug: "seo-on-page-agent", icon: "Article", creditCost: 10,
    nameZh: "页面优化 Agent", nameEn: "On-page SEO Agent",
    descriptionZh: "优化页面标题、搜索摘要、标题层级、可读性和 FAQ 内容。",
    descriptionEn: "Improve titles, descriptions, heading structure, readability, and FAQ content.",
    templateIds: ["seo-score", "meta-title", "meta-description", "heading-optimization", "readability", "faq-suggestion", "external-link"],
  },
  {
    id: "tool_seo_technical_agent", slug: "seo-technical-agent", icon: "ChartLineUp", creditCost: 12, runtimeKind: "builtin-seo",
    nameZh: "技术 SEO Agent", nameEn: "Technical SEO Agent",
    descriptionZh: "真实抓取网站并检查 Robots、Sitemap、Canonical、重定向、图片和移动端基础。",
    descriptionEn: "Crawl a live site and inspect robots, sitemaps, canonicals, redirects, images, and mobile fundamentals.",
    templateIds: ["site-audit", "robots-txt", "sitemap", "canonical", "image-optimization", "broken-links", "redirect-check", "duplicate-content", "mobile-friendly"],
  },
  {
    id: "tool_seo_internal_link_agent", slug: "seo-internal-link-agent", icon: "ShareNetwork", creditCost: 10,
    nameZh: "内链优化 Agent", nameEn: "Internal Link Agent",
    descriptionZh: "结合真实网站页面和目标关键词生成内链位置、目标页与锚文本建议。",
    descriptionEn: "Use crawled pages and target keywords to recommend link placements, targets, and anchor text.",
    templateIds: ["internal-link"],
  },
  {
    id: "tool_seo_publisher_agent", slug: "seo-publisher-agent", icon: "PaperPlaneRight", creditCost: 8,
    nameZh: "发布交付 Agent", nameEn: "Publisher Handoff Agent",
    descriptionZh: "生成 HTML、Meta、内链和 CMS 操作清单，不直接修改用户网站。",
    descriptionEn: "Create HTML, metadata, internal-link, and CMS handoff checklists without modifying the user's site.",
    templateIds: ["publishing-handoff"],
  },
  {
    id: "tool_seo_index_agent", slug: "seo-index-agent", icon: "Database", creditCost: 8, runtimeKind: "builtin-seo",
    nameZh: "收录检查 Agent", nameEn: "Index Agent",
    descriptionZh: "检查影响收录的 Robots、Sitemap、Canonical 与 Noindex 信号，并明确数据边界。",
    descriptionEn: "Inspect robots, sitemaps, canonicals, and noindex signals that affect indexability, with explicit data boundaries.",
    templateIds: ["robots-txt", "sitemap", "canonical", "site-audit"],
  },
  {
    id: "tool_seo_rank_tracker_agent", slug: "seo-rank-tracker-agent", icon: "TrendUp", creditCost: 12, runtimeKind: "builtin-seo",
    nameZh: "排名监控 Agent", nameEn: "Rank Tracker Agent",
    descriptionZh: "保存 Google 或百度真实排名快照并生成可比较的历史趋势。",
    descriptionEn: "Save observed Google or Baidu rank snapshots and generate comparable historical trends.",
    templateIds: ["keyword-ranking", "serp-monitor", "ranking-history", "ranking-trend"],
  },
  {
    id: "tool_seo_analytics_agent", slug: "seo-analytics-agent", icon: "ChartBar", creditCost: 10,
    nameZh: "SEO 数据分析 Agent", nameEn: "Analytics Agent",
    descriptionZh: "解读用户提供的 Search Console、GA4 或百度统计导出数据，不补造缺失指标。",
    descriptionEn: "Interpret user-supplied Search Console, GA4, or Baidu Analytics exports without inventing missing metrics.",
    templateIds: ["analytics-insights"],
  },
  {
    id: "tool_seo_content_refresh_agent", slug: "seo-content-refresh-agent", icon: "ArrowsClockwise", creditCost: 12,
    nameZh: "内容更新 Agent", nameEn: "Content Refresh Agent",
    descriptionZh: "结合原文、目标关键词与真实表现数据生成可追踪的内容更新方案。",
    descriptionEn: "Create a traceable content refresh plan from the original copy, target keywords, and observed performance data.",
    templateIds: ["content-refresh"],
  },
];

export const seoSpecialistSlugs = new Set(seoSpecialists.map((item) => item.slug));
export const seoSpecialistBySlug = new Map(seoSpecialists.map((item) => [item.slug, item]));

export function publicSeoSpecialists(modules) {
  const templates = new Map(modules.flatMap((module) => module.templates.map((template) => [template.id, template])));
  return seoSpecialists.map((agent) => {
    const capabilities = agent.templateIds.map((id) => templates.get(id)).filter(Boolean);
    return {
      slug: agent.slug,
      nameZh: agent.nameZh,
      nameEn: agent.nameEn,
      descriptionZh: agent.descriptionZh,
      descriptionEn: agent.descriptionEn,
      templateIds: agent.templateIds,
      availableCapabilities: capabilities.filter((item) => item.available).length,
      totalCapabilities: capabilities.length,
      ready: capabilities.some((item) => item.available),
      requirements: [...new Set(capabilities.map((item) => item.requirement).filter(Boolean))],
    };
  });
}

export function filterCatalogForSpecialist(catalog, slug) {
  const agent = seoSpecialistBySlug.get(slug);
  if (!agent) return null;
  const allowed = new Set(agent.templateIds);
  return {
    ...catalog,
    specialist: publicSeoSpecialists(catalog.modules).find((item) => item.slug === slug),
    modules: catalog.modules
      .map((module) => ({ ...module, templates: module.templates.filter((template) => allowed.has(template.id)) }))
      .filter((module) => module.templates.length),
  };
}
