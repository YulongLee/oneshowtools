const field = (id, zh, en, type = "text", required = false, placeholderZh = "", placeholderEn = "") => ({ id, label: { zh, en }, type, required, placeholder: { zh: placeholderZh, en: placeholderEn } });

const commonArticleFields = [
  field("title", "标题", "Title", "text", false, "可选，输入文章标题", "Optional article title"),
  field("topic", "主题", "Topic", "text", true, "这篇内容主要讲什么？", "What is this content about?"),
  field("keywords", "关键词", "Keywords", "tags", false, "用逗号分隔", "Separate with commas"),
  field("audience", "目标用户", "Audience", "text", false, "例如：首次创业者", "For example: first-time founders"),
];
const sourceContent = field("sourceContent", "原始内容", "Source content", "textarea", true, "粘贴需要处理的内容…", "Paste the content to process…");
const keywordFields = [field("keywords", "核心关键词", "Primary keywords", "tags", true, "输入 1–5 个关键词", "Enter 1–5 keywords"), field("audience", "目标用户", "Audience", "text", false)];

const t = (id, zh, en, descriptionZh, descriptionEn, fields, rules = []) => ({ id, label: { zh, en }, description: { zh: descriptionZh, en: descriptionEn }, fields, rules });
const m = (id, zh, en, icon, accent, descriptionZh, descriptionEn, templates) => ({ id, label: { zh, en }, icon, accent, description: { zh: descriptionZh, en: descriptionEn }, templates });

