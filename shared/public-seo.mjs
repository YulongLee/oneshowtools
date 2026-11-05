export const SITE_URL = "https://oneshowtools.com";
export const SITE_NAME = "OneShowTools";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/dashboard/oneshowtools-ai-toolkit-900.png`;

export const TARGET_KEYWORDS = [
  "在线 AI 工具", "AI 工具箱", "实用 AI 工具", "AI 食物热量分析", "拍照识别食物热量",
  "AI 卡路里计算器", "AI 冰箱食谱", "冰箱食材生成菜谱", "AI 一键换装", "AI 证件照生成器",
  "图片转可编辑 PPT", "图片文字修改工具", "图片转可编辑设计稿", "AI 音乐生成器", "MBTI 性格测试",
  "沉浸式英语阅读", "AI 面试助手", "性价比排名工具", "产品竞争力分析工具", "排行榜图片生成器",
];

export const CORE_TOOLS = [
  ["food-nutrition-analyzer", "AI 食物热量分析", "上传食物照片，识别菜品和份量，估算热量、蛋白质、碳水、脂肪、膳食纤维与钠。", "AI 食物热量分析,拍照识别食物热量,AI 卡路里计算器"],
  ["ai-fridge-recipe", "AI 冰箱食谱", "上传冰箱照片识别现有食材，生成可执行菜谱、缺少食材和采购清单。", "AI 冰箱食谱,冰箱食材生成菜谱"],
  ["ai-music-studio", "AI 音乐工作室", "通过灵感、自定义歌词或纯音乐模式生成完整音乐并统一管理试听与下载。", "AI 音乐生成器,AI 作曲"],
  ["ai-outfit-changer", "AI 一键换装", "上传人物照片并描述服装或提供服装参考图，生成保留人物特征的换装效果。", "AI 一键换装,AI 换衣服"],
  ["image-text-editor", "字迹 · AI 视觉结构重建", "把图片、海报、截图和 PDF 重建为可编辑文字图层，可导出 PPTX、SVG 或高清图片。", "图片转可编辑 PPT,图片文字修改工具,图片转可编辑设计稿"],
  ["hang-la-tier-list-generator", "夯拉排行榜生成器", "上传多张图片、自定义等级并拖拽排序，导出适合视频和社交平台分享的排行榜长图。", "排行榜图片生成器,排行榜制作工具"],
  ["ai-id-photo-studio", "证照 · AI 证件照与工牌", "生成证件照、职业照和员工工牌头像，支持常见背景颜色与职业服装。", "AI 证件照生成器,AI 职业照"],
  ["interview-assistant", "面试稳 AI 助手", "结合简历和目标岗位，提供实时语音识别、截图解题、回答思路与面试复盘。", "AI 面试助手,AI 面试题"],
  ["mbti-personality-test", "MBTI 性格偏好自测", "通过 64 道平衡情境题了解四维偏好，呈现模糊维度和答题质量提示。", "MBTI 性格测试,人格测试"],
  ["value-ranking-tool", "性价比排名工具", "比较多个同类产品的总价与可使用小时数，自动计算每小时价格并生成排名。", "性价比排名工具,每小时价格计算"],
  ["product-kill-line-analyzer", "斩杀线 · 二维产品竞争力分析器", "将产品放入二维坐标，通过可调斩杀线、功能评分和演示动画分析竞争力边界。", "产品竞争力分析工具,产品对比分析"],
  ["sliding-ancestor-generator", "滑动变祖器", "上传人物照片，生成同一人物从虚到夯、按强度排列的十种连续形态。", "滑动变祖器,人物形态生成"],
  ["word-immersion", "词浸 · AI 沉浸式英语阅读", "上传真正想读的内容，让目标英语词汇自然融入上下文，在阅读中逐渐掌握。", "沉浸式英语阅读,英语阅读工具"],
].map(([slug, nameZh, descriptionZh, keywords]) => ({ slug, nameZh, descriptionZh, keywords, creditCost: 0 }));

const HOME_DESCRIPTION = "OneShowTools 是面向中文用户的在线 AI 工具箱，提供图片编辑、图片转可编辑 PPT、AI 食物热量分析、AI 音乐、证件照、英语阅读、产品分析等实用工具。无需安装即可在线使用。";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const jsonLd = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const normalizeTool = (tool) => ({
  slug: tool.slug,
  nameZh: tool.nameZh || tool.name_zh || tool.name || "在线工具",
  descriptionZh: tool.descriptionZh || tool.description_zh || tool.description || "在 OneShowTools 在线完成任务。",
  keywords: tool.keywords || "在线 AI 工具,实用 AI 工具",
  creditCost: Number(tool.creditCost ?? tool.credit_cost ?? 0),
});

export function mergePublicTools(tools = []) {
  const merged = new Map(CORE_TOOLS.map((tool) => [tool.slug, tool]));
  for (const item of tools.map(normalizeTool)) merged.set(item.slug, { ...merged.get(item.slug), ...item });
  return [...merged.values()];
}

function toolForPath(pathname, tools) {
  const match = String(pathname || "/").match(/^\/tools\/([^/?#]+)\/?$/);
  return match ? mergePublicTools(tools).find((tool) => tool.slug === decodeURIComponent(match[1])) : null;
}

export function pageSeo(pathname = "/", tools = []) {
  const cleanPath = pathname === "/index.html" ? "/" : pathname.replace(/\/$/, "") || "/";
  const tool = toolForPath(cleanPath, tools);
  if (tool) {
    const keywordList = String(tool.keywords || "").split(",").filter(Boolean);
    const keyword = keywordList.find((item) => item !== tool.nameZh) || keywordList[0] || "在线 AI 工具";
    return {
      kind: "tool", tool, pathname: `/tools/${tool.slug}`,
      title: `${keyword}｜${tool.nameZh} - OneShowTools`,
      description: `${tool.descriptionZh} 在线打开即可使用，结果可预览、保存或下载。OneShowTools 提供清晰的操作流程与安全的个人工作区。`,
      keywords: tool.keywords,
    };
  }
  const legal = {
    "/legal/terms": ["OneShowTools 用户服务协议", "查看 OneShowTools 用户服务协议，了解账号、AI 工具、用户内容、积分套餐及服务使用规则。"],
    "/legal/privacy": ["OneShowTools 隐私政策", "查看 OneShowTools 如何处理账号、文件、AI 任务与支持数据，以及用户可以行使的数据权利。"],
    "/legal/credits": ["OneShowTools 积分、套餐与退款规则", "了解 OneShowTools 积分充值、会员套餐、任务扣费、失败退回和退款处理规则。"],
  }[cleanPath];
  if (legal) return { kind: "legal", pathname: cleanPath, title: `${legal[0]} - OneShowTools`, description: legal[1], keywords: "OneShowTools,用户协议,隐私政策" };
  return {
    kind: "home", pathname: "/", title: "在线 AI 工具箱｜图片、文档与效率工具 - OneShowTools",
    description: HOME_DESCRIPTION, keywords: TARGET_KEYWORDS.slice(0, 12).join(","),
  };
}

function homepageShell(tools) {
  const publicTools = mergePublicTools(tools);
  return `<main id="seo-static-shell" class="seo-static-shell">
    <header><a href="/" aria-label="OneShowTools 首页"><strong>OneShowTools</strong></a><nav><a href="#ai-tools">AI 工具</a><a href="#use-cases">使用场景</a><a href="#about">关于平台</a></nav></header>
    <article>
      <p class="eyebrow">ONLINE AI TOOLKIT</p>
      <h1>在线 AI 工具箱：把图片、文档与日常任务做得更简单</h1>
      <p>OneShowTools 是面向中文用户的实用 AI 工具平台。你可以直接在浏览器中完成图片编辑、图片转可编辑 PPT、AI 食物热量分析、AI 音乐创作、证件照生成、英语阅读和产品竞争力分析，无需分别安装多个软件。平台把上传、设置、处理、预览和下载放在同一条清晰流程中，并为登录用户保存任务和文件记录。</p>
      <section id="ai-tools"><h2>可以在线使用哪些 AI 工具？</h2><p>OneShowTools 按真实任务组织能力，而不是只提供一个空白聊天框。每个工具都有专门的输入方式、参数、结果预览和下载出口。以下工具页面可以被搜索引擎和 AI 搜索独立理解，也可以从首页直接进入。</p><ul>${publicTools.map((tool) => `<li><a href="/tools/${esc(tool.slug)}"><strong>${esc(tool.nameZh)}</strong></a><span>${esc(tool.descriptionZh)}</span></li>`).join("")}</ul></section>
      <section id="use-cases"><h2>OneShowTools 适合解决哪些问题？</h2><p>需要处理图片时，可以使用 AI 换装、证件照、视觉结构重建和排行榜生成工具；需要理解食物和食材时，可以使用拍照识别热量与冰箱食谱；需要创作时，可以生成音乐或把目标词汇融入英语阅读；需要做产品内容和录制视频时，可以用性价比排名与二维斩杀线生成结构清晰的可视化结果。</p></section>
      <section><h2>如何开始使用在线 AI 工具？</h2><ol><li>从工具列表中选择与你当前任务匹配的工具。</li><li>上传合法拥有使用权的素材，或填写必要的文字与参数。</li><li>开始处理并在页面中检查预览结果。</li><li>满意后下载结果；登录用户还可以在任务中心和文件中心继续管理。</li></ol></section>
      <section id="about"><h2>为什么选择 OneShowTools？</h2><p>平台强调可执行的结果、清晰的费用提示和失败任务处理。免费工具会明确标记，消耗积分的 AI 任务会在提交前展示费用。AI 生成与识别结果具有概率性，涉及营养、身份、商业发布等场景时，请结合原始资料进行人工确认。OneShowTools 由杭州临平知界智能技术运营，并持续维护产品说明、隐私政策和服务规则。</p></section>
    </article>
    <footer><a href="/legal/terms">用户服务协议</a><a href="/legal/privacy">隐私政策</a><a href="/legal/credits">积分与退款规则</a></footer>
  </main>`;
}

function toolShell(tool, tools) {
  const related = mergePublicTools(tools).filter((item) => item.slug !== tool.slug).slice(0, 4);
  const keywordList = String(tool.keywords || "").split(",").filter(Boolean);
  const primary = keywordList.find((item) => item !== tool.nameZh) || keywordList[0] || "在线 AI 工具";
  return `<main id="seo-static-shell" class="seo-static-shell">
    <header><a href="/"><strong>OneShowTools</strong></a><nav><a href="/#tools">全部工具</a><a href="/legal/privacy">隐私政策</a></nav></header>
    <article>
      <p class="eyebrow">ONESHOWTOOLS · ONLINE TOOL</p>
      <h1>${esc(tool.nameZh)}：在线${esc(primary)}</h1>
      <p>${esc(tool.descriptionZh)} 该工具在浏览器中提供从输入、设置到结果预览与下载的完整流程，适合个人创作、办公处理和视频内容制作。</p>
      <section><h2>${esc(tool.nameZh)}能做什么？</h2><p>${esc(tool.descriptionZh)} 页面会根据任务类型展示所需素材、可调整参数和结果状态，避免用户在多个应用之间来回切换。处理完成后请先核对关键文字、数值、人物或版式，再将结果用于正式发布。</p></section>
      <section><h2>如何使用${esc(tool.nameZh)}？</h2><ol><li>打开工具并阅读支持的文件格式或输入要求。</li><li>上传拥有合法使用权的素材，填写与结果有关的必要信息。</li><li>确认参数后开始处理，并在结果区域检查生成或分析内容。</li><li>确认无误后下载或保存；如果结果不符合预期，可调整输入后重新处理。</li></ol></section>
      <section><h2>结果是否可以直接商用？</h2><p>是否可以商用取决于输入素材权利、模型或第三方服务条款以及具体使用场景。AI 结果可能存在识别误差或生成偏差，涉及数字、姓名、营养信息、身份材料和品牌内容时应进行人工审核。请勿上传没有授权的个人信息、商业秘密或受保护素材。</p></section>
      <section><h2>相关在线工具</h2><ul>${related.map((item) => `<li><a href="/tools/${esc(item.slug)}">${esc(item.nameZh)}</a>：${esc(item.descriptionZh)}</li>`).join("")}</ul></section>
    </article><footer><a href="/">返回 OneShowTools</a><a href="/legal/terms">用户服务协议</a><a href="/legal/privacy">隐私政策</a></footer>
  </main>`;
}

function schemasFor(page, tools) {
  const organization = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/brand/oneshowtools-mark-512.png`, legalName: "杭州临平知界智能技术" };
  const website = { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, inLanguage: ["zh-CN", "en"], publisher: { "@id": `${SITE_URL}/#organization` } };
  if (page.kind !== "tool") {
    const graph = [organization, website];
    if (page.kind === "home") graph.push({ "@type": "CollectionPage", "@id": `${SITE_URL}/#webpage`, url: `${SITE_URL}/`, name: page.title, description: page.description, isPartOf: { "@id": `${SITE_URL}/#website` }, mainEntity: { "@type": "ItemList", itemListElement: mergePublicTools(tools).map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.nameZh, url: `${SITE_URL}/tools/${tool.slug}` })) } });
    return graph.map((item) => ({ "@context": "https://schema.org", ...item }));
  }
  const tool = page.tool;
  return [organization, website,
    { "@type": "WebApplication", "@id": `${SITE_URL}${page.pathname}#app`, name: tool.nameZh, url: `${SITE_URL}${page.pathname}`, description: tool.descriptionZh, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript and a modern web browser", inLanguage: "zh-CN", isAccessibleForFree: tool.creditCost === 0, provider: { "@id": `${SITE_URL}/#organization` }, featureList: String(tool.keywords || "").split(",").filter(Boolean) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "OneShowTools", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: tool.nameZh, item: `${SITE_URL}${page.pathname}` }] },
    { "@type": "WebPage", "@id": `${SITE_URL}${page.pathname}#webpage`, url: `${SITE_URL}${page.pathname}`, name: page.title, description: page.description, isPartOf: { "@id": `${SITE_URL}/#website` }, mainEntity: { "@id": `${SITE_URL}${page.pathname}#app` }, dateModified: "2026-11-06" },
  ].map((item) => ({ "@context": "https://schema.org", ...item }));
}

export function injectSeoDocument(html, pathname = "/", tools = []) {
  const page = pageSeo(pathname, tools);
  const canonical = `${SITE_URL}${page.pathname === "/" ? "/" : page.pathname}`;
  const shell = page.kind === "tool" ? toolShell(page.tool, tools) : homepageShell(tools);
  const dynamic = `<meta name="keywords" content="${esc(page.keywords)}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="${SITE_NAME}" /><meta property="og:locale" content="zh_CN" />
    <meta property="og:title" content="${esc(page.title)}" /><meta property="og:description" content="${esc(page.description)}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${DEFAULT_SOCIAL_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(page.title)}" /><meta name="twitter:description" content="${esc(page.description)}" /><meta name="twitter:image" content="${DEFAULT_SOCIAL_IMAGE}" />
    ${schemasFor(page, tools).map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`).join("\n    ")}`;
  return String(html)
    .replace(/<html\b[^>]*lang="[^"]*"/i, '<html lang="zh-CN"')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(page.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?>/i, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="zh-CN"[^>]*>/i, `<link rel="alternate" hreflang="zh-CN" href="${canonical}?locale=zh-CN" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="en"[^>]*>/i, `<link rel="alternate" hreflang="en" href="${canonical}?locale=en" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="x-default"[^>]*>/i, `<link rel="alternate" hreflang="x-default" href="${canonical}" />`)
    .replace("<!-- seo:dynamic -->", dynamic)
    .replace(/<!-- seo:static:start -->[\s\S]*?<!-- seo:static:end -->/, `<!-- seo:static:start -->${shell}<!-- seo:static:end -->`);
}

export function sitemapXml(tools = CORE_TOOLS) {
  const urls = ["/", ...mergePublicTools(tools).map((tool) => `/tools/${tool.slug}`), "/legal/terms", "/legal/privacy", "/legal/credits"];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>2026-11-06</lastmod><changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq><priority>${path === "/" ? "1.0" : path.startsWith("/tools/") ? "0.8" : "0.3"}</priority></url>`).join("\n")}\n</urlset>\n`;
}

export function llmsText(tools = CORE_TOOLS, full = false) {
  const rows = mergePublicTools(tools).map((tool) => `- [${tool.nameZh}](${SITE_URL}/tools/${tool.slug}): ${tool.descriptionZh}`).join("\n");
  return `# OneShowTools\n> 面向中文用户的在线 AI 工具箱，提供图片、文档、音乐、学习与产品分析工具。\n\n## 核心工具\n${rows}\n\n## 平台说明\n- [首页](${SITE_URL}/): 浏览全部已上线工具与使用场景\n- [用户服务协议](${SITE_URL}/legal/terms): 服务和内容使用规则\n- [隐私政策](${SITE_URL}/legal/privacy): 数据处理与用户权利\n- [积分与退款规则](${SITE_URL}/legal/credits): 费用、扣费和失败退回规则\n${full ? `\n## 关键事实\n- OneShowTools 由杭州临平知界智能技术运营。\n- 工具费用以各工具页面提交前显示为准。\n- AI 结果可能存在误差，正式使用前应人工核对。\n- 登录用户可在任务中心和文件中心管理处理记录。\n` : ""}`;
}