export const writingModules = [
  m("content-creation", "内容创作", "Content Creation", "Article", "blue", "从想法到结构完整的原创内容", "Create original, structured content from an idea", [
    t("ai-article", "AI 文章", "AI Article", "通用长文生成", "General long-form article", commonArticleFields, ["use a clear hierarchy", "add original, useful detail"]),
    t("blog-post", "博客文章", "Blog Post", "适合持续发布的博客内容", "Publish-ready blog content", commonArticleFields, ["open with a reader-relevant hook", "use scan-friendly headings"]),
    t("tutorial", "教程", "Tutorial", "可执行的分步教程", "Actionable step-by-step tutorial", [...commonArticleFields, field("prerequisites", "前置条件", "Prerequisites", "textarea")], ["number each actionable step", "include prerequisites and verification"]),
    t("technical-article", "技术文章", "Technical Article", "面向技术读者的准确说明", "Accurate writing for technical readers", [...commonArticleFields, field("technicalLevel", "技术深度", "Technical depth", "select")], ["define unfamiliar terms", "keep terminology consistent", "never invent APIs or benchmarks"]),
    t("news-article", "新闻", "News Article", "基于事实材料组织新闻稿", "Fact-grounded news article", [...commonArticleFields, field("facts", "事实材料", "Source facts", "textarea", true)], ["distinguish verified facts from claims", "do not fabricate quotes, dates, or sources"]),
    t("faq-article", "FAQ", "FAQ Article", "围绕主题生成高价值问答", "Useful questions and answers", commonArticleFields, ["use real user questions", "answer directly before elaborating"]),
    t("product-introduction", "产品介绍", "Product Introduction", "说明产品价值、场景与差异", "Explain value, use cases, and differentiation", [...commonArticleFields, field("productFacts", "产品事实", "Product facts", "textarea", true)], ["use only supplied product claims", "connect features to outcomes"]),
    t("custom-article", "自定义文章", "Custom Article", "按你的要求生成文章", "Article guided by your instructions", [...commonArticleFields, field("requirements", "写作要求", "Writing requirements", "textarea", true)], ["follow the user's bounded creative requirements"]),
  ]),
  m("content-optimization", "内容优化", "Content Optimization", "ArrowsClockwise", "violet", "保留事实与意图，提升已有内容", "Improve existing content while preserving intent", [
    t("rewrite", "改写", "Rewrite", "换一种表达，保留原意", "Rephrase while preserving meaning", [sourceContent], ["preserve facts, intent, and names"]),
    t("expand", "扩写", "Expand", "补充解释、例子和上下文", "Add context, examples, and detail", [sourceContent, field("focus", "重点补充", "Expansion focus", "text")], ["add useful substance, not repetition"]),
    t("shorten", "缩写", "Shorten", "压缩内容而不损失关键信息", "Condense without losing key information", [sourceContent, field("targetLength", "目标长度", "Target length", "text")], ["retain decisions, evidence, and calls to action"]),
    t("polish", "润色", "Polish", "改善清晰度、节奏和专业度", "Improve clarity, flow, and professionalism", [sourceContent], ["prefer specific verbs and concise sentences"]),
    t("summarize", "总结", "Summarize", "生成结构化摘要", "Create a structured summary", [sourceContent], ["separate takeaway, evidence, and actions"]),
    t("extract-key-points", "提炼重点", "Extract Key Points", "提取可扫描的核心信息", "Extract scannable key points", [sourceContent], ["use parallel bullet structure"]),
    t("change-tone", "改变语气", "Change Tone", "切换表达风格但保留事实", "Change style while preserving facts", [sourceContent, field("targetTone", "目标语气", "Target tone", "select", true)], ["do not change factual meaning"]),
    t("translate", "翻译", "Translate", "自然、符合语境的翻译", "Natural, context-aware translation", [sourceContent, field("targetLanguage", "目标语言", "Target language", "select", true)], ["preserve formatting, names, numbers, and terminology"]),
  ]),
  m("seo-writing", "SEO 写作", "SEO Writing", "TrendUp", "green", "兼顾搜索意图、可读性与真实价值", "Balance search intent, readability, and genuine value", [
    t("seo-article", "SEO 文章", "SEO Article", "面向搜索意图的深度内容", "In-depth search-intent content", [...keywordFields, field("searchIntent", "搜索意图", "Search intent", "select")], ["write for people first", "use keywords naturally in prominent locations"]),
    t("meta-title", "Meta Title", "Meta Title", "生成可点击的页面标题", "Clickable page title options", [...keywordFields, field("pageSummary", "页面内容", "Page summary", "textarea", true)], ["return 5 distinct options", "keep each title concise and accurate"]),
    t("meta-description", "Meta Description", "Meta Description", "准确概括页面价值", "Accurately summarize page value", [...keywordFields, field("pageSummary", "页面内容", "Page summary", "textarea", true)], ["return 5 unique options", "avoid generic descriptions and keyword stuffing"]),
    t("seo-faq", "FAQ", "SEO FAQ", "覆盖搜索用户的关联问题", "Answer related search questions", keywordFields, ["use natural questions", "answer directly and accurately"]),
    t("landing-page", "Landing Page", "Landing Page", "从价值主张到行动转化", "From value proposition to conversion", [...keywordFields, field("offer", "产品或服务", "Offer", "textarea", true)], ["lead with a specific outcome", "include proof placeholders only when proof is not supplied"]),
    t("product-description", "产品描述", "Product Description", "兼顾搜索与购买决策", "Support search and purchase decisions", [...keywordFields, field("productFacts", "产品信息", "Product facts", "textarea", true)], ["use only supplied claims", "make benefits concrete"]),
    t("category-description", "分类描述", "Category Description", "生成分类页介绍与选购信息", "Category introduction and buying guidance", [...keywordFields, field("categoryFacts", "分类信息", "Category facts", "textarea", true)], ["explain selection criteria", "avoid repetitive keyword lists"]),
  ]),
  m("marketing-copy", "营销文案", "Marketing Copy", "MegaphoneSimple", "orange", "围绕受众、利益点与行动生成转化文案", "Conversion copy built around audience, benefit, and action", [
    t("google-ads", "Google Ads", "Google Ads", "响应式搜索广告素材", "Responsive search ad assets", [field("offer", "产品/优惠", "Offer", "textarea", true), ...keywordFields], ["return 10 unique headlines and 4 descriptions", "headlines max 30 characters; descriptions max 90 characters", "avoid gimmicky punctuation"]),
    t("facebook-ads", "Facebook Ads", "Facebook Ads", "信息流广告文案组合", "Feed ad copy variations", [field("offer", "产品/优惠", "Offer", "textarea", true), field("audience", "目标人群", "Audience", "text", true)], ["provide primary text, headline, description, and CTA", "avoid unsupported personal-attribute claims"]),
    t("email-marketing", "Email 营销", "Email Marketing", "从主题行到正文的营销邮件", "Marketing email from subject to body", [field("offer", "推广内容", "Offer", "textarea", true), field("audience", "收件人", "Audience", "text")], ["include 5 subject lines", "one clear primary CTA"]),
    t("newsletter", "Newsletter", "Newsletter", "结构清晰的订阅通讯", "Structured subscriber newsletter", [field("topics", "本期内容", "Issue content", "textarea", true), field("audience", "订阅者", "Audience", "text")], ["lead with the issue takeaway", "use concise sections"]),
    t("cta", "CTA", "CTA", "生成具体、可行动的按钮文案", "Specific action-oriented CTA options", [field("goal", "转化目标", "Conversion goal", "text", true), field("offer", "价值说明", "Value proposition", "textarea")], ["return 12 concise options", "make the next action explicit"]),
    t("sales-copy", "销售文案", "Sales Copy", "完整的销售页文案框架", "Full sales-page copy", [field("offer", "产品/服务", "Offer", "textarea", true), field("audience", "目标用户", "Audience", "text", true), field("proof", "证据素材", "Proof", "textarea")], ["connect pain to outcome", "never invent testimonials or numbers"]),
    t("product-hunt-launch", "Product Hunt 发布", "Product Hunt Launch", "发布页与首条评论素材", "Launch page and first-comment copy", [field("productFacts", "产品信息", "Product facts", "textarea", true), field("audience", "目标用户", "Audience", "text")], ["include tagline, description, maker comment, and launch checklist"]),
  ]),
  m("social-media", "社交媒体", "Social Media", "ShareNetwork", "pink", "适配不同平台语境与阅读习惯", "Adapt to each platform's context and reading behavior", [
    t("x-post", "X", "X", "短帖或串文", "Short post or thread", [field("topic", "内容主题", "Topic", "textarea", true), field("goal", "发布目标", "Goal", "text")], ["front-load the point", "avoid unnecessary hashtags"]),
    t("linkedin-post", "LinkedIn", "LinkedIn", "专业洞察与经验分享", "Professional insight post", [field("topic", "内容主题", "Topic", "textarea", true), field("audience", "目标读者", "Audience", "text")], ["deliver professional utility", "use 3-5 relevant hashtags at most"]),
    t("reddit-post", "Reddit", "Reddit", "尊重社区语境的讨论帖", "Community-aware discussion post", [field("topic", "内容主题", "Topic", "textarea", true), field("community", "社区/Subreddit", "Community/Subreddit", "text")], ["sound transparent and conversational", "avoid disguised promotion"]),
    t("facebook-post", "Facebook", "Facebook", "适合动态流的互动内容", "Engaging feed post", [field("topic", "内容主题", "Topic", "textarea", true), field("goal", "发布目标", "Goal", "text")], ["use a clear conversational opening", "invite relevant interaction"]),
    t("instagram-caption", "Instagram", "Instagram", "配合视觉内容的说明文字", "Caption supporting visual content", [field("visual", "图片/视频内容", "Visual description", "textarea", true), field("message", "核心信息", "Core message", "textarea")], ["complement rather than repeat the visual", "use readable line breaks"]),
    t("xiaohongshu-post", "小红书", "Xiaohongshu", "真实、有信息密度的种草笔记", "Authentic, useful lifestyle note", [field("topic", "内容主题", "Topic", "textarea", true), field("experience", "真实体验/素材", "Experience and facts", "textarea")], ["do not fabricate personal experience", "use searchable natural-language headings"]),
  ]),
  m("business-writing", "商务办公", "Business Writing", "Briefcase", "cyan", "生成可执行、可协作的专业文档", "Professional documents built for action and collaboration", [
    t("email", "邮件", "Email", "清晰专业的商务邮件", "Clear professional email", [field("purpose", "邮件目的", "Purpose", "text", true), field("context", "背景信息", "Context", "textarea"), field("recipient", "收件人关系", "Recipient relationship", "text")], ["include a specific subject", "state the request and next step clearly"]),
    t("email-reply", "邮件回复", "Email Reply", "结合上下文生成得体回复", "Context-aware email reply", [sourceContent, field("replyGoal", "回复目标", "Reply goal", "text", true)], ["address every explicit question", "do not promise unavailable actions"]),
    t("prd", "PRD", "PRD", "产品需求文档", "Product requirements document", [field("productIdea", "产品需求", "Product requirement", "textarea", true), field("users", "目标用户", "Users", "text"), field("constraints", "约束", "Constraints", "textarea")], ["include problem, goals, non-goals, stories, requirements, metrics, risks, and acceptance criteria"]),
    t("api-documentation", "API 文档", "API Documentation", "开发者可用的接口说明", "Developer-ready API documentation", [field("apiSpec", "接口资料", "API source material", "textarea", true), field("audience", "读者水平", "Audience level", "text")], ["never invent endpoints", "include auth, requests, responses, errors, and examples only from supplied facts"]),
    t("business-plan", "商业计划书", "Business Plan", "结构化商业计划", "Structured business plan", [field("business", "项目介绍", "Business overview", "textarea", true), field("marketFacts", "市场事实", "Market facts", "textarea")], ["mark assumptions explicitly", "never fabricate market numbers"]),
    t("meeting-minutes", "会议纪要", "Meeting Minutes", "提取决策、行动项和负责人", "Extract decisions, actions, and owners", [sourceContent], ["separate decisions, action items, owners, dates, and open questions"]),
    t("resume", "简历", "Resume", "面向岗位的真实经历表达", "Role-focused truthful resume", [field("experience", "真实经历", "Experience", "textarea", true), field("targetRole", "目标岗位", "Target role", "text", true)], ["never invent achievements", "use measurable evidence only when supplied"]),
    t("cover-letter", "求职信", "Cover Letter", "结合岗位和经历的求职信", "Role-specific cover letter", [field("jobDescription", "职位描述", "Job description", "textarea", true), field("experience", "个人经历", "Experience", "textarea", true)], ["connect evidence to role needs", "avoid generic praise"]),
  ]),
  m("creative-writing", "创意写作", "Creative Writing", "Palette", "purple", "从设定、结构到可读成稿", "From premise and structure to readable draft", [
    t("novel", "小说", "Novel", "小说片段或章节", "Fiction scene or chapter", [field("premise", "故事设定", "Premise", "textarea", true), field("characters", "人物", "Characters", "textarea"), field("genre", "类型", "Genre", "text")], ["maintain point of view and character continuity", "show through scene detail"]),
    t("screenplay", "剧本", "Screenplay", "规范场景与对白结构", "Scene and dialogue structure", [field("premise", "剧情设定", "Premise", "textarea", true), field("characters", "人物", "Characters", "textarea")], ["use scene headings, action, and dialogue", "make action filmable"]),
    t("video-script", "视频脚本", "Video Script", "包含画面、旁白与节奏", "Visuals, narration, and pacing", [field("topic", "视频主题", "Video topic", "textarea", true), field("duration", "时长", "Duration", "text")], ["use a scene table with time, visual, audio, and on-screen text"]),
    t("podcast-script", "播客脚本", "Podcast Script", "适合听觉表达的节目脚本", "Audio-first episode script", [field("topic", "节目主题", "Episode topic", "textarea", true), field("format", "节目形式", "Format", "text")], ["write for listening", "include transitions and host cues"]),
    t("youtube-script", "YouTube 脚本", "YouTube Script", "兼顾留存与信息密度", "Retention-aware informative script", [field("topic", "视频主题", "Video topic", "textarea", true), field("audience", "目标观众", "Audience", "text"), field("duration", "目标时长", "Target duration", "text")], ["earn attention without clickbait", "include hook, promise, beats, pattern interrupts, and close"]),
  ]),
];

export const writingTemplateMap = new Map(writingModules.flatMap((module) => module.templates.map((template) => [template.id, { ...template, module }])));
export function publicWritingCatalog() {
  return { version: "2026-08-01", modules: writingModules.map(({ templates, ...module }) => ({ ...module, templates: templates.map(({ rules, ...template }) => template) })) };
}
