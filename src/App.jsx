import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Check, CheckCircle, Clock, CloudArrowUp,
  Coins, CreditCard, Database, File, FilePdf, FolderOpen, GridFour,
  House, ImageSquare, ListChecks, LockKey, MagicWand, MagnifyingGlass, Microphone,
  ArrowLeft, Copy, DownloadSimple, Play, RocketLaunch, SignOut, Sparkle, SpinnerGap,
  SquaresFour, StopCircle, Translate, Trash, User, UserCircle, Warning, Wrench, X,
  GearSix, Plus, PlugsConnected, ShieldCheck, PenNib, ChartLineUp, Megaphone, Code,
  Lightbulb, Briefcase, ShareNetwork, ChartBar, Binoculars, VideoCamera, MusicNotes, Robot, Headphones, UserFocus,
  NotePencil, Article, ArrowsClockwise, TrendUp, MegaphoneSimple, Palette, TextAa,
  PaperPlaneRight, CheckSquare, FileText, Crown, Gift, Lightning,
  Fire, Funnel, CaretDown, ArrowDown, ArrowUp, Receipt, CalendarBlank, Eye, XCircle, HardDrives, ArrowsOutLineHorizontal,
  Bell, Star, HandWaving, Brain, ForkKnife,
} from "@phosphor-icons/react";
import { SupportWidget } from "./SupportWidget.jsx";
import { LEGAL_VERSION } from "./LegalPage.jsx";
import "./workbench.css";

const SeoAgentWorkspace = lazy(() => import("./SeoAgentWorkspace.jsx").then((module) => ({ default: module.SeoAgentWorkspace })));
const MusicStudio = lazy(() => import("./MusicStudio.jsx").then((module) => ({ default: module.MusicStudio })));
const LyricsGenerator = lazy(() => import("./LyricsGenerator.jsx").then((module) => ({ default: module.LyricsGenerator })));
const SlidingAncestorStudio = lazy(() => import("./SlidingAncestorStudio.jsx").then((module) => ({ default: module.SlidingAncestorStudio })));
const FoodNutritionAnalyzer = lazy(() => import("./FoodNutritionAnalyzer.jsx").then((module) => ({ default: module.FoodNutritionAnalyzer })));
const FridgeRecipePlanner = lazy(() => import("./FridgeRecipePlanner.jsx").then((module) => ({ default: module.FridgeRecipePlanner })));
const TierListGenerator = lazy(() => import("./TierListGenerator.jsx").then((module) => ({ default: module.TierListGenerator })));
const MbtiPersonalityTest = lazy(() => import("./MbtiPersonalityTest.jsx").then((module) => ({ default: module.MbtiPersonalityTest })));
const StockPetProduct = lazy(() => import("./StockPetProduct.jsx").then((module) => ({ default: module.StockPetProduct })));

const iconMap = {
  MagicWand, Sparkle, FilePdf, ImageSquare, Microphone, NotePencil, ChartLineUp, Robot,
  MagnifyingGlass, Binoculars, ShareNetwork, FileText, Article, PaperPlaneRight,
  Database, TrendUp, ChartBar, ArrowsClockwise, ShieldCheck, TextAa, GridFour, UserCircle,
  Code, Megaphone, MusicNotes, Briefcase, ArrowsOutLineHorizontal, Brain, ForkKnife,
};
const commercialToolIconBySlug = {
  "ai-music-studio": "/tool-icons-v2/optimized/ai-music-studio.png",
  "ai-outfit-changer": "/tool-icons-v2/optimized/ai-outfit-changer.png",
  "ai-product-photo": "/tool-icons-v2/optimized/ai-image-generation.png",
  "ai-portrait-studio": "/tool-icons-v2/optimized/ai-image-generation.png",
  "seo-workbench": "/tool-icons-v2/optimized/seo-analysis.png",
  "ai-writer": "/tool-icons-v2/optimized/ai-writing.png",
  "pdf-summary": "/tool-icons-v2/optimized/pdf-tools.png",
  "pdf-merge": "/tool-icons-v2/optimized/pdf-tools.png",
  "hang-la-tier-list-generator": "/tool-icons-v2/optimized/hang-la-tier-list-generator.png",
  "mbti-personality-test": "/mbti/mbti-icon-v1.webp",
  "food-nutrition-analyzer": "/food-nutrition/food-nutrition-icon-v1.webp",
  "ai-fridge-recipe": "/fridge-recipes/fridge-recipe-icon-v1.webp",
  "stock-pet": "/stock-pet/niu-lai-le-mascot.png",
};
const resolveToolIconUrl = (tool, fallbackUrl = "") => tool?.iconUrl || commercialToolIconBySlug[tool?.slug] || fallbackUrl;
function ProductToolIcon({ tool, size = 22, weight = "duotone", compact = false, className = "" }) {
  const Icon = iconMap[tool?.icon] || Wrench;
  const iconUrl = resolveToolIconUrl(tool);
  return <span
    className={`tool-icon ${compact ? "compact" : ""} ${tool?.category || ""} ${className}`.trim()}
    style={{ ...(tool?.iconColor ? { color: tool.iconColor } : {}), ...(tool?.iconBackground ? { background: tool.iconBackground } : {}) }}
  ><Icon className="tool-icon-fallback" size={size} weight={weight} />{iconUrl ? <img src={iconUrl} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}</span>;
}
function ToolPrice({ tool, locale = "zh-CN", withUnit = true }) {
  const free = Number(tool?.creditCost || 0) === 0;
  return free
    ? <span className="tool-price free"><Gift size={14} weight="duotone" />{locale === "en" ? "Free" : "免费"}</span>
    : <span className="tool-price"><Coins size={14} />{tool.creditCost}{withUnit ? (locale === "en" ? " Credits" : " 积分/次") : ""}</span>;
}
const aiImageToolSlugs = new Set(["ai-outfit-changer", "ai-id-photo", "ai-professional-headshot", "ai-product-photo", "ai-portrait-studio", "ai-smart-cutout", "ai-background-replacer", "ai-image-restorer", "sliding-ancestor-generator"]);
const imageToolSlugs = new Set(["background-remover", "image-compressor", "heic-to-jpg", "image-format-converter", "target-image-compressor", "batch-image-resizer", "social-image-resizer", "favicon-generator", "og-image-generator", "exif-remover", "image-watermark", "nine-grid-image", "id-photo-maker", "image-ocr", "qr-code-reader", ...aiImageToolSlugs]);
const pdfToolSlugs = new Set(["pdf-merge", "pdf-split", "pdf-compress", "pdf-organizer", "images-to-pdf", "pdf-to-images", "pdf-watermark", "pdf-page-numbers", "pdf-ocr", "pdf-to-markdown", "pdf-table-to-excel", "pdf-summary"]);
const multiFilePdfSlugs = new Set(["pdf-merge", "images-to-pdf"]);
const imageToolFields = {
  "image-format-converter": [{ id: "format", type: "select", zh: "输出格式", en: "Output format", options: [["jpeg", "JPG"], ["png", "PNG"], ["webp", "WebP"], ["avif", "AVIF"]] }],
  "target-image-compressor": [{ id: "targetKb", type: "select", zh: "目标大小", en: "Target size", options: [["100", "100 KB"], ["200", "200 KB"], ["500", "500 KB"], ["1000", "1 MB"]] }],
  "batch-image-resizer": [{ id: "width", type: "number", zh: "最大宽度", en: "Max width", min: 16, max: 8000 }, { id: "height", type: "number", zh: "最大高度（可选）", en: "Max height (optional)", min: 16, max: 8000 }],
  "social-image-resizer": [{ id: "preset", type: "select", zh: "平台尺寸", en: "Platform preset", options: [["xiaohongshu-cover", "小红书封面 · 1242×1660"], ["wechat-cover", "公众号封面 · 900×383"], ["instagram-square", "Instagram · 1080×1080"], ["youtube-thumbnail", "YouTube · 1280×720"]] }],
  "og-image-generator": [{ id: "title", type: "text", zh: "主标题", en: "Headline" }, { id: "subtitle", type: "text", zh: "副标题", en: "Subtitle" }, { id: "brand", type: "text", zh: "品牌名称", en: "Brand" }, { id: "accent", type: "color", zh: "品牌颜色", en: "Accent color" }],
  "image-watermark": [{ id: "watermark", type: "text", zh: "水印文字", en: "Watermark text" }, { id: "opacity", type: "range", zh: "透明度", en: "Opacity", min: 10, max: 100 }, { id: "fontSize", type: "number", zh: "字号", en: "Font size", min: 12, max: 180 }],
  "id-photo-maker": [{ id: "preset", type: "select", zh: "证件照尺寸", en: "Photo size", options: [["one-inch", "一寸 · 295×413"], ["two-inch", "二寸 · 413×579"], ["passport", "护照方图 · 600×600"]] }, { id: "background", type: "color", zh: "背景颜色", en: "Background" }, { id: "tolerance", type: "range", zh: "背景识别容差", en: "Background tolerance", min: 18, max: 100 }],
  "image-ocr": [{ id: "language", type: "select", zh: "识别语言", en: "Recognition language", options: [["chi_sim+eng", "简体中文 + English"], ["chi_sim", "简体中文"], ["eng", "English"]] }],
  "ai-outfit-changer": [{ id: "outfit", type: "text", zh: "目标服装", en: "Target outfit", placeholderZh: "例如：深灰色商务西装、白衬衫", placeholderEn: "e.g. charcoal business suit and white shirt" }, { id: "prompt", type: "textarea", zh: "补充要求（可选）", en: "Additional direction (optional)" }],
  "ai-id-photo": [{ id: "backgroundColor", type: "select", zh: "证件照底色", en: "Background", options: [["white", "白色", "White"], ["blue", "蓝色", "Blue"], ["red", "红色", "Red"], ["light gray", "浅灰色", "Light gray"]] }, { id: "outfit", type: "select", zh: "服装", en: "Outfit", options: [["formal dark suit and white shirt", "深色正装 + 白衬衫", "Dark suit + white shirt"], ["white collared shirt", "白色衬衫", "White shirt"], ["preserve original clothing", "保留原服装", "Preserve original outfit"]] }],
  "ai-professional-headshot": [{ id: "outfit", type: "text", zh: "职业服装", en: "Professional outfit", placeholderZh: "例如：现代科技公司商务休闲", placeholderEn: "e.g. modern tech business casual" }, { id: "background", type: "text", zh: "背景场景", en: "Background", placeholderZh: "例如：明亮现代办公室虚化背景", placeholderEn: "e.g. bright modern office with soft bokeh" }, { id: "style", type: "select", zh: "照片风格", en: "Photo style", options: [["natural corporate photography", "自然企业肖像", "Natural corporate"], ["premium studio portrait", "高端影棚肖像", "Premium studio"], ["warm founder portrait", "温暖创始人形象", "Warm founder"]] }],
  "ai-product-photo": [{ id: "background", type: "text", zh: "商品场景", en: "Product scene", placeholderZh: "例如：纯白电商背景，柔和自然阴影", placeholderEn: "e.g. pure white ecommerce backdrop with soft shadow" }, { id: "style", type: "select", zh: "成片类型", en: "Output style", options: [["clean ecommerce catalog photography", "电商白底主图", "Ecommerce catalog"], ["premium advertising hero image", "广告级主视觉", "Advertising hero"], ["realistic lifestyle product scene", "真实生活场景图", "Lifestyle scene"]] }, { id: "prompt", type: "textarea", zh: "补充要求（可选）", en: "Additional direction (optional)" }],
  "ai-portrait-studio": [{ id: "style", type: "select", zh: "写真风格", en: "Portrait style", options: [["cinematic editorial portrait", "电影感时尚写真", "Cinematic editorial"], ["clean Japanese daylight portrait", "日系清透写真", "Japanese daylight"], ["classic fine-art studio portrait", "经典艺术影棚", "Fine-art studio"], ["urban night fashion portrait", "城市夜景时尚", "Urban night fashion"]] }, { id: "background", type: "text", zh: "场景描述", en: "Scene", placeholderZh: "例如：雨后霓虹街道、柔和景深", placeholderEn: "e.g. neon street after rain with soft depth of field" }, { id: "prompt", type: "textarea", zh: "补充要求（可选）", en: "Additional direction (optional)" }],
  "ai-background-replacer": [{ id: "background", type: "textarea", zh: "新背景描述", en: "New background", placeholderZh: "例如：落地窗旁的现代咖啡店，下午自然光", placeholderEn: "e.g. modern cafe by a window in soft afternoon light" }, { id: "prompt", type: "text", zh: "补充要求（可选）", en: "Additional direction (optional)" }],
  "ai-image-restorer": [{ id: "prompt", type: "select", zh: "修复重点", en: "Restoration priority", options: [["enhance facial details and overall clarity", "人脸与整体清晰度", "Faces and overall clarity"], ["restore old photo scratches and natural colors", "老照片划痕与自然上色", "Old photo and color"], ["remove compression artifacts and sharpen product details", "去压缩痕迹与商品细节", "Compression and product detail"]] }],
};
const imageToolInitial = { format: "webp", targetKb: "200", width: "1200", height: "", preset: "xiaohongshu-cover", title: "一个网站，解决每天的小需求", subtitle: "简单、好用的 AI 工具平台", brand: "OneShowTools", accent: "#1769e8", watermark: "OneShowTools", opacity: "55", fontSize: "48", background: "", backgroundColor: "white", outfit: "", style: "natural realistic photography", prompt: "", tolerance: "48", language: "chi_sim+eng" };
const pdfToolFields = {
  "pdf-split": [{ id: "pages", type: "text", zh: "页码范围", en: "Page range", placeholderZh: "例如：1-3, 6, 9-12；留空为全部", placeholderEn: "e.g. 1-3, 6, 9-12; blank means all" }, { id: "splitMode", type: "select", zh: "输出方式", en: "Output", options: [["individual", "每页单独 PDF（ZIP）", "One PDF per page (ZIP)"], ["extract", "选中页面合成一个 PDF", "Combine selected pages into one PDF"]] }],
  "pdf-compress": [{ id: "quality", type: "range", zh: "页面清晰度", en: "Page quality", min: 45, max: 90 }, { id: "scale", type: "select", zh: "输出分辨率", en: "Output resolution", options: [["1", "标准 · 72 DPI", "Standard · 72 DPI"], ["1.25", "清晰 · 90 DPI", "Clear · 90 DPI"], ["1.6", "高清 · 115 DPI", "High · 115 DPI"]] }],
  "pdf-organizer": [{ id: "order", type: "text", zh: "保留顺序", en: "Pages to keep in order", placeholderZh: "例如：3,1,2,5；留空保持原顺序", placeholderEn: "e.g. 3,1,2,5; blank keeps original order" }, { id: "rotate", type: "select", zh: "批量旋转", en: "Rotate all", options: [["0", "不旋转", "No rotation"], ["90", "顺时针 90°", "Clockwise 90°"], ["180", "旋转 180°", "Rotate 180°"], ["270", "逆时针 90°", "Counterclockwise 90°"]] }],
  "pdf-to-images": [{ id: "format", type: "select", zh: "图片格式", en: "Image format", options: [["png", "PNG · 适合文字与图表", "PNG · best for text and charts"], ["jpg", "JPG · 文件更小", "JPG · smaller files"]] }],
  "pdf-watermark": [{ id: "watermark", type: "text", zh: "水印文字", en: "Watermark text" }, { id: "opacity", type: "range", zh: "透明度", en: "Opacity", min: 8, max: 80 }, { id: "fontSize", type: "number", zh: "字号", en: "Font size", min: 12, max: 96 }, { id: "color", type: "color", zh: "文字颜色", en: "Text color" }],
  "pdf-page-numbers": [{ id: "start", type: "number", zh: "起始页码", en: "Starting number", min: 1, max: 9999 }, { id: "position", type: "select", zh: "页码位置", en: "Position", options: [["bottom-left", "底部左侧", "Bottom left"], ["bottom-center", "底部居中", "Bottom center"], ["bottom-right", "底部右侧", "Bottom right"], ["top-left", "顶部左侧", "Top left"], ["top-center", "顶部居中", "Top center"], ["top-right", "顶部右侧", "Top right"]] }],
  "pdf-ocr": [{ id: "language", type: "select", zh: "识别语言", en: "Recognition language", options: [["chi_sim+eng", "简体中文 + English"], ["chi_sim", "简体中文"], ["eng", "English"]] }],
};
const pdfToolInitial = { pages: "", splitMode: "individual", quality: "72", scale: "1.25", order: "", rotate: "0", format: "png", watermark: "OneShowTools", opacity: "22", fontSize: "42", color: "#1769e8", start: "1", position: "bottom-center", language: "chi_sim+eng", question: "" };
const mediaToolSlugs = new Set(["video-compressor", "mov-to-mp4", "mkv-to-mp4", "video-trimmer", "video-to-gif", "video-extract-audio", "mp4-to-mp3", "audio-format-converter", "audio-trimmer", "audio-merger", "audio-normalizer"]);
const mediaToolFields = {
  "video-compressor": [{ id: "quality", type: "select", zh: "压缩强度", en: "Compression", options: [["quality", "优先画质", "Quality first"], ["balanced", "平衡", "Balanced"], ["small", "优先体积", "Smaller file"]] }],
  "video-trimmer": [{ id: "start", type: "number", zh: "开始时间（秒）", en: "Start time (seconds)", min: 0, max: 21600 }, { id: "duration", type: "number", zh: "截取时长（秒）", en: "Duration (seconds)", min: 0.1, max: 3600 }],
  "video-to-gif": [{ id: "start", type: "number", zh: "开始时间（秒）", en: "Start time (seconds)", min: 0, max: 21600 }, { id: "duration", type: "number", zh: "动图时长（最多 30 秒）", en: "GIF duration (max 30s)", min: 0.2, max: 30 }, { id: "width", type: "select", zh: "动图宽度", en: "GIF width", options: [["480", "480 px"], ["640", "640 px"], ["800", "800 px"]] }],
  "audio-format-converter": [{ id: "format", type: "select", zh: "输出格式", en: "Output format", options: [["mp3", "MP3"], ["wav", "WAV"], ["flac", "FLAC"]] }],
  "audio-trimmer": [{ id: "start", type: "number", zh: "开始时间（秒）", en: "Start time (seconds)", min: 0, max: 21600 }, { id: "duration", type: "number", zh: "截取时长（秒）", en: "Duration (seconds)", min: 0.1, max: 3600 }],
  "audio-normalizer": [{ id: "target", type: "select", zh: "目标响度", en: "Target loudness", options: [["-16", "播客 · -16 LUFS", "Podcast · -16 LUFS"], ["-14", "在线视频 · -14 LUFS", "Online video · -14 LUFS"], ["-18", "语音节目 · -18 LUFS", "Voice · -18 LUFS"]] }],
};
const mediaToolInitial = { quality: "balanced", start: "0", duration: "10", width: "640", format: "mp3", target: "-16" };
const dataFileToolSlugs = new Set(["excel-merger", "excel-splitter", "csv-file-splitter", "excel-deduplicator", "excel-to-csv", "json-to-excel", "xml-to-excel", "excel-to-json", "table-field-mapper", "table-pivot-summary", "contact-data-extractor"]);
const dataFileToolFields = {
  "csv-file-splitter": [{ id: "rowsPerFile", type: "select", zh: "每个文件的数据行", en: "Rows per file", options: [["1000", "1,000"], ["5000", "5,000"], ["10000", "10,000"], ["50000", "50,000"]] }],
  "excel-deduplicator": [{ id: "keyColumn", type: "text", zh: "去重字段（可选）", en: "Deduplication key (optional)", placeholderZh: "输入表头名称；留空按整行去重", placeholderEn: "Header name; blank compares the whole row" }],
  "table-field-mapper": [{ id: "mapping", type: "textarea", zh: "字段映射（每行一项）", en: "Field mapping (one per line)", placeholderZh: "原字段:新字段\nphone:手机号", placeholderEn: "old_name:new_name\nphone:phone_number" }],
  "table-pivot-summary": [{ id: "groupColumn", type: "text", zh: "分组字段", en: "Group column" }, { id: "valueColumn", type: "text", zh: "数值字段（计数可留空）", en: "Value column (optional for count)" }, { id: "aggregation", type: "select", zh: "统计方式", en: "Aggregation", options: [["sum", "求和", "Sum"], ["count", "计数", "Count"], ["average", "平均值", "Average"]] }],
};
const dataFileToolInitial = { rowsPerFile: "5000", keyColumn: "", mapping: "", groupColumn: "", valueColumn: "", aggregation: "sum" };
const dataFileAccept = (slug) => slug === "json-to-excel" ? ".json,application/json" : slug === "xml-to-excel" ? ".xml,application/xml,text/xml" : slug === "csv-file-splitter" ? ".csv,text/csv" : ["table-field-mapper", "table-pivot-summary"].includes(slug) ? ".xlsx,.csv" : slug === "contact-data-extractor" ? ".xlsx,.csv,.txt" : ".xlsx";
const dataFileHint = (slug) => slug === "json-to-excel" ? "JSON" : slug === "xml-to-excel" ? "XML" : slug === "csv-file-splitter" ? "CSV" : ["table-field-mapper", "table-pivot-summary"].includes(slug) ? "XLSX · CSV" : slug === "contact-data-extractor" ? "XLSX · CSV · TXT" : "XLSX";
const utilityToolSlugs = new Set(["json-formatter", "data-format-converter", "jwt-decoder", "timestamp-converter", "base64-url-codec", "regex-tester", "text-diff", "meta-title-generator", "meta-description-generator", "schema-generator", "serp-preview", "robots-generator", "sitemap-checker", "xiaohongshu-copy", "content-repurposer", "qr-code-generator", "text-statistics", "csv-json-converter", "csv-cleaner", "csv-to-excel", "markdown-html-converter", "rich-text-cleaner", "utm-builder"]);
const utilityToolFields = {
  "json-formatter": [{ id: "source", type: "textarea", zh: "JSON 内容", en: "JSON input" }, { id: "mode", type: "select", zh: "处理方式", en: "Mode", options: [["format", "格式化", "Format"], ["minify", "压缩", "Minify"]] }],
  "data-format-converter": [{ id: "source", type: "textarea", zh: "结构化数据", en: "Structured data" }, { id: "inputFormat", type: "select", zh: "输入格式", en: "Input format", options: [["json", "JSON"], ["yaml", "YAML"], ["xml", "XML"]] }, { id: "outputFormat", type: "select", zh: "输出格式", en: "Output format", options: [["yaml", "YAML"], ["json", "JSON"], ["xml", "XML"]] }],
  "jwt-decoder": [{ id: "token", type: "textarea", zh: "JWT Token", en: "JWT token", sensitive: true }],
  "timestamp-converter": [{ id: "value", type: "text", zh: "时间或时间戳", en: "Date or timestamp", placeholderZh: "例如：1722470400 或 2026-08-03T10:00:00Z", placeholderEn: "e.g. 1722470400 or 2026-08-03T10:00:00Z" }],
  "base64-url-codec": [{ id: "source", type: "textarea", zh: "待处理内容", en: "Source text", sensitive: true }, { id: "operation", type: "select", zh: "操作", en: "Operation", options: [["base64-encode", "Base64 编码"], ["base64-decode", "Base64 解码"], ["url-encode", "URL 编码"], ["url-decode", "URL 解码"]] }],
  "regex-tester": [{ id: "pattern", type: "text", zh: "正则表达式", en: "Regular expression", placeholderZh: "例如：(\\w+)@(\\w+\\.\\w+)", placeholderEn: "e.g. (\\w+)@(\\w+\\.\\w+)" }, { id: "flags", type: "text", zh: "Flags", en: "Flags", placeholderZh: "例如：gi", placeholderEn: "e.g. gi" }, { id: "source", type: "textarea", zh: "测试文本", en: "Test text" }],
  "text-diff": [{ id: "before", type: "textarea", zh: "原始文本", en: "Original text" }, { id: "after", type: "textarea", zh: "修改后文本", en: "Revised text" }],
  "meta-title-generator": [{ id: "keyword", type: "text", zh: "目标关键词", en: "Target keyword" }, { id: "brand", type: "text", zh: "品牌名称（可选）", en: "Brand (optional)" }],
  "meta-description-generator": [{ id: "keyword", type: "text", zh: "目标关键词", en: "Target keyword" }, { id: "benefit", type: "textarea", zh: "页面价值与用户收益", en: "Page value and user benefit" }],
  "schema-generator": [{ id: "schemaType", type: "select", zh: "Schema 类型", en: "Schema type", options: [["Article", "Article"], ["Product", "Product"], ["Organization", "Organization"], ["BreadcrumbList", "BreadcrumbList"]] }, { id: "name", type: "text", zh: "名称 / 标题", en: "Name / title", placeholderZh: "面包屑请用 > 分隔", placeholderEn: "Use > between breadcrumb items" }, { id: "url", type: "url", zh: "页面 URL", en: "Page URL" }, { id: "description", type: "textarea", zh: "描述", en: "Description" }, { id: "author", type: "text", zh: "作者（Article）", en: "Author (Article)" }, { id: "brand", type: "text", zh: "品牌（Product）", en: "Brand (Product)" }],
  "serp-preview": [{ id: "title", type: "text", zh: "页面标题", en: "Page title" }, { id: "url", type: "url", zh: "页面 URL", en: "Page URL" }, { id: "description", type: "textarea", zh: "Meta Description", en: "Meta description" }],
  "robots-generator": [{ id: "website", type: "url", zh: "网站地址", en: "Website URL" }, { id: "allow", type: "textarea", zh: "允许路径（每行一个，可选）", en: "Allowed paths (one per line, optional)" }, { id: "disallow", type: "textarea", zh: "禁止路径（每行一个）", en: "Disallowed paths (one per line)" }, { id: "sitemap", type: "url", zh: "Sitemap 地址（可选）", en: "Sitemap URL (optional)" }],
  "sitemap-checker": [{ id: "website", type: "url", zh: "网站或 Sitemap 地址", en: "Website or sitemap URL", placeholderZh: "https://example.com 或 https://example.com/sitemap.xml", placeholderEn: "https://example.com or https://example.com/sitemap.xml" }],
  "xiaohongshu-copy": [{ id: "topic", type: "textarea", zh: "主题、卖点或素材", en: "Topic, benefits, or source material" }, { id: "audience", type: "text", zh: "目标人群", en: "Target audience" }, { id: "tone", type: "select", zh: "文案语气", en: "Tone", options: [["真实分享", "真实分享", "Authentic"], ["专业干货", "专业干货", "Expert"], ["轻松种草", "轻松种草", "Conversational"]] }],
  "content-repurposer": [{ id: "source", type: "textarea", zh: "原始内容", en: "Source content" }, { id: "platforms", type: "text", zh: "目标平台", en: "Target platforms", placeholderZh: "例如：小红书、公众号、LinkedIn、X", placeholderEn: "e.g. Xiaohongshu, WeChat, LinkedIn, X" }],
  "qr-code-generator": [{ id: "content", type: "textarea", zh: "网址或二维码内容", en: "URL or QR content", placeholderZh: "支持网址、文本、Wi-Fi 配置或联系方式", placeholderEn: "URL, text, Wi-Fi settings, or contact details" }, { id: "size", type: "select", zh: "图片尺寸", en: "Image size", options: [["320", "320 × 320"], ["640", "640 × 640"], ["1024", "1024 × 1024"]] }, { id: "errorCorrection", type: "select", zh: "容错等级", en: "Error correction", options: [["M", "标准", "Standard"], ["Q", "较高", "High"], ["H", "最高", "Maximum"]] }],
  "text-statistics": [{ id: "source", type: "textarea", zh: "需要统计的文本", en: "Text to analyze" }],
  "csv-json-converter": [{ id: "source", type: "textarea", zh: "CSV 或 JSON 数据", en: "CSV or JSON data" }, { id: "direction", type: "select", zh: "转换方向", en: "Direction", options: [["csv-to-json", "CSV 转 JSON", "CSV to JSON"], ["json-to-csv", "JSON 转 CSV", "JSON to CSV"]] }, { id: "delimiter", type: "select", zh: "分隔符", en: "Delimiter", options: [["comma", "逗号", "Comma"], ["tab", "制表符", "Tab"], ["semicolon", "分号", "Semicolon"]] }],
  "csv-cleaner": [{ id: "source", type: "textarea", zh: "CSV 数据", en: "CSV data" }, { id: "delimiter", type: "select", zh: "分隔符", en: "Delimiter", options: [["comma", "逗号", "Comma"], ["tab", "制表符", "Tab"], ["semicolon", "分号", "Semicolon"]] }, { id: "trimCells", type: "select", zh: "清理首尾空格", en: "Trim cell whitespace", options: [["yes", "是", "Yes"], ["no", "否", "No"]] }, { id: "deduplicate", type: "select", zh: "删除重复行", en: "Remove duplicate rows", options: [["yes", "是", "Yes"], ["no", "否", "No"]] }],
  "csv-to-excel": [{ id: "source", type: "textarea", zh: "CSV 数据", en: "CSV data" }, { id: "delimiter", type: "select", zh: "分隔符", en: "Delimiter", options: [["comma", "逗号", "Comma"], ["tab", "制表符", "Tab"], ["semicolon", "分号", "Semicolon"]] }],
  "markdown-html-converter": [{ id: "source", type: "textarea", zh: "Markdown 或 HTML", en: "Markdown or HTML" }, { id: "direction", type: "select", zh: "转换方向", en: "Direction", options: [["markdown-to-html", "Markdown 转 HTML", "Markdown to HTML"], ["html-to-markdown", "HTML 转 Markdown", "HTML to Markdown"]] }],
  "rich-text-cleaner": [{ id: "source", type: "textarea", zh: "粘贴富文本或 HTML", en: "Paste rich text or HTML" }],
  "utm-builder": [{ id: "url", type: "url", zh: "目标网址", en: "Destination URL", placeholderZh: "https://example.com/landing", placeholderEn: "https://example.com/landing" }, { id: "source", type: "text", zh: "广告来源 utm_source", en: "Campaign source" }, { id: "medium", type: "text", zh: "渠道 utm_medium", en: "Campaign medium" }, { id: "campaign", type: "text", zh: "活动名称 utm_campaign", en: "Campaign name" }, { id: "term", type: "text", zh: "关键词（可选）", en: "Term (optional)" }, { id: "content", type: "text", zh: "素材标识（可选）", en: "Content label (optional)" }],
};
const utilityToolInitial = { source: "", mode: "format", inputFormat: "json", outputFormat: "yaml", token: "", value: "", operation: "base64-encode", pattern: "", flags: "gi", before: "", after: "", keyword: "", brand: "", benefit: "", schemaType: "Article", name: "", url: "", description: "", author: "", website: "", allow: "/", disallow: "/admin\n/private", sitemap: "", title: "", topic: "", audience: "", tone: "真实分享", platforms: "小红书、公众号、LinkedIn、X", content: "", size: "640", errorCorrection: "M", direction: "csv-to-json", delimiter: "comma", trimCells: "yes", deduplicate: "yes", medium: "", campaign: "", term: "" };
const writingIconMap = { Article, ArrowsClockwise, TrendUp, MegaphoneSimple, ShareNetwork, Briefcase, Palette };
const seoIconMap = { MagnifyingGlass, Article, Pulse: ChartLineUp, TrendUp, Link: ShareNetwork, Binoculars, FileText };
const seoSpecialistFor = (catalog, slug) => catalog?.specialists?.find((item) => item.slug === slug) || null;
const seoCatalogForTool = (catalog, tool) => {
  if (!catalog || tool?.slug === "seo-workbench") return catalog;
  const specialist = seoSpecialistFor(catalog, tool?.slug);
  if (!specialist) return null;
  const allowed = new Set(specialist.templateIds);
  return {
    ...catalog,
    specialist,
    modules: catalog.modules
      .map((module) => ({ ...module, templates: module.templates.filter((template) => allowed.has(template.id)) }))
      .filter((module) => module.templates.length),
  };
};
const marketplaceCategories = [
  { id: "all", icon: SquaresFour, accepts: [] },
  { id: "writing", icon: PenNib, accepts: ["writing"] },
  { id: "seo", icon: ChartLineUp, accepts: ["seo"] },
  { id: "marketing", icon: Megaphone, accepts: ["marketing"] },
  { id: "developer", icon: Code, accepts: ["developer"] },
  { id: "startup", icon: Lightbulb, accepts: ["startup"] },
  { id: "productivity", icon: Briefcase, accepts: ["document", "productivity"] },
  { id: "social", icon: ShareNetwork, accepts: ["social"] },
  { id: "data", icon: ChartBar, accepts: ["data"] },
  { id: "searchCategory", icon: Binoculars, accepts: ["search"] },
  { id: "image", icon: ImageSquare, accepts: ["image"] },
  { id: "video", icon: VideoCamera, accepts: ["video"] },
  { id: "audio", icon: Microphone, accepts: ["audio"] },
  { id: "music", icon: MusicNotes, accepts: ["music"] },
  { id: "agent", icon: Robot, accepts: ["agent"] },
];

const dictionary = {
  "zh-CN": {
    nav: { dashboard: "工作台", marketplace: "AI 工具市场", recent: "最近使用", favorites: "我的收藏", agent: "AI Agent", runtime: "AI Runtime", tasks: "任务中心", files: "文件中心", projects: "项目中心", plans: "积分与套餐", billing: "计费中心", settings: "设置中心", credits: "积分", account: "用户系统" },
    search: "搜索工具或输入你想完成的任务", searchAction: "搜索", popularTools: "常用工具", today: "今天想完成什么？", todaySub: "搜索你需要的能力，快速找到合适的 AI 工具。",
    login: "登录", signup: "注册", logout: "退出登录", language: "EN", overview: "平台概览", recentTasks: "最近任务", openMarketplace: "打开工具市场",
    creditsBalance: "可用积分", taskCount: "任务总数", fileCount: "文件数量", completed: "已完成", noTasks: "还没有任务", noTasksHint: "从工具市场选择一个工具，创建你的第一个任务。",
    marketplace: "工具市场", marketplaceSub: "按场景发现工具，用一个账户完成从创作到交付的工作。", all: "全部工具", image: "图片工具", document: "文档工具", audio: "音频工具", music: "音乐工具", writing: "写作工具",
    seo: "SEO 工具", marketing: "营销工具", developer: "开发工具", startup: "创业工具", productivity: "办公工具", social: "社媒工具", data: "数据工具", searchCategory: "AI 搜索", video: "视频工具", agent: "AI Agent",
    categoryDirectory: "工具分类", availableTools: "个可用工具", marketplaceResults: "工具目录", toolsFound: "个结果", comingSoon: "该分类的工具正在接入", comingSoonHint: "你可以先查看其他分类，或搜索已经上线的能力。",
    ready: "可运行", config: "待配置", creditsUnit: "积分 / 次", run: "打开工具", runTitle: "创建 AI 任务", inputLabel: "任务内容", inputPlaceholder: "输入需要处理的文本或任务要求…",
    attach: "关联文件", createTask: "创建任务", taskCreated: "任务已创建，可在任务中心查看状态。", runtime: "AI Runtime", runtimeSub: "管理平台托管模型、个人模型连接与工具运行方式。",
    provider: "运行提供商", model: "模型", status: "状态", configured: "已配置", notConfigured: "未配置", runtimeNote: "未配置的运行服务不会伪造结果；任务会保留真实状态并自动退回积分。",
    credits: "Credits", creditsSub: "每一笔获取与消耗都有可追踪的真实账本记录。", ledger: "积分流水", amount: "变动", balance: "余额", description: "说明", time: "时间",
    billing: "Billing", billingSub: "管理订阅方案、付款能力与当前订阅状态。", currentPlan: "当前方案", free: "免费版", monthly: "每月", subscribe: "订阅专业版",
    billingUnavailable: "支付通道尚未配置或暂时不可用，当前不会发起扣款。", billingReady: "支付通道已配置，可以创建真实结账会话。",
    tasks: "Task Center", tasksSub: "查看所有真实任务的状态、输入、输出和积分消耗。", retry: "刷新状态", cancel: "取消任务", taskOutput: "任务结果",
    files: "File Center", filesSub: "上传、下载和管理 AI 任务使用的真实文件。", upload: "上传文件", uploadHint: "单个文件最大 25MB", fileName: "文件名", size: "大小", download: "下载", delete: "删除", emptyFiles: "还没有上传文件",
    account: "用户系统", accountSub: "管理你的 OneShowTools Platform 账户与语言偏好。", emailStatus: "邮箱状态", pendingVerify: "待验证", verified: "已验证", memberSince: "注册时间",
    system: "平台状态", database: "SQLite 数据库", online: "运行正常", signInTitle: "登录 OneShowTools", signUpTitle: "创建 OneShowTools 账户", authSub: "一个账户，统一使用所有 AI 工具。",
    name: "姓名", email: "邮箱", password: "密码", passwordHint: "至少 10 位", noAccount: "还没有账户？", hasAccount: "已有账户？",
    invalid: "请检查输入信息后重试。", welcome: "登录后使用完整平台", welcomeSub: "注册即可获得真实记录的 200 欢迎积分。",
    recentEmpty: "登录后，这里会显示你的真实任务和账户状态。", signInAction: "登录或注册", planPro: "专业版", planDesc: "适合持续使用多个 AI 工具的个人与团队。",
    error: "操作失败，请稍后重试。", fileLimit: "文件数量已达到 100 个，请先到文件中心删除不需要的文件。", insufficient: "积分不足，请先充值或订阅。", loading: "正在加载真实数据…", inputRequired: "请输入任务内容，或选择一个文件。", noResults: "没有找到匹配的工具",
    backToMarket: "返回工具市场", toolWorkspace: "工具工作区", chooseFile: "选择文件", selectedFile: "已选择", startProcessing: "开始处理", processing: "正在处理",
    result: "处理结果", downloadResult: "下载结果", copyResult: "复制结果", copied: "已复制", imageTolerance: "背景容差", imageQuality: "压缩质量",
    textInput: "输入原始文案", pdfInput: "上传 PDF 文件", imageInput: "上传图片", speechInput: "实时语音识别", startSpeech: "开始识别", stopSpeech: "停止识别",
    browserUnsupported: "当前浏览器不支持实时语音识别。", loginToUse: "登录后即可运行此工具并保存任务记录。", localMode: "本地处理", aiMode: "AI 增强",
    registrationUnavailable: "邮箱注册尚未开放，请稍后再试。", verificationPending: "验证邮件已发送", verificationPendingBody: "验证邮箱后即可登录并领取欢迎积分。", resendVerification: "重新发送验证邮件",
    emailLogin: "邮箱登录", smsLogin: "短信登录", phone: "手机号", smsCode: "短信验证码", sendSmsCode: "获取验证码", resendSmsIn: "秒后重发", smsAuthTitle: "手机号登录或注册", smsAuthSub: "中国大陆手机号验证后即可登录，首次使用会自动创建账户。", smsCodeSent: "验证码已发送，5 分钟内有效。", smsUnavailable: "短信登录尚未开放。", smsInvalidPhone: "请输入正确的中国大陆手机号。", smsInvalidCode: "验证码不正确，请重新输入。", smsExpired: "验证码已过期，请重新获取。", smsRateLimited: "发送过于频繁，请稍后再试。",
    forgotPassword: "忘记密码？", recoveryTitle: "找回密码", recoveryBody: "如果该邮箱已注册，你将收到重置邮件。", sendRecovery: "发送重置邮件", resetTitle: "设置新密码", newPassword: "新密码", resetSuccess: "密码已更新，请重新登录。",
    accountProfile: "账户资料", saveProfile: "保存资料", accountSecurity: "账户安全", currentPassword: "当前密码", changePassword: "修改密码", newEmail: "新邮箱", changeEmail: "验证新邮箱",
    activeSessions: "登录设备", revokeOthers: "退出其他设备", privacyControls: "隐私与数据", exportData: "导出账户数据", deleteAccount: "删除账户", deletionUnavailable: "账户删除需完成政策配置后开放。",
    billingPortal: "管理支付", invoices: "交易记录", noInvoices: "暂无交易记录", pendingConfirmation: "付款完成后需要等待安全回调确认。",
    managedModel: "平台托管模型", personalModels: "我的模型连接", addModel: "添加模型连接", connectionName: "连接名称", providerTemplate: "接口协议", baseUrl: "API 地址（Base URL）", baseUrlPlaceholder: "例如：https://api.deepseek.com", apiKey: "API Key", saveConnection: "安全保存",
    keyPrivacy: "API Key 会加密保存，提交后仅显示末四位，平台和管理员都无法再次查看明文。", noConnections: "尚未添加个人模型连接", testConnection: "测试", setDefault: "设为默认", disable: "停用", enable: "启用", rotateKey: "更换 Key", deleteConnection: "删除",
    selectModel: "运行模型", useManaged: "OneShowModel（平台托管）", connectionHealthy: "连接可用", testBeforeSave: "测试连接", testingConnection: "正在测试", testPassed: "连接测试成功", testFailed: "连接测试失败", testRequired: "请先测试连接，成功后再保存。", modelRouteSaved: "工具模型配置已保存", localTool: "本地工具，无需配置模型", toolSettings: "工具设置", toolSettingsHint: "选择这个工具运行时使用的平台模型或个人模型连接。", saveSettings: "保存设置", currentModel: "当前模型",
    runtimeReady: "模型服务运行正常", managedDescription: "无需配置 API Key，登录后即可在支持的工具中使用。", connectionCount: "个人连接", enabledTools: "可用工具", addFirstConnection: "添加第一个连接", connectionsHint: "接入你自己的模型账户，并自由设置工具的运行来源。", toolRouting: "工具运行方式", toolRoutingHint: "每个工具都明确显示当前处理方式。", close: "关闭",
  },
  en: {
    nav: { dashboard: "Workspace", marketplace: "AI Marketplace", recent: "Recently used", favorites: "Favorites", agent: "AI Agent", runtime: "AI Runtime", tasks: "Task Center", files: "File Center", projects: "Project Center", plans: "Credits & Plans", billing: "Billing", settings: "Settings", credits: "Credits", account: "Account" },
    search: "Search tools or describe what you want to do", searchAction: "Search", popularTools: "Popular tools", today: "What would you like to accomplish?", todaySub: "Search by capability and quickly find the right AI tool.",
    login: "Sign in", signup: "Sign up", logout: "Sign out", language: "中文", overview: "Platform overview", recentTasks: "Recent tasks", openMarketplace: "Open marketplace",
    creditsBalance: "Available credits", taskCount: "Total tasks", fileCount: "Files", completed: "Completed", noTasks: "No tasks yet", noTasksHint: "Choose a tool in the marketplace to create your first task.",
    marketplace: "Tool Marketplace", marketplaceSub: "Discover tools by workflow and get work done with one account.", all: "All tools", image: "Image", document: "Documents", audio: "Audio", music: "Music", writing: "Writing",
    seo: "SEO", marketing: "Marketing", developer: "Developer", startup: "Startup", productivity: "Productivity", social: "Social", data: "Data", searchCategory: "AI Search", video: "Video", agent: "AI Agent",
    categoryDirectory: "Categories", availableTools: "tools available", marketplaceResults: "Tool directory", toolsFound: "results", comingSoon: "Tools in this category are on the way", comingSoonHint: "Browse another category or search the capabilities already available.",
    ready: "Ready", config: "Setup required", creditsUnit: "credits / run", run: "Open tool", runTitle: "Create AI task", inputLabel: "Task content", inputPlaceholder: "Enter the text or instructions to process…",
    attach: "Attach files", createTask: "Create task", taskCreated: "Task created. Track it in Task Center.", runtime: "AI Runtime", runtimeSub: "Manage the hosted model, personal connections, and tool routing.",
    provider: "Provider", model: "Model", status: "Status", configured: "Configured", notConfigured: "Not configured", runtimeNote: "Unconfigured runtimes never fabricate results. Tasks retain their real state and credits are refunded.",
    credits: "Credits", creditsSub: "Every grant and charge is recorded in a traceable ledger.", ledger: "Credit ledger", amount: "Change", balance: "Balance", description: "Description", time: "Time",
    billing: "Billing", billingSub: "Manage plans, payment capability, and subscription status.", currentPlan: "Current plan", free: "Free", monthly: "month", subscribe: "Subscribe to Pro",
    billingUnavailable: "No payment channel is available, so no charge can be created.", billingReady: "A payment channel is configured and ready for checkout.",
    tasks: "Task Center", tasksSub: "Review real task status, input, output, and credit usage.", retry: "Refresh status", cancel: "Cancel task", taskOutput: "Task output",
    files: "File Center", filesSub: "Upload, download, and manage real files used by AI tasks.", upload: "Upload file", uploadHint: "25MB maximum per file", fileName: "File name", size: "Size", download: "Download", delete: "Delete", emptyFiles: "No files uploaded yet",
    account: "User system", accountSub: "Manage your OneShowTools Platform account and language.", emailStatus: "Email status", pendingVerify: "Pending verification", verified: "Verified", memberSince: "Member since",
    system: "Platform status", database: "SQLite database", online: "Operational", signInTitle: "Sign in to OneShowTools", signUpTitle: "Create your OneShowTools account", authSub: "One account for every AI tool.",
    name: "Name", email: "Email", password: "Password", passwordHint: "10 characters minimum", noAccount: "New to OneShowTools?", hasAccount: "Already have an account?",
    invalid: "Check your details and try again.", welcome: "Sign in for the complete platform", welcomeSub: "New accounts receive 200 credits recorded in the real ledger.",
    recentEmpty: "Your real tasks and account state will appear here after sign-in.", signInAction: "Sign in or sign up", planPro: "Pro", planDesc: "For individuals and teams using multiple AI tools regularly.",
    error: "Something went wrong. Please try again.", fileLimit: "You have reached the 100-file limit. Delete unused files in File Center first.", insufficient: "Not enough credits. Top up or subscribe first.", loading: "Loading live data…", inputRequired: "Enter task content or select a file.", noResults: "No matching tools found",
    backToMarket: "Back to marketplace", toolWorkspace: "Tool workspace", chooseFile: "Choose file", selectedFile: "Selected", startProcessing: "Start processing", processing: "Processing",
    result: "Result", downloadResult: "Download result", copyResult: "Copy result", copied: "Copied", imageTolerance: "Background tolerance", imageQuality: "Compression quality",
    textInput: "Enter original copy", pdfInput: "Upload PDF", imageInput: "Upload image", speechInput: "Live speech recognition", startSpeech: "Start recognition", stopSpeech: "Stop recognition",
    browserUnsupported: "Live speech recognition is not supported in this browser.", loginToUse: "Sign in to run this tool and save its task record.", localMode: "Local processing", aiMode: "AI enhanced",
    registrationUnavailable: "Email registration is not open yet.", verificationPending: "Verification email sent", verificationPendingBody: "Verify your email before signing in and receiving welcome credits.", resendVerification: "Resend verification",
    emailLogin: "Email", smsLogin: "SMS", phone: "Phone number", smsCode: "Verification code", sendSmsCode: "Send code", resendSmsIn: "s to resend", smsAuthTitle: "Sign in or register by phone", smsAuthSub: "Verify a mainland China phone number. A new account is created on first use.", smsCodeSent: "Code sent and valid for 5 minutes.", smsUnavailable: "SMS sign-in is not available.", smsInvalidPhone: "Enter a valid mainland China phone number.", smsInvalidCode: "The verification code is incorrect.", smsExpired: "The code has expired. Request a new one.", smsRateLimited: "Too many attempts. Try again later.",
    forgotPassword: "Forgot password?", recoveryTitle: "Recover your account", recoveryBody: "If the email is registered, a reset message is on the way.", sendRecovery: "Send reset email", resetTitle: "Choose a new password", newPassword: "New password", resetSuccess: "Password updated. Sign in again.",
    accountProfile: "Profile", saveProfile: "Save profile", accountSecurity: "Account security", currentPassword: "Current password", changePassword: "Change password", newEmail: "New email", changeEmail: "Verify new email",
    activeSessions: "Signed-in devices", revokeOthers: "Sign out other devices", privacyControls: "Privacy and data", exportData: "Export account data", deleteAccount: "Delete account", deletionUnavailable: "Account deletion opens after the retention policy is configured.",
    billingPortal: "Manage payments", invoices: "Transactions", noInvoices: "No transactions yet", pendingConfirmation: "Payment access updates only after secure provider confirmation.",
    managedModel: "Managed model", personalModels: "My model connections", addModel: "Add model connection", connectionName: "Connection name", providerTemplate: "API protocol", baseUrl: "API Base URL", baseUrlPlaceholder: "For example: https://api.deepseek.com", apiKey: "API Key", saveConnection: "Save securely",
    keyPrivacy: "API keys are encrypted and cannot be displayed again. Only the last four characters remain visible.", noConnections: "No personal model connections yet", testConnection: "Test", setDefault: "Set default", disable: "Disable", enable: "Enable", rotateKey: "Rotate key", deleteConnection: "Delete",
    selectModel: "Runtime model", useManaged: "OneShowModel (managed)", connectionHealthy: "Connection ready", testBeforeSave: "Test connection", testingConnection: "Testing", testPassed: "Connection test passed", testFailed: "Connection test failed", testRequired: "Test the connection successfully before saving.", modelRouteSaved: "Tool model setting saved", localTool: "Local tool · no model setup needed", toolSettings: "Tool settings", toolSettingsHint: "Choose the managed model or a personal connection for this tool.", saveSettings: "Save settings", currentModel: "Current model",
    runtimeReady: "Model service operational", managedDescription: "No API key setup required. Use it immediately in supported tools.", connectionCount: "Personal connections", enabledTools: "Available tools", addFirstConnection: "Add your first connection", connectionsHint: "Connect your own model account and choose how supported tools run.", toolRouting: "Tool routing", toolRoutingHint: "See the processing route for every tool at a glance.", close: "Close",
  },
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "include",
    ...(options.method ? {} : { cache: "no-store" }),
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.code || "REQUEST_FAILED");
    error.status = response.status;
    throw error;
  }
  return data;
};
const jsonOptions = (method, data) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
const formatDate = (value, locale) => value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
const formatBytes = (bytes) => bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const statusLabel = (status, locale) => ({
  queued: locale === "en" ? "Queued" : "排队中", running: locale === "en" ? "Running" : "运行中",
  completed: locale === "en" ? "Completed" : "已完成", failed: locale === "en" ? "Failed" : "失败",
  waiting_for_runtime: locale === "en" ? "Runtime required" : "等待运行服务", cancelled: locale === "en" ? "Cancelled" : "已取消",
})[status] || status;
const modelTestLabel = (status, locale) => ({
  healthy: locale === "en" ? "Connection ready" : "连接正常",
  model_auth_failed: locale === "en" ? "Authentication failed" : "密钥认证失败",
  model_rate_limited: locale === "en" ? "Rate limited" : "调用频率受限",
  model_timeout: locale === "en" ? "Timed out" : "连接超时",
  model_or_endpoint_invalid: locale === "en" ? "Model name or endpoint is invalid" : "模型名称或接口地址不正确",
  model_quota_exceeded: locale === "en" ? "Insufficient provider balance or quota" : "模型账户余额或额度不足",
  model_endpoint_blocked: locale === "en" ? "Endpoint blocked by security policy" : "接口地址未通过安全校验",
  invalid_model_endpoint: locale === "en" ? "Enter a valid HTTPS API base URL" : "请输入有效的 HTTPS API 地址",
  unavailable: locale === "en" ? "Model unavailable" : "模型暂不可用",
})[status] || (locale === "en" ? "Not tested" : "尚未测试");

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark"><img src="/brand/oneshowtools-mark-192.png" alt="" /></span><span><strong><span>OneShow</span><span className="brand-tools">Tools</span></strong><small>Platform</small></span></div>;
}

function StatusPill({ status, locale }) {
  return <span className={`status-pill ${status}`}>{["completed", "ready"].includes(status) ? <CheckCircle size={14} weight="fill" /> : ["running", "queued"].includes(status) ? <SpinnerGap className="spin" size={14} /> : <Clock size={14} />}{status === "ready" ? dictionary[locale].ready : status === "configuration_required" ? dictionary[locale].config : statusLabel(status, locale)}</span>;
}

function SectionTitle({ title, action }) {
  return <div className="section-title"><h2>{title}</h2>{action}</div>;
}
function PageHeading({ title, subtitle, action }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}
function Loading({ locale }) {
  return <div className="loading-state"><SpinnerGap className="spin" size={24} />{dictionary[locale].loading}</div>;
}
function EmptyState({ icon: Icon = ListChecks, title, body, action }) {
  return <div className="empty-state"><span><Icon size={28} /></span><h3>{title}</h3>{body && <p>{body}</p>}{action}</div>;
}

function AuthDialog({ locale, registrationEnabled, smsAuthEnabled, onClose, onAuthenticated }) {
  const t = dictionary[locale];
  const resetToken = new URLSearchParams(location.search).get("resetToken");
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [authMethod, setAuthMethod] = useState("email");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [smsForm, setSmsForm] = useState({ phone: "", code: "" });
  const [smsSent, setSmsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  useEffect(() => {
    if (!countdown) return undefined;
    const timer = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);
  const authError = (error) => ({
    INVALID_PHONE: t.smsInvalidPhone,
    INVALID_SMS_CODE: t.smsInvalidCode,
    SMS_CODE_INVALID: t.smsInvalidCode,
    SMS_CODE_EXPIRED: t.smsExpired,
    SMS_RATE_LIMITED: t.smsRateLimited,
    SMS_AUTH_UNAVAILABLE: t.smsUnavailable,
    LEGAL_CONSENT_REQUIRED: locale === "en" ? "Please accept the Terms and Privacy Policy." : "请先阅读并同意用户协议和隐私政策。",
  })[error.message] || (error.message === "EMAIL_UNVERIFIED" ? t.verificationPendingBody : t.invalid);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "signup") { await api("/api/auth/register", jsonOptions("POST", { ...form, locale, legalAccepted, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION })); setMode("pending"); }
      else if (mode === "forgot") { await api("/api/auth/forgot-password", jsonOptions("POST", { email: form.email })); setMessage(t.recoveryBody); }
      else if (mode === "reset") { await api("/api/auth/reset-password", jsonOptions("POST", { token: resetToken, password: form.password })); history.replaceState({}, "", location.pathname); setMode("login"); setMessage(t.resetSuccess); }
      else { const result = await api("/api/auth/login", jsonOptions("POST", { ...form, locale })); onAuthenticated(result.user); onClose(); }
    } catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); await api("/api/auth/resend-verification", jsonOptions("POST", { email: form.email })).catch(() => {});
    setMessage(t.verificationPendingBody); setBusy(false);
  };
  const sendSms = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await api("/api/auth/sms/send", jsonOptions("POST", { phone: smsForm.phone, locale }));
      setSmsSent(true); setCountdown(Number(result.retryAfter || 60)); setMessage(t.smsCodeSent);
    } catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  };
  const verifySms = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const result = await api("/api/auth/sms/verify", jsonOptions("POST", { phone: smsForm.phone, code: smsForm.code, locale, legalAccepted, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION })); onAuthenticated(result.user); onClose(); }
    catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  };
  const title = authMethod === "sms" ? t.smsAuthTitle : mode === "signup" ? t.signUpTitle : mode === "forgot" ? t.recoveryTitle : mode === "reset" ? t.resetTitle : mode === "pending" ? t.verificationPending : t.signInTitle;
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true">
    <button className="icon-button modal-close" onClick={onClose}><X size={20} /></button><Brand />
    <h2>{title}</h2><p className="modal-subtitle">{authMethod === "sms" ? t.smsAuthSub : mode === "pending" ? t.verificationPendingBody : mode === "forgot" ? t.recoveryBody : t.authSub}</p>
    {!["reset", "pending"].includes(mode) && <div className="auth-method-tabs" role="tablist"><button type="button" className={authMethod === "email" ? "active" : ""} onClick={() => { setAuthMethod("email"); setMessage(""); }}>{t.emailLogin}</button><button type="button" disabled={!smsAuthEnabled} className={authMethod === "sms" ? "active" : ""} onClick={() => { setAuthMethod("sms"); setMode("login"); setMessage(""); }}>{t.smsLogin}</button></div>}
    {authMethod === "sms" ? <form onSubmit={verifySms} className="auth-form"><label>{t.phone}<div className="phone-input"><span>+86</span><input inputMode="numeric" autoComplete="tel" required maxLength={11} placeholder="138 0000 0000" value={smsForm.phone} onChange={(event) => setSmsForm({ ...smsForm, phone: event.target.value.replace(/\D/g, "").slice(0, 11) })} /></div></label><label>{t.smsCode}<div className="sms-code-input"><input inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={smsForm.code} onChange={(event) => setSmsForm({ ...smsForm, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} /><button type="button" disabled={busy || countdown > 0 || smsForm.phone.length !== 11} onClick={sendSms}>{countdown > 0 ? `${countdown}${t.resendSmsIn}` : t.sendSmsCode}</button></div></label><LegalConsent locale={locale} checked={legalAccepted} onChange={setLegalAccepted} />{message && <p className="form-note" role="status"><Warning size={17} />{message}</p>}<button className="primary-button full" disabled={busy || !smsSent || smsForm.code.length !== 6 || !legalAccepted}>{busy ? <SpinnerGap className="spin" size={20} /> : t.login}</button></form> : mode === "pending" ? <div className="auth-form"><button className="secondary-button full" disabled={busy || !form.email} onClick={resend}>{t.resendVerification}</button><button className="primary-button full" onClick={() => setMode("login")}>{t.login}</button>{message && <p className="form-note">{message}</p>}</div> : <form onSubmit={submit} className="auth-form">{mode === "signup" && <label>{t.name}<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
      {mode !== "reset" && <label>{t.email}<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>}
      {!["forgot"].includes(mode) && <label>{mode === "reset" ? t.newPassword : t.password}<input type="password" required minLength={10} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>{t.passwordHint}</small></label>}
      {mode === "signup" && <LegalConsent locale={locale} checked={legalAccepted} onChange={setLegalAccepted} />}
      {message && <p className="form-note" role="status"><Warning size={17} />{message}</p>}<button className="primary-button full" disabled={busy || (mode === "signup" && (!registrationEnabled || !legalAccepted))}>{busy ? <SpinnerGap className="spin" size={20} /> : mode === "signup" ? t.signup : mode === "forgot" ? t.sendRecovery : mode === "reset" ? t.changePassword : t.login}</button>
      {mode === "login" && <button className="text-button" type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>{t.forgotPassword}</button>}
      {mode === "signup" && !registrationEnabled && <p className="config-caption">{t.registrationUnavailable}</p>}
    </form>}
    {authMethod === "email" && ["login", "signup"].includes(mode) && <p className="auth-switch">{mode === "signup" ? t.hasAccount : t.noAccount}{(registrationEnabled || mode === "signup") && <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? t.login : t.signup}</button>}</p>}
    {authMethod === "email" && mode === "forgot" && <p className="auth-switch"><button onClick={() => { setMode("login"); setMessage(""); }}>{t.login}</button></p>}
  </section></div>;
}

function LegalConsent({ locale, checked, onChange }) {
  return <label className="legal-consent"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{locale === "en" ? "I have read and agree to the " : "我已阅读并同意"}<a href="/legal/terms" target="_blank" rel="noreferrer">{locale === "en" ? "Terms" : "《用户协议》"}</a>{locale === "en" ? " and " : "与"}<a href="/legal/privacy" target="_blank" rel="noreferrer">{locale === "en" ? "Privacy Policy" : "《隐私政策》"}</a></span></label>;
}

function RunToolDialog({ tool, files, locale, onClose, onCreated }) {
  const t = dictionary[locale];
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() && !selectedFiles.length) return setMessage(t.inputRequired);
    setBusy(true);
    try {
      await api("/api/tasks", jsonOptions("POST", { toolId: tool.id, text, fileIds: selectedFiles, locale }));
      onCreated();
      onClose();
    } catch (error) {
      setMessage(error.status === 402 ? t.insufficient : t.error);
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="run-modal" role="dialog" aria-modal="true">
    <button className="icon-button modal-close" onClick={onClose}><X size={20} /></button><div className="tool-modal-heading"><ProductToolIcon tool={tool} size={25} /><div><small>{t.runTitle}</small><h2>{locale === "en" ? tool.nameEn : tool.nameZh}</h2></div></div>
    <form onSubmit={submit}><label className="field-label">{t.inputLabel}<textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} /></label>
      {!!files.length && <fieldset className="file-picker"><legend>{t.attach}</legend>{files.map((file) => <label key={file.id}><input type="checkbox" checked={selectedFiles.includes(file.id)} onChange={(event) => setSelectedFiles(event.target.checked ? [...selectedFiles, file.id] : selectedFiles.filter((id) => id !== file.id))} /><File size={17} />{file.name}</label>)}</fieldset>}
      {message && <p className="form-error"><Warning size={17} />{message}</p>}<div className="modal-actions"><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span><button className="primary-button" disabled={busy}>{busy ? <SpinnerGap className="spin" size={19} /> : <><Play size={18} weight="fill" />{t.createTask}</>}</button></div>
    </form>
  </section></div>;
}

function AiWriterPage({ tool, catalog, locale, authenticated, runtime, onBack, onAuth, onCompleted, onModelChange }) {
  const zh = locale !== "en";
  const labels = zh ? {
    back: "返回工具市场", eyebrow: "AI WRITING STUDIO", title: "AI 写作工作台", subtitle: "从 49 个专业模板开始，也可以加入自己的提示词。每次生成都会经过质量自检。",
    modules: "写作能力", templates: "选择模板", input: "写作信息", output: "生成结果", setup: "输出设置", language: "输出语言", length: "内容长度", tone: "写作语气", model: "运行模型", custom: "补充要求（可选）", customHint: "例如：使用更多案例，结尾加入行动建议…", generate: "生成并自检", generating: "正在生成与质量自检", waiting: "长文章通常需要 1–2 分钟，请保持页面开启", delayed: "等待时间较长，后台可能仍在生成。请稍后到任务中心查看结果。", empty: "选择模板并填写信息，完成的 Markdown 内容会显示在这里。", quality: "质量自检", copy: "复制 Markdown", download: "下载 .md", copied: "已复制", required: "请填写所有必填项", login: "登录后即可生成并保存任务记录", auto: "跟随输入", chinese: "简体中文", english: "English", short: "精简", medium: "标准", long: "深度", professional: "专业", friendly: "亲和", concise: "简洁", persuasive: "有说服力", creative: "创意", chars: "字", credits: "积分 / 次", passed: "项通过", issue: "项建议",
  } : {
    back: "Back to marketplace", eyebrow: "AI WRITING STUDIO", title: "AI Writing Workspace", subtitle: "Start with 49 professional templates or add your own instructions. Every generation includes a quality review.",
    modules: "Capabilities", templates: "Choose a template", input: "Writing brief", output: "Result", setup: "Output settings", language: "Language", length: "Length", tone: "Tone", model: "Runtime model", custom: "Additional instructions (optional)", customHint: "For example: add more examples and end with next steps…", generate: "Generate & review", generating: "Generating and reviewing", waiting: "Long-form writing usually takes 1–2 minutes. Keep this page open.", delayed: "The request is taking longer than expected and may still finish in the background. Check Task Center shortly.", empty: "Choose a template and complete the brief. Your Markdown result will appear here.", quality: "Quality review", copy: "Copy Markdown", download: "Download .md", copied: "Copied", required: "Complete all required fields", login: "Sign in to generate and save a task record", auto: "Match input", chinese: "Simplified Chinese", english: "English", short: "Short", medium: "Standard", long: "In-depth", professional: "Professional", friendly: "Friendly", concise: "Concise", persuasive: "Persuasive", creative: "Creative", chars: "chars", credits: "credits / run", passed: "checks passed", issue: "suggestions",
  };
  const modules = catalog?.modules || [];
  const [moduleId, setModuleId] = useState(modules[0]?.id || "content-creation");
  const activeModule = modules.find((item) => item.id === moduleId) || modules[0];
  const [templateId, setTemplateId] = useState(activeModule?.templates?.[0]?.id || "ai-article");
  const activeTemplate = activeModule?.templates?.find((item) => item.id === templateId) || activeModule?.templates?.[0];
  const [values, setValues] = useState({});
  const [settings, setSettings] = useState({ outputLanguage: zh ? "zh-CN" : "en", length: "medium", tone: "professional", customInstructions: "" });
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);

  useEffect(() => { if (!moduleId && modules[0]) setModuleId(modules[0].id); }, [moduleId, modules]);
  useEffect(() => { if (activeModule && !activeModule.templates.some((item) => item.id === templateId)) setTemplateId(activeModule.templates[0]?.id); }, [activeModule, templateId]);
  useEffect(() => { setModelConnectionId(runtimeTool?.modelConnectionId || "managed"); }, [runtimeTool?.modelConnectionId]);
  useEffect(() => { if (!busy) return undefined; const started = Date.now(); setElapsed(0); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  const selectModule = (id) => { const next = modules.find((item) => item.id === id); setModuleId(id); setTemplateId(next?.templates?.[0]?.id); setValues({}); setError(""); };
  const selectTemplate = (id) => { setTemplateId(id); setValues({}); setError(""); };
  const changeModel = async (value) => { const previous = modelConnectionId; setModelConnectionId(value); try { await onModelChange?.(tool.id, value); } catch { setModelConnectionId(previous); setError(dictionary[locale].error); } };
  const generate = async () => {
    if (!authenticated) return onAuth();
    if (activeTemplate?.fields?.some((item) => item.required && !String(values[item.id] || "").trim())) return setError(labels.required);
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await api(`/api/tool-actions/${tool.slug}`, jsonOptions("POST", { templateId: activeTemplate.id, values, ...settings, modelConnectionId }));
      setResult(response.output); onCompleted?.(response); requestAnimationFrame(() => document.querySelector(".writer-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) { setError(caught.status === 402 ? dictionary[locale].insufficient : [502, 504].includes(caught.status) ? labels.delayed : dictionary[locale].error); }
    finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(result?.markdown || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => { const blob = new Blob([result?.markdown || ""], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${activeTemplate?.id || "writing"}.md`; anchor.click(); URL.revokeObjectURL(url); };
  if (!activeModule || !activeTemplate) return <Loading locale={locale} />;

  return <div className="writer-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{labels.back}</button>
    <header className="writer-hero"><span className="writer-product-icon"><NotePencil size={34} weight="duotone" /><Sparkle className="writer-spark" size={17} weight="fill" /></span><div><p className="eyebrow">{labels.eyebrow}</p><h1>{labels.title}</h1><p>{labels.subtitle}</p></div><div className="writer-meta"><span><CheckCircle size={16} weight="fill" />{modules.reduce((sum, item) => sum + item.templates.length, 0)} Templates</span><span><Coins size={16} />{tool.creditCost} {labels.credits}</span></div></header>
    <div className="writer-shell">
      {busy && <div className="writer-progress" role="status"><span><SpinnerGap className="spin" size={20} /></span><div><strong>{labels.generating} · {elapsed}s</strong><small>{labels.waiting}</small></div><i><b style={{ width: `${Math.min(92, 12 + elapsed * .85)}%` }} /></i></div>}
      <aside className="writer-library"><header><strong>{labels.modules}</strong><small>7 MODULES</small></header><nav>{modules.map((module) => { const Icon = writingIconMap[module.icon] || Article; return <button key={module.id} className={`${module.id === activeModule.id ? "active" : ""} ${module.accent}`} onClick={() => selectModule(module.id)}><span><Icon size={19} weight={module.id === activeModule.id ? "duotone" : "regular"} /></span><div><strong>{module.label[zh ? "zh" : "en"]}</strong><small>{module.templates.length} {zh ? "个模板" : "templates"}</small></div><ArrowRight size={14} /></button>; })}</nav></aside>
      <main className="writer-canvas">
        <section className="writer-template-section"><header><div><span>{activeModule.label[zh ? "zh" : "en"]}</span><h2>{labels.templates}</h2></div><p>{activeModule.description[zh ? "zh" : "en"]}</p></header><div className="writer-template-grid">{activeModule.templates.map((template) => <button key={template.id} className={template.id === activeTemplate.id ? "active" : ""} onClick={() => selectTemplate(template.id)}><span><FileText size={18} /></span><div><strong>{template.label[zh ? "zh" : "en"]}</strong><small>{template.description[zh ? "zh" : "en"]}</small></div>{template.id === activeTemplate.id && <CheckCircle size={17} weight="fill" />}</button>)}</div></section>
        <section className="writer-editor"><header><span className={`writer-template-mark ${activeModule.accent}`}><TextAa size={22} weight="duotone" /></span><div><small>{activeModule.label[zh ? "zh" : "en"]}</small><h2>{activeTemplate.label[zh ? "zh" : "en"]}</h2></div></header><div className="writer-fields">{activeTemplate.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "wide" : ""}><span>{field.label[zh ? "zh" : "en"]}{field.required && <em>*</em>}</span>{field.type === "textarea" ? <textarea rows={field.id === "sourceContent" ? 9 : 5} value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} /> : field.type === "select" ? <select value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}><option value="">{zh ? "请选择" : "Select"}</option><option value="beginner">{zh ? "基础/通用" : "General"}</option><option value="advanced">{zh ? "专业/进阶" : "Advanced"}</option><option value="friendly">{zh ? "亲和" : "Friendly"}</option><option value="professional">{zh ? "专业" : "Professional"}</option></select> : <input value={values[field.id] || ""} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} />}</label>)}</div></section>
        <section className="writer-result"><header><div><span className="writer-result-icon"><Sparkle size={19} weight="fill" /></span><div><small>MARKDOWN</small><h2>{labels.output}</h2></div></div>{result && <div className="writer-result-actions"><button onClick={copy}><Copy size={16} />{copied ? labels.copied : labels.copy}</button><button onClick={download}><DownloadSimple size={16} />{labels.download}</button></div>}</header>{!result ? <div className="writer-result-empty"><NotePencil size={35} weight="duotone" /><strong>{labels.output}</strong><p>{labels.empty}</p></div> : <><pre>{result.markdown}</pre><div className="writer-review"><div><strong>{result.review?.score ?? 0}</strong><span>/100<br />{labels.quality}</span></div><section><p>{result.review?.checks?.map((item) => <span key={item}><CheckSquare size={15} weight="fill" />{item}</span>)}</p>{result.review?.issues?.length > 0 && <small>{result.review.issues.length} {labels.issue}：{result.review.issues.join("；")}</small>}</section><em>{result.wordCount} {labels.chars}</em></div></>}</section>
      </main>
      <aside className="writer-settings"><header><GearSix size={19} /><strong>{labels.setup}</strong></header><label><span>{labels.language}</span><select value={settings.outputLanguage} onChange={(event) => setSettings({ ...settings, outputLanguage: event.target.value })}><option value="zh-CN">{labels.chinese}</option><option value="en">{labels.english}</option><option value="auto">{labels.auto}</option></select></label><label><span>{labels.length}</span><div className="writer-segment">{["short", "medium", "long"].map((value) => <button className={settings.length === value ? "active" : ""} onClick={() => setSettings({ ...settings, length: value })} key={value}>{labels[value]}</button>)}</div></label><label><span>{labels.tone}</span><select value={settings.tone} onChange={(event) => setSettings({ ...settings, tone: event.target.value })}>{["professional", "friendly", "concise", "persuasive", "creative"].map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select></label>{authenticated && <label><span>{labels.model}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{dictionary[locale].useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}<label><span>{labels.custom}</span><textarea rows={6} value={settings.customInstructions} onChange={(event) => setSettings({ ...settings, customInstructions: event.target.value })} placeholder={labels.customHint} /></label>{!authenticated && <div className="writer-login"><LockKey size={18} /><span>{labels.login}</span></div>}{error && <p className="form-error"><Warning size={16} />{error}</p>}<button className="writer-generate" onClick={generate} disabled={busy}>{busy ? <><SpinnerGap className="spin" size={18} />{labels.generating}</> : <><PaperPlaneRight size={18} weight="fill" />{labels.generate}</>}</button><small className="writer-review-note"><ShieldCheck size={15} />{zh ? "生成后自动检查准确性、结构、可读性与模板规范" : "Automatically checks accuracy, structure, readability, and template fit"}</small></aside>
    </div>
  </div>;
}

const seoResultNames = {
  zh: { keywords: "关键词结果", content: "内容交付结果", audit: "诊断结果", ranking: "排名数据", backlinks: "外链数据", comparison: "差距对比", scorecard: "评分结果", report: "SEO 报告" },
  en: { keywords: "Keyword results", content: "Content deliverable", audit: "Audit findings", ranking: "Ranking data", backlinks: "Backlink data", comparison: "Gap comparison", scorecard: "Scorecard", report: "SEO report" },
};

function seoFailureMessage(caught, locale) {
  const zh = locale !== "en";
  const messages = {
    MODEL_TIMEOUT: zh ? "模型分析超时，本次不会扣除积分。请点击重试。" : "Model analysis timed out. No credits were charged; please retry.",
    SEO_PROVIDER_TIMEOUT: zh ? "SEO 数据供应商响应超时，本次不会扣除积分。请稍后重试。" : "The SEO data provider timed out. No credits were charged; please retry later.",
    SEO_DATA_SOURCE_REQUIRED: zh ? "该功能所需的数据源尚未配置，请联系管理员。" : "The required data source is not configured. Contact an administrator.",
    SEO_PROVIDER_UNREACHABLE: zh ? "暂时无法连接 SEO 数据供应商，请稍后重试。" : "The SEO data provider is temporarily unreachable. Please retry later.",
    SEO_PROVIDER_FAILED: zh ? "SEO 数据供应商返回异常，本次不会扣除积分。" : "The SEO data provider returned an error. No credits were charged.",
    SEO_INVALID_URL: zh ? "网址格式不正确，请输入完整的 HTTP 或 HTTPS 地址。" : "The URL is invalid. Enter a complete HTTP or HTTPS address.",
    SEO_HTTP_REQUIRED: zh ? "仅支持公开的 HTTP 或 HTTPS 网站。" : "Only public HTTP or HTTPS websites are supported.",
    SEO_URL_BLOCKED: zh ? "该网址不符合安全抓取规则，请使用公开的 HTTP 或 HTTPS 网站。" : "This URL does not meet safe-crawling rules. Use a public HTTP or HTTPS website.",
    SEO_HOST_NOT_FOUND: zh ? "无法找到该网站，请检查域名是否填写正确。" : "The website could not be found. Check the domain name.",
    SEO_FETCH_TIMEOUT: zh ? "网站抓取超时，本次不会扣除积分。请稍后重试。" : "Website crawling timed out. No credits were charged; please retry later.",
    SEO_FETCH_FAILED: zh ? "网站暂时无法访问，请检查网址或网站的访问限制。" : "The website could not be reached. Check its URL or access restrictions.",
    SEO_HTML_REQUIRED: zh ? "该地址不是可分析的网页，请输入网站页面地址。" : "This address is not an analyzable web page. Enter a website page URL.",
    SEO_RESPONSE_TOO_LARGE: zh ? "网页内容过大，暂时无法完成分析。" : "The page is too large to analyze.",
    SEO_REDIRECT_LIMIT: zh ? "网站重定向次数过多，请检查最终访问地址。" : "The website redirects too many times. Check its final URL.",
    ONESHOW_MODEL_UNAVAILABLE: zh ? "OneShowModel 当前不可用，可稍后重试或选择个人模型。" : "OneShowModel is unavailable. Retry later or select a personal model.",
  };
  if (caught?.status === 402) return dictionary[locale].insufficient;
  return messages[caught?.message] || (zh ? "运行失败，未扣除积分。请检查输入后重试。" : "The run failed and no credits were charged. Check the inputs and retry.");
}

function seoCell(value, zh) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? (zh ? "是" : "Yes") : (zh ? "否" : "No");
  if (typeof value === "object") return Array.isArray(value) ? value.join("、") : JSON.stringify(value);
  return String(value);
}

function SeoResultView({ result, zh }) {
  const presentation = result.presentation || { type: result.resultType || "report", markdown: result.markdown };
  const rows = presentation.rows || [];
  const columns = presentation.columns || [];
  const cards = presentation.cards || [];
  const issues = presentation.issues || [];
  const isReport = presentation.type === "report";
  return <div className={`seo-presentation ${presentation.type}`}>
    {cards.length > 0 && <div className="seo-presentation-cards">{cards.map((card, index) => <article key={`${card.label}-${index}`}><small>{card.label}</small><strong>{seoCell(card.value, zh)}</strong></article>)}</div>}
    {rows.length > 0 && columns.length > 0 && <div className="seo-data-table-wrap"><table className="seo-data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.key} title={seoCell(row[column.key], zh)}>{seoCell(row[column.key], zh)}</td>)}</tr>)}</tbody></table></div>}
    {presentation.type === "audit" && issues.length > 0 && <div className="seo-issue-list">{issues.map((issue, index) => <article className={issue.severity || "medium"} key={`${issue.title}-${index}`}><span>{String(issue.severity || "medium").toUpperCase()}</span><div><strong>{issue.title}</strong><p>{issue.detail}</p>{issue.evidenceId && <small>{zh ? "证据" : "Evidence"} · {issue.evidenceId}</small>}</div></article>)}</div>}
    {!rows.length && !cards.length && !issues.length && !isReport && <pre className="seo-artifact-body">{presentation.markdown || result.markdown}</pre>}
    {isReport && <pre className="seo-artifact-body report">{presentation.markdown || result.markdown}</pre>}
    {!isReport && (rows.length > 0 || cards.length > 0 || issues.length > 0) && <details className="seo-full-notes"><summary>{zh ? "查看完整说明与数据边界" : "View full notes and data boundaries"}</summary><pre>{presentation.markdown || result.markdown}</pre></details>}
  </div>;
}

function SeoWorkbenchPage({ tool, catalog, locale, authenticated, runtime, onBack, onAuth, onCompleted, onModelChange }) {
  const zh = locale !== "en";
  const labels = zh ? {
    back: "返回工具市场", eyebrow: "EVIDENCE-DRIVEN SEO", title: "SEO 工作台", subtitle: "真实抓取网站，结合模型分析；没有数据源的指标不会编造。",
    modules: "SEO 能力", templates: "选择任务", input: "任务参数", output: "运行结果", settings: "运行设置", model: "分析模型", custom: "补充要求（可选）", customHint: "例如：重点分析中文市场和转化型关键词…",
    run: "开始运行", running: "正在获取与处理数据", waiting: "网站抓取可能需要 30–90 秒，请保持页面开启", empty: "选择任务并填写参数，对应的结果会显示在这里。", copy: "复制 Markdown", download: "下载 .md", downloadCsv: "导出 CSV", downloadHtml: "下载 HTML", copied: "已复制", required: "请填写所有必填项", login: "登录后即可运行并保存任务记录", credits: "积分 / 次", locked: "需要数据源", lockedBody: "该能力依赖真实关键词、SERP 或外链供应商，配置后才会开放。", score: "规则评分", source: "数据来源", quality: "数据质量", error: "运行失败，请检查网址、数据源或模型配置。",
  } : {
    back: "Back to marketplace", eyebrow: "EVIDENCE-DRIVEN SEO", title: "SEO Workspace", subtitle: "Crawl real websites and interpret evidence with AI. Missing provider metrics are never fabricated.",
    modules: "SEO capabilities", templates: "Choose an analysis", input: "Analysis inputs", output: "SEO report", settings: "Run settings", model: "Analysis model", custom: "Additional instructions (optional)", customHint: "For example: focus on commercial intent and the US market…",
    run: "Run task", running: "Collecting and processing data", waiting: "Website crawls may take 30–90 seconds. Keep this page open.", empty: "Choose a task and complete the inputs. Its result will appear here.", copy: "Copy Markdown", download: "Download .md", downloadCsv: "Export CSV", downloadHtml: "Download HTML", copied: "Copied", required: "Complete all required fields", login: "Sign in to run and save task history", credits: "credits / run", locked: "Data source required", lockedBody: "This capability requires a real keyword, SERP, or backlink provider and opens only after configuration.", score: "Rule score", source: "Data source", quality: "Data quality", error: "Run failed. Check the URL, data source, or model setup.",
  };
  const modules = catalog?.modules || [];
  const specialist = catalog?.specialist || null;
  const pageTitle = specialist ? (zh ? specialist.nameZh : specialist.nameEn) : labels.title;
  const pageSubtitle = specialist ? (zh ? specialist.descriptionZh : specialist.descriptionEn) : labels.subtitle;
  const PageIcon = iconMap[tool.icon] || ChartLineUp;
  const [moduleId, setModuleId] = useState(modules[0]?.id || "keyword-research");
  const activeModule = modules.find((item) => item.id === moduleId) || modules[0];
  const [templateId, setTemplateId] = useState(activeModule?.templates?.[0]?.id || "keyword-discovery");
  const activeTemplate = activeModule?.templates?.find((item) => item.id === templateId) || activeModule?.templates?.[0];
  const [lastTemplateByModule, setLastTemplateByModule] = useState({});
  const [draftsByTemplate, setDraftsByTemplate] = useState({});
  const [instructionsByTemplate, setInstructionsByTemplate] = useState({});
  const [resultsByTemplate, setResultsByTemplate] = useState({});
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const [busy, setBusy] = useState(false); const [elapsed, setElapsed] = useState(0); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  const values = draftsByTemplate[templateId] || {};
  const fieldValue = (field) => values[field.id] ?? field.defaultValue ?? "";
  const resolvedValues = Object.fromEntries((activeTemplate?.fields || []).map((field) => [field.id, fieldValue(field)]));
  const customInstructions = instructionsByTemplate[templateId] || "";
  const result = resultsByTemplate[templateId] || null;
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);
  useEffect(() => { if (!moduleId && modules[0]) setModuleId(modules[0].id); }, [moduleId, modules]);
  useEffect(() => { if (activeModule && !activeModule.templates.some((item) => item.id === templateId)) setTemplateId(activeModule.templates[0]?.id); }, [activeModule, templateId]);
  useEffect(() => { setModelConnectionId(runtimeTool?.modelConnectionId || "managed"); }, [runtimeTool?.modelConnectionId]);
  useEffect(() => { if (!busy) return undefined; const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  const selectModule = (id) => {
    const next = modules.find((item) => item.id === id);
    setLastTemplateByModule((previous) => ({ ...previous, [activeModule.id]: templateId }));
    setModuleId(id);
    setTemplateId(lastTemplateByModule[id] || next?.templates?.[0]?.id);
    setError("");
  };
  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setLastTemplateByModule((previous) => ({ ...previous, [activeModule.id]: template.id }));
    setError(template.available ? "" : labels.lockedBody);
  };
  const setFieldValue = (fieldId, value) => setDraftsByTemplate((previous) => {
    const next = { ...(previous[templateId] || {}), [fieldId]: value };
    if (fieldId === "searchEngine" && value === "baidu") Object.assign(next, { country: "China", language: "Chinese (Simplified)" });
    if (fieldId === "searchEngine" && value === "google" && next.language === "Chinese (Simplified)") Object.assign(next, { country: "United States", language: "English" });
    return { ...previous, [templateId]: next };
  });
  const setCustomInstructions = (value) => setInstructionsByTemplate((previous) => ({ ...previous, [templateId]: value }));
  const changeModel = async (value) => { const previous = modelConnectionId; setModelConnectionId(value); try { await onModelChange?.(tool.id, value); } catch { setModelConnectionId(previous); setError(dictionary[locale].error); } };
  const run = async () => {
    if (!authenticated) return onAuth();
    if (!activeTemplate.available) return setError(labels.lockedBody);
    if (activeTemplate.fields.some((field) => field.required && !String(resolvedValues[field.id] || "").trim())) return setError(labels.required);
    setBusy(true); setElapsed(0); setError("");
    try { const response = await api(`/api/tool-actions/${tool.slug}`, jsonOptions("POST", { templateId: activeTemplate.id, values: resolvedValues, locale, customInstructions, modelConnectionId })); setResultsByTemplate((previous) => ({ ...previous, [activeTemplate.id]: response.output })); onCompleted?.(response); requestAnimationFrame(() => document.querySelector(".seo-result")?.scrollIntoView({ behavior: "smooth", block: "start" })); }
    catch (caught) { setError(seoFailureMessage(caught, locale)); } finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(result?.markdown || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  const download = () => { const blob = new Blob([result?.markdown || ""], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-report"}.md`; a.click(); URL.revokeObjectURL(url); };
  const downloadCsv = () => { const presentation = result?.presentation; if (!presentation?.rows?.length || !presentation?.columns?.length) return; const quote = (value) => `"${seoCell(value, zh).replace(/"/g, '""')}"`; const csv = [presentation.columns.map((column) => quote(column.label)).join(","), ...presentation.rows.map((row) => presentation.columns.map((column) => quote(row[column.key])).join(","))].join("\n"); const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-result"}.csv`; a.click(); URL.revokeObjectURL(url); };
  const downloadHtml = () => { const blob = new Blob([result?.html || ""], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${activeTemplate?.id || "seo-report"}.html`; a.click(); URL.revokeObjectURL(url); };
  if (!activeModule || !activeTemplate) return <Loading locale={locale} />;
  return <div className="writer-page seo-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{labels.back}</button>
    <header className="writer-hero seo-hero"><span className="writer-product-icon seo-product-icon"><PageIcon size={34} weight="duotone" /><MagnifyingGlass className="writer-spark" size={17} weight="bold" /></span><div><p className="eyebrow">{specialist ? "SEO SPECIALIST AGENT" : labels.eyebrow}</p><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div><div className="writer-meta"><span><CheckCircle size={16} weight="fill" />{modules.reduce((sum, item) => sum + item.templates.length, 0)} Templates</span><span><Coins size={16} />{tool.creditCost} {labels.credits}</span></div></header>
    <div className="writer-shell seo-shell">
      {busy && <div className="writer-progress"><span><SpinnerGap className="spin" size={20} /></span><div><strong>{labels.running} · {elapsed}s</strong><small>{labels.waiting}</small></div><i><b style={{ width: `${Math.min(92, 10 + elapsed * .75)}%` }} /></i></div>}
      <aside className="writer-library seo-library"><header><strong>{labels.modules}</strong><small>{modules.length} {modules.length === 1 ? "MODULE" : "MODULES"}</small></header><nav>{modules.map((module) => { const Icon = seoIconMap[module.icon] || ChartLineUp; return <button key={module.id} className={`${module.id === activeModule.id ? "active" : ""} ${module.accent}`} onClick={() => selectModule(module.id)}><span><Icon size={19} weight={module.id === activeModule.id ? "duotone" : "regular"} /></span><div><strong>{module.label[zh ? "zh" : "en"]}</strong><small>{module.templates.length} {zh ? "个工具" : module.templates.length === 1 ? "tool" : "tools"}</small></div><ArrowRight size={14} /></button>; })}</nav></aside>
      <main className="writer-canvas">
        <section className="writer-template-section"><header><div><span>{activeModule.label[zh ? "zh" : "en"]}</span><h2>{labels.templates}</h2></div><p>{activeModule.description[zh ? "zh" : "en"]}</p></header><div className="writer-template-grid">{activeModule.templates.map((template) => <button key={template.id} className={`${template.id === activeTemplate.id ? "active" : ""} ${!template.available ? "locked" : ""}`} onClick={() => selectTemplate(template)}><span>{template.available ? <FileText size={18} /> : <LockKey size={18} />}</span><div><strong>{template.label[zh ? "zh" : "en"]}</strong><small>{template.available ? template.description[zh ? "zh" : "en"] : labels.locked}</small></div>{template.id === activeTemplate.id ? <CheckCircle size={17} weight="fill" /> : resultsByTemplate[template.id] ? <CheckCircle className="seo-saved-result" title={zh ? "报告已保留" : "Report preserved"} size={17} weight="fill" /> : null}</button>)}</div></section>
        <section className="writer-editor"><header><span className={`writer-template-mark ${activeModule.accent}`}><MagnifyingGlass size={22} weight="duotone" /></span><div><small>{activeModule.label[zh ? "zh" : "en"]}</small><h2>{activeTemplate.label[zh ? "zh" : "en"]}</h2></div>{!activeTemplate.available && <span className="seo-source-required"><LockKey size={14} />{labels.locked}</span>}</header><div className="writer-fields">{activeTemplate.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "wide" : ""}><span>{field.label[zh ? "zh" : "en"]}{field.required && <em>*</em>}</span>{field.type === "textarea" ? <textarea rows={field.id === "content" ? 10 : 5} value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} /> : field.type === "select" ? <select value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)}>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label?.[zh ? "zh" : "en"] || option.value}</option>)}</select> : <input type={field.type === "url" ? "url" : "text"} value={fieldValue(field)} onChange={(event) => setFieldValue(field.id, event.target.value)} placeholder={field.placeholder?.[zh ? "zh" : "en"] || ""} disabled={resolvedValues.searchEngine === "baidu" && field.id === "language"} />}</label>)}</div></section>
        <section className="writer-result seo-result"><header><div><span className="writer-result-icon"><ChartLineUp size={19} weight="fill" /></span><div><small>{String(result?.presentation?.type || activeTemplate.resultType || "result").toUpperCase()}</small><h2>{result ? (seoResultNames[zh ? "zh" : "en"][result.presentation?.type || result.resultType] || labels.output) : (seoResultNames[zh ? "zh" : "en"][activeTemplate.resultType] || labels.output)}</h2></div></div>{result && <div className="writer-result-actions"><button onClick={copy}><Copy size={16} />{copied ? labels.copied : labels.copy}</button>{result.presentation?.rows?.length > 0 && <button onClick={downloadCsv}><DownloadSimple size={16} />{labels.downloadCsv}</button>}<button onClick={download}><DownloadSimple size={16} />{labels.download}</button>{result.html && <button onClick={downloadHtml}><DownloadSimple size={16} />{labels.downloadHtml}</button>}</div>}</header>{!result ? <div className="writer-result-empty"><ChartLineUp size={35} weight="duotone" /><strong>{seoResultNames[zh ? "zh" : "en"][activeTemplate.resultType] || labels.output}</strong><p>{labels.empty}</p></div> : <><div className="seo-result-metrics"><span><small>{labels.score}</small><strong>{result.score ?? "—"}{result.score != null ? "/100" : ""}</strong></span><span><small>{labels.source}</small><strong>{result.dataSource}</strong></span><span><small>{labels.quality}</small><strong>{result.dataQuality}</strong></span></div><SeoResultView result={result} zh={zh} /></>}</section>
      </main>
      <aside className="writer-settings"><header><GearSix size={19} /><strong>{labels.settings}</strong></header><div className="seo-source-card"><ShieldCheck size={18} /><div><strong>{zh ? "数据真实性保护" : "Evidence guard"}</strong><small>{zh ? "缺失指标显示暂无数据，不由模型补齐" : "Missing metrics stay unavailable, never model-filled"}</small></div></div>{authenticated && runtimeTool?.modelConfigurable && <label><span>{labels.model}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{dictionary[locale].useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}<label><span>{labels.custom}</span><textarea rows={7} value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} placeholder={labels.customHint} /></label>{!authenticated && <div className="writer-login"><LockKey size={18} /><span>{labels.login}</span></div>}{error && <p className="form-error"><Warning size={16} />{error}</p>}<button className="writer-generate" onClick={run} disabled={busy || !activeTemplate.available}>{busy ? <><SpinnerGap className="spin" size={18} />{labels.running}</> : <><PaperPlaneRight size={18} weight="fill" />{activeTemplate.available ? labels.run : labels.locked}</>}</button><small className="writer-review-note"><ShieldCheck size={15} />{zh ? "网站抓取有严格的内网地址与跳转安全限制" : "Crawling blocks private addresses and unsafe redirects"}</small></aside>
    </div>
  </div>;
}

function SeoAgentPage({ tool, locale, authenticated, account, onBack, onAuth }) {
  const zh = locale !== "en";
  const copy = zh ? {
    back: "返回工具市场", eyebrow: "AUTONOMOUS SEO WORKSPACE", title: "OneShow SEO Agent", domain: "oneshowseo.com",
    subtitle: "从发现机会到执行优化，让 SEO 每天持续向前。高风险变更始终由你批准。", running: "Agent 运行中", prototype: "产品原型 · 尚未连接网站写入权限",
    credits: "可用积分", today: "今日行动", plan: "自动化计划", growth: "增长监控", history: "变更记录", review: "3 项待审批",
    actionTitle: "修复 12 个页面的 Meta Description", actionBody: "这些页面已有稳定曝光，但摘要缺失或重复。补全后可改善搜索结果中的点击意愿。",
    evidence: "机会依据", evidenceValue: "来自 28 天 Search Console 数据", impact: "预计影响", impactValue: "+6%～11% 点击率", risk: "风险", riskValue: "低风险，可一键回滚", pages: "影响页面", pagesValue: "12 个 URL", cost: "预计消耗", costValue: "24 积分",
    approve: "批准并执行", executing: "正在执行", done: "执行完成", changes: "查看变更", hideChanges: "收起变更", safe: "安全模式", safeBody: "页面发布、重定向和删除操作必须人工审批。", on: "已开启", off: "已关闭",
    scope: "自动化范围", scopeBody: "Agent 可以自主研究和生成草稿，写入网站前需要你的确认。", discover: "发现机会", draft: "生成优化草稿", publish: "发布网站变更", approval: "需要审批",
    week: "近 7 天增长", impressions: "自然曝光", clicks: "自然点击", health: "技术健康度", next: "下次巡检", nextValue: "今天 18:30",
    faq: "为 6 个教程页生成 FAQ Schema", faqBody: "页面已包含问答内容，可补充结构化数据帮助搜索引擎理解。", refresh: "更新 3 篇表现下滑的文章", refreshBody: "排名从前 10 位跌至 11–20 位，建议补充过时段落与引用。",
    inspect: "检查详情", queued: "等待审批", medium: "中风险", low: "低风险", connect: "连接我的网站", login: "登录后开始配置 Agent",
  } : {
    back: "Back to marketplace", eyebrow: "AUTONOMOUS SEO WORKSPACE", title: "OneShow SEO Agent", domain: "oneshowseo.com",
    subtitle: "Move SEO forward every day—from opportunity discovery to safe execution. You approve every high-risk change.", running: "Agent running", prototype: "Product prototype · site write access not connected",
    credits: "Available credits", today: "Today's actions", plan: "Automation plan", growth: "Growth monitor", history: "Change log", review: "3 awaiting approval",
    actionTitle: "Fix meta descriptions on 12 pages", actionBody: "These pages have steady impressions but missing or duplicate snippets. Better descriptions can improve search-result CTR.",
    evidence: "Evidence", evidenceValue: "28 days of Search Console data", impact: "Expected impact", impactValue: "+6%–11% CTR", risk: "Risk", riskValue: "Low, one-click rollback", pages: "Affected", pagesValue: "12 URLs", cost: "Estimated cost", costValue: "24 credits",
    approve: "Approve & execute", executing: "Executing", done: "Completed", changes: "Review changes", hideChanges: "Hide changes", safe: "Safe mode", safeBody: "Publishing, redirects, and deletion always require human approval.", on: "On", off: "Off",
    scope: "Automation scope", scopeBody: "The Agent researches and drafts independently, but asks before writing to your site.", discover: "Discover opportunities", draft: "Create optimization drafts", publish: "Publish site changes", approval: "Approval required",
    week: "Last 7 days", impressions: "Organic impressions", clicks: "Organic clicks", health: "Technical health", next: "Next scan", nextValue: "Today, 18:30",
    faq: "Generate FAQ schema for 6 guides", faqBody: "The pages already contain Q&A content and can benefit from structured data.", refresh: "Refresh 3 declining articles", refreshBody: "Rankings slipped from the top 10 to positions 11–20; update stale sections and citations.",
    inspect: "View details", queued: "Awaiting approval", medium: "Medium risk", low: "Low risk", connect: "Connect my website", login: "Sign in to configure the Agent",
  };
  const [tab, setTab] = useState("today");
  const [safeMode, setSafeMode] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("idle");
  const approve = () => {
    if (!authenticated) return onAuth();
    setStatus("running");
    setTimeout(() => setStatus("done"), 900);
  };
  const tabs = [["today", copy.today], ["plan", copy.plan], ["growth", copy.growth], ["history", copy.history]];
  const balance = account?.credits?.balance;
  return <div className="seo-agent-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{copy.back}</button>
    <header className="seo-agent-hero">
      <div className="seo-agent-brand"><span className="seo-agent-logo"><Robot size={31} weight="duotone" /></span><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></div>
      <div className="seo-agent-hero-meta"><span className="agent-domain"><PlugsConnected size={16} />{copy.domain}</span><span className="agent-live"><i />{copy.running}</span>{authenticated && <span className="agent-credit"><Coins size={17} />{copy.credits} <strong>{balance?.toLocaleString() ?? "—"}</strong></span>}</div>
    </header>
    <div className="agent-prototype-note"><ShieldCheck size={16} />{copy.prototype}</div>
    <nav className="seo-agent-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "today" && <span>3</span>}</button>)}</nav>
    <div className="seo-agent-layout">
      <main className="seo-agent-main">
        {tab === "today" && <>
          <section className="agent-section-head"><div><p>{copy.today}</p><h2>{copy.review}</h2></div><span><Clock size={16} />{copy.next} · {copy.nextValue}</span></section>
          <article className={`agent-primary-action ${status}`}>
            <header><span className="agent-action-icon"><MagicWand size={24} weight="duotone" /></span><div><span className="agent-recommend">{zh ? "优先推荐" : "Top recommendation"}</span><h3>{copy.actionTitle}</h3><p>{copy.actionBody}</p></div><span className="agent-risk low"><ShieldCheck size={14} />{copy.low}</span></header>
            <div className="agent-evidence-grid">{[[MagnifyingGlass, copy.evidence, copy.evidenceValue], [TrendUp, copy.impact, copy.impactValue], [ShieldCheck, copy.risk, copy.riskValue], [FileText, copy.pages, copy.pagesValue]].map(([Icon, label, value]) => <div key={label}><Icon size={18} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
            {expanded && <div className="agent-change-preview"><header><strong>{zh ? "变更预览" : "Change preview"}</strong><span>{copy.pagesValue}</span></header><div><small>/blog/ai-seo-guide</small><p>{zh ? "自动化 SEO 指南：从诊断、内容优化到安全发布，让网站持续获得自然流量。" : "Automated SEO guide: audit, optimize, and publish safely to grow organic traffic."}</p></div><div><small>/tools/seo-workbench</small><p>{zh ? "一站式关键词研究、网站诊断与排名跟踪工具，支持中国与全球搜索市场。" : "Keyword research, site audits, and rank tracking for Chinese and global search markets."}</p></div></div>}
            <footer><div><small>{copy.cost}</small><strong>{copy.costValue}</strong></div><button className="agent-secondary" onClick={() => setExpanded(!expanded)}>{expanded ? copy.hideChanges : copy.changes}<ArrowRight size={16} /></button><button className="agent-primary" onClick={approve} disabled={status === "running" || status === "done"}>{status === "running" ? <><SpinnerGap className="spin" size={17} />{copy.executing}</> : status === "done" ? <><CheckCircle size={17} weight="fill" />{copy.done}</> : <><Play size={17} weight="fill" />{copy.approve}</>}</button></footer>
          </article>
          <div className="agent-action-list">{[[FileText, copy.faq, copy.faqBody, copy.low, "12"], [ArrowsClockwise, copy.refresh, copy.refreshBody, copy.medium, "18"]].map(([Icon, title, body, risk, credits]) => <article key={title}><span><Icon size={21} weight="duotone" /></span><div><h3>{title}</h3><p>{body}</p><small><ShieldCheck size={13} />{risk} · {credits} {zh ? "积分" : "credits"}</small></div><button>{copy.inspect}<ArrowRight size={15} /></button></article>)}</div>
        </>}
        {tab === "plan" && <section className="agent-panel"><header><p>{copy.plan}</p><h2>{zh ? "一周自动化节奏" : "Weekly automation rhythm"}</h2></header><div className="agent-plan-list">{[[zh ? "每天" : "Daily", zh ? "扫描技术问题与排名变化" : "Scan technical issues and ranking changes", copy.nextValue], [zh ? "周二" : "Tuesday", zh ? "生成内容更新建议" : "Generate content refresh suggestions", "09:30"], [zh ? "周四" : "Thursday", zh ? "发现关键词与内容缺口" : "Find keyword and content gaps", "10:00"], [zh ? "周五" : "Friday", zh ? "生成本周增长复盘" : "Generate weekly growth review", "17:00"]].map(([day, task, time]) => <div key={task}><span><Clock size={18} /></span><div><small>{day}</small><strong>{task}</strong></div><time>{time}</time></div>)}</div></section>}
        {tab === "growth" && <section className="agent-panel"><header><p>{copy.growth}</p><h2>{copy.week}</h2></header><div className="agent-growth-grid">{[[TrendUp, copy.impressions, "28,420", "+14.2%"], [ChartLineUp, copy.clicks, "1,836", "+9.8%"], [ShieldCheck, copy.health, "92 / 100", "+4"], [CheckCircle, zh ? "已完成行动" : "Actions completed", "17", zh ? "本周" : "this week"]].map(([Icon, label, value, delta]) => <div key={label}><Icon size={20} weight="duotone" /><small>{label}</small><strong>{value}</strong><span>{delta}</span></div>)}</div><div className="agent-insight"><Lightbulb size={22} weight="duotone" /><div><strong>{zh ? "本周洞察" : "Weekly insight"}</strong><p>{zh ? "教程类页面贡献了 63% 的新增自然点击。建议下一轮优先补充高意图 FAQ 与内部链接。" : "Tutorial pages drove 63% of new organic clicks. Prioritize high-intent FAQs and internal links next."}</p></div></div></section>}
        {tab === "history" && <section className="agent-panel"><header><p>{copy.history}</p><h2>{zh ? "所有变更均可追溯" : "Every change is traceable"}</h2></header><div className="agent-history-list">{[[CheckCircle, zh ? "更新 8 个页面标题" : "Updated 8 page titles", zh ? "你批准 · 昨天 16:42" : "Approved by you · Yesterday 16:42"], [ArrowsClockwise, zh ? "回滚 /pricing 的描述更新" : "Rolled back /pricing description", zh ? "自动保护 · 3 天前" : "Automatic safeguard · 3 days ago"], [MagnifyingGlass, zh ? "完成全站技术巡检" : "Completed technical site scan", zh ? "Agent · 4 天前" : "Agent · 4 days ago"]].map(([Icon, title, meta]) => <div key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{meta}</small></div><button>{zh ? "查看" : "View"}</button></div>)}</div></section>}
      </main>
      <aside className="seo-agent-side">
        <section className="agent-safety"><header><span><ShieldCheck size={20} weight="duotone" /></span><div><strong>{copy.safe}</strong><small>{safeMode ? copy.on : copy.off}</small></div><button className={safeMode ? "active" : ""} onClick={() => setSafeMode(!safeMode)} aria-label={copy.safe}><i /></button></header><p>{copy.safeBody}</p></section>
        <section className="agent-scope"><header><strong>{copy.scope}</strong><GearSix size={18} /></header><p>{copy.scopeBody}</p><ul><li><Check size={15} />{copy.discover}</li><li><Check size={15} />{copy.draft}</li><li className="approval"><LockKey size={15} />{copy.publish}<span>{copy.approval}</span></li></ul></section>
        <section className="agent-side-growth"><header><strong>{copy.week}</strong><TrendUp size={18} /></header><div><span><small>{copy.impressions}</small><strong>+14.2%</strong></span><span><small>{copy.clicks}</small><strong>+9.8%</strong></span></div></section>
        <button className="agent-connect" onClick={() => authenticated ? setTab("plan") : onAuth()}><PlugsConnected size={18} />{authenticated ? copy.connect : copy.login}</button>
      </aside>
    </div>
  </div>;
}

function SeoAgentCommercialPage({ tool, locale, authenticated, account, onBack, onAuth }) {
  const zh = locale !== "en";
  const c = zh ? {
    back: "返回工具市场", kicker: "SEO 增长驾驶舱", title: "OneShowSEO", sub: "让 Agent 每天发现增长机会，你负责做最终决定。", demo: "演示数据", prototype: "当前为产品原型，尚未获得任何网站写入权限",
    site: "网站项目", verified: "演示项目", connect: "连接真实网站", credits: "可用积分", overview: "今日概览", opportunities: "机会队列", automation: "自动化", changes: "变更与回滚",
    data: "数据连接", dataSub: "决定 Agent 能看到什么、能否证明优化结果。", connected: "已连接", pending: "待接入", today: "今日最值得处理", waiting: "3 项等待你决定", scan: "下次巡检 18:30",
    action: "修复 12 个高曝光页面的搜索摘要", actionBody: "这些页面过去 28 天获得 18,420 次曝光，但摘要缺失或重复。Agent 已根据页面内容生成独立描述。", evidence: "数据依据", evidenceValue: "Search Console · 28 天", impact: "预计影响", impactValue: "CTR +6%～11%", confidence: "可信度", confidenceValue: "高 · 87%", affected: "影响范围", affectedValue: "12 个 URL", cost: "本次预计消耗", costValue: "24 积分", risk: "低风险", snapshot: "执行前自动保存快照，可随时回滚", preview: "预览 12 项变更", hide: "收起变更", approve: "批准并执行", executing: "正在安全执行", completed: "执行完成",
    before: "修改前", after: "修改后", queue: "下一批机会", all: "查看全部机会", baseline: "增长基线", baselineSub: "执行后的结果会与此基线比较。", impressions: "自然曝光", clicks: "自然点击", health: "网站健康度", guard: "Agent 安全边界", guardSub: "研究和生成可自动进行，网站写入受策略保护。", mode: "当前模式", modeValue: "逐项审批", protected: "发布、跳转、删除均需人工确认", recent: "最近一次变更", recentValue: "更新 8 个页面标题", rollback: "可回滚",
    setupTitle: "连接网站项目", setupSub: "完成所有权和数据授权后，Agent 才会使用真实数据。", domain: "网站域名", domainHint: "例如：https://example.com", next: "继续", close: "关闭", step1: "网站信息", step2: "验证所有权", step3: "连接数据", finish: "完成演示配置", verifyBody: "正式版本将提供 DNS、HTML 文件与 Search Console 三种验证方式。", sourceBody: "正式版本将在此授权 GSC、GA4、百度搜索资源平台和 CMS。",
    modeRecommend: "仅建议", modeApprove: "逐项审批", modeAuto: "低风险自动", schedule: "自动巡检计划", daily: "每日 08:30 · 技术与排名巡检", weekly: "每周五 17:00 · 增长复盘", historyTitle: "所有操作均有证据和快照", rollbackDone: "已完成回滚", view: "查看详情",
  } : {
    back: "Back to marketplace", kicker: "SEO GROWTH COMMAND CENTER", title: "OneShowSEO", sub: "The Agent finds growth opportunities every day. You make the final call.", demo: "Demo data", prototype: "Product prototype — no website write access has been granted",
    site: "Website project", verified: "Demo project", connect: "Connect live site", credits: "Available credits", overview: "Today", opportunities: "Opportunity queue", automation: "Automation", changes: "Changes & rollback",
    data: "Data connections", dataSub: "These determine what the Agent can see and prove.", connected: "Connected", pending: "Pending", today: "Best action today", waiting: "3 decisions waiting", scan: "Next scan 18:30",
    action: "Fix search snippets on 12 high-impression pages", actionBody: "These pages received 18,420 impressions over 28 days but have missing or duplicate descriptions. The Agent created a unique draft for each page.", evidence: "Evidence", evidenceValue: "Search Console · 28 days", impact: "Expected impact", impactValue: "CTR +6%–11%", confidence: "Confidence", confidenceValue: "High · 87%", affected: "Affected", affectedValue: "12 URLs", cost: "Estimated cost", costValue: "24 credits", risk: "Low risk", snapshot: "A snapshot is saved before execution and can be rolled back", preview: "Preview 12 changes", hide: "Hide changes", approve: "Approve & execute", executing: "Executing safely", completed: "Completed",
    before: "Before", after: "After", queue: "Next opportunities", all: "View all opportunities", baseline: "Growth baseline", baselineSub: "Post-action results will be compared with this baseline.", impressions: "Organic impressions", clicks: "Organic clicks", health: "Site health", guard: "Agent guardrails", guardSub: "Research and drafting can run automatically; site writes stay policy protected.", mode: "Current mode", modeValue: "Approval required", protected: "Publishing, redirects, and deletion require approval", recent: "Latest change", recentValue: "Updated 8 page titles", rollback: "Rollback ready",
    setupTitle: "Connect website project", setupSub: "The Agent uses live data only after ownership and data authorization are complete.", domain: "Website domain", domainHint: "For example: https://example.com", next: "Continue", close: "Close", step1: "Website", step2: "Verify ownership", step3: "Connect data", finish: "Finish demo setup", verifyBody: "The production flow will support DNS, HTML file, and Search Console verification.", sourceBody: "The production flow will authorize GSC, GA4, Baidu Search Resource Platform, and your CMS here.",
    modeRecommend: "Recommend only", modeApprove: "Approval required", modeAuto: "Auto low-risk", schedule: "Scan schedule", daily: "Daily 08:30 · technical and rank scan", weekly: "Friday 17:00 · growth review", historyTitle: "Every action has evidence and a snapshot", rollbackDone: "Rolled back", view: "View details",
  };
  const [tab, setTab] = useState("overview");
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [domain, setDomain] = useState("https://mianshiwen.cn");
  const [preview, setPreview] = useState(false);
  const [actionState, setActionState] = useState("idle");
  const [agentMode, setAgentMode] = useState("approval");
  const [rollbackState, setRollbackState] = useState("ready");
  const balance = account?.credits?.balance;
  const approve = () => { if (!authenticated) return onAuth(); setActionState("running"); setTimeout(() => setActionState("done"), 950); };
  const tabs = [["overview", c.overview], ["opportunities", c.opportunities], ["automation", c.automation], ["changes", c.changes]];
  const sources = [["Google Search Console", c.connected, true], ["GA4", c.connected, true], ["DataForSEO", c.connected, true], [zh ? "百度搜索资源平台" : "Baidu Search", c.pending, false], ["WordPress", c.pending, false]];
  const opportunities = [
    [zh ? "内容衰退" : "Content decay", zh ? "更新 3 篇排名下滑的教程" : "Refresh 3 declining guides", zh ? "排名从前 10 位跌至 11–20 位" : "Rankings fell from top 10 to positions 11–20", "18", "medium"],
    [zh ? "结构化数据" : "Structured data", zh ? "为 6 个教程页补充 HowTo Schema" : "Add HowTo schema to 6 guides", zh ? "页面具备完整步骤，但搜索引擎尚未识别" : "Pages contain steps that search engines do not yet recognize", "12", "low"],
    [zh ? "内部链接" : "Internal links", zh ? "连接 9 个孤立内容页面" : "Connect 9 orphaned content pages", zh ? "页面已有曝光，但站内链接入口不足" : "Pages have impressions but too few internal entry points", "9", "low"],
  ];
  const historyRows = [
    [zh ? "更新 8 个页面标题" : "Updated 8 page titles", zh ? "你批准 · 昨天 16:42" : "Approved by you · Yesterday 16:42", "+4.8% CTR", true],
    [zh ? "修复 14 个失效内部链接" : "Fixed 14 broken internal links", zh ? "你批准 · 3 天前" : "Approved by you · 3 days ago", zh ? "健康度 +3" : "Health +3", true],
    [zh ? "全站技术巡检" : "Full technical scan", zh ? "Agent · 4 天前" : "Agent · 4 days ago", zh ? "发现 7 个问题" : "7 issues found", false],
  ];
  return <div className="seo-growth-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{c.back}</button>
    <header className="seo-growth-header">
      <div className="seo-growth-title"><span><Robot size={28} weight="duotone" /></span><div><p className="eyebrow">{c.kicker}</p><h1>{c.title}</h1><p>{c.sub}</p></div></div>
      <div className="seo-growth-account"><span><Coins size={17} />{c.credits}<strong>{balance?.toLocaleString() ?? "—"}</strong></span><button onClick={() => setSetupOpen(true)}><PlugsConnected size={17} />{c.connect}</button></div>
    </header>
    <div className="seo-growth-projectbar">
      <div><small>{c.site}</small><strong>mianshiwen.cn</strong><span><CheckCircle size={14} weight="fill" />{c.verified}</span><em>{c.demo}</em></div>
      <p><ShieldCheck size={15} />{c.prototype}</p>
    </div>
    <section className="seo-growth-sources"><div><strong>{c.data}</strong><small>{c.dataSub}</small></div><ul>{sources.map(([name, status, ready]) => <li key={name} className={ready ? "ready" : "pending"}><i />{name}<span>{status}</span></li>)}</ul><button onClick={() => setSetupOpen(true)}><GearSix size={16} /></button></section>
    <nav className="seo-growth-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "opportunities" && <span>3</span>}</button>)}</nav>
    {tab === "overview" && <div className="seo-growth-layout"><main>
      <div className="seo-growth-sectionhead"><div><p>{c.today}</p><h2>{c.waiting}</h2></div><span><Clock size={15} />{c.scan}</span></div>
      <article className={`seo-growth-focus ${actionState}`}>
        <header><span><MagicWand size={23} weight="duotone" /></span><div><small>{zh ? "最高优先级 · 快速增长机会" : "TOP PRIORITY · QUICK WIN"}</small><h3>{c.action}</h3><p>{c.actionBody}</p></div><em><ShieldCheck size={14} />{c.risk}</em></header>
        <dl>{[[c.evidence,c.evidenceValue],[c.impact,c.impactValue],[c.confidence,c.confidenceValue],[c.affected,c.affectedValue]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {preview && <div className="seo-growth-diff"><div><small>{c.before}</small><p>AI SEO 工具：自动提升你的网站排名。</p></div><ArrowRight size={18} /><div><small>{c.after}</small><p>自动化 SEO 指南：持续诊断、优化并安全发布，让网站获得稳定自然流量。</p></div></div>}
        <div className="seo-growth-safety"><ShieldCheck size={16} /><span>{c.snapshot}</span></div>
        <footer><div><small>{c.cost}</small><strong>{c.costValue}</strong></div><button className="secondary" onClick={() => setPreview(!preview)}>{preview ? c.hide : c.preview}</button><button className="primary" onClick={approve} disabled={actionState !== "idle"}>{actionState === "running" ? <><SpinnerGap className="spin" size={17} />{c.executing}</> : actionState === "done" ? <><CheckCircle size={17} weight="fill" />{c.completed}</> : <><Play size={17} weight="fill" />{c.approve}</>}</button></footer>
      </article>
      <section className="seo-growth-queue"><header><div><strong>{c.queue}</strong><small>{zh ? "按影响、可信度和成本自动排序" : "Prioritized by impact, confidence, and cost"}</small></div><button onClick={() => setTab("opportunities")}>{c.all}<ArrowRight size={14} /></button></header>{opportunities.slice(0,2).map(([type,title,body,cost,risk]) => <div key={title}><span className={risk}><FileText size={18} /></span><div><small>{type}</small><strong>{title}</strong><p>{body}</p></div><em>{cost} {zh ? "积分" : "credits"}</em><button>{c.view}<ArrowRight size={14} /></button></div>)}</section>
    </main><aside>
      <section className="seo-growth-baseline"><header><div><strong>{c.baseline}</strong><small>{c.baselineSub}</small></div><ChartLineUp size={19} /></header><dl><div><dt>{c.impressions}</dt><dd>28,420</dd><span>+14.2%</span></div><div><dt>{c.clicks}</dt><dd>1,836</dd><span>+9.8%</span></div><div><dt>{c.health}</dt><dd>92/100</dd><span>+4</span></div></dl></section>
      <section className="seo-growth-guard"><header><ShieldCheck size={20} weight="duotone" /><strong>{c.guard}</strong></header><p>{c.guardSub}</p><div><small>{c.mode}</small><strong>{c.modeValue}</strong></div><span><LockKey size={14} />{c.protected}</span></section>
      <section className="seo-growth-recent"><small>{c.recent}</small><strong>{c.recentValue}</strong><span><ArrowsClockwise size={14} />{c.rollback}</span></section>
    </aside></div>}
    {tab === "opportunities" && <section className="seo-growth-wide"><header><div><p>{c.opportunities}</p><h2>{zh ? "由真实数据排序的增长机会" : "Growth opportunities ranked by evidence"}</h2></div><span>{zh ? "3 项待处理 · 39 积分" : "3 pending · 39 credits"}</span></header><div className="seo-growth-table">{opportunities.map(([type,title,body,cost,risk], index) => <div key={title}><b>{index + 1}</b><span className={risk}><FileText size={19} /></span><div><small>{type}</small><strong>{title}</strong><p>{body}</p></div><em>{risk === "low" ? c.risk : (zh ? "中风险" : "Medium risk")}</em><span>{cost} {zh ? "积分" : "credits"}</span><button>{c.view}<ArrowRight size={14} /></button></div>)}</div></section>}
    {tab === "automation" && <section className="seo-growth-wide"><header><div><p>{c.automation}</p><h2>{zh ? "决定 Agent 可以自主做到哪一步" : "Choose how far the Agent can act"}</h2></div></header><div className="seo-growth-modes">{[["recommend",c.modeRecommend,zh?"只发现机会并生成草稿":"Discover and draft only"],["approval",c.modeApprove,zh?"所有网站变更由你批准":"You approve every site change"],["auto",c.modeAuto,zh?"仅自动执行可回滚的低风险任务":"Auto-run reversible low-risk actions"]].map(([id,title,body]) => <button key={id} className={agentMode === id ? "active" : ""} onClick={() => setAgentMode(id)}><span>{agentMode === id ? <CheckCircle size={20} weight="fill" /> : <ShieldCheck size={20} />}</span><strong>{title}</strong><small>{body}</small></button>)}</div><div className="seo-growth-schedule"><header><strong>{c.schedule}</strong><GearSix size={17} /></header><div><Clock size={18} /><span>{c.daily}</span><em>{zh ? "已开启" : "On"}</em></div><div><ChartLineUp size={18} /><span>{c.weekly}</span><em>{zh ? "已开启" : "On"}</em></div></div></section>}
    {tab === "changes" && <section className="seo-growth-wide"><header><div><p>{c.changes}</p><h2>{c.historyTitle}</h2></div></header><div className="seo-growth-history">{historyRows.map(([title,meta,result,canRollback],index) => <div key={title}><span><CheckCircle size={18} weight="fill" /></span><div><strong>{title}</strong><small>{meta}</small></div><em>{result}</em>{canRollback && <button onClick={() => index === 0 && setRollbackState("done")}>{index === 0 && rollbackState === "done" ? c.rollbackDone : c.rollback}</button>}<button>{c.view}</button></div>)}</div></section>}
    {setupOpen && <div className="seo-growth-modal-backdrop" role="presentation"><section className="seo-growth-modal" role="dialog" aria-modal="true" aria-label={c.setupTitle}><header><div><span><PlugsConnected size={22} /></span><div><h2>{c.setupTitle}</h2><p>{c.setupSub}</p></div></div><button onClick={() => setSetupOpen(false)} aria-label={c.close}><X size={20} /></button></header><nav>{[[1,c.step1],[2,c.step2],[3,c.step3]].map(([step,label]) => <span key={step} className={setupStep >= step ? "active" : ""}><i>{step}</i>{label}</span>)}</nav>{setupStep === 1 && <label><span>{c.domain}</span><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder={c.domainHint} /></label>}{setupStep === 2 && <div className="seo-growth-setup-info"><ShieldCheck size={26} weight="duotone" /><strong>{c.step2}</strong><p>{c.verifyBody}</p></div>}{setupStep === 3 && <div className="seo-growth-setup-info"><Database size={26} weight="duotone" /><strong>{c.step3}</strong><p>{c.sourceBody}</p></div>}<footer><button className="secondary" onClick={() => setSetupOpen(false)}>{c.close}</button><button className="primary" onClick={() => setupStep < 3 ? setSetupStep(setupStep + 1) : setSetupOpen(false)}>{setupStep < 3 ? c.next : c.finish}<ArrowRight size={15} /></button></footer></section></div>}
  </div>;
}

function OutfitImageSlot({ file, title, hint, badge, required, disabled = false, onSelect, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return undefined; }
    let cancelled = false;
    let url = "";
    const release = () => {
      if (!url) return;
      const revoke = () => URL.revokeObjectURL(url);
      if (window.requestIdleCallback) window.requestIdleCallback(revoke, { timeout: 1200 });
      else window.setTimeout(revoke, 80);
    };
    const createPreview = async () => {
      try {
        const bitmap = await createImageBitmap(file);
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .86));
        if (!blob) throw new Error("PREVIEW_UNAVAILABLE");
        url = URL.createObjectURL(blob);
      } catch {
        url = URL.createObjectURL(file);
      }
      if (cancelled) release();
      else setPreviewUrl(url);
    };
    setPreviewUrl("");
    createPreview();
    return () => { cancelled = true; release(); };
  }, [file]);
  return <article className={`outfit-image-slot ${file ? "selected" : ""}`}>
    <header><div><span>{badge}</span><strong>{title}</strong></div>{required && <em>{required}</em>}</header>
    {file ? previewUrl ? <div className="outfit-image-preview"><img src={previewUrl} alt={title} /><span><CheckCircle size={15} weight="fill" />{file.name}</span><button type="button" onClick={onRemove} aria-label={`Remove ${title}`}><Trash size={16} /></button></div> : <div className="outfit-image-preview loading"><SpinnerGap className="spin" size={25} /><strong>{file.name}</strong><button type="button" onClick={onRemove} aria-label={`Remove ${title}`}><Trash size={16} /></button></div> : disabled ? <div className="outfit-image-picker disabled"><LockKey size={23} /><strong>{hint}</strong><small>PNG · JPG · WEBP · HEIC · 25 MB</small></div> : <label className="outfit-image-picker"><input type="file" accept="image/*,.heic,.heif" onChange={(event) => onSelect(event.target.files?.[0] || null)} /><CloudArrowUp size={25} /><strong>{hint}</strong><small>PNG · JPG · WEBP · HEIC · 25 MB</small></label>}
  </article>;
}

function OutfitUploadStudio({ files, mode, locale, onModeChange, onFilesChange }) {
  const zh = locale !== "en";
  const setAt = (index, selected) => {
    const next = files.slice(0, 2);
    if (index === 0 && !selected) return onFilesChange([]);
    if (!selected) return onFilesChange(next.slice(0, index));
    next[index] = selected;
    onFilesChange(next.filter(Boolean));
  };
  const switchMode = (nextMode) => {
    onModeChange(nextMode);
    if (nextMode === "description" && files.length > 1) onFilesChange(files.slice(0, 1));
  };
  return <section className="outfit-upload-studio">
    <nav className="outfit-mode-tabs" aria-label={zh ? "换装方式" : "Outfit mode"}>
      <button type="button" className={mode === "description" ? "active" : ""} onClick={() => switchMode("description")}><MagicWand size={17} />{zh ? "描述服装" : "Describe outfit"}</button>
      <button type="button" className={mode === "reference" ? "active" : ""} onClick={() => switchMode("reference")}><ImageSquare size={17} />{zh ? "参考图换装" : "Reference outfit"}<em>{zh ? "新功能" : "New"}</em></button>
    </nav>
    <div className={`outfit-upload-grid ${mode}`}>
      <OutfitImageSlot file={files[0]} badge="1" title={zh ? "人物原图" : "Person photo"} required={zh ? "必选" : "Required"} hint={zh ? "上传需要换装的人物照片" : "Upload the person to dress"} onSelect={(selected) => setAt(0, selected)} onRemove={() => setAt(0, null)} />
      {mode === "reference" && <><span className="outfit-transfer-arrow"><ArrowRight size={19} /></span><OutfitImageSlot file={files[1]} badge="2" title={zh ? "服装参考图" : "Outfit reference"} required={zh ? "必选" : "Required"} disabled={!files[0]} hint={!files[0] ? (zh ? "请先上传人物原图" : "Upload the person photo first") : (zh ? "上传包含目标服装的图片" : "Upload an image of the target outfit")} onSelect={(selected) => setAt(1, selected)} onRemove={() => setAt(1, null)} /></>}
    </div>
    <p className="outfit-upload-help"><ShieldCheck size={16} />{mode === "reference" ? (zh ? "系统只迁移第 2 张图中的服装，并尽量保留第 1 张图的人脸、发型、姿势、身材比例和背景。" : "Only the outfit from image 2 is transferred while preserving the person, pose, proportions, and background in image 1.") : (zh ? "上传后会立即显示预览；请使用正面或半身清晰人物照，换装效果更稳定。" : "A preview appears immediately. Clear front-facing or half-body portraits produce the most stable results.")}</p>
  </section>;
}

function ToolPage({ tool, catalog, task, historyTasks, locale, authenticated, runtime, account, onBack, onAuth, onCompleted, onModelChange }) {
  if (tool.slug === "stock-pet") return <StockPetProduct authenticated={authenticated} account={account} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "mbti-personality-test") return <MbtiPersonalityTest tool={tool} task={task} historyTasks={historyTasks} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "hang-la-tier-list-generator") return <TierListGenerator tool={tool} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "food-nutrition-analyzer") return <FoodNutritionAnalyzer tool={tool} task={task} historyTasks={historyTasks} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "ai-fridge-recipe") return <FridgeRecipePlanner tool={tool} task={task} historyTasks={historyTasks} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "sliding-ancestor-generator") return <SlidingAncestorStudio tool={tool} task={task} historyTasks={historyTasks} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "ai-music-studio") return <MusicStudio locale={locale} authenticated={authenticated} account={account} focusTaskId={task?.id} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} />;
  if (tool.slug === "lyrics-generator") return <LyricsGenerator tool={tool} task={task} historyTasks={historyTasks} locale={locale} authenticated={authenticated} runtime={runtime} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} onModelChange={onModelChange} />;
  if (tool.slug === "seo-agent") return <SeoAgentWorkspace locale={locale} account={account} onBack={onBack} onCompleted={onCompleted} />;
  if (tool.slug === "ai-writer") return <AiWriterPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} runtime={runtime} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} onModelChange={onModelChange} />;
  if (tool.slug === "seo-workbench" || catalog?.specialist) return <SeoWorkbenchPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} runtime={runtime} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} onModelChange={onModelChange} />;
  const t = dictionary[locale];
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [imageSettings, setImageSettings] = useState(imageToolInitial);
  const [pdfSettings, setPdfSettings] = useState(pdfToolInitial);
  const [mediaSettings, setMediaSettings] = useState(mediaToolInitial);
  const [dataFileSettings, setDataFileSettings] = useState(dataFileToolInitial);
  const [utilitySettings, setUtilitySettings] = useState(utilityToolInitial);
  const [text, setText] = useState("");
  const [quality, setQuality] = useState(75);
  const [tolerance, setTolerance] = useState(48);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [outfitMode, setOutfitMode] = useState("description");
  const [recording, setRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modelConnectionId, setModelConnectionId] = useState("managed");
  const recognitionRef = useRef(null);
  const restoredTaskRef = useRef(null);
  const name = locale === "en" ? tool.nameEn : tool.nameZh;
  const description = locale === "en" ? tool.descriptionEn : tool.descriptionZh;
  const outfitHistory = tool.slug === "ai-outfit-changer"
    ? (historyTasks || []).filter((item) => item.status === "completed" && item.file?.mimeType?.startsWith("image/")).slice(0, 12)
    : [];
  const isImage = imageToolSlugs.has(tool.slug);
  const isPdf = pdfToolSlugs.has(tool.slug);
  const isUtility = utilityToolSlugs.has(tool.slug);
  const isMedia = mediaToolSlugs.has(tool.slug);
  const isDataFile = dataFileToolSlugs.has(tool.slug);
  const pdfMultiple = multiFilePdfSlugs.has(tool.slug);
  const fileMultiple = tool.slug === "batch-image-resizer" || tool.slug === "ai-outfit-changer" || pdfMultiple || tool.slug === "audio-merger" || tool.slug === "excel-merger";
  const imageNeedsFile = isImage && tool.slug !== "og-image-generator";
  const isFile = imageNeedsFile || isPdf || isMedia || isDataFile;
  const isText = tool.slug === "copy-polish";
  const isSpeech = tool.slug === "speech-to-text";
  const runtimeTool = runtime?.tools?.find((item) => item.id === tool.id);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);
  useEffect(() => {
    setFiles([]); setFile(null); setResult(null); setError("");
    setOutfitMode("description");
    setImageSettings({ ...imageToolInitial, preset: tool.slug === "id-photo-maker" ? "one-inch" : "xiaohongshu-cover" });
    setPdfSettings({ ...pdfToolInitial });
    setMediaSettings({ ...mediaToolInitial });
    setDataFileSettings({ ...dataFileToolInitial });
    setUtilitySettings({ ...utilityToolInitial });
  }, [tool.id, tool.slug]);
  useEffect(() => {
    setModelConnectionId(runtimeTool?.modelConnectionId || "managed");
  }, [runtimeTool?.modelConnectionId, tool.id]);

  const restoreOutfitResult = useCallback((historyTask, updateUrl = false) => {
    if (!historyTask?.file) return;
    restoredTaskRef.current = historyTask.id;
    setResult({ task: { id: historyTask.id, status: historyTask.status, createdAt: historyTask.createdAt }, output: historyTask.output || {}, file: historyTask.file });
    setError("");
    if (updateUrl) history.replaceState({}, "", `/tools/${tool.slug}?task=${encodeURIComponent(historyTask.id)}`);
  }, [tool.slug]);

  useEffect(() => {
    if (tool.slug !== "ai-outfit-changer" || !authenticated) return;
    const candidate = task?.file ? task : outfitHistory[0];
    if (!candidate || restoredTaskRef.current === candidate.id) return;
    restoreOutfitResult(candidate);
  }, [authenticated, outfitHistory, restoreOutfitResult, task, tool.slug]);

  const run = async () => {
    if (!authenticated) return onAuth();
    const utilityHasInput = !isUtility || (utilityToolFields[tool.slug] || []).some((field) => !["select"].includes(field.type) && String(utilitySettings[field.id] || "").trim());
    if ((isFile && fileMultiple && !files.length) || (isFile && !fileMultiple && !file) || (tool.slug === "ai-outfit-changer" && outfitMode === "reference" && files.length < 2) || (!isFile && !isImage && !isUtility && !text.trim()) || !utilityHasInput) return setError(tool.slug === "ai-outfit-changer" && outfitMode === "reference" ? (locale === "en" ? "Please upload both the person photo and the outfit reference." : "请同时上传人物原图和服装参考图。") : t.inputRequired);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      let options;
      if (isFile) {
        const form = new FormData();
        if (fileMultiple) files.forEach((item) => form.append("files", item));
        else form.append("file", file);
        if (modelConnectionId) form.append("modelConnectionId", modelConnectionId);
        if (tool.slug === "background-remover") form.append("tolerance", String(tolerance));
        if (tool.slug === "image-compressor") form.append("quality", String(quality));
        (imageToolFields[tool.slug] || []).forEach((field) => form.append(field.id, String(imageSettings[field.id] ?? "")));
        (pdfToolFields[tool.slug] || []).forEach((field) => form.append(field.id, String(pdfSettings[field.id] ?? "")));
        (mediaToolFields[tool.slug] || []).forEach((field) => form.append(field.id, String(mediaSettings[field.id] ?? "")));
        (dataFileToolFields[tool.slug] || []).forEach((field) => form.append(field.id, String(dataFileSettings[field.id] ?? "")));
        if (tool.slug === "pdf-summary") form.append("question", String(pdfSettings.question || ""));
        options = { method: "POST", body: form };
      } else if (tool.slug === "og-image-generator") {
        const form = new FormData();
        (imageToolFields[tool.slug] || []).forEach((field) => form.append(field.id, String(imageSettings[field.id] ?? "")));
        options = { method: "POST", body: form };
      } else if (isUtility) {
        options = jsonOptions("POST", { ...utilitySettings, modelConnectionId });
      } else {
        options = jsonOptions("POST", { text, modelConnectionId });
      }
      const response = await api(`/api/tool-actions/${tool.slug}`, options);
      setResult(response);
      onCompleted?.(response);
    } catch (caught) {
      setError(caught.message === "USER_FILE_LIMIT_REACHED" ? t.fileLimit : caught.status === 402 ? t.insufficient : t.error);
    } finally {
      setBusy(false);
    }
  };

  const toggleSpeech = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setError(t.browserUnsupported);
    const recognition = new SpeechRecognition();
    recognition.lang = locale === "en" ? "en-US" : "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      setText(transcript);
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => { setRecording(false); setError(t.error); };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setError("");
  };

  const copyOutput = async () => {
    if (!result?.output?.text) return;
    await navigator.clipboard.writeText(result.output.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const changeModel = async (value) => {
    const previous = modelConnectionId;
    setModelConnectionId(value);
    try {
      await onModelChange?.(tool.id, value);
    } catch {
      setModelConnectionId(previous);
      setError(t.error);
    }
  };

  return <div className="tool-page">
    <button className="tool-back" onClick={onBack}><ArrowLeft size={17} />{t.backToMarket}</button>
    <header className="tool-page-header"><ProductToolIcon tool={tool} size={31} className="large" /><div><p className="eyebrow">{t.toolWorkspace}</p><h1>{name}</h1><p>{description}</p></div><div className="tool-run-meta"><StatusPill status={tool.runtimeStatus} locale={locale} /><span><Coins size={16} />{tool.creditCost} {t.creditsUnit}</span></div></header>
    <div className="tool-workspace-grid">
      <section className="surface tool-input-panel">
        <h2>{tool.slug === "og-image-generator" ? (locale === "en" ? "Configure social image" : "设置分享图内容") : isImage ? t.imageInput : isPdf ? (tool.slug === "images-to-pdf" ? (locale === "en" ? "Upload images" : "上传图片") : t.pdfInput) : isMedia ? (locale === "en" ? "Upload media" : "上传媒体文件") : isDataFile ? (locale === "en" ? "Upload data file" : "上传数据文件") : isUtility ? (locale === "en" ? "Tool input" : "工具输入") : isSpeech ? t.speechInput : t.textInput}</h2>
        {tool.slug === "ai-outfit-changer" && <OutfitUploadStudio files={files} mode={outfitMode} locale={locale} onModeChange={setOutfitMode} onFilesChange={(selected) => { setFiles(selected); setFile(selected[0] || null); setResult(null); setError(""); }} />}
        {isFile && tool.slug !== "ai-outfit-changer" && <label className={`tool-dropzone ${(file || files.length) ? "selected" : ""}`}><input type="file" multiple={fileMultiple} accept={isMedia ? (tool.category === "video" ? "video/*,.mov,.mkv,.mp4" : "audio/*,video/mp4,.mp3,.wav,.flac,.m4a,.aac") : isDataFile ? dataFileAccept(tool.slug) : isImage || tool.slug === "images-to-pdf" ? "image/*,.heic,.heif" : "application/pdf"} onChange={(event) => { const selected = [...(event.target.files || [])]; setFiles(selected); setFile(selected[0] || null); setResult(null); }} /><CloudArrowUp size={30} /><strong>{fileMultiple && files.length ? `${t.selectedFile}: ${files.length} ${locale === "en" ? "files" : "个文件"}` : file ? `${t.selectedFile}: ${file.name}` : t.chooseFile}</strong><span>{fileMultiple && files.length ? formatBytes(files.reduce((sum, item) => sum + item.size, 0)) : file ? formatBytes(file.size) : isMedia ? (locale === "en" ? "Audio / video · up to 50 MB" : "音频 / 视频 · 最大 50 MB") : isDataFile ? `${dataFileHint(tool.slug)} · 25 MB` : isImage || tool.slug === "images-to-pdf" ? "HEIC · PNG · JPG · WEBP · AVIF" : "PDF · 25 MB"}</span></label>}
        {isImage && (imageToolFields[tool.slug] || []).length > 0 && <div className="image-tool-options">{imageToolFields[tool.slug].filter((field) => !(tool.slug === "ai-outfit-changer" && outfitMode === "reference" && field.id === "outfit")).map((field) => <label key={field.id}><span>{locale === "en" ? field.en : field.zh}{field.type === "range" && <strong>{imageSettings[field.id]}</strong>}</span>{field.type === "select" ? <select value={imageSettings[field.id]} onChange={(event) => setImageSettings({ ...imageSettings, [field.id]: event.target.value })}>{field.options.map(([value, labelZh, labelEn]) => <option value={value} key={value}>{locale === "en" ? (labelEn || labelZh) : labelZh}</option>)}</select> : field.type === "textarea" ? <textarea rows="4" value={imageSettings[field.id] || ""} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} onChange={(event) => setImageSettings({ ...imageSettings, [field.id]: event.target.value })} /> : <input type={field.type} min={field.min} max={field.max} value={imageSettings[field.id] || ""} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} onChange={(event) => setImageSettings({ ...imageSettings, [field.id]: event.target.value })} />}</label>)}</div>}
        {aiImageToolSlugs.has(tool.slug) && <p className="tool-inline-note"><ShieldCheck size={16} />{locale === "en" ? "Only upload images you have permission to use. Results are stored in your private File Center." : "请仅上传你有权使用的图片；生成结果会保存到你的私有文件中心。"}</p>}
        {isPdf && (pdfToolFields[tool.slug] || []).length > 0 && <div className="image-tool-options pdf-tool-options">{pdfToolFields[tool.slug].map((field) => <label key={field.id}><span>{locale === "en" ? field.en : field.zh}{field.type === "range" && <strong>{pdfSettings[field.id]}{field.id === "opacity" ? "%" : ""}</strong>}</span>{field.type === "select" ? <select value={pdfSettings[field.id]} onChange={(event) => setPdfSettings({ ...pdfSettings, [field.id]: event.target.value })}>{field.options.map(([value, labelZh, labelEn]) => <option value={value} key={value}>{locale === "en" ? (labelEn || labelZh) : labelZh}</option>)}</select> : <input type={field.type} min={field.min} max={field.max} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} value={pdfSettings[field.id]} onChange={(event) => setPdfSettings({ ...pdfSettings, [field.id]: event.target.value })} />}</label>)}</div>}
        {isMedia && (mediaToolFields[tool.slug] || []).length > 0 && <div className="image-tool-options">{mediaToolFields[tool.slug].map((field) => <label key={field.id}><span>{locale === "en" ? field.en : field.zh}</span>{field.type === "select" ? <select value={mediaSettings[field.id]} onChange={(event) => setMediaSettings({ ...mediaSettings, [field.id]: event.target.value })}>{field.options.map(([value, labelZh, labelEn]) => <option value={value} key={value}>{locale === "en" ? (labelEn || labelZh) : labelZh}</option>)}</select> : <input type={field.type} min={field.min} max={field.max} value={mediaSettings[field.id]} onChange={(event) => setMediaSettings({ ...mediaSettings, [field.id]: event.target.value })} />}</label>)}</div>}
        {isDataFile && (dataFileToolFields[tool.slug] || []).length > 0 && <div className="utility-tool-fields">{dataFileToolFields[tool.slug].map((field) => <label key={field.id}><span>{locale === "en" ? field.en : field.zh}</span>{field.type === "select" ? <select value={dataFileSettings[field.id]} onChange={(event) => setDataFileSettings({ ...dataFileSettings, [field.id]: event.target.value })}>{field.options.map(([value, labelZh, labelEn]) => <option value={value} key={value}>{locale === "en" ? (labelEn || labelZh) : labelZh}</option>)}</select> : field.type === "textarea" ? <textarea rows="6" value={dataFileSettings[field.id]} onChange={(event) => setDataFileSettings({ ...dataFileSettings, [field.id]: event.target.value })} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} /> : <input type={field.type} value={dataFileSettings[field.id]} onChange={(event) => setDataFileSettings({ ...dataFileSettings, [field.id]: event.target.value })} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} />}</label>)}</div>}
        {isMedia && <p className="tool-inline-note"><ShieldCheck size={16} />{locale === "en" ? "Processing runs on OneShowTools servers. Uploaded media is not sent to third-party conversion sites." : "文件在 OneShowTools 服务器内处理，不会发送到第三方转换网站。"}</p>}
        {tool.slug === "pdf-summary" && <label className="pdf-question-field"><span>{locale === "en" ? "Question (optional)" : "针对文档提问（可选）"}</span><textarea rows="4" value={pdfSettings.question} onChange={(event) => setPdfSettings({ ...pdfSettings, question: event.target.value })} placeholder={locale === "en" ? "Leave blank to generate a summary, or ask a question about the document." : "留空生成摘要，或输入一个需要根据文档回答的问题。"} /></label>}
        {tool.slug === "pdf-compress" && <p className="tool-inline-note"><Warning size={16} />{locale === "en" ? "Compression rebuilds pages as optimized images. It works best for scanned PDFs and does not preserve searchable text." : "压缩会将页面重建为优化图片，适合扫描件和图片型 PDF，但不会保留可搜索文字层。"}</p>}
        {tool.slug === "pdf-ocr" && <p className="tool-inline-note"><FileText size={16} />{locale === "en" ? "Recognizes up to 12 pages per run and exports editable text." : "单次最多识别 12 页，完成后导出可编辑文字文件。"}</p>}
        {tool.slug === "id-photo-maker" && <p className="tool-inline-note"><ShieldCheck size={16} />{locale === "en" ? "Solid-color backgrounds are supported now. Advanced hair-level AI matting will be added after a vision API is connected." : "当前支持纯色背景证件照；发丝级智能抠图将在接入视觉模型后升级。"}</p>}
        {isUtility && <div className="utility-tool-fields">{(utilityToolFields[tool.slug] || []).map((field) => <label key={field.id}><span>{locale === "en" ? field.en : field.zh}{field.sensitive && <small>{locale === "en" ? "Not stored in task history" : "不会写入任务记录"}</small>}</span>{field.type === "select" ? <select value={utilitySettings[field.id]} onChange={(event) => setUtilitySettings({ ...utilitySettings, [field.id]: event.target.value })}>{field.options.map(([value, labelZh, labelEn]) => <option key={value} value={value}>{locale === "en" ? (labelEn || labelZh) : labelZh}</option>)}</select> : field.type === "textarea" ? <textarea rows={field.id === "source" || field.id === "before" || field.id === "after" || field.id === "topic" ? 8 : 4} value={utilitySettings[field.id]} onChange={(event) => setUtilitySettings({ ...utilitySettings, [field.id]: event.target.value })} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} /> : <input type={field.type || "text"} value={utilitySettings[field.id]} onChange={(event) => setUtilitySettings({ ...utilitySettings, [field.id]: event.target.value })} placeholder={locale === "en" ? field.placeholderEn : field.placeholderZh} />}</label>)}</div>}
        {isText && <textarea className="tool-textarea" rows={12} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} />}
        {isSpeech && <><div className={`speech-pad ${recording ? "recording" : ""}`}><button onClick={toggleSpeech}>{recording ? <StopCircle size={28} weight="fill" /> : <Microphone size={28} weight="fill" />}<span>{recording ? t.stopSpeech : t.startSpeech}</span></button></div><textarea className="tool-textarea" rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={t.inputPlaceholder} /></>}
        {authenticated && runtimeTool?.modelConfigurable && <label className="model-select-field"><span>{t.selectModel}</span><select value={modelConnectionId} onChange={(event) => changeModel(event.target.value)}><option value="managed">{t.useManaged}</option>{runtime?.connections?.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label>}
        {tool.slug === "background-remover" && <label className="range-field"><span>{t.imageTolerance}<strong>{tolerance}</strong></span><input type="range" min="12" max="120" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} /></label>}
        {tool.slug === "image-compressor" && <label className="range-field"><span>{t.imageQuality}<strong>{quality}%</strong></span><input type="range" min="30" max="95" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}
        {!authenticated && <div className="tool-auth-notice"><LockKey size={18} /><span>{t.loginToUse}</span><button onClick={onAuth}>{t.signInAction}</button></div>}
        {error && <p className="form-error"><Warning size={17} />{error}</p>}
        <button className="primary-button tool-run-button" onClick={isSpeech && !text.trim() ? toggleSpeech : run} disabled={busy}>{busy ? <><SpinnerGap className="spin" size={19} />{t.processing}</> : <><Play size={18} weight="fill" />{isSpeech && !text.trim() ? t.startSpeech : t.startProcessing}</>}</button>
      </section>
      <section className="surface tool-result-panel">
        <div className="tool-result-heading"><h2>{t.result}</h2>{result?.output?.mode && <span>{result.output.mode === "ai" ? t.aiMode : t.localMode}</span>}</div>
        {!result && <EmptyState icon={Icon} title={t.result} body={locale === "en" ? "Your processed result will appear here." : "处理完成后，结果会显示在这里。"} />}
        {result?.file && <div className="file-result">{result.file.mimeType.startsWith("image/") && <div className="result-preview"><img src={result.file.downloadUrl} alt={result.file.name} /></div>}{result.file.mimeType.startsWith("video/") && <div className="result-preview"><video src={result.file.downloadUrl} controls /></div>}{result.file.mimeType.startsWith("audio/") && <div className="result-preview"><audio src={result.file.downloadUrl} controls /></div>}<div className="result-file-row"><span className="file-icon"><File size={19} /></span><div><strong>{result.file.name}</strong><small>{formatBytes(result.file.sizeBytes)}</small></div><a className="primary-button" href={result.file.downloadUrl}><DownloadSimple size={17} />{t.downloadResult}</a></div>{result.output.savedPercent !== undefined && <div className="result-stats"><span>{locale === "en" ? "Original" : "原始大小"}<strong>{formatBytes(result.output.originalBytes)}</strong></span><span>{locale === "en" ? "Output" : "处理后"}<strong>{formatBytes(result.output.compressedBytes)}</strong></span><span>{locale === "en" ? "Change" : "体积变化"}<strong>{result.output.savedPercent}%</strong></span></div>}{(isPdf || isDataFile) && (result.output.pages || result.output.rows || result.output.sheets || result.output.recordCount || result.output.sheetCount) && <div className="pdf-result-meta">{result.output.pages ? <span><strong>{result.output.pages}</strong>{locale === "en" ? "Pages" : "页"}</span> : null}{result.output.rows || result.output.recordCount ? <span><strong>{result.output.rows || result.output.recordCount}</strong>{locale === "en" ? "Rows" : "行"}</span> : null}{result.output.sheets || result.output.sheetCount ? <span><strong>{result.output.sheets || result.output.sheetCount}</strong>{locale === "en" ? "Sheets" : "工作表"}</span> : null}</div>}</div>}
        {result?.output?.text && <div className="text-result"><pre>{result.output.text}</pre><button className="secondary-button" onClick={copyOutput}><Copy size={17} />{copied ? t.copied : t.copyResult}</button></div>}
      </section>
    </div>
    {tool.slug === "ai-outfit-changer" && authenticated && <section className="surface outfit-history"><header><div><Clock size={20} weight="duotone" /><div><h2>{locale === "en" ? "Outfit history" : "历史换装记录"}</h2><p>{locale === "en" ? "Generated images are saved privately. Select one to restore it above." : "生成结果会保存到你的私有文件中心，点击记录即可重新查看和下载。"}</p></div></div><span>{outfitHistory.length} {locale === "en" ? "recent" : "条近期记录"}</span></header>{outfitHistory.length ? <div>{outfitHistory.map((item) => <button type="button" className={result?.task?.id === item.id ? "active" : ""} key={item.id} onClick={() => { restoreOutfitResult(item, true); document.querySelector(".tool-result-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><img src={item.file.downloadUrl} alt={item.file.name} loading="lazy" /><span><strong>{item.input?.outfitMode === "reference" ? (locale === "en" ? "Reference outfit" : "参考图换装") : (locale === "en" ? "Described outfit" : "描述服装换装")}</strong><small>{formatDate(item.createdAt, locale)}</small></span><ArrowRight size={15} /></button>)}</div> : <div className="outfit-history-empty"><ImageSquare size={26} weight="duotone" /><span>{locale === "en" ? "Your first generated outfit will appear here." : "完成第一次换装后，生成记录会显示在这里。"}</span></div>}</section>}
  </div>;
}

function PublicToolShell({ tool, catalog, locale, authenticated, onBack, onAuth, onLocale, onCompleted }) {
  const t = dictionary[locale];
  return <div className="guest-shell"><header className="guest-header"><Brand /><nav><button onClick={onBack}>{t.marketplace}</button><span>{locale === "en" ? tool.nameEn : tool.nameZh}</span></nav><div><button className="locale-button" onClick={onLocale}><Translate size={17} />{t.language}</button><button className="primary-button" onClick={onAuth}>{t.login}</button></div></header><main className="public-tool-main"><ToolPage tool={tool} catalog={catalog} locale={locale} authenticated={authenticated} onBack={onBack} onAuth={onAuth} onCompleted={onCompleted} /></main></div>;
}

function TaskRow({ task, locale, onCancel }) {
  const Icon = iconMap[task.icon] || Wrench;
  return <div className="task-row"><span className="tool-icon compact"><Icon size={20} /></span><div className="task-main"><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{formatDate(task.createdAt, locale)}</small></div><span className="task-cost">−{task.creditCost}</span><StatusPill status={task.status} locale={locale} />{onCancel && ["queued", "waiting_for_runtime"].includes(task.status) && <button className="icon-button" onClick={(event) => { event.stopPropagation(); onCancel(task.id); }}><X size={18} /></button>}</div>;
}

function Dashboard({ data, tools, runtime, locale, onNavigate, onSearch, onRun, projects = [] }) {
  const t = dictionary[locale];
  const [homeQuery, setHomeQuery] = useState("");
  if (!data) return <Loading locale={locale} />;
  const isEn = locale === "en";
  const userName = data.user?.name || (isEn ? "Creator" : "创作者");
  const currentPlan = data.subscription ? (isEn ? data.subscription.nameEn : data.subscription.nameZh) : t.free;
  const metrics = [
    [t.creditsBalance, data.metrics.credits, Coins, "blue", isEn ? "Live balance" : "实时余额"],
    [t.taskCount, data.metrics.tasks, ListChecks, "purple", `${data.metrics.running} ${isEn ? "running" : "个执行中"}`],
    [t.completed, data.metrics.completed, CheckCircle, "green", isEn ? "Recorded results" : "结果已记录"],
    [t.fileCount, data.metrics.files, FolderOpen, "orange", isEn ? "Private files" : "账户私有文件"],
    [t.currentPlan, currentPlan, Crown, "violet", data.subscription?.currentPeriodEnd ? formatDate(data.subscription.currentPeriodEnd, locale) : (isEn ? "Upgrade anytime" : "随时可以升级")],
  ];
  // `tools` is already the administrator-curated published catalog. Keep every
  // published tool discoverable here, even when a provider needs configuration.
  const readyTools = tools;
  const preferredSlugs = ["ai-writer", "seo-workbench", "ai-music-studio", "lyrics-generator", "image-compressor", "pdf-summary", "background-remover", "content-repurposer"];
  const recommended = [...preferredSlugs.map((slug) => readyTools.find((tool) => tool.slug === slug)).filter(Boolean), ...readyTools]
    .filter((tool, index, list) => list.findIndex((item) => item.id === tool.id) === index).slice(0, 8);
  const recentTools = data.recentTasks.reduce((items, task) => {
    if (!items.some((item) => item.toolId === task.toolId)) items.push(task);
    return items;
  }, []).slice(0, 3);
  const activity = data.recentTasks.slice(0, 3);
  const quickActions = [
    ["ai-music-studio", isEn ? "Generate music" : "生成音乐", isEn ? "Generate comfortable piano music" : "生成一首舒缓的钢琴纯音乐"],
    ["ai-outfit-changer", isEn ? "Change outfit" : "一键换装", isEn ? "Change my portrait into a professional outfit" : "把我的人像换成职业正装"],
    ["ai-product-photo", isEn ? "Generate image" : "生成图片", isEn ? "Generate a polished product image" : "生成一张精美的产品图片"],
    ["seo-workbench", isEn ? "Analyze SEO" : "分析 SEO", isEn ? "Analyze my website SEO" : "分析我的网站 SEO"],
    ["ai-writer", isEn ? "Write a post" : "写小红书文案", isEn ? "Write a social media post" : "帮我写一篇小红书文案"],
    ["pdf-summary", isEn ? "Summarize PDF" : "总结 PDF", isEn ? "Summarize a PDF document" : "总结一份 PDF 文档"],
  ].map(([slug, label, query]) => ({ slug, label, query, tool: readyTools.find((item) => item.slug === slug) }));
  const submitSearch = (event) => {
    event.preventDefault();
    onSearch(homeQuery.trim());
  };
  return <div className="page-stack dashboard-page">
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy"><h1>{isEn ? "Hello" : "你好"}，{userName}<HandWaving size={24} weight="duotone" aria-hidden="true" /></h1><p>{isEn ? "What would you like AI to help you accomplish today?" : "今天想让 AI 帮你完成什么？"}</p>
        <form className="dashboard-search" onSubmit={submitSearch}><Sparkle size={18} weight="fill" /><input value={homeQuery} onChange={(event) => setHomeQuery(event.target.value)} placeholder={isEn ? "Describe what you need, for example: create relaxing piano music..." : "描述你的需求，例如：生成一首舒缓的钢琴纯音乐..."} /><button aria-label={t.searchAction}><ArrowRight size={20} /></button></form>
        <div className="dashboard-hot">{quickActions.map((action) => <button key={action.slug} onClick={() => action.tool ? onRun(action.tool) : onSearch(action.query)}>{action.label}</button>)}</div>
      </div>
      <div className="dashboard-hero-art" aria-hidden="true">
        <img src="/dashboard/dashboard-workbench-hero-v2.webp" alt="" width="960" height="521" fetchPriority="high" decoding="async" />
      </div>
    </section>

    <section className="dashboard-metric-grid">{metrics.map(([label, value, Icon, tone, note]) => <article className="dashboard-metric-card" key={label}><span className={`metric-icon ${tone}`}><Icon size={22} weight="duotone" /></span><div><small>{label}</small><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong><p>{note}</p></div><span className={`dashboard-metric-accent ${tone}`} /></article>)}</section>

    <section className="dashboard-primary-grid">
      <article className="surface dashboard-recent-tools"><header><h2>{isEn ? "Recently used" : "最近使用"}</h2><button onClick={() => onNavigate("recent")}>{isEn ? "All" : "全部"}<ArrowRight size={14} /></button></header>{recentTools.length ? <div>{recentTools.map((task) => { const tool = tools.find((item) => item.id === task.toolId); return <button key={task.id} onClick={() => tool && onRun(tool)}><ProductToolIcon tool={tool || { icon: task.icon }} compact /><span><strong>{isEn ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)} · {formatDate(task.updatedAt || task.createdAt, locale)}</small></span><ArrowRight size={14} /></button>; })}</div> : <p>{t.noTasksHint}</p>}</article>
      <article className="surface dashboard-recommendations"><header><h2>{isEn ? "Recommended for you" : "为你推荐"}</h2><button onClick={() => onNavigate("marketplace")}>{isEn ? "More tools" : "更多工具"}<ArrowRight size={14} /></button></header><div>{recommended.slice(0, 4).map((tool, index) => <button className={`recommend-card tone-${index + 1}`} key={tool.id} onClick={() => onRun(tool)}><div className="recommend-visual"><ProductToolIcon tool={tool} size={28} /></div><strong>{isEn ? tool.nameEn : tool.nameZh}</strong><p>{isEn ? tool.descriptionEn : tool.descriptionZh}</p><span>{isEn ? "Use now" : "立即使用"}<ArrowRight size={13} /></span></button>)}</div></article>
    </section>

    <section className="dashboard-secondary-grid">
      <article className="surface dashboard-work-summary"><header><h2>{isEn ? "Your work" : "你的工作"}</h2></header><div>{[
        [isEn ? "Running tasks" : "进行中任务", data.metrics.running, ListChecks, "blue", "tasks"],
        [isEn ? "Files" : "文件数量", data.metrics.files, FolderOpen, "orange", "files"],
        ["AI Agent", data.recentTasks.filter((task) => task.toolSlug?.includes("agent")).length, Robot, "violet", "agent"],
        [isEn ? "Projects" : "最近项目", projects.length, Database, "green", "projects"],
      ].map(([label, value, Icon, tone, route]) => <button key={label} onClick={() => onNavigate(route)}><span className={`metric-icon ${tone}`}><Icon size={22} weight="duotone" /></span><small>{label}</small><strong>{value.toLocaleString()}</strong><ArrowRight size={14} /></button>)}</div></article>
      <article className="surface dashboard-activity"><header><h2>{isEn ? "Recent activity" : "最近动态"}</h2><button onClick={() => onNavigate("tasks")}>{isEn ? "All activity" : "全部动态"}<ArrowRight size={14} /></button></header>{activity.length ? <div>{activity.map((task) => { const tool = tools.find((item) => item.id === task.toolId); return <button key={task.id} onClick={() => tool && onRun(tool)}><ProductToolIcon tool={tool || { icon: task.icon }} compact /><span><strong>{isEn ? task.toolNameEn : task.toolNameZh} · {statusLabel(task.status, locale)}</strong><small>{task.outputFileName || task.id}</small></span><time>{formatDate(task.updatedAt || task.createdAt, locale)}</time><i className={`dot ${task.status}`} /></button>; })}</div> : <p>{t.noTasksHint}</p>}</article>
    </section>
  </div>;
}

function RecentUsagePage({ tools, tasks, files, locale, onRun, onOpenTask, onNavigate }) {
  const isEn = locale === "en";
  const [period, setPeriod] = useState("all");
  const [toolLayout, setToolLayout] = useState("grid");
  const copy = isEn ? {
    title: "Recently used", subtitle: "Quickly revisit your recent AI tools, tasks and files.", tools: "Tools", tasks: "Tasks", files: "Files", recentTools: "Recently used tools", recentTasks: "Recent tasks", recentFiles: "Recent files", allTime: "All time", days7: "Last 7 days", days30: "Last 30 days", viewAllTasks: "View all tasks", viewAllFiles: "View all files", viewResult: "View result", noTools: "No tools used yet", noTasks: "No recent tasks", noFiles: "No recent files", browse: "Browse tools",
  } : {
    title: "最近使用", subtitle: "快速访问你最近使用过的 AI 工具、执行任务和文件内容。", tools: "工具", tasks: "任务", files: "文件", recentTools: "最近使用的工具", recentTasks: "最近任务", recentFiles: "最近文件", allTime: "全部时间", days7: "最近 7 天", days30: "最近 30 天", viewAllTasks: "查看全部任务", viewAllFiles: "查看全部文件", viewResult: "查看结果", noTools: "还没有使用过工具", noTasks: "暂无最近任务", noFiles: "暂无最近文件", browse: "浏览工具",
  };
  const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
  const filteredTasks = tasks.filter((task) => Number(task.createdAt || 0) >= cutoff);
  const recentToolRecords = [...new Map(filteredTasks.map((task) => [task.toolId, task])).values()];
  const recentTools = recentToolRecords.map((task) => tools.find((tool) => tool.id === task.toolId)).filter(Boolean).slice(0, 6);
  const recentTasks = filteredTasks.slice(0, 6);
  const recentFiles = files.filter((file) => Number(file.createdAt || 0) >= cutoff).slice(0, 6);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const taskSummary = (task) => String(task.input?.text || task.input?.prompt || task.input?.topic || task.input?.title || "").trim();
  const fileKind = (file) => file.mimeType?.startsWith("image/") ? "image" : file.mimeType?.startsWith("audio/") ? "audio" : file.mimeType?.startsWith("video/") ? "video" : /pdf/i.test(`${file.mimeType} ${file.name}`) ? "pdf" : "document";
  const fileMeta = { image: [ImageSquare, "image"], audio: [MusicNotes, "audio"], video: [VideoCamera, "video"], pdf: [FilePdf, "pdf"], document: [FileText, "document"] };
  return <div className="recent-usage-page page-stack">
    <header className="recent-usage-heading"><div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></header>
    <nav className="recent-section-tabs" aria-label={copy.title}><button onClick={() => scrollTo("recent-tools")}><SquaresFour size={15} />{copy.tools}</button><button onClick={() => scrollTo("recent-tasks")}><ListChecks size={15} />{copy.tasks}</button><button onClick={() => scrollTo("recent-files")}><FolderOpen size={15} />{copy.files}</button></nav>
    <section className="surface recent-tools-panel" id="recent-tools">
      <header><h2>{copy.recentTools}</h2><div><label><Clock size={15} /><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">{copy.allTime}</option><option value="7">{copy.days7}</option><option value="30">{copy.days30}</option></select><CaretDown size={13} /></label><button className={toolLayout === "grid" ? "active" : ""} aria-label="Grid" onClick={() => setToolLayout("grid")}><SquaresFour size={17} /></button><button className={toolLayout === "list" ? "active" : ""} aria-label="List" onClick={() => setToolLayout("list")}><ListChecks size={17} /></button></div></header>
      {recentTools.length ? <div className={`recent-tool-cards ${toolLayout}`}>{recentTools.map((tool) => { const usedTask = recentToolRecords.find((task) => task.toolId === tool.id); return <button key={tool.id} onClick={() => onRun(tool)}><ProductToolIcon tool={tool} size={28} /><span><strong>{isEn ? tool.nameEn : tool.nameZh}</strong><small>{isEn ? tool.descriptionEn : tool.descriptionZh}</small><em>{formatDate(usedTask?.createdAt, locale)}</em></span><ArrowRight size={16} /></button>; })}</div> : <div className="recent-empty"><Clock size={24} /><span>{copy.noTools}</span><button onClick={() => onNavigate("marketplace")}>{copy.browse}</button></div>}
    </section>
    <section className="surface recent-task-panel" id="recent-tasks">
      <header><h2>{copy.recentTasks}</h2><button onClick={() => onNavigate("tasks")}>{copy.viewAllTasks}<ArrowRight size={14} /></button></header>
      {recentTasks.length ? <div className="recent-task-table"><div className="recent-task-head"><span>{isEn ? "Task" : "任务内容"}</span><span>{isEn ? "Tool" : "使用工具"}</span><span>{isEn ? "Status" : "状态"}</span><span>{isEn ? "Created" : "创建时间"}</span><span>{isEn ? "Action" : "操作"}</span></div>{recentTasks.map((task) => { const tool = tools.find((item) => item.id === task.toolId); return <button key={task.id} onClick={() => onOpenTask(task)}><ProductToolIcon tool={tool || { icon: task.icon, category: "tool" }} compact /><span><strong>{taskSummary(task) || (isEn ? task.toolNameEn : task.toolNameZh)}</strong><small>{isEn ? task.toolNameEn : task.toolNameZh}</small></span><span className="recent-task-tool"><ProductToolIcon tool={tool || { icon: task.icon }} compact />{isEn ? task.toolNameEn : task.toolNameZh}</span><StatusPill status={task.status} locale={locale} /><time>{formatDate(task.createdAt, locale)}</time><em>{copy.viewResult}<ArrowRight size={13} /></em></button>; })}</div> : <div className="recent-empty"><ListChecks size={24} /><span>{copy.noTasks}</span></div>}
    </section>
    <section className="surface recent-files-panel" id="recent-files">
      <header><h2>{copy.recentFiles}</h2><button onClick={() => onNavigate("files")}>{copy.viewAllFiles}<ArrowRight size={14} /></button></header>
      {recentFiles.length ? <div className="recent-file-cards">{recentFiles.map((file) => { const kind = fileKind(file); const [Icon, tone] = fileMeta[kind]; return <a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer" key={file.id}><span className={`recent-file-preview ${tone}`}>{kind === "image" ? <img src={`/api/files/${file.id}/thumbnail`} alt={file.name} loading="lazy" decoding="async" /> : <Icon size={34} weight="duotone" />}</span><strong title={file.name}>{file.name}</strong><small>{formatDate(file.createdAt, locale)}</small></a>; })}</div> : <div className="recent-empty"><FolderOpen size={24} /><span>{copy.noFiles}</span></div>}
    </section>
  </div>;
}

function AgentHubPage({ tools, tasks, favorites, locale, onRun, onToggleFavorite, onNavigate }) {
  const isEn = locale === "en";
  const [category, setCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const agentTools = useMemo(() => {
    return tools.filter((tool) => tool.category === "agent" || tool.slug?.includes("agent"));
  }, [tools]);
  const agentTasks = useMemo(() => tasks.filter((task) => agentTools.some((tool) => tool.id === task.toolId)), [tasks, agentTools]);
  const categories = [["all",isEn?"Featured":"精选推荐",Sparkle],["content",isEn?"Content":"内容创作",PenNib],["growth",isEn?"Growth":"营销增长",TrendUp],["data",isEn?"Data":"数据分析",ChartBar],["developer",isEn?"Developer":"开发编程",Code],["office",isEn?"Office":"办公效率",Briefcase],["research",isEn?"Research":"研究分析",Binoculars],["commerce",isEn?"Commerce":"电商运营",Megaphone]];
  const categoryFor = (tool) => {
    const text = `${tool.slug} ${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    if (/seo|growth|营销|增长/.test(text)) return "growth";
    if (/data|analysis|分析|数据/.test(text)) return "data";
    if (/code|developer|开发|编程/.test(text)) return "developer";
    if (/commerce|ecommerce|电商|商品|运营/.test(text)) return "commerce";
    if (/research|market|研究|调研|竞品/.test(text)) return "research";
    if (/office|document|办公|会议|周报/.test(text)) return "office";
    return "content";
  };
  const filtered = category === "all" ? agentTools : agentTools.filter((tool) => categoryFor(tool) === category);
  const featured = showAll ? filtered : filtered.slice(0,5);
  const completed = agentTasks.filter((task) => task.status === "completed").length;
  const failed = agentTasks.filter((task) => task.status === "failed").length;
  const successRate = completed + failed ? Math.round((completed / (completed + failed)) * 1000) / 10 : 100;
  const ownAgents = [...new Map(agentTasks.map((task) => [task.toolId, task])).values()].slice(0,3);
  const popularTemplates = agentTools.slice(0,4);
  const copy = isEn ? {
    title:"AI Agent",subtitle:"Run published Agent templates as traceable tasks. Multi-step orchestration is currently in Beta.",heroTitle:"Start with a published AI Agent",heroBody:"Choose an available Agent template, provide its input, and review the real task and output records after execution.",create:"Choose Agent",featured:"Published Agents",featuredSub:"Agent capabilities currently available to run",mine:"My Agent runs",mineSub:"Agent templates you have actually run",all:"View all",guide:"How AI Agents work",overview:"Agent overview",runs:"Runs",success:"Success rate",quick:"Quick actions",browse:"Browse templates",projects:"Open projects",templates:"Available templates",empty:"No Agent has been run yet.",choose:"Choose Agent template",chooseBody:"Only published Agent capabilities are shown here. Each selection opens its real workflow.",close:"Close",use:"Use template",running:"runs",categories:"Agent categories",
  } : {
    title:"AI Agent",subtitle:"将已发布的 Agent 模板作为可追踪任务运行；多步骤自动编排目前处于 Beta 阶段。",heroTitle:"从已发布的 AI Agent 开始",heroBody:"选择当前可用的 Agent 模板，填写输入后执行，并在任务中心和文件中心查看真实记录与结果。",create:"选择 Agent",featured:"已发布 Agent",featuredSub:"当前已经发布并可真实运行的 Agent 能力",mine:"我的 Agent 运行",mineSub:"你实际运行过的 Agent 模板",all:"查看全部",guide:"如何使用 AI Agent",overview:"Agent 运行概览",runs:"运行次数",success:"成功率",quick:"快捷操作",browse:"浏览 Agent 模板",projects:"打开项目中心",templates:"可用模板",empty:"你还没有运行过 Agent。",choose:"选择 Agent 模板",chooseBody:"这里只展示已发布的 Agent 能力，选择后会直接进入真实工作流。",close:"关闭",use:"使用模板",running:"次运行",categories:"Agent 分类",
  };
  return <div className="agent-hub page-stack">
    <header className="agent-hub-heading"><div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></header>
    <div className="agent-hub-layout"><main>
      <section className="agent-hub-hero"><div><h2>{copy.heroTitle}</h2><p>{copy.heroBody}</p><button onClick={() => setCreateOpen(true)}><Plus size={16} weight="bold" />{copy.create}<ArrowRight size={15}/></button></div><img src="/landing-v2/ai-agent-robot.webp" alt="" width="420" height="250" fetchPriority="high" decoding="async" /></section>
      <nav className="agent-category-tabs" aria-label={copy.categories}>{categories.map(([id,label,Icon])=><button key={id} className={category===id?"active":""} onClick={()=>setCategory(id)}><Icon size={15} weight={category===id?"fill":"regular"}/>{label}</button>)}</nav>
      <section className="agent-featured" id="agent-templates"><header><div><h2>{copy.featured}</h2><p>{copy.featuredSub}</p></div>{filtered.length>5&&<button onClick={()=>setShowAll(!showAll)}>{showAll?(isEn?"Show less":"收起"):copy.all}<ArrowRight size={14}/></button>}</header>
        {featured.length?<div>{featured.map((tool)=><article key={tool.id}><div><ProductToolIcon tool={tool} size={26}/><button aria-label={isEn?"Toggle favorite":"切换收藏"} className={favorites.includes(tool.id)?"active":""} onClick={()=>onToggleFavorite(tool.id)}><Star size={16} weight={favorites.includes(tool.id)?"fill":"regular"}/></button></div><h3>{isEn?tool.nameEn:tool.nameZh}</h3><p>{isEn?tool.descriptionEn:tool.descriptionZh}</p><span><small>{categoryFor(tool)}</small><ToolPrice tool={tool} locale={locale}/></span><footer><em>{agentTasks.filter((task)=>task.toolId===tool.id).length.toLocaleString()} {copy.running}</em><button onClick={()=>onRun(tool)}>{copy.use}<ArrowRight size={13}/></button></footer></article>)}</div>:<EmptyState icon={Robot} title={isEn?"No Agent in this category":"该分类暂无 Agent"}/>}</section>
      <section className="agent-mine"><header><div><h2>{copy.mine}</h2><p>{copy.mineSub}</p></div><button onClick={()=>onNavigate("tasks")}>{copy.all}<ArrowRight size={14}/></button></header><div>{ownAgents.map((task)=>{const tool=agentTools.find((item)=>item.id===task.toolId);const count=agentTasks.filter((item)=>item.toolId===task.toolId).length;return <article key={task.toolId}><div><ProductToolIcon tool={tool||{icon:task.icon,category:"agent"}} size={25}/><button aria-label="More">•••</button></div><h3>{isEn?task.toolNameEn:task.toolNameZh}</h3><p>{tool?(isEn?tool.descriptionEn:tool.descriptionZh):"AI Agent"}</p><footer><span className={`agent-status ${task.status}`}><i/>{statusLabel(task.status,locale)}</span><time>{count} {copy.running}</time></footer></article>;})}<button className="agent-new-card" onClick={()=>setCreateOpen(true)}><span><Plus size={28}/></span><strong>{copy.create}</strong><small>{isEn?"Start with a published template":"从已发布模板开始"}</small></button></div>{!ownAgents.length&&<p className="agent-mine-empty">{copy.empty}</p>}</section>
      <section className="agent-guide"><h2>{copy.guide}</h2><div>{[[MagicWand,isEn?"Choose a template":"选择模板",isEn?"Pick a published Agent for your goal":"选择适合目标的已发布 Agent"],[CheckSquare,isEn?"Set the task":"设置任务",isEn?"Provide input and parameters":"填写输入内容与执行参数"],[Play,isEn?"Run":"启动执行",isEn?"The Agent creates a traceable task":"Agent 创建可追踪任务"],[Eye,isEn?"Review results":"查看结果",isEn?"Open outputs in Tasks and Files":"在任务与文件中心查看结果"]].map(([Icon,title,body],index)=><article key={title}><span>{index+1}</span><Icon size={20} weight="duotone"/><div><strong>{title}</strong><small>{body}</small></div>{index<3&&<ArrowRight size={18}/>}</article>)}</div></section>
    </main><aside>
      <section className="agent-overview"><header><h2>{copy.overview}</h2><select aria-label={copy.overview}><option>{isEn?"This month":"本月"}</option></select></header><div><span><small>{copy.runs}</small><strong>{agentTasks.length.toLocaleString()}</strong></span><span><small>{copy.success}</small><strong>{successRate}%</strong></span></div><div className="agent-run-chart" aria-label={isEn?"Recent Agent activity":"近期 Agent 活动"}><svg viewBox="0 0 240 72" role="img" aria-hidden="true"><defs><linearGradient id="agentChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6c5ff3" stopOpacity=".25"/><stop offset="100%" stopColor="#6c5ff3" stopOpacity="0"/></linearGradient></defs><path className="area" d="M4 58 L28 43 L52 51 L76 33 L100 45 L124 25 L148 39 L172 18 L196 28 L236 8 L236 70 L4 70 Z"/><path className="line" d="M4 58 L28 43 L52 51 L76 33 L100 45 L124 25 L148 39 L172 18 L196 28 L236 8"/></svg><span><small>5/1</small><small>5/8</small><small>5/15</small><small>5/22</small><small>5/29</small></span></div></section>
      <section className="agent-quick"><h2>{copy.quick}</h2><button onClick={()=>setCreateOpen(true)}><span><MagicWand size={20} weight="duotone"/></span><div><strong>{copy.create}</strong><small>{isEn?"Build from a real template":"从真实模板创建"}</small></div><ArrowRight size={15}/></button><button onClick={()=>document.getElementById("agent-templates")?.scrollIntoView({behavior:"smooth"})}><span><Database size={20} weight="duotone"/></span><div><strong>{copy.browse}</strong><small>{agentTools.length} {isEn?"published Agents":"个已发布 Agent"}</small></div><ArrowRight size={15}/></button><button onClick={()=>onNavigate("projects")}><span><FolderOpen size={20} weight="duotone"/></span><div><strong>{copy.projects}</strong><small>{isEn?"Manage continuous work":"管理持续执行的工作"}</small></div><ArrowRight size={15}/></button></section>
      <section className="agent-popular"><header><h2>{copy.templates}</h2><button onClick={()=>document.getElementById("agent-templates")?.scrollIntoView({behavior:"smooth"})}>{copy.all}<ArrowRight size={13}/></button></header>{popularTemplates.map((tool)=><button key={tool.id} onClick={()=>onRun(tool)}><ProductToolIcon tool={tool} compact/><span><strong>{isEn?tool.nameEn:tool.nameZh}</strong><small>{agentTasks.filter((task)=>task.toolId===tool.id).length} {copy.running}</small></span></button>)}</section>
    </aside></div>
    {createOpen&&<div className="agent-template-modal" role="dialog" aria-modal="true" aria-labelledby="agent-template-title" onMouseDown={(event)=>{if(event.target===event.currentTarget)setCreateOpen(false);}}><section><header><div><h2 id="agent-template-title">{copy.choose}</h2><p>{copy.chooseBody}</p></div><button aria-label={copy.close} onClick={()=>setCreateOpen(false)}><X size={20}/></button></header><div>{agentTools.map((tool)=><button key={tool.id} onClick={()=>{setCreateOpen(false);onRun(tool);}}><ProductToolIcon tool={tool} size={25}/><span><strong>{isEn?tool.nameEn:tool.nameZh}</strong><small>{isEn?tool.descriptionEn:tool.descriptionZh}</small></span><em>{copy.use}<ArrowRight size={13}/></em></button>)}</div>{!agentTools.length&&<EmptyState icon={Robot} title={isEn?"No published Agent yet":"还没有已发布的 Agent"}/>}<footer><button onClick={()=>setCreateOpen(false)}>{copy.close}</button></footer></section></div>}
  </div>;
}

function ToolCollectionPage({ mode, tools, tasks, favorites, locale, onRun, onToggleFavorite, onNavigate }) {
  const isEn = locale === "en";
  const taskToolIds = [...new Set(tasks.map((task) => task.toolId))];
  const list = mode === "recent"
    ? taskToolIds.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean)
    : mode === "favorites"
      ? tools.filter((tool) => favorites.includes(tool.id))
      : tools.filter((tool) => tool.category === "agent" || tool.slug?.includes("agent"));
  const copy = mode === "recent"
    ? [isEn ? "Recently used" : "最近使用", isEn ? "Pick up where you left off from your real task history." : "根据你的真实任务记录，继续上一次的工作。", Clock]
    : mode === "favorites"
      ? [isEn ? "My favorites" : "我的收藏", isEn ? "Keep the tools you use most within easy reach." : "集中管理常用工具，随时快速开始。", Star]
      : ["AI Agent", isEn ? "Agents turn multi-step work into trackable tasks." : "把复杂的多步骤工作交给智能体持续执行。", Robot];
  const EmptyIcon = copy[2];
  return <div className="collection-page page-stack"><header className="collection-heading"><span><EmptyIcon size={24} weight="duotone" /></span><div><h1>{copy[0]}</h1><p>{copy[1]}</p></div></header>{list.length ? <section className="collection-grid">{list.map((tool) => <article className="surface collection-tool" key={tool.id}><div><ProductToolIcon tool={tool} size={24} /><button aria-label={isEn ? "Toggle favorite" : "切换收藏"} className={favorites.includes(tool.id) ? "active" : ""} onClick={() => onToggleFavorite(tool.id)}><Star size={17} weight={favorites.includes(tool.id) ? "fill" : "regular"} /></button></div><h2>{isEn ? tool.nameEn : tool.nameZh}</h2><p>{isEn ? tool.descriptionEn : tool.descriptionZh}</p><footer><span><Coins size={14} />{tool.creditCost}</span><button onClick={() => onRun(tool)}>{isEn ? "Use" : "使用"}<ArrowRight size={14} /></button></footer></article>)}</section> : <EmptyState icon={EmptyIcon} title={mode === "favorites" ? (isEn ? "No favorites yet" : "还没有收藏工具") : (isEn ? "No activity yet" : "暂无使用记录")} body={mode === "favorites" ? (isEn ? "Favorite a tool in the marketplace and it will appear here." : "在工具市场收藏常用工具后，会集中显示在这里。") : undefined} action={<button className="primary-button" onClick={() => onNavigate("marketplace")}>{isEn ? "Browse tools" : "浏览工具"}</button>} />}</div>;
}

function FavoritesPage({ tools, tasks, files, favorites, collections, counts, locale, onRun, onOpenTask, onNavigate, onAdd, onRemove, onMove, onCreateCollection }) {
  const isEn = locale === "en";
  const [tab, setTab] = useState("tool");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [layout, setLayout] = useState("grid");
  const [showFolders, setShowFolders] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const copy = isEn ? {
    title:"My favorites", subtitle:"Your saved AI tools, files, prompts and generated assets.", tool:"Tools", file:"Files", prompt:"Prompts", material:"Assets", all:"All", folders:"Folders", create:"Create folder", add:"Add favorite", choose:"Choose content to save", search:"Search favorites", newest:"Newest", oldest:"Oldest", stats:"Favorites", recent:"Recently saved", empty:"Nothing saved in this category yet.", emptyFolder:"This folder is empty. Move favorites here from the item menu.", browse:"Browse tools", backToAll:"Back to all favorites", remove:"Remove", move:"Move to folder", root:"Unfiled", save:"Create", cancel:"Cancel", noPrompt:"Untitled prompt", noCandidate:"Everything available in this category is already saved.", addNow:"Save",
  } : {
    title:"我的收藏", subtitle:"统一管理你收藏的 AI 工具、文件、提示词和生成素材。", tool:"工具", file:"文件", prompt:"提示词", material:"素材", all:"全部", folders:"收藏夹", create:"创建收藏夹", add:"添加收藏", choose:"选择要收藏的内容", search:"搜索收藏内容", newest:"最新收藏", oldest:"最早收藏", stats:"收藏统计", recent:"最近收藏", empty:"这个分类下还没有收藏内容。", emptyFolder:"这个收藏夹还是空的，可以通过收藏卡片下方的菜单将内容移入。", browse:"去发现工具", backToAll:"返回全部收藏", remove:"取消收藏", move:"移动到收藏夹", root:"未分类", save:"创建", cancel:"取消", noPrompt:"未命名提示词", noCandidate:"这个分类下可收藏的内容都已经保存了。", addNow:"收藏",
  };
  const tabs = [["tool",copy.tool,Wrench],["file",copy.file,File],["prompt",copy.prompt,NotePencil],["material",copy.material,ImageSquare]];
  const promptText = (task) => String(task?.input?.prompt || task?.input?.text || task?.input?.topic || task?.input?.title || "").trim();
  const favoriteItems = favorites.map((favorite) => {
    if (favorite.itemType === "tool") return { ...favorite, item: tools.find((item) => item.id === favorite.itemId) };
    if (favorite.itemType === "prompt") return { ...favorite, item: tasks.find((item) => item.id === favorite.itemId) };
    return { ...favorite, item: files.find((item) => item.id === favorite.itemId) };
  }).filter((favorite) => favorite.item);
  const searchable = (favorite) => favorite.itemType === "tool"
    ? `${favorite.item.nameZh} ${favorite.item.nameEn} ${favorite.item.descriptionZh} ${favorite.item.descriptionEn}`
    : favorite.itemType === "prompt"
      ? `${promptText(favorite.item)} ${favorite.item.toolNameZh} ${favorite.item.toolNameEn}`
      : `${favorite.item.name} ${favorite.item.sourceNameZh || ""} ${favorite.item.sourceNameEn || ""}`;
  const activeCollection = collections.find((folder) => folder.id === selectedCollectionId) || null;
  const visible = favoriteItems.filter((favorite) => (activeCollection ? favorite.collectionId === activeCollection.id : favorite.itemType === tab) && searchable(favorite).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b) => sort === "oldest" ? a.createdAt-b.createdAt : b.createdAt-a.createdAt);
  const recent = [...favoriteItems].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  const savedIds = new Set(favorites.filter((favorite)=>favorite.itemType===tab).map((favorite)=>favorite.itemId));
  const pickerItems = (tab === "tool" ? tools : tab === "prompt" ? tasks : files.filter((file)=>tab === "material" ? Boolean(file.sourceNameZh || file.sourceNameEn) : !file.sourceNameZh && !file.sourceNameEn)).filter((item)=>!savedIds.has(item.id));
  const labelFor = (favorite) => favorite.itemType === "tool" ? (isEn ? favorite.item.nameEn : favorite.item.nameZh) : favorite.itemType === "prompt" ? (promptText(favorite.item) || copy.noPrompt) : favorite.item.name;
  const itemIcon = (favorite, size=25) => favorite.itemType === "tool" ? <ProductToolIcon tool={favorite.item} size={size}/>
    : favorite.itemType === "prompt" ? <span className="favorite-kind-icon prompt"><NotePencil size={size} weight="duotone"/></span>
      : favorite.item.mimeType?.startsWith("image/") ? <span className="favorite-kind-icon image"><img src={`/api/files/${favorite.item.id}/thumbnail`} alt="" loading="lazy" decoding="async"/></span>
        : <span className={`favorite-kind-icon ${favorite.itemType}`}><FileText size={size} weight="duotone"/></span>;
  const openFavorite = (favorite) => favorite.itemType === "tool" ? onRun(favorite.item) : favorite.itemType === "prompt" ? onOpenTask(favorite.item) : window.open(`/api/files/${favorite.item.id}/download`, "_blank", "noopener,noreferrer");
  return <div className="favorites-page page-stack">
    <header className="favorites-heading"><div><span><Star size={30} weight="duotone"/></span><div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></div><div><button className="primary-button" onClick={()=>setShowPicker(true)}><Plus size={16}/>{copy.add}</button><button className="secondary-button" onClick={()=>setShowFolders(true)}><FolderOpen size={16}/>{copy.create}</button><label><select value={sort} onChange={(event)=>setSort(event.target.value)}><option value="newest">{copy.newest}</option><option value="oldest">{copy.oldest}</option></select><CaretDown size={13}/></label><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}><GridFour size={17}/></button><button className={layout==="list"?"active":""} onClick={()=>setLayout("list")}><ListChecks size={17}/></button></div></header>
    <nav className="favorites-tabs">{tabs.map(([id,label,Icon])=><button className={!activeCollection&&tab===id?"active":""} key={id} onClick={()=>{setSelectedCollectionId(null);setTab(id);}}><Icon size={16}/>{label}<small>{counts?.[id]||0}</small></button>)}</nav>
    <section className="surface favorites-library"><main><header><nav><button className={!activeCollection?"active":""} onClick={()=>setSelectedCollectionId(null)}>{copy.all}<small>{activeCollection?favoriteItems.length:visible.length}</small></button><button className={activeCollection?"active":""} onClick={()=>activeCollection?setSelectedCollectionId(null):document.querySelector(".favorite-folders")?.scrollIntoView({behavior:"smooth",block:"center"})}>{activeCollection?activeCollection.name:copy.folders}<small>{activeCollection?visible.length:collections.length}</small></button></nav><label><MagnifyingGlass size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.search}/></label></header>
      {visible.length ? <div className={`favorite-card-grid ${layout}`}>{visible.map((favorite)=><article key={favorite.id} className="favorite-card">{itemIcon(favorite,28)}<div className="favorite-card-copy"><strong title={labelFor(favorite)}>{labelFor(favorite)}</strong><small>{favorite.itemType === "tool" ? (isEn ? favorite.item.descriptionEn : favorite.item.descriptionZh) : favorite.itemType === "prompt" ? (isEn ? favorite.item.toolNameEn : favorite.item.toolNameZh) : `${formatBytes(favorite.item.sizeBytes)} · ${favorite.item.sourceNameZh || copy.file}`}</small>{favorite.itemType === "tool" && <span>{favorite.item.tags?.slice(0,2).map((tag)=><em key={tag}>{tag}</em>)}</span>}</div><footer><time>{formatDate(favorite.createdAt,locale)}</time><label title={copy.move}><select value={favorite.collectionId||""} onChange={(event)=>onMove(favorite.id,event.target.value||null)}><option value="">{copy.root}</option>{collections.map((folder)=><option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><button onClick={()=>openFavorite(favorite)}><ArrowRight size={15}/></button><button className="favorite-remove" title={copy.remove} onClick={()=>onRemove(favorite.id)}><Star size={16} weight="fill"/></button></footer></article>)}</div> : <EmptyState
        icon={Star}
        title={activeCollection ? copy.emptyFolder : copy.empty}
        action={<button className="primary-button" onClick={()=>activeCollection?setSelectedCollectionId(null):onNavigate("marketplace")}>{activeCollection?copy.backToAll:copy.browse}</button>}
      />}
      {!activeCollection&&collections.length>0&&<section className="favorite-folders"><h2>{copy.folders}</h2><div>{collections.map((folder)=><button type="button" key={folder.id} onClick={()=>{setSelectedCollectionId(folder.id);setQuery("");}}><FolderOpen size={23} weight="duotone"/><span><strong>{folder.name}</strong><small>{folder.itemCount} {isEn?"items":"项收藏"}</small></span><ArrowRight size={15}/></button>)}</div></section>}
    </main><aside><label className="favorite-search"><MagnifyingGlass size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.search}/></label><section><h2>{copy.stats}</h2><div>{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)}><span><Icon size={18} weight="duotone"/></span><small>{label}</small><strong>{counts?.[id]||0}</strong></button>)}</div></section><section className="favorite-recent"><h2>{copy.recent}</h2>{recent.map((favorite)=><button key={favorite.id} onClick={()=>{setTab(favorite.itemType);openFavorite(favorite);}}>{itemIcon(favorite,18)}<strong>{labelFor(favorite)}</strong><time>{formatDate(favorite.createdAt,locale)}</time></button>)}</section></aside></section>
    {showFolders&&<div className="modal-backdrop"><section className="surface favorite-folder-dialog"><button className="modal-close icon-button" onClick={()=>setShowFolders(false)}><X size={19}/></button><FolderOpen size={30} weight="duotone"/><h2>{copy.create}</h2><input autoFocus value={folderName} maxLength={40} onChange={(event)=>setFolderName(event.target.value)} placeholder={isEn?"Folder name":"例如：创作工具"}/><div><button className="secondary-button" onClick={()=>setShowFolders(false)}>{copy.cancel}</button><button className="primary-button" disabled={!folderName.trim()} onClick={async()=>{await onCreateCollection(folderName.trim());setFolderName("");setShowFolders(false);}}><Plus size={15}/>{copy.save}</button></div></section></div>}
    {showPicker&&<div className="modal-backdrop"><section className="surface favorite-picker-dialog"><button className="modal-close icon-button" onClick={()=>setShowPicker(false)}><X size={19}/></button><header><Star size={27} weight="duotone"/><div><h2>{copy.choose}</h2><p>{tabs.find(([id])=>id===tab)?.[1]}</p></div></header>{pickerItems.length?<div>{pickerItems.slice(0,12).map((item)=>{const title=tab==="tool"?(isEn?item.nameEn:item.nameZh):tab==="prompt"?(promptText(item)||copy.noPrompt):item.name;return <article key={item.id}>{tab==="tool"?<ProductToolIcon tool={item} size={23}/>:tab==="prompt"?<span className="favorite-kind-icon prompt"><NotePencil size={21}/></span>:<span className={`favorite-kind-icon ${tab}`}><FileText size={21}/></span>}<strong title={title}>{title}</strong><button onClick={async()=>{await onAdd(tab,item.id);setShowPicker(false);}}><Plus size={14}/>{copy.addNow}</button></article>;})}</div>:<p className="favorite-picker-empty">{copy.noCandidate}</p>}</section></div>}
  </div>;
}

function ProjectStatusDonut({ groups, total }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const size = 116;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.clearRect(0, 0, size, size);
    context.lineWidth = 12;
    context.lineCap = "round";
    context.strokeStyle = "#edf1f8";
    context.beginPath();
    context.arc(size / 2, size / 2, 43, 0, Math.PI * 2);
    context.stroke();
    if (!total) return;
    let start = -Math.PI / 2;
    groups.forEach((group) => {
      if (!group.value) return;
      const sweep = (group.value / total) * Math.PI * 2;
      context.strokeStyle = group.color;
      context.beginPath();
      context.arc(size / 2, size / 2, 43, start + 0.025, start + sweep - 0.025);
      context.stroke();
      start += sweep;
    });
  }, [groups, total]);
  return <canvas ref={canvasRef} aria-label={`Projects: ${total}`} role="img" />;
}

function ProjectCenter({ projects, locale, onNavigate, onRefresh, onNotice }) {
  const isEn = locale === "en";
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [layout, setLayout] = useState("grid");
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const projectState = (project) => project.status || "active";
  const createProject = async (event) => { event.preventDefault(); try { await api("/api/projects", jsonOptions("POST", draft)); setDraft({ name: "", description: "" }); setCreating(false); await onRefresh(); onNotice?.(isEn ? "Project created." : "项目已创建。"); } catch { onNotice?.(isEn ? "Could not create project." : "项目创建失败，请重试。"); } };
  const updateProject = async (project, values) => { try { await api(`/api/projects/${project.id}`, jsonOptions("PATCH", values)); setSelectedProject(null); await onRefresh(); onNotice?.(isEn ? "Project updated." : "项目已更新。"); } catch { onNotice?.(isEn ? "Could not update project." : "项目更新失败，请重试。"); } };
  const removeProject = async (project) => {
    const approved = window.confirm(isEn
      ? `Delete “${project.name}”? This action cannot be undone.`
      : `确定删除“${project.name}”吗？此操作无法撤销。`);
    if (!approved) return;
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      setSelectedProject(null);
      await onRefresh();
      onNotice?.(isEn ? "Project deleted." : "项目已删除。");
    } catch {
      onNotice?.(isEn ? "Could not delete project." : "项目删除失败，请重试。");
    }
  };
  const counts = projects.reduce((result, project) => {
    result[projectState(project)] += 1;
    return result;
  }, { active: 0, running: 0, completed: 0, archived: 0 });
  const scheduled = projects.reduce((sum, project) => sum + Number(project.taskCount || 0), 0);
  const copy = isEn ? {
    title: "Project Center", subtitle: "Organize related AI work, tasks and files in one place.", all: "All projects", created: "Created by me", involved: "Active", inspected: "Completed", archived: "Archived", newProject: "New project", search: "Search project name or description", allStatus: "All status", newest: "Recently updated", oldest: "Oldest updated", score: "Name", total: "Projects", active: "Active", completed: "Completed", scheduled: "Linked tasks", recent: "Recent activity", open: "Open project", templates: "Quick starts", seoTemplate: "New workspace project", agentTemplate: "AI Agent workspace", taskTemplate: "Task Center", lastUpdate: "Updated", noProjects: "No matching projects", noProjectsBody: "Create your first project to organize related AI work.", automation: "Tasks", manual: "Files", health: "Items", status: { active: "Active", running: "Active", completed: "Completed", archived: "Archived" },
  } : {
    title: "项目中心", subtitle: "集中整理同一目标下的 AI 工作、任务和文件。", all: "全部项目", created: "我创建的", involved: "进行中", inspected: "已完成", archived: "已归档", newProject: "新建项目", search: "搜索项目名称或描述", allStatus: "全部状态", newest: "最近更新", oldest: "最早更新", score: "名称排序", total: "全部项目", active: "进行中", completed: "已完成", scheduled: "关联任务", recent: "最近动态", open: "打开项目", templates: "常用入口", seoTemplate: "新建工作项目", agentTemplate: "AI Agent 工作区", taskTemplate: "任务中心", lastUpdate: "最近更新", noProjects: "没有符合条件的项目", noProjectsBody: "创建第一个项目，把相关 AI 工作集中管理。", automation: "任务", manual: "文件", health: "内容", status: { active: "进行中", running: "进行中", completed: "已完成", archived: "已归档" },
  };
  const tabs = [["all", copy.all], ["created", copy.created], ["active", copy.involved], ["completed", copy.inspected], ["archived", copy.archived]];
  const visible = projects.filter((project) => {
    const matchesQuery = `${project.name || ""} ${project.description || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const state = projectState(project);
    const matchesScope = scope === "all" || scope === "created" || state === scope;
    return matchesQuery && matchesScope;
  }).sort((a, b) => {
    if (sort === "oldest") return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
    if (sort === "score") return String(a.name).localeCompare(String(b.name), locale);
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  const donutGroups = [
    { id: "active", label: copy.active, value: counts.active + counts.running, color: "#5067e9" },
    { id: "completed", label: copy.completed, value: counts.completed, color: "#21ad82" },
    { id: "archived", label: copy.archived, value: counts.archived, color: "#a4aec2" },
  ];
  const recent = [...projects].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 5);
  return <div className="projects-dashboard-layout">
    <main className="projects-page">
      <header className="projects-heading"><div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div><button className="primary-button" onClick={()=>setCreating(true)}><Plus size={16}/>{copy.newProject}</button></header>
      <nav className="projects-tabs">{tabs.map(([id, label]) => <button className={scope === id ? "active" : ""} key={id} onClick={() => setScope(id)}>{label}</button>)}</nav>
      <section className="surface projects-overview">
        {[
          [copy.total, projects.length, Database, "blue"],
          [copy.active, counts.active + counts.running, ChartLineUp, "violet"],
          [copy.completed, counts.completed, CheckCircle, "green"],
          [copy.scheduled, scheduled, CalendarBlank, "orange"],
          [copy.archived, counts.archived, FolderOpen, "slate"],
        ].map(([label, value, Icon, tone]) => <article key={label}><span className={tone}><Icon size={20} weight="duotone"/></span><div><small>{label}</small><strong>{value}</strong></div></article>)}
      </section>
      <section className="projects-toolbar">
        <label className="projects-search"><MagnifyingGlass size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search}/></label>
        <label><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">{copy.allStatus}</option><option value="active">{copy.involved}</option><option value="completed">{copy.inspected}</option><option value="archived">{copy.archived}</option></select><CaretDown size={13}/></label>
        <label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{copy.newest}</option><option value="oldest">{copy.oldest}</option><option value="score">{copy.score}</option></select><CaretDown size={13}/></label>
        <span className="projects-layout-toggle"><button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid"><GridFour size={17}/></button><button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} aria-label="List"><ListChecks size={17}/></button></span>
      </section>
      {visible.length ? <section className={`project-card-grid-v2 ${layout}`}>{visible.map((project) => {
        const state = projectState(project);
        return <article className="surface project-card-v2" key={project.id}>
          <button className="project-card-main" onClick={()=>setSelectedProject(project)}>
            <div className="project-visual"><span><FolderOpen size={34} weight="duotone"/></span><div><small>{copy.health}</small><strong>{Number(project.taskCount||0)+Number(project.fileCount||0)}</strong><em>{isEn?"linked items":"项关联内容"}</em></div></div>
            <div className="project-card-copy"><strong>{project.name}</strong><p>{project.description || (isEn?"No description":"暂无项目描述")}</p><div><span>{project.taskCount || 0} {copy.automation}</span><span>{project.fileCount || 0} {copy.manual}</span></div></div>
          </button>
          <footer><span className={`project-state ${state}`}><i/>{copy.status[state]}</span><time>{copy.lastUpdate} · {formatDate(project.updatedAt, locale)}</time><button onClick={()=>setSelectedProject(project)} aria-label={copy.open}><ArrowRight size={16}/></button></footer>
        </article>;
      })}</section> : <section className="surface projects-empty"><EmptyState icon={Database} title={copy.noProjects} body={copy.noProjectsBody} action={<button className="primary-button" onClick={()=>setCreating(true)}><Plus size={15}/>{copy.newProject}</button>}/></section>}
      <footer className="projects-results"><span>{visible.length} / {projects.length} {isEn ? "projects" : "个项目"}</span></footer>
    </main>
    <aside className="projects-side">
      <section className="surface project-status-panel"><header><h2>{isEn ? "Project status" : "项目状态分布"}</h2></header><div><span className="project-donut"><ProjectStatusDonut groups={donutGroups} total={projects.length}/><strong>{projects.length}<small>{copy.total}</small></strong></span><ul>{donutGroups.map((group) => <li key={group.id}><i style={{ background: group.color }}/><span>{group.label}</span><strong>{group.value}</strong></li>)}</ul></div></section>
      <section className="surface project-activity"><header><h2>{copy.recent}</h2></header>{recent.length ? recent.map((project) => <button key={project.id} onClick={()=>setSelectedProject(project)}><span><FolderOpen size={17} weight="duotone"/></span><div><strong>{project.name}</strong><small>{copy.status[projectState(project)]}</small></div><time>{formatDate(project.updatedAt, locale)}</time></button>) : <p>{copy.noProjects}</p>}</section>
      <section className="surface project-quick"><header><h2>{copy.templates}</h2></header><button onClick={()=>setCreating(true)}><span><FolderOpen size={18} weight="duotone"/></span><div><strong>{copy.seoTemplate}</strong><small>{isEn?"Organize related work":"整理相关工作"}</small></div><ArrowRight size={15}/></button><button onClick={() => onNavigate("agent")}><span><Robot size={18} weight="duotone"/></span><div><strong>{copy.agentTemplate}</strong><small>AI Agent</small></div><ArrowRight size={15}/></button><button onClick={() => onNavigate("tasks")}><span><ListChecks size={18} weight="duotone"/></span><div><strong>{copy.taskTemplate}</strong><small>{isEn ? "Track execution" : "查看执行进度"}</small></div><ArrowRight size={15}/></button></section>
    </aside>
    {creating&&<div className="modal-backdrop"><form className="surface favorite-folder-dialog" onSubmit={createProject}><button type="button" className="modal-close icon-button" onClick={()=>setCreating(false)}><X size={19}/></button><FolderOpen size={30} weight="duotone"/><h2>{copy.newProject}</h2><input autoFocus required maxLength={80} value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})} placeholder={isEn?"Project name":"项目名称"}/><textarea maxLength={500} value={draft.description} onChange={(event)=>setDraft({...draft,description:event.target.value})} placeholder={isEn?"What are you working on?":"描述这个项目要完成的工作"}/><div><button type="button" className="secondary-button" onClick={()=>setCreating(false)}>{isEn?"Cancel":"取消"}</button><button className="primary-button" disabled={!draft.name.trim()}><Plus size={15}/>{copy.newProject}</button></div></form></div>}
    {selectedProject&&<div className="modal-backdrop"><section className="surface favorite-folder-dialog"><button className="modal-close icon-button" onClick={()=>setSelectedProject(null)}><X size={19}/></button><FolderOpen size={30} weight="duotone"/><h2>{selectedProject.name}</h2><p>{selectedProject.description || (isEn?"No description":"暂无项目描述")}</p><div><button className="secondary-button danger" onClick={()=>removeProject(selectedProject)}><Trash size={15}/>{isEn?"Delete":"删除"}</button><button className="secondary-button" onClick={()=>updateProject(selectedProject,{status:selectedProject.status==="archived"?"active":"archived"})}>{selectedProject.status==="archived"?(isEn?"Restore":"恢复"):(isEn?"Archive":"归档")}</button><button className="primary-button" onClick={()=>onNavigate("tasks")}>{copy.taskTemplate}<ArrowRight size={14}/></button></div></section></div>}
  </div>;
}

function Marketplace({ tools, locale, query, onQuery, onRun, data, runtime, tasks = [], onNavigate, favorites = [], onToggleFavorite = () => {} }) {
  const t = dictionary[locale];
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(12);
  const isEn = locale === "en";
  const selectedCategory = marketplaceCategories.find((item) => item.id === category) || marketplaceCategories[0];
  const matching = tools.filter((tool) => {
    const text = `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    const categoryMatches = category === "all" || selectedCategory.accepts.includes(tool.category);
    const queryMatches = !query || text.includes(query.toLowerCase());
    const filterMatches = filter === "all"
      || (filter === "free" && Number(tool.creditCost || 0) === 0)
      || (filter === "paid" && Number(tool.creditCost || 0) > 0)
      || (filter === "agent" && tool.category === "agent")
      || (filter === "local" && tool.runtimeKind !== "openai");
    return categoryMatches && queryMatches && filterMatches;
  });
  const visible = matching.slice(0, limit);
  const categoryCount = (item) => item.id === "all" ? tools.length : tools.filter((tool) => item.accepts.includes(tool.category)).length;
  const preferredSlugs = ["ai-music-studio", "ai-outfit-changer", "seo-agent", "ai-writer", "pdf-summary"];
  const featured = [...preferredSlugs.map((slug) => tools.find((tool) => tool.slug === slug)).filter(Boolean), ...tools]
    .filter((tool, index, list) => list.findIndex((item) => item.id === tool.id) === index).slice(0, 6);
  const recentTasks = tasks.slice(0, 5);
  const activeConnections = runtime?.connections?.filter((item) => item.status === "active").length || 0;
  const runtimeRows = [
    [isEn ? "Running tasks" : "运行中任务", data?.metrics?.running || 0, ListChecks],
    [isEn ? "Available models" : "可用模型", activeConnections + (runtime?.managed?.status === "ready" ? 1 : 0), PlugsConnected],
    [isEn ? "Completed tasks" : "已完成任务", data?.metrics?.completed || 0, CheckCircle],
  ];
  const filters = [
    ["all", isEn ? "All tools" : "全部工具", SquaresFour],
    ["free", isEn ? "Free" : "免费", Gift],
    ["paid", isEn ? "Paid" : "付费", Coins],
    ["agent", "AI Agent", Robot],
    ["local", isEn ? "Local tools" : "本地工具", ShieldCheck],
  ];
  useEffect(() => setLimit(12), [category, filter, query]);
  return <div className="marketplace-page marketplace-page-redesign">
    <div className="marketplace-primary">
      <section className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <p>ONSHOWTOOLS · AI WORKSPACE</p>
          <h1>{isEn ? "AI Tool Marketplace" : "AI 工具市场"}</h1>
          <span>{isEn ? `Explore ${tools.length}+ practical AI tools and get more done.` : `探索 ${tools.length}+ 款强大的 AI 工具，让 AI 帮你完成更多工作。`}</span>
          <div className="marketplace-search"><MagnifyingGlass size={21} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t.search} />{query ? <button aria-label={t.close} onClick={() => onQuery("")}><X size={16} /></button> : <button className="marketplace-search-submit" aria-label={isEn ? "Search tools" : "搜索工具"}><ArrowRight size={20} /></button>}</div>
        </div>
        <img src="/dashboard/oneshowtools-ai-toolkit-900.png" alt="" aria-hidden="true" />
      </section>

      <nav className="marketplace-category-nav" aria-label={isEn ? "Tool categories" : "工具分类"}>{marketplaceCategories.filter((item) => item.id === "all" || categoryCount(item) > 0).map((item) => { const CategoryIcon = item.icon; return <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}><CategoryIcon size={16} />{t[item.id]}<small>{categoryCount(item)}</small></button>; })}</nav>

      <section className="marketplace-featured surface">
        <header><div><Sparkle size={20} weight="fill" /><h2>{isEn ? "Featured picks" : "精选推荐"}</h2><span>{isEn ? "High-quality tools selected for you" : "精选优质 AI 工具，让你的工作效率翻倍"}</span></div><button onClick={() => { setCategory("all"); setFilter("all"); }}>{isEn ? "View all" : "查看全部精选"}<ArrowRight size={14} /></button></header>
        <div>{featured.slice(0, 2).map((tool, index) => <button className={`featured-tool tone-${index + 1}`} key={tool.id} onClick={() => onRun(tool)}><span className="featured-copy"><small><Fire size={12} weight="fill" />{isEn ? "POPULAR" : "热门"}</small><strong>{locale === "en" ? tool.nameEn : tool.nameZh}</strong><em>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</em><span className="featured-tags"><i>{t[tool.category] || tool.category}</i><ToolPrice tool={tool} locale={locale} /></span><b>{isEn ? "Use now" : "立即使用"}<ArrowRight size={14} /></b></span><span className="featured-icon"><ProductToolIcon tool={tool} size={84} /></span></button>)}</div>
      </section>

      <section className="marketplace-hot-tools surface"><header><div><Fire size={20} weight="fill" /><h2>{isEn ? "Popular tools" : "热门工具"}</h2><span>{isEn ? "Tools people are using now" : "大家都在用的 AI 工具"}</span></div><button onClick={() => { setCategory("all"); setFilter("all"); }}>{isEn ? "View all" : "查看全部热门"}<ArrowRight size={14} /></button></header><div>{featured.map((tool) => <article key={tool.id}><div><ProductToolIcon tool={tool} size={24} /><button className={`tool-favorite ${favorites.includes(tool.id) ? "active" : ""}`} onClick={() => onToggleFavorite(tool.id)} aria-label={isEn ? "Toggle favorite" : "切换收藏"}><Star size={15} weight={favorites.includes(tool.id) ? "fill" : "regular"} /></button></div><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3><p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><footer><ToolPrice tool={tool} locale={locale} /><button onClick={() => onRun(tool)} aria-label={isEn ? "Use tool" : "使用工具"}><ArrowRight size={15} /></button></footer></article>)}</div></section>

      <section className="marketplace-catalog surface">
        <div className="marketplace-filterbar">{filters.map(([id, label, Icon]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}><Icon size={16} />{label}</button>)}<span><Funnel size={15} />{matching.length} {t.toolsFound}</span></div>
        <div className="marketplace-catalog-body">
          <aside className="marketplace-categories">
            <header><span>{t.categoryDirectory}</span><small>{tools.length} {t.availableTools}</small></header>
            <nav>{marketplaceCategories.map((item) => { const CategoryIcon = item.icon; const count = categoryCount(item); return <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}><span><CategoryIcon size={17} />{t[item.id]}</span><small>{count}</small></button>; })}</nav>
          </aside>
          <div className="marketplace-card-area">
            <header><div><span>{t.marketplaceResults}</span><h2>{t[selectedCategory.id]}</h2></div><small>{matching.length} {t.toolsFound}</small></header>
            {visible.length ? <div className="marketplace-tool-grid">{visible.map((tool) => { const ready = tool.runtimeStatus === "ready"; const favorite = favorites.includes(tool.id); return <article className="marketplace-tool-card" key={tool.id}><div className="tool-card-head"><ProductToolIcon tool={tool} size={22} /><div><button className={`tool-favorite ${favorite ? "active" : ""}`} aria-label={isEn ? "Toggle favorite" : "切换收藏"} onClick={() => onToggleFavorite(tool.id)}><Star size={15} weight={favorite ? "fill" : "regular"} /></button>{ready ? <span className="tool-ready"><CheckCircle size={13} weight="fill" />{t.ready}</span> : <StatusPill status={tool.runtimeStatus} locale={locale} />}</div></div><h3>{locale === "en" ? tool.nameEn : tool.nameZh}</h3><p>{locale === "en" ? tool.descriptionEn : tool.descriptionZh}</p><div className="tool-card-tags"><span>{isEn ? "Tool" : "工具"}</span><span>{t[tool.category] || tool.category}</span></div><footer><ToolPrice tool={tool} locale={locale} /><button onClick={() => onRun(tool)}>{isEn ? "Use" : "使用"}</button></footer></article>; })}</div> : <EmptyState icon={selectedCategory.icon} title={query ? t.noResults : t.comingSoon} body={query ? undefined : t.comingSoonHint} action={!query && <button className="secondary-button" onClick={() => setCategory("all")}>{t.all}</button>} />}
            {matching.length > visible.length && <button className="marketplace-load-more" onClick={() => setLimit((value) => value + 12)}>{isEn ? "Load more tools" : "加载更多工具"}<CaretDown size={15} /></button>}
          </div>
        </div>
      </section>
    </div>

    <aside className="marketplace-side">
      <article className="market-side-card credits"><header><span>{t.creditsBalance}</span><Coins size={22} weight="duotone" /></header><strong>{data?.metrics?.credits?.toLocaleString() ?? "—"}</strong><small>Credits</small><div><button onClick={() => onNavigate?.("credits")}>{isEn ? "Top up" : "充值积分"}</button><button onClick={() => onNavigate?.("credits")}>{isEn ? "Details" : "积分明细"}</button></div></article>
      <article className="market-side-card"><header><h3>{isEn ? "AI Runtime status" : "AI Runtime 状态"}</h3><button onClick={() => onNavigate?.("runtime")}>{isEn ? "View" : "查看"}<ArrowRight size={13} /></button></header><dl>{runtimeRows.map(([label, value, Icon]) => <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value}</dd></div>)}</dl></article>
      <article className="market-side-card"><header><h3>{t.recentTasks}</h3><button onClick={() => onNavigate?.("tasks")}>{isEn ? "View all" : "查看全部"}<ArrowRight size={13} /></button></header>{recentTasks.length ? <div className="market-recent-list">{recentTasks.map((task) => { const Icon = iconMap[task.icon] || Wrench; return <button key={task.id} onClick={() => onNavigate?.("tasks")}><span className="recent-tool-icon"><Icon size={15} /></span><div><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)}</small></div><span>{formatDate(task.createdAt, locale)}</span></button>; })}</div> : <p className="market-empty-note">{t.noTasksHint}</p>}</article>
      <article className="market-side-upgrade"><Crown size={30} weight="duotone" /><h3>{isEn ? "Unlock more with Pro" : "升级到 Pro"}</h3><p>{isEn ? "8,000 credits every month, priority queue and more concurrency." : "每月获得 8,000 积分，享受优先队列和更多并发。"}</p><button onClick={() => onNavigate?.("billing")}>{isEn ? "View plans" : "查看会员方案"}</button></article>
    </aside>
  </div>;
}

function Runtime({ data, dashboard, tasks = [], locale, onRefresh, onNotice, onNavigate }) {
  const t = dictionary[locale];
  const [form, setForm] = useState({ name: "", providerTemplate: "openai", baseUrl: "", modelId: "", apiKey: "" });
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [settingsTool, setSettingsTool] = useState(null);
  const [toolModelDraft, setToolModelDraft] = useState("managed");
  const [runtimeTab, setRuntimeTab] = useState("connections");
  const [connectionQuery, setConnectionQuery] = useState("");
  const [connectionFilter, setConnectionFilter] = useState("all");
  const openConnectionSettings = () => {
    setRuntimeTab("connections");
    if (data.byokEnabled) setShowForm(true);
    else onNotice(isEn ? "Personal model connections are disabled by the administrator." : "管理员尚未开放个人模型连接，请先使用平台托管模型。");
  };
  useEffect(() => {
    if (!showForm && !settingsTool) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setShowForm(false);
      setSettingsTool(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showForm, settingsTool]);
  if (!data) return <Loading locale={locale} />;
  const mutate = async (path, options, success) => {
    setBusy(true);
    try {
      await api(path, options);
      await onRefresh();
      onNotice(success);
      return true;
    } catch {
      onNotice(t.error);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (testResult?.status !== "healthy") return onNotice(t.testRequired);
    const saved = await mutate("/api/model-connections", jsonOptions("POST", form), t.configured);
    if (saved) {
      setForm({ name: "", providerTemplate: "openai", baseUrl: "", modelId: "", apiKey: "" });
      setTestResult(null);
      setShowForm(false);
    }
  };
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setTestResult(null);
  };
  const updateProvider = (providerTemplate) => {
    setForm((current) => ({ ...current, providerTemplate }));
    setTestResult(null);
  };
  const testDraftConnection = async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await api("/api/model-connections/validate", jsonOptions("POST", form));
      setTestResult(result);
      onNotice(result.status === "healthy" ? t.testPassed : `${t.testFailed}：${modelTestLabel(result.status, locale)}`);
    } catch (error) {
      const status = String(error.message || "unavailable").toLowerCase();
      setTestResult({ status });
      onNotice(`${t.testFailed}：${modelTestLabel(status, locale)}`);
    } finally {
      setBusy(false);
    }
  };
  const testSavedConnection = async (connection) => {
    setBusy(true);
    try {
      const result = await api(`/api/model-connections/${connection.id}/test`, { method: "POST" });
      await onRefresh();
      onNotice(result.status === "healthy" ? t.testPassed : `${t.testFailed}：${modelTestLabel(result.status, locale)}`);
    } catch {
      onNotice(t.testFailed);
    } finally {
      setBusy(false);
    }
  };
  const openToolSettings = (tool) => {
    setSettingsTool(tool);
    setToolModelDraft(tool.modelConnectionId || "managed");
  };
  const saveToolSettings = async (event) => {
    event.preventDefault();
    const saved = await mutate(`/api/tools/${settingsTool.id}/model`, jsonOptions("PATCH", {
      modelConnectionId: toolModelDraft,
    }), t.modelRouteSaved);
    if (saved) setSettingsTool(null);
  };
  const orderedTools = [...data.tools].sort(
    (first, second) => Number(second.modelConfigurable) - Number(first.modelConfigurable),
  );
  const isEn = locale === "en";
  const activeConnections = data.connections.filter((item) => item.status === "active");
  const healthyConnections = data.connections.filter((item) => item.lastTestStatus === "healthy");
  const modelTools = orderedTools.filter((tool) => tool.modelRequired);
  const configurableTools = modelTools.filter((tool) => tool.modelConfigurable);
  const recentTasks = tasks.slice(0, 4);
  const runtimeMetrics = [
    [isEn ? "Model connections" : "模型连接", data.connections.length + (data.managed.configured ? 1 : 0), PlugsConnected, isEn ? "Configured" : "已配置模型"],
    [isEn ? "Personal models" : "个人模型", activeConnections.length, PlugsConnected],
    [isEn ? "Running tasks" : "运行任务", dashboard?.metrics?.running || 0, ListChecks, isEn ? "Running today" : "今日运行"],
    [isEn ? "Completed tasks" : "已完成任务", dashboard?.metrics?.completed || 0, CheckCircle, isEn ? "Total tasks" : "总任务数"],
  ];
  const tabs = [
    ["connections", isEn ? "Model connections" : "模型连接管理"],
    ["routing", isEn ? "Tool routing" : "工具配置"],
    ["monitoring", isEn ? "Runtime monitor" : "运行监控"],
  ];
  const visibleConnections = data.connections.filter((connection) => {
    const query = connectionQuery.trim().toLowerCase();
    const matchesQuery = !query || [connection.name, connection.modelId, connection.baseUrl].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesFilter = connectionFilter === "all" || (connectionFilter === "healthy" ? connection.lastTestStatus === "healthy" : connection.status === connectionFilter);
    return matchesQuery && matchesFilter;
  });
  const connectionRows = <div className="runtime-connection-list">
    <article className="runtime-managed-row"><span className="runtime-model-logo"><img src="/brand/oneshowtools-mark-192.png" alt="" /></span><div><h3>OneShowModel <small>{isEn ? "Official" : "官方"}</small></h3><p>{t.managedDescription}</p><span className={data.managed.configured ? "runtime-connected" : "runtime-disconnected"}><CheckCircle size={13} weight="fill" />{data.managed.configured ? t.runtimeReady : t.notConfigured}</span></div><strong>{isEn ? "Default" : "默认"}</strong></article>
    {visibleConnections.map((connection) => <article className="runtime-connection-row" key={connection.id}><span className="connection-icon"><PlugsConnected size={20} /></span><div className="connection-copy"><h3>{connection.name} <small>{isEn ? "Custom" : "自定义模型"}</small></h3><p>{isEn ? "Model" : "模型"}：{connection.modelId}</p><small className="connection-endpoint">{connection.baseUrl}</small></div><span className={connection.lastTestStatus === "healthy" ? "runtime-connected" : "runtime-disconnected"}><span className={`connection-state ${connection.lastTestStatus === "healthy" ? "active" : connection.status}`} />{modelTestLabel(connection.lastTestStatus, locale)}{connection.lastTestLatencyMs ? ` · ${connection.lastTestLatencyMs}ms` : ""}</span><div className="connection-actions"><button disabled={busy} onClick={() => testSavedConnection(connection)}>{t.testConnection}</button><button disabled={busy} onClick={() => { const apiKey = window.prompt(t.apiKey); if (apiKey) mutate(`/api/model-connections/${connection.id}/rotate`, jsonOptions("POST", { apiKey }), t.configured); }}>{t.rotateKey}</button><button disabled={busy} onClick={() => mutate(`/api/model-connections/${connection.id}`, jsonOptions("PATCH", { status: connection.status === "active" ? "disabled" : "active" }), t.configured)}>{connection.status === "active" ? t.disable : t.enable}</button><button className="danger-link" disabled={busy} onClick={() => mutate(`/api/model-connections/${connection.id}`, { method: "DELETE" }, t.deleteConnection)}>{t.deleteConnection}</button></div></article>)}
    {!visibleConnections.length && <div className="runtime-empty-row"><PlugsConnected size={24} /><div><strong>{connectionQuery || connectionFilter !== "all" ? (isEn ? "No matching connections" : "没有匹配的模型连接") : t.noConnections}</strong><p>{t.connectionsHint}</p></div></div>}
    {data.byokEnabled ? <button className="runtime-add-row" onClick={() => setShowForm(true)}><Plus size={20} /><div><strong>{t.addModel}</strong><small>{isEn ? "OpenAI or Anthropic compatible endpoints" : "支持 OpenAI 或 Anthropic 兼容接口"}</small></div><ArrowRight size={18} /></button> : <div className="runtime-add-row disabled"><ShieldCheck size={20}/><div><strong>{isEn?"Managed models enabled":"已启用平台托管模型"}</strong><small>{isEn?"Personal connections are managed by the administrator.":"个人模型连接暂由管理员统一管理。"}</small></div></div>}
  </div>;
  const managedRouteName = (tool) => {
    if (tool.modelFamily === "music") return "OneShowMusic";
    if (tool.modelFamily === "image") return isEn ? "Platform image model" : "平台图片模型";
    if (tool.modelFamily === "vision") return isEn ? "Platform vision model" : "平台视觉模型";
    return "OneShowModel";
  };
  const routingRows = modelTools.length ? <div className="runtime-routing-list">{modelTools.map((tool) => {
    const selectedConnection = data.connections.find((item) => item.id === tool.modelConnectionId);
    const routeName = tool.modelConfigurable ? (selectedConnection?.name || "OneShowModel") : managedRouteName(tool);
    return <article key={tool.id} className={tool.modelConfigurable ? "configurable" : "managed-specialized"}><ProductToolIcon tool={tool} size={18} compact /><div><strong>{isEn ? tool.nameEn : tool.nameZh}</strong><small>{t.currentModel}：{routeName}</small></div>{tool.modelConfigurable ? <button onClick={() => openToolSettings(tool)}><GearSix size={14} />{t.toolSettings}</button> : <span className="runtime-managed-route"><ShieldCheck size={13} weight="fill" />{isEn ? "Platform managed" : "平台专用模型"}</span>}</article>;
  })}</div> : <div className="runtime-routing-empty"><Sparkle size={24} /><strong>{isEn ? "No model-backed tools are currently available" : "当前暂无需要模型的已上线工具"}</strong></div>;
  const totalTasks = Math.max(Number(dashboard?.metrics?.completed || 0) + Number(dashboard?.metrics?.running || 0), tasks.length);
  const completedTasks = Number(dashboard?.metrics?.completed || 0);
  const runningTasks = Number(dashboard?.metrics?.running || 0);
  const failedTasks = Math.max(0, totalTasks - completedTasks - runningTasks);
  return <div className="runtime-dashboard-layout runtime-v3"><main className="runtime-page">
    <section className="runtime-title-row"><div><span className="runtime-title-badge">Beta</span><h1>{t.runtime}</h1><p>{t.runtimeSub}</p></div><img src="/runtime/oneshow-runtime-platform.webp" alt="" aria-hidden="true" />{data.byokEnabled && <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={18} />{t.addModel}</button>}</section>
    <section className="runtime-metric-strip">{runtimeMetrics.map(([label, value, Icon, hint]) => <article className="surface" key={label}><span><Icon size={18} weight="duotone" /></span><div><small>{label}</small><strong>{Number(value).toLocaleString()}</strong><em>{hint || (isEn ? "Connected" : "已连接")}</em></div></article>)}<article className="surface runtime-status-card"><span><ShieldCheck size={18} weight="duotone" /></span><div><small>{isEn ? "Runtime status" : "运行状态"}</small><strong>{data.managed.configured ? (isEn ? "Normal" : "正常") : t.notConfigured}</strong><em>{data.managed.configured ? (isEn ? "System is healthy" : "系统运行良好") : (isEn ? "Configure the platform model" : "请配置平台模型")}</em></div></article></section>
    <section className="runtime-console surface"><nav className="runtime-tabs">{tabs.map(([id, label]) => <button className={runtimeTab === id ? "active" : ""} key={id} onClick={() => setRuntimeTab(id)}>{label}</button>)}</nav>
    {runtimeTab === "connections" && <section className="runtime-section runtime-connections-panel"><div className="runtime-section-heading"><div><h2>{isEn ? "My model connections" : "我的模型连接"}</h2><p>{isEn ? "Connect model services and choose the runtime source for tools." : "接入你的模型服务，并自由设置工具的运行来源。"}</p></div><div className="runtime-connection-filters"><label><MagnifyingGlass size={15} /><input value={connectionQuery} onChange={(event) => setConnectionQuery(event.target.value)} placeholder={isEn ? "Search models" : "搜索模型名称"} /></label><select value={connectionFilter} onChange={(event) => setConnectionFilter(event.target.value)}><option value="all">{isEn ? "All statuses" : "全部状态"}</option><option value="healthy">{isEn ? "Healthy" : "运行正常"}</option><option value="active">{isEn ? "Active" : "已启用"}</option><option value="disabled">{isEn ? "Disabled" : "已停用"}</option></select></div></div>{connectionRows}</section>}
    {runtimeTab === "routing" && <section className="runtime-section"><div className="runtime-section-heading"><div><h2>{t.toolRouting}</h2><p>{t.toolRoutingHint}</p></div><span>{modelTools.length} {isEn ? `model tools · ${configurableTools.length} configurable` : `个模型工具 · ${configurableTools.length} 个支持自定义`}</span></div><div className="runtime-routing-note"><ShieldCheck size={16} /><span>{isEn ? "Text and SEO tools can use your OpenAI/Anthropic-compatible connection. Image, music and vision tools use protocol-compatible platform models." : "文本与 SEO 工具可使用你的 OpenAI/Anthropic 兼容模型；图片、音乐和视觉工具使用协议匹配的平台专用模型。"}</span></div>{routingRows}</section>}
    {runtimeTab === "monitoring" && <section className="runtime-monitor-grid">{runtimeMetrics.map(([label, value, Icon]) => <article className="surface" key={label}><span><Icon size={22} weight="duotone" /></span><small>{label}</small><strong>{Number(value).toLocaleString()}</strong></article>)}</section>}
    <div className="runtime-security-note"><ShieldCheck size={18} weight="fill" /><span>{t.keyPrivacy}</span></div></section>
    {showForm && <div className="runtime-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="runtime-dialog surface" role="dialog" aria-modal="true" aria-labelledby="runtime-dialog-title"><header><div><span className="runtime-dialog-icon"><PlugsConnected size={21} /></span><div><h2 id="runtime-dialog-title">{t.addModel}</h2><p>{t.keyPrivacy}</p></div></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label={t.close}><X size={19} /></button></header><form className="connection-form" onSubmit={submit}><label><span>{t.connectionName}</span><input autoFocus required maxLength={80} value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label><label><span>{t.providerTemplate}</span><select value={form.providerTemplate} onChange={(event) => updateProvider(event.target.value)}><option value="" disabled>{t.providerTemplate}</option>{data.supportedTemplates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="connection-base-url"><span>{t.baseUrl}</span><input required type="url" placeholder={t.baseUrlPlaceholder} value={form.baseUrl} onChange={(event) => updateForm("baseUrl", event.target.value)} /></label><label><span>{t.model}</span><input required value={form.modelId} onChange={(event) => updateForm("modelId", event.target.value)} /></label><label><span>{t.apiKey}</span><input required type="password" autoComplete="new-password" value={form.apiKey} onChange={(event) => updateForm("apiKey", event.target.value)} /></label>{testResult && <div className={`connection-test-result ${testResult.status === "healthy" ? "success" : "error"}`}><span>{testResult.status === "healthy" ? <CheckCircle size={17} weight="fill" /> : <Warning size={17} weight="fill" />}</span><strong>{modelTestLabel(testResult.status, locale)}</strong>{testResult.latencyMs ? <small>{testResult.latencyMs}ms</small> : null}</div>}<footer><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t.close}</button><button type="button" className="secondary-button" disabled={busy || !form.name || !form.baseUrl || !form.modelId || !form.apiKey} onClick={testDraftConnection}>{busy ? <SpinnerGap className="spin" size={17} /> : <PlugsConnected size={17} />}{busy ? t.testingConnection : t.testBeforeSave}</button><button className="primary-button" disabled={busy || testResult?.status !== "healthy"}>{busy ? <SpinnerGap className="spin" size={18} /> : <LockKey size={18} />}{t.saveConnection}</button></footer></form></div></div>}
    {settingsTool && <div className="runtime-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsTool(null); }}><div className="runtime-dialog tool-settings-dialog surface" role="dialog" aria-modal="true" aria-labelledby="tool-settings-title"><header><div><span className="runtime-dialog-icon"><GearSix size={21} /></span><div><h2 id="tool-settings-title">{locale === "en" ? settingsTool.nameEn : settingsTool.nameZh} · {t.toolSettings}</h2><p>{t.toolSettingsHint}</p></div></div><button className="icon-button" onClick={() => setSettingsTool(null)} aria-label={t.close}><X size={19} /></button></header><form className="tool-settings-form" onSubmit={saveToolSettings}><label><span>{t.selectModel}</span><select autoFocus value={toolModelDraft} onChange={(event) => setToolModelDraft(event.target.value)}><option value="managed">{t.useManaged}</option>{data.connections.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.keyHint}</option>)}</select></label><div className="tool-settings-default"><Sparkle size={19} weight="fill" /><div><strong>OneShowModel</strong><small>{t.managedDescription}</small></div></div><footer><button type="button" className="secondary-button" onClick={() => setSettingsTool(null)}>{t.close}</button><button className="primary-button" disabled={busy}><Check size={17} />{t.saveSettings}</button></footer></form></div></div>}
  </main><aside className="runtime-side">
    <article className="runtime-guide surface"><h2>{isEn ? "Quick setup guide" : "快速接入指南"}</h2>{[[isEn ? "Add a model connection" : "添加模型连接", isEn ? "Connect your API key and endpoint" : "连接你的 API Key 或自定义接口"],[isEn ? "Configure tool models" : "配置工具模型", isEn ? "Choose the right model for each tool" : "为每个工具选择合适的模型"],[isEn ? "Start using tools" : "开始使用", isEn ? "Run real AI tasks from the marketplace" : "从工具市场运行真实 AI 任务"]].map(([title, body], index) => <div key={title}><span>{index + 1}</span><p><strong>{title}</strong><small>{body}</small></p></div>)}<button onClick={openConnectionSettings}>{data.byokEnabled ? (isEn ? "Open connection settings" : "进入连接设置") : (isEn ? "View managed runtime" : "查看托管运行环境")}<ArrowRight size={14} /></button></article>
    <article className="runtime-side-monitor runtime-task-distribution surface"><header><h2>{isEn ? "Runtime monitor" : "运行监控"}</h2><button onClick={() => onNavigate?.("tasks")}>{isEn ? "View log" : "查看日志"}<ArrowRight size={13} /></button></header><div className="runtime-task-total"><ChartBar size={76} weight="duotone" /><span><strong>{totalTasks.toLocaleString()}</strong><small>{isEn ? "Total tasks" : "总任务"}</small></span></div><ul><li><i className="success" />{isEn ? "Success" : "成功"}<strong>{completedTasks.toLocaleString()}</strong></li><li><i className="running" />{isEn ? "Running" : "运行中"}<strong>{runningTasks.toLocaleString()}</strong></li><li><i className="failed" />{isEn ? "Failed" : "失败"}<strong>{failedTasks.toLocaleString()}</strong></li></ul></article>
    <article className="runtime-side-recent surface"><header><h2>{t.recentTasks}</h2><button onClick={() => onNavigate?.("tasks")}>{isEn ? "View all" : "查看全部"}<ArrowRight size={13} /></button></header>{recentTasks.length ? recentTasks.map((task) => <button key={task.id} onClick={() => onNavigate?.("tasks")}><span className={`dot ${task.status}`} /><div><strong>{isEn ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)} · {formatDate(task.createdAt, locale)}</small></div></button>) : <p>{t.noTasksHint}</p>}</article>
  </aside></div>;
}

function Credits({ data, user, billing, tasks = [], locale, onNavigate }) {
  const t = dictionary[locale];
  const [kind, setKind] = useState("all");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);
  if (!data) return <Loading locale={locale} />;
  const isEn = locale === "en";
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const periodStart = period === "7" ? Date.now() - 7 * 86400000 : period === "30" ? Date.now() - 30 * 86400000 : 0;
  const matchingLedger = data.ledger.filter((entry) => {
    if (kind === "earned" && entry.amount <= 0) return false;
    if (kind === "spent" && entry.amount >= 0) return false;
    return entry.createdAt >= periodStart;
  });
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(matchingLedger.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const monthlySpent = Math.abs(data.ledger.filter((entry) => entry.amount < 0 && entry.createdAt >= startOfMonth).reduce((sum, entry) => sum + entry.amount, 0));
  const monthlyEarned = data.ledger.filter((entry) => entry.amount > 0 && entry.createdAt >= startOfMonth).reduce((sum, entry) => sum + entry.amount, 0);
  const todaySpent = Math.abs(data.ledger.filter((entry) => entry.amount < 0 && entry.createdAt >= startOfDay).reduce((sum, entry) => sum + entry.amount, 0));
  let running = data.balance;
  const ledgerWithBalance = data.ledger.map((entry) => { const item = { ...entry, balanceAfter: running }; running -= entry.amount; return item; });
  const visibleLedger = ledgerWithBalance.filter((entry) => matchingLedger.some((match) => match.id === entry.id)).slice((safePage - 1) * pageSize, safePage * pageSize);
  const recentTasks = tasks.slice(0, 4);
  const planName = billing?.subscription ? (isEn ? billing.subscription.nameEn : billing.subscription.nameZh) : t.free;
  const copy = isEn ? {
    title: "Credits center", badge: "Credits", subtitle: "Every credit grant and charge is recorded in your traceable account ledger.", details: "Credit ledger", topup: "Top up", monthSpent: "Spent this month", monthEarned: "Earned this month", entries: "Ledger entries", todaySpent: "Spent today", all: "All types", earned: "Earned", spent: "Spent", allTime: "All time", days7: "Last 7 days", days30: "Last 30 days", type: "Type", source: "Source", account: "Credit account", plan: "Current plan", needMore: "Need more credits?", needMoreBody: "Top up credits or choose a monthly membership for recurring credits.", quick: "Quick actions", tasks: "Recent usage", viewAll: "View all", empty: "No ledger entries match these filters.", unknownSource: "Account ledger",
  } : {
    title: "积分中心", badge: "Credits", subtitle: "每一份创作都值得被支持，所有积分获取与消耗均记录在真实账本中。", details: "积分明细", topup: "充值积分", monthSpent: "本月消耗", monthEarned: "本月获得", entries: "流水笔数", todaySpent: "今日消耗", all: "全部类型", earned: "获得", spent: "消耗", allTime: "全部时间", days7: "最近 7 天", days30: "最近 30 天", type: "类型", source: "来源", account: "积分账户", plan: "当前方案", needMore: "积分不够用？", needMoreBody: "充值积分或选择月度会员，持续获得创作额度。", quick: "快捷操作", tasks: "最近使用", viewAll: "查看全部", empty: "当前筛选条件下没有积分流水。", unknownSource: "账户账本",
  };
  const sourceLabel = (entry) => {
    const known = { task: isEn ? "Tool task" : "工具任务", user: isEn ? "Account" : "账户", billing: isEn ? "Billing" : "充值", subscription: isEn ? "Membership" : "会员", admin: isEn ? "Admin adjustment" : "管理员调整", qa: isEn ? "QA" : "测试" };
    return known[entry.referenceType] || entry.referenceType || copy.unknownSource;
  };
  return <div className="credits-dashboard-layout"><main className="credits-page">
    <section className="credits-title-row"><div><h1>{copy.title}</h1><span className="credits-title-badge">{copy.badge}</span><p>{copy.subtitle}</p></div><div><button className="secondary-button" onClick={() => document.getElementById("credit-ledger")?.scrollIntoView({ behavior: "smooth" })}><Receipt size={17} />{copy.details}</button><button className="primary-button" onClick={() => onNavigate?.("billing")}><Coins size={17} weight="fill" />{copy.topup}</button></div></section>
    <section className="credits-summary surface"><article className="credits-balance-card"><div><small>{t.creditsBalance}</small><strong>{data.balance.toLocaleString()}</strong><span>Credits</span></div><img src="/credits/credits-coin-stack.webp" alt="" aria-hidden="true" /></article>{[[copy.monthSpent,monthlySpent,ArrowDown,"spent"],[copy.monthEarned,monthlyEarned,ArrowUp,"earned"],[copy.entries,data.ledger.length,ListChecks,"entries"],[copy.todaySpent,todaySpent,ChartBar,"today"]].map(([label,value,Icon,tone]) => <article className={`credits-summary-metric ${tone}`} key={label}><div><small>{label}</small><strong>{Number(value).toLocaleString()}</strong><span>{tone === "entries" ? copy.details : "Credits"}</span></div><i><Icon size={20} weight="bold" /></i></article>)}</section>
    <section className="credits-ledger-section" id="credit-ledger"><header><h2>{t.ledger}</h2><div><label><Funnel size={15} /><select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="all">{copy.all}</option><option value="earned">{copy.earned}</option><option value="spent">{copy.spent}</option></select></label><label><CalendarBlank size={15} /><select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}><option value="all">{copy.allTime}</option><option value="7">{copy.days7}</option><option value="30">{copy.days30}</option></select></label></div></header><div className="surface credits-ledger-table"><div className="credits-ledger-head"><span>{copy.type}</span><span>{t.description}</span><span>{t.time}</span><span>{t.amount}</span><span>{t.balance}</span><span>{copy.source}</span></div>{visibleLedger.map((entry) => <div className="credits-ledger-row" key={entry.id}><span><b className={entry.amount > 0 ? "earned" : "spent"}>{entry.amount > 0 ? copy.earned : copy.spent}</b></span><strong>{isEn ? entry.descriptionEn : entry.descriptionZh}</strong><time>{formatDate(entry.createdAt, locale)}</time><em className={entry.amount > 0 ? "positive" : "negative"}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()}</em><span>{entry.balanceAfter.toLocaleString()}</span><span>{sourceLabel(entry)}</span></div>)}{!visibleLedger.length && <div className="credits-ledger-empty"><Receipt size={22} /><span>{copy.empty}</span></div>}<footer><button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft size={15} /></button><span>{safePage} / {pageCount}</span><button disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ArrowRight size={15} /></button></footer></div></section>
  </main><aside className="credits-side"><article className="credits-account-card surface"><span className="credits-avatar">{user?.name?.slice(0,1).toUpperCase() || "U"}</span><h2>{user?.name}</h2><p>{user?.email}</p><div><small>{t.creditsBalance}</small><strong><Coins size={17} weight="duotone" />{data.balance.toLocaleString()} Credits</strong></div><div><small>{copy.plan}</small><strong><Crown size={17} weight="duotone" />{planName}</strong></div></article><article className="credits-topup-card"><div><h2>{copy.needMore}</h2><p>{copy.needMoreBody}</p><button onClick={() => onNavigate?.("billing")}>{copy.topup}</button></div><img src="/credits/credits-wallet.webp" alt="" aria-hidden="true" /></article><article className="credits-quick-card surface"><h2>{copy.quick}</h2><button onClick={() => document.getElementById("credit-ledger")?.scrollIntoView({ behavior: "smooth" })}><Receipt size={16} />{copy.details}<ArrowRight size={14} /></button><button onClick={() => onNavigate?.("billing")}><Coins size={16} />{copy.topup}<ArrowRight size={14} /></button><button onClick={() => onNavigate?.("tasks")}><ListChecks size={16} />{t.tasks}<ArrowRight size={14} /></button></article><article className="credits-recent-card surface"><header><h2>{copy.tasks}</h2><button onClick={() => onNavigate?.("tasks")}>{copy.viewAll}<ArrowRight size={13} /></button></header>{recentTasks.length ? recentTasks.map((task) => <button key={task.id} onClick={() => onNavigate?.("tasks")}><span className={`dot ${task.status}`} /><div><strong>{isEn ? task.toolNameEn : task.toolNameZh}</strong><small>{formatDate(task.createdAt,locale)}</small></div></button>) : <p>{t.noTasksHint}</p>}</article></aside></div>;
}

function Billing({ plans, status, credits, user, tasks = [], locale, onCheckout, onPortal, onNavigate }) {
  const t = dictionary[locale];
  const [billingMode, setBillingMode] = useState("topup");
  const [showLedger, setShowLedger] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [qrPayment, setQrPayment] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  useEffect(() => {
    if (!qrPayment?.orderId) return undefined;
    const timer = setInterval(async () => {
      try {
        const result = await api(`/api/billing/orders/${encodeURIComponent(qrPayment.orderId)}`);
        if (result.order?.status === "paid") location.assign("/?view=plans&billing=success");
        if (["failed", "cancelled", "expired"].includes(result.order?.status)) setQrPayment(null);
      } catch { /* transient polling errors do not alter payment state */ }
    }, 2500);
    return () => clearInterval(timer);
  }, [qrPayment?.orderId]);
  if (!status) return <Loading locale={locale} />;
  const isEn = locale === "en";
  const copy = isEn ? {
    title: "Credits & membership", subtitle: "Top up when you need more, or subscribe for monthly credits and advanced access.",
    topup: "Credit top-ups", topupSub: "One-time purchase · Credits never expire", membership: "Monthly membership", membershipSub: "Monthly credits plus capability upgrades",
    credits: "base credits", bonus: "bonus", total: "credits received", buy: "Buy credits", subscribe: "Choose plan", current: "Current plan", unavailable: "View payment setup details",
    monthlyCredits: "credits / month", perMonth: "/ month", value: "A clear internal reference: approximately 100 credits ≈ ¥1 of tool usage.",
    paymentPending: "Checkout will open after the payment provider is configured. No charge is attempted today.", manage: "Manage billing",
  } : {
    title: "积分与会员", subtitle: "按需充值积分，或订阅会员持续获得月度积分和高级权益。",
    topup: "积分充值", topupSub: "一次购买 · 积分长期有效", membership: "月度会员", membershipSub: "按月购买会员权益，获得月度积分与高级能力",
    credits: "基础积分", bonus: "额外赠送", total: "实际到账", buy: "充值积分", subscribe: "选择会员", current: "当前方案", unavailable: "查看开通说明",
    monthlyCredits: "积分 / 月", perMonth: "/ 月", value: "平台内部价值参考：约 100 积分 ≈ ¥1 的工具使用额度。",
    paymentPending: "当前尚未启用支付通道，不会发起真实扣款。你仍可查看套餐，支付启用后即可购买。", manage: "管理支付",
    paymentNoticeTitle: "支付功能尚未启用", paymentNoticeBody: "当前没有可用的支付宝、微信支付或银行卡通道，因此暂时无法创建订单。支付启用后，这里会自动展示可用的支付方式。", paymentNoticeAction: "我知道了",
  };
  const topups = plans.filter((plan) => plan.kind === "topup");
  const memberships = plans.filter((plan) => plan.kind === "membership");
  const price = (plan) => new Intl.NumberFormat(isEn ? "en-US" : "zh-CN", { style: "currency", currency: plan.currency, maximumFractionDigits: plan.amountMinor % 100 ? 1 : 0 }).format(plan.amountMinor / 100);
  const activeCode = status.subscription?.code || "free";
  const actionLabel = (plan, kind) => {
    if (kind === "membership" && plan.code === activeCode) return copy.current;
    if (!status.configured) return copy.unavailable;
    return kind === "topup" ? copy.buy : copy.subscribe;
  };
  const paymentProviders = status.providers || [];
  const beginCheckout = async (plan, provider) => {
    setCheckoutBusy(true);
    try {
      const result = await onCheckout(plan.id, provider);
      setSelectedPlan(null);
      if (result?.presentation === "qr") setQrPayment({ ...result, plan });
    } finally { setCheckoutBusy(false); }
  };
  const openCheckout = (plan) => {
    if (!status.configured || paymentProviders.length === 0) {
      setPaymentNotice(true);
      return;
    }
    if (paymentProviders.length === 1) beginCheckout(plan, paymentProviders[0].id);
    else setSelectedPlan(plan);
  };
  const selectBillingMode = (mode) => {
    setBillingMode(mode);
    requestAnimationFrame(() => document.getElementById(`billing-${mode === "topup" ? "topups" : "memberships"}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const ledger = credits?.ledger || [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthly = ledger.filter((entry) => entry.createdAt >= monthStart.getTime());
  const monthlySpent = monthly.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const monthlyEarned = monthly.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todaySpent = ledger.filter((entry) => entry.createdAt >= todayStart.getTime() && entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const currentPlan = status.subscription ? (isEn ? status.subscription.nameEn : status.subscription.nameZh) : t.free;
  const recentSpend = ledger.filter((entry) => entry.amount < 0).slice(0,4);
  const billingCopy = isEn ? {
    heading: "Credits & plans", headingSub: "Manage credits and plans in one place, with access to more powerful AI tools.", overview: "Usage this month", monthSpent: "Spent this month", monthEarned: "Earned this month", entries: "Completed tasks", todaySpent: "Spent today", creditsTab: "Credit balance", memberTab: "Plan subscription", creditHint: "Choose the credit pack that fits your workload · One-time purchase and no expiry", account: "Account information", manage: "Manage subscription", accountSettings: "Account settings", needMore: "Need more credits?", needMoreBody: "Top up credits to unlock more tools and services.", reasons: "Why choose credits?", durable: "Flexible across tools", durableSub: "Use one balance across supported AI tools", secure: "Secure & traceable", secureSub: "Every charge is recorded in your ledger", value: "Better value", valueSub: "Higher packs include additional credits", recent: "Recent charges", noSpend: "No recent credit charges", details: "Credit ledger", choosePlan: "Choose the right plan", benefits: "Plan benefits", allTools: "Access supported AI tools", priority: "Priority task processing", largerFiles: "Larger file support", ledgerTitle: "Credit ledger", closeLedger: "Close ledger",
  } : {
    heading: "积分与套餐", headingSub: "管理你的积分与套餐，享受更强大的 AI 工具服务。", overview: "本月使用概览", monthSpent: "本月消耗", monthEarned: "本月获得", entries: "完成任务", todaySpent: "今日消耗", creditsTab: "积分余额", memberTab: "套餐订阅", creditHint: "选择适合你的积分套餐 · 一次购买，长期有效", account: "账户信息", manage: "管理订阅", accountSettings: "进入账户设置", needMore: "积分不够用？", needMoreBody: "充值积分，即时享受强大工具能力。", reasons: "为什么选择积分？", durable: "灵活通用", durableSub: "适用于所有已接入的 AI 工具和服务", secure: "安全可靠", secureSub: "每次消耗均有清晰账本记录", value: "性价比高", valueSub: "按需使用，避免资源浪费", recent: "最近消费", noSpend: "暂无积分消费记录", details: "积分明细", choosePlan: "选择适合你的套餐", benefits: "套餐权益对比", allTools: "全平台 AI 工具可用", priority: "更快的任务处理优先级", largerFiles: "支持更大文件与导出", ledgerTitle: "积分明细", closeLedger: "收起明细",
  };
  return <div className="billing-dashboard-layout"><main className="billing-page">
    <section className="billing-heading"><div><h1>{billingCopy.heading}</h1><p>{billingCopy.headingSub}</p></div></section>
    <section className="billing-overview surface"><article className="billing-credit-balance"><div><small>{t.creditsBalance}</small><strong>{(credits?.balance || 0).toLocaleString()}</strong><span>Credits</span></div><img src="/credits/credits-coin-stack.webp" alt="" aria-hidden="true" /></article><div className="billing-overview-body"><header><strong>{billingCopy.overview}</strong><span>{monthStart.toLocaleDateString(isEn ? "en-US" : "zh-CN",{month:"2-digit",day:"2-digit"})} - {new Date().toLocaleDateString(isEn ? "en-US" : "zh-CN",{month:"2-digit",day:"2-digit"})}</span></header><div>{[[billingCopy.monthSpent,monthlySpent],[billingCopy.monthEarned,monthlyEarned],[billingCopy.entries,tasks.filter((task) => task.status === "completed").length],[billingCopy.todaySpent,todaySpent]].map(([label,value]) => <article key={label}><small>{label}</small><strong>{Number(value).toLocaleString()}</strong><span>{label === billingCopy.entries ? (isEn ? "tasks" : "次") : "Credits"}</span></article>)}</div></div><div className="billing-overview-actions"><button className="secondary-button" onClick={() => setShowLedger((value) => !value)}><Receipt size={16} />{showLedger ? billingCopy.closeLedger : billingCopy.details}</button><button className="primary-button" onClick={() => selectBillingMode("topup")}><Coins size={16} weight="fill" />{copy.topup}</button></div></section>
    {showLedger && <section className="billing-inline-ledger surface" aria-label={billingCopy.ledgerTitle}><header><h2>{billingCopy.ledgerTitle}</h2><button className="text-button" onClick={() => setShowLedger(false)}>{billingCopy.closeLedger}</button></header>{ledger.length ? <div>{ledger.slice(0,10).map((entry) => <article key={entry.id}><div><strong>{isEn ? entry.descriptionEn : entry.descriptionZh}</strong><small>{formatDate(entry.createdAt,locale)}</small></div><em className={entry.amount > 0 ? "positive" : "negative"}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()}</em></article>)}</div> : <p>{billingCopy.noSpend}</p>}</section>}
    {!status.configured && <div className="billing-channel pending"><ShieldCheck size={17} weight="fill" /><span>{copy.paymentPending}</span></div>}
    <nav className="billing-plan-tabs" role="tablist" aria-label={isEn ? "Billing option" : "计费方式"}><button id="billing-tab-topup" role="tab" aria-controls="billing-topups" className={billingMode === "topup" ? "active" : ""} aria-selected={billingMode === "topup"} onClick={() => selectBillingMode("topup")}><Lightning size={18} weight="fill" />{billingCopy.creditsTab}</button><button id="billing-tab-membership" role="tab" aria-controls="billing-memberships" className={billingMode === "membership" ? "active" : ""} aria-selected={billingMode === "membership"} onClick={() => selectBillingMode("membership")}><Crown size={18} weight="fill" />{billingCopy.memberTab}</button></nav>
    {billingMode === "topup" && <section className="billing-section" id="billing-topups" role="tabpanel" aria-labelledby="billing-tab-topup"><header><div><h2>{billingCopy.choosePlan}</h2><p>{billingCopy.creditHint}</p></div><span className="billing-value-note">{copy.value}</span></header><div className="topup-grid">{topups.map((plan) => <article className={`topup-card surface ${plan.code === "pro-topup" ? "featured" : ""}`} key={plan.id}><div className="topup-card-head"><span className="plan-badge">{isEn ? plan.badgeEn : plan.badgeZh}</span>{plan.code === "pro-topup" && <CheckCircle size={18} weight="fill" />}</div><h3>{isEn ? plan.nameEn : plan.nameZh}</h3><strong className="billing-price">{price(plan)}</strong><dl><div><dt><Coins size={13} />{copy.credits}</dt><dd>{plan.recurringCredits.toLocaleString()}</dd></div><div><dt><Gift size={13} />{copy.bonus}</dt><dd className={plan.bonusCredits ? "positive" : ""}>+{plan.bonusCredits.toLocaleString()}</dd></div></dl><div className="topup-total"><span>{copy.total}</span><strong>{plan.totalCredits.toLocaleString()}</strong></div><button className={plan.code === "pro-topup" ? "primary-button full" : "secondary-button full"} onClick={() => openCheckout(plan)}>{actionLabel(plan, "topup")}</button></article>)}</div></section>}
    {billingMode === "membership" && <section className="billing-section" id="billing-memberships" role="tabpanel" aria-labelledby="billing-tab-membership"><header><div><span className="billing-section-icon membership"><Crown size={18} weight="fill" /></span><div><h2>{billingCopy.memberTab}</h2><p>{copy.membershipSub}</p></div></div></header><div className="membership-grid">{memberships.map((plan) => { const active = plan.code === activeCode; return <article className={`membership-card surface ${plan.code === "pro-monthly" ? "featured" : ""} ${active ? "active" : ""}`} key={plan.id}>{plan.code === "pro-monthly" && <span className="membership-ribbon">{isEn ? plan.badgeEn : plan.badgeZh}</span>}<div className="membership-card-head"><div><span>{isEn ? plan.badgeEn : plan.badgeZh}</span><h3>{isEn ? plan.nameEn : plan.nameZh}</h3></div><span className={`membership-mark ${plan.code}`}><Crown size={22} weight="duotone" /></span></div><strong className="membership-price">{price(plan)}<small>{copy.perMonth}</small></strong><div className="membership-credits"><Coins size={18} weight="duotone" /><strong>{plan.recurringCredits.toLocaleString()}</strong><span>{copy.monthlyCredits}</span></div><ul>{(isEn ? plan.benefitsEn : plan.benefitsZh).map((benefit) => <li key={benefit}><CheckCircle size={15} weight="fill" />{benefit}</li>)}</ul><button className={plan.code === "pro-monthly" ? "primary-button full" : "secondary-button full"} disabled={active || plan.amountMinor === 0} onClick={() => openCheckout(plan)}>{actionLabel(plan, "membership")}</button></article>; })}</div></section>}
    <section className="billing-benefits surface"><h2>{billingCopy.benefits}</h2><div>{[[SquaresFour,billingCopy.allTools],[RocketLaunch,billingCopy.priority],[FolderOpen,billingCopy.largerFiles],[ShieldCheck,billingCopy.secure]].map(([Icon,label]) => <article key={label}><span><Icon size={18} weight="duotone" /></span><strong>{label}</strong></article>)}</div></section>
  </main><aside className="billing-side"><article className="billing-account surface"><h2>{billingCopy.account}</h2><span className="credits-avatar">{user?.name?.slice(0,1).toUpperCase() || "U"}</span><h3>{user?.name}</h3><p>{user?.email}</p><strong><Crown size={15} weight="fill" />{currentPlan}</strong><button onClick={() => onNavigate?.("settings")}>{billingCopy.accountSettings}</button>{status.subscription?.provider === "stripe" ? <button className="billing-account-manage" onClick={onPortal}>{billingCopy.manage}</button> : null}</article><article className="billing-side-topup"><div><h2>{billingCopy.needMore}</h2><p>{billingCopy.needMoreBody}</p><button onClick={() => selectBillingMode("topup")}>{copy.topup}</button></div><img src="/credits/credits-wallet.webp" alt="" aria-hidden="true" /></article><article className="billing-reasons surface"><h2>{billingCopy.reasons}</h2>{[[ArrowsClockwise,billingCopy.durable,billingCopy.durableSub],[ShieldCheck,billingCopy.secure,billingCopy.secureSub],[ChartLineUp,billingCopy.value,billingCopy.valueSub]].map(([Icon,title,body]) => <div key={title}><span><Icon size={16} weight="duotone" /></span><p><strong>{title}</strong><small>{body}</small></p></div>)}</article><article className="billing-recent surface"><header><h2>{billingCopy.recent}</h2><button onClick={() => setShowLedger(true)}>{billingCopy.details}<ArrowRight size={13} /></button></header>{recentSpend.length ? recentSpend.map((entry) => <div key={entry.id}><p><strong>{isEn ? entry.descriptionEn : entry.descriptionZh}</strong><small>{formatDate(entry.createdAt,locale)}</small></p><em>{entry.amount.toLocaleString()}</em></div>) : <p className="account-empty">{billingCopy.noSpend}</p>}</article></aside>
  {paymentNotice && <div className="modal-backdrop"><section className="payment-method-dialog surface" role="dialog" aria-modal="true" aria-labelledby="payment-notice-title"><button className="modal-close icon-button" aria-label={isEn ? "Close" : "关闭"} onClick={() => setPaymentNotice(false)}><X size={20} /></button><ShieldCheck size={30} weight="duotone" /><h2 id="payment-notice-title">{copy.paymentNoticeTitle || "Payment is not available yet"}</h2><p>{copy.paymentNoticeBody || copy.paymentPending}</p><button className="primary-button full" onClick={() => setPaymentNotice(false)}>{copy.paymentNoticeAction || (isEn ? "Got it" : "我知道了")}</button></section></div>}
  {selectedPlan && <div className="modal-backdrop"><section className="payment-method-dialog surface"><button className="modal-close icon-button" onClick={() => setSelectedPlan(null)}><X size={20} /></button><ShieldCheck size={30} weight="duotone" /><h2>{isEn ? "Choose payment method" : "选择支付方式"}</h2><p>{isEn ? `${isEn ? selectedPlan.nameEn : selectedPlan.nameZh} · ${price(selectedPlan)}` : `${selectedPlan.nameZh} · ${price(selectedPlan)}`}</p><div>{paymentProviders.map((provider) => <button key={provider.id} disabled={checkoutBusy} onClick={() => beginCheckout(selectedPlan, provider.id)}><CreditCard size={21} weight="duotone" /><strong>{provider.id === "alipay" ? "支付宝" : provider.id === "wechat_pay" ? "微信支付" : "银行卡"}</strong><ArrowRight size={17} /></button>)}</div><small>{isEn ? "Credits are granted only after the provider confirms payment." : "支付结果以支付平台的安全通知为准，确认后积分自动到账。"}</small></section></div>}
  {qrPayment && <div className="modal-backdrop"><section className="payment-qr-dialog surface"><button className="modal-close icon-button" onClick={() => setQrPayment(null)}><X size={20} /></button><h2>{isEn ? "Scan with WeChat" : "微信扫码支付"}</h2><p>{qrPayment.plan?.nameZh} · {price(qrPayment.plan)}</p><img src={qrPayment.qrCode} alt={isEn ? "WeChat Pay QR code" : "微信支付二维码"} /><strong>{isEn ? "Waiting for secure payment confirmation…" : "正在等待支付平台安全确认…"}</strong><small>{isEn ? "Do not close this window until payment is confirmed." : "支付完成前请不要关闭窗口，请勿重复支付。"}</small></section></div>}
  </div>;
}

function TaskUsageDonut({ items }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const size = 86;
    canvas.width = size * ratio; canvas.height = size * ratio;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    context.scale(ratio, ratio);
    const actualTotal = items.reduce((sum, item) => sum + item.value, 0);
    const total = actualTotal || 1;
    let start = -Math.PI / 2;
    items.forEach((item) => {
      const angle = (item.value / total) * Math.PI * 2;
      context.beginPath(); context.arc(size / 2, size / 2, 31, start, start + angle);
      context.strokeStyle = item.color; context.lineWidth = 13; context.stroke(); start += angle;
    });
    if (!actualTotal) { context.beginPath(); context.arc(size / 2,size / 2,31,0,Math.PI*2); context.strokeStyle="#e8edf5"; context.lineWidth=13; context.stroke(); }
  }, [items]);
  return <canvas ref={canvasRef} role="img" aria-label="Task usage distribution" />;
}

function Tasks({ tasks, user, credits, billing, locale, onRefresh, onCancel, onDeleteMany, onOpenTask, onNavigate }) {
  const t = { ...dictionary[locale], topup: locale === "en" ? "Top up credits" : "充值积分", viewAll: locale === "en" ? "View all" : "查看全部" };
  const isEn = locale === "en";
  const [statusFilter, setStatusFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const copy = isEn ? {
    subtitle: "View and manage all your AI tasks", all: "All tasks", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled", total: "All tasks", taskInfo: "Task", tool: "Tool", status: "Status", progress: "Progress", created: "Created", action: "Action", allTools: "All tools", allStatus: "All statuses", allTime: "All time", days7: "Last 7 days", days30: "Last 30 days", usage: "Task statistics", common: "Common tools", manageTools: "Manage tools", recent: "Recent tasks", noTasks: "No tasks match these filters.", prompt: "Input", page: "Page", viewAll: "View all", create: "New task", batch: "Bulk actions", cancelSelected: "Cancel selected", deleteSelected: "Delete selected", deleteTask: "Delete task", deleteConfirm: "Remove the selected task records? Generated files and credit history will be kept.", search: "Search tasks or tools", clear: "Clear filters", list: "Task list", tasksUnit: "tasks", selectAll: "Select visible tasks", download: "Download result", open: "View task", refresh: "Refresh", totalTasks: "Total tasks", share: "Share",
  } : {
    subtitle: "查看和管理你的所有 AI 任务", all: "全部任务", running: "运行中", completed: "已完成", failed: "失败", cancelled: "已取消", total: "全部任务", taskInfo: "任务信息", tool: "工具", status: "状态", progress: "进度", created: "创建时间", action: "操作", allTools: "全部工具", allStatus: "全部状态", allTime: "全部时间", days7: "最近 7 天", days30: "最近 30 天", usage: "任务统计", common: "常用工具", manageTools: "管理工具", recent: "最近任务", noTasks: "当前筛选条件下没有任务。", prompt: "输入", page: "页", viewAll: "查看全部", create: "新建任务", batch: "批量操作", cancelSelected: "取消所选任务", deleteSelected: "删除所选任务", deleteTask: "删除任务", deleteConfirm: "确定删除所选任务记录吗？生成文件和积分流水会继续保留。", search: "搜索任务名称或工具", clear: "清空筛选", list: "任务列表", tasksUnit: "个任务", selectAll: "全选当前页", download: "下载结果", open: "查看任务", refresh: "刷新状态", totalTasks: "总任务", share: "占",
  };
  const normalizedStatus = (status) => ["queued","waiting_for_runtime","running"].includes(status) ? "running" : status;
  const counts = tasks.reduce((result,task) => { const key=normalizedStatus(task.status); result[key]=(result[key]||0)+1; return result; },{});
  const tools = [...new Map(tasks.map((task) => [task.toolId,{id:task.toolId,name:isEn ? task.toolNameEn : task.toolNameZh}])).values()];
  const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = tasks.filter((task) => {
    const input = String(task.input?.text || task.input?.prompt || task.input?.topic || task.input?.website || "").toLowerCase();
    const searchable = `${task.toolNameZh || ""} ${task.toolNameEn || ""} ${input}`.toLowerCase();
    return (statusFilter === "all" || normalizedStatus(task.status) === statusFilter)
      && (toolFilter === "all" || task.toolId === toolFilter)
      && task.createdAt >= cutoff
      && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const pageSize = 8;
  const pageCount = Math.max(1,Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page,pageCount);
  const visible = filtered.slice((safePage-1)*pageSize,safePage*pageSize);
  const statusDistribution = [
    { name: copy.completed, value: counts.completed || 0, color: "#32b58c" },
    { name: copy.running, value: counts.running || 0, color: "#3375ef" },
    { name: copy.failed, value: counts.failed || 0, color: "#f05b63" },
    { name: copy.cancelled, value: counts.cancelled || 0, color: "#929db1" },
  ];
  const toolFrequency = [...tasks.reduce((map,task) => {
    const entry = map.get(task.toolId) || { ...task, value: 0 };
    entry.value += 1; map.set(task.toolId,entry); return map;
  },new Map()).values()].sort((a,b)=>b.value-a.value).slice(0,5);
  const recentTasks = tasks.slice(0,5);
  const selectFilter = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const visibleIds = visible.map((task)=>task.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id)=>selectedIds.has(id));
  const toggleTask = (id) => setSelectedIds((current)=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});
  const toggleVisible = () => setSelectedIds((current)=>{const next=new Set(current);visibleIds.forEach((id)=>allVisibleSelected?next.delete(id):next.add(id));return next;});
  const clearFilters = () => { setQuery(""); setToolFilter("all"); setStatusFilter("all"); setPeriod("all"); setPage(1); };
  const cancelSelected = async () => {
    const eligible = tasks.filter((task)=>selectedIds.has(task.id)&&["queued","waiting_for_runtime"].includes(task.status));
    for (const task of eligible) await onCancel(task.id);
    setSelectedIds(new Set());
  };
  const cancellableSelectedCount = tasks.filter((task)=>selectedIds.has(task.id)&&["queued","waiting_for_runtime"].includes(task.status)).length;
  const deletableSelectedIds = tasks.filter((task)=>selectedIds.has(task.id)&&["completed","failed","cancelled"].includes(task.status)).map((task)=>task.id);
  const deleteSelected = async () => {
    if (!deletableSelectedIds.length || !window.confirm(copy.deleteConfirm)) return;
    const result = await onDeleteMany(deletableSelectedIds);
    if (result?.deletedIds?.length) setSelectedIds((current)=>new Set([...current].filter((id)=>!result.deletedIds.includes(id))));
  };
  const progressFor = (task) => {
    if (task.status === "completed") return 100;
    if (!["queued","waiting_for_runtime","running"].includes(task.status)) return null;
    const progress = task.output?.progress;
    if (Number.isFinite(Number(progress?.percent))) return Math.max(0,Math.min(100,Number(progress.percent)));
    if (Number(progress?.total)>0 && Number.isFinite(Number(progress?.completed))) return Math.round((Number(progress.completed)/Number(progress.total))*100);
    return null;
  };
  const percentage = (value) => tasks.length ? Math.round(value / tasks.length * 100) : 0;
  const metricItems = [[copy.total,tasks.length,ListChecks,"all",copy.totalTasks],[copy.running,counts.running||0,SpinnerGap,"running",`${copy.share} ${percentage(counts.running||0)}%`],[copy.completed,counts.completed||0,CheckCircle,"completed",`${copy.share} ${percentage(counts.completed||0)}%`],[copy.failed,counts.failed||0,XCircle,"failed",`${copy.share} ${percentage(counts.failed||0)}%`],[copy.cancelled,counts.cancelled||0,Clock,"cancelled",`${copy.share} ${percentage(counts.cancelled||0)}%`]];
  return <div className="tasks-dashboard-layout"><main className="tasks-page"><section className="tasks-heading"><div><h1>{t.nav.tasks}</h1><p>{copy.subtitle}</p></div><div className="tasks-heading-actions"><button className="primary-button" onClick={()=>onNavigate?.("marketplace")}><Plus size={17}/>{copy.create}</button><button className="secondary-button" disabled={!cancellableSelectedCount} onClick={cancelSelected}><CheckSquare size={16}/>{cancellableSelectedCount?`${copy.cancelSelected} (${cancellableSelectedCount})`:copy.batch}</button><button className="secondary-button danger" disabled={!deletableSelectedIds.length} onClick={deleteSelected}><Trash size={16}/>{deletableSelectedIds.length?`${copy.deleteSelected} (${deletableSelectedIds.length})`:copy.deleteSelected}</button></div></section>
    <nav className="tasks-status-tabs">{[["all",copy.all],["running",copy.running],["completed",copy.completed],["failed",copy.failed],["cancelled",copy.cancelled]].map(([id,label]) => <button className={statusFilter===id?"active":""} key={id} onClick={()=>{setStatusFilter(id);setPage(1);}}>{label}</button>)}</nav>
    <section className="surface tasks-console"><div className="tasks-filter-bar"><label className="tasks-search"><MagnifyingGlass size={15}/><input value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} placeholder={copy.search}/></label><label><select value={toolFilter} onChange={selectFilter(setToolFilter)}><option value="all">{copy.allTools}</option>{tools.map((tool)=><option key={tool.id} value={tool.id}>{tool.name}</option>)}</select><CaretDown size={14}/></label><label><select value={statusFilter} onChange={selectFilter(setStatusFilter)}><option value="all">{copy.allStatus}</option><option value="running">{copy.running}</option><option value="completed">{copy.completed}</option><option value="failed">{copy.failed}</option><option value="cancelled">{copy.cancelled}</option></select><CaretDown size={14}/></label><label><CalendarBlank size={14}/><select value={period} onChange={selectFilter(setPeriod)}><option value="all">{copy.allTime}</option><option value="7">{copy.days7}</option><option value="30">{copy.days30}</option></select></label><button onClick={clearFilters}>{copy.clear}</button></div>
      <section className="tasks-metrics">{metricItems.map(([label,value,Icon,tone,detail]) => <article key={label}><div><small>{label}</small><strong>{Number(value).toLocaleString()}</strong><span>{detail}</span></div><i className={tone}><Icon size={20} weight="duotone" /></i></article>)}</section>
      <section className="tasks-list"><header><div><strong>{copy.list}</strong><span>（{filtered.length} {copy.tasksUnit}）</span></div><button onClick={onRefresh}><ArrowClockwise size={15}/>{copy.refresh}</button></header><div className="tasks-table-head"><label className="task-check"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label={copy.selectAll}/><span/></label><span>{copy.taskInfo}</span><span>{copy.tool}</span><span>{copy.status}</span><span>{copy.progress}</span><span>{copy.created}</span><span>{copy.action}</span></div>{visible.map((task) => { const input=String(task.input?.text || task.input?.prompt || task.input?.topic || task.input?.website || "").trim(); const progress=progressFor(task); return <article className={selectedIds.has(task.id)?"selected":""} key={task.id}><label className="task-check"><input type="checkbox" checked={selectedIds.has(task.id)} onChange={()=>toggleTask(task.id)} aria-label={`${copy.taskInfo}: ${isEn?task.toolNameEn:task.toolNameZh}`}/><span/></label><div className="task-primary" role="button" tabIndex="0" onClick={()=>onOpenTask(task)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ") onOpenTask(task);}}><ProductToolIcon tool={task} compact size={19}/><span><strong>{isEn?task.toolNameEn:task.toolNameZh}</strong><small>{input || (task.file?.name ?? task.id)}</small></span></div><span className="task-tool-name">{isEn?task.toolNameEn:task.toolNameZh}</span><StatusPill status={task.status} locale={locale}/><div className="task-progress">{progress===null?<span>—</span>:<><strong>{progress}%</strong><i><b style={{width:`${progress}%`}}/></i></>}</div><time>{formatDate(task.createdAt,locale)}</time><div className="tasks-row-actions"><button title={copy.open} onClick={()=>onOpenTask(task)}><Eye size={16}/></button>{task.file&&<a href={task.file.downloadUrl} title={copy.download}><DownloadSimple size={16}/></a>}{["queued","waiting_for_runtime"].includes(task.status)&&<button title={copy.cancelled} onClick={()=>onCancel(task.id)}><X size={16}/></button>}</div></article>;})}{!visible.length && <div className="tasks-empty"><ListChecks size={24}/><span>{copy.noTasks}</span></div>}<footer><span>{filtered.length.toLocaleString()} {copy.tasksUnit}</span><div><button disabled={safePage<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))}><ArrowLeft size={15}/></button><strong>{safePage}</strong><span>/ {pageCount} {copy.page}</span><button disabled={safePage>=pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}><ArrowRight size={15}/></button></div></footer></section>
    </section>
  </main><aside className="tasks-side"><article className="tasks-usage surface"><header><h2>{copy.usage}</h2><button onClick={onRefresh}>{t.viewAll}<ArrowRight size={13}/></button></header><div className="tasks-donut-wrap"><div><TaskUsageDonut items={statusDistribution}/><strong>{tasks.length}</strong><small>{copy.totalTasks}</small></div><ul>{statusDistribution.map((item)=><li key={item.name}><i style={{background:item.color}}/><span>{item.name}</span><strong>{item.value} <small>({tasks.length?Math.round(item.value/tasks.length*100):0}%)</small></strong></li>)}</ul></div></article><article className="tasks-common surface"><header><h2>{copy.common}</h2><button onClick={()=>onNavigate?.("marketplace")}>{copy.manageTools}<ArrowRight size={13}/></button></header>{toolFrequency.length?toolFrequency.map((task)=><button key={task.toolId} onClick={()=>onOpenTask(task)}><ProductToolIcon tool={task} compact size={15}/><strong>{isEn?task.toolNameEn:task.toolNameZh}</strong><span>{task.value}</span></button>):<p className="account-empty">{t.noTasksHint}</p>}</article><article className="tasks-recent surface"><header><h2>{copy.recent}</h2><button onClick={()=>onNavigate?.("recent")}>{copy.viewAll}<ArrowRight size={13}/></button></header>{recentTasks.length?recentTasks.map((task)=><button key={task.id} onClick={()=>onOpenTask(task)}><ProductToolIcon tool={task} compact size={14}/><span><strong>{isEn?task.toolNameEn:task.toolNameZh}</strong><small>{statusLabel(task.status,locale)}{progressFor(task)!==null?` · ${progressFor(task)}%`:""}</small></span><time>{formatDate(task.createdAt,locale)}</time></button>):<p className="account-empty">{t.noTasksHint}</p>}</article></aside></div>;
}

function FileQuotaDonut({ value = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const size = 106;
    canvas.width = size * ratio; canvas.height = size * ratio;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    context.scale(ratio, ratio); context.clearRect(0, 0, size, size);
    context.lineWidth = 11; context.lineCap = "round";
    context.beginPath(); context.arc(53, 53, 39, 0, Math.PI * 2); context.strokeStyle = "#e8edf8"; context.stroke();
    if (value > 0) { context.beginPath(); context.arc(53, 53, 39, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(100, value) / 100); context.strokeStyle = "#5968ed"; context.stroke(); }
  }, [value]);
  return <canvas ref={ref} role="img" aria-label={`${Math.round(value)}%`} />;
}

function Files({ files, quota, user, billing, favorites = [], locale, onUpload, onDelete, onDeleteMany, onToggleFavorite = () => {}, onNavigate }) {
  const t = dictionary[locale];
  const isEn = locale === "en";
  const inputRef = useRef(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [layout, setLayout] = useState("list");
  const [scope, setScope] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const copy = isEn ? {
    subtitle:"Manage every uploaded and generated file in one secure, searchable workspace.", total:"All files", storage:"File allowance", month:"Added today", outputs:"Tool outputs", types:"File types", all:"All files", generated:"Created by tools", favorite:"Favorites", image:"Images", audio:"Audio", video:"Videos", document:"Documents", archive:"Archives", other:"Other", search:"Search file names", newest:"Last modified", oldest:"Oldest first", largest:"Largest first", name:"Name", size:"Size", type:"Type", time:"Saved", source:"Source tool", action:"Action", uploaded:"Manual upload", allSources:"All sources", storageTitle:"File allowance", storageBody:`Your current membership can retain up to ${quota?.limit || 100} private files.`, storageManage:"View details", upload:"Upload file", create:"Create with AI", createHint:"Open the AI tool marketplace to create content", empty:"No files match these filters.", page:"Page", download:"Download", remove:"Delete", list:"List view", grid:"Grid view", selectAll:"Select current page", selected:"selected", clear:"Clear selection", clearFilters:"Clear filters", deleteSelected:"Delete selected", confirmDelete:"Delete the selected files?", confirmBody:"This permanently removes the files and cannot be undone.", cancel:"Cancel", confirm:"Delete files", deleting:"Deleting...", sources:"File sources", recent:"Recent files", viewAll:"View all", quotaUsed:"used", quotaUnit:"files", today:"Today",
  } : {
    subtitle:"集中管理你的所有文件，安全存储、高效查找。", total:"全部文件", storage:"文件额度", month:"今日新增", outputs:"工具生成", types:"文件类型", all:"全部文件", generated:"工具生成", favorite:"收藏文件", image:"图片", audio:"音频", video:"视频", document:"文档", archive:"压缩包", other:"其他", search:"搜索文件名称", newest:"修改时间", oldest:"最早保存", largest:"文件大小", name:"名称", size:"大小", type:"类型", time:"保存时间", source:"来源工具", action:"操作", uploaded:"手动上传", allSources:"全部来源", storageTitle:"文件额度", storageBody:`当前会员最多可保留 ${quota?.limit || 100} 个私有文件。`, storageManage:"查看详情", upload:"上传文件", create:"使用 AI 创建", createHint:"打开 AI 工具市场创建内容", empty:"当前筛选条件下没有文件。", page:"页", download:"下载", remove:"删除", list:"列表视图", grid:"网格视图", selectAll:"全选当前页", selected:"个文件已选择", clear:"取消选择", clearFilters:"清空筛选", deleteSelected:"删除所选", confirmDelete:"确定删除所选文件？", confirmBody:"文件将被永久删除，此操作无法撤销。", cancel:"取消", confirm:"确认删除", deleting:"正在删除...", sources:"文件来源分布", recent:"最近文件", viewAll:"查看全部", quotaUsed:"已使用", quotaUnit:"个文件", today:"今天",
  };
  const fileType = (mime="",name="") => {
    const value = `${mime} ${name}`.toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    if (/zip|rar|7z|tar|gzip/.test(value)) return "archive";
    if (/pdf|text|document|word|sheet|excel|csv|json|xml|markdown/.test(value)) return "document";
    return "other";
  };
  const typeMeta = {
    image:[copy.image,ImageSquare,"image"], audio:[copy.audio,MusicNotes,"audio"], video:[copy.video,VideoCamera,"video"], document:[copy.document,FileText,"document"], archive:[copy.archive,Database,"archive"], other:[copy.other,File,"other"],
  };
  const now = new Date(); const dayStart = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const totalBytes = files.reduce((sum,file)=>sum+Number(file.sizeBytes||0),0);
  const categoryCounts = files.reduce((counts,file)=>{const key=fileType(file.mimeType,file.name);counts[key]=(counts[key]||0)+1;return counts;},{});
  const favoriteFileIds = new Set(favorites.filter((item)=>["file","material"].includes(item.itemType)).map((item)=>item.itemId));
  const favoriteTypeFor = (file) => favorites.find((item)=>["file","material"].includes(item.itemType)&&item.itemId===file.id)?.itemType || (fileType(file.mimeType,file.name)==="image"?"material":"file");
  const sourceOptions = [...new Set(files.map((file)=>(isEn?file.sourceNameEn:file.sourceNameZh)||copy.uploaded))];
  const filtered = files.filter((file)=>{
    const source=(isEn?file.sourceNameEn:file.sourceNameZh)||copy.uploaded;
    return (scope==="all"||(scope==="generated"&&Boolean(file.sourceNameZh||file.sourceNameEn))||(scope==="favorite"&&favoriteFileIds.has(file.id)))
      && (category==="all"||fileType(file.mimeType,file.name)===category)
      && (sourceFilter==="all"||source===sourceFilter)
      && file.name.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a,b)=>sort==="oldest"?a.createdAt-b.createdAt:sort==="largest"?b.sizeBytes-a.sizeBytes:b.createdAt-a.createdAt);
  const pageSize = layout === "grid" ? 12 : 10;
  const pageCount = Math.max(1,Math.ceil(filtered.length/pageSize)); const safePage=Math.min(page,pageCount); const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);
  useEffect(() => {
    const available = new Set(files.map((file) => file.id));
    setSelectedIds((current) => new Set([...current].filter((id) => available.has(id))));
  }, [files]);
  const chooseFile = () => inputRef.current?.click();
  const categoryTabs = [["all",copy.all],["image",copy.image],["audio",copy.audio],["video",copy.video],["document",copy.document],["archive",copy.archive],["other",copy.other]];
  const quotaUsed = Number(quota?.used ?? files.length); const quotaLimit = Number(quota?.limit ?? 100); const quotaPercent = quotaLimit ? Math.min(100,quotaUsed/quotaLimit*100) : 0;
  const generatedCount = files.filter((file)=>file.sourceNameZh||file.sourceNameEn).length;
  const sourceGroups = [...files.reduce((map,file)=>{const label=(isEn?file.sourceNameEn:file.sourceNameZh)||copy.uploaded;const current=map.get(label)||{label,count:0,file};current.count+=1;map.set(label,current);return map;},new Map()).values()].sort((a,b)=>b.count-a.count).slice(0,6);
  const clearFilters = () => { setSearch(""); setCategory("all"); setSourceFilter("all"); setSort("newest"); setPage(1); };
  const allVisibleSelected = visible.length > 0 && visible.every((file) => selectedIds.has(file.id));
  const toggleFile = (id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleVisible = () => setSelectedIds((current) => { const next = new Set(current); if (allVisibleSelected) visible.forEach((file) => next.delete(file.id)); else visible.forEach((file) => next.add(file.id)); return next; });
  const clearSelection = () => { setSelectedIds(new Set()); setConfirmingDelete(false); };
  const deleteSelection = async () => {
    setDeleting(true);
    const result = await onDeleteMany([...selectedIds]);
    setDeleting(false);
    if (result?.deletedIds?.length) setSelectedIds((current) => new Set([...current].filter((id) => !result.deletedIds.includes(id))));
    if (!result?.failedIds?.length) setConfirmingDelete(false);
  };
  return <div className="files-dashboard-layout files-v3"><main className="files-page"><section className="files-heading"><div><h1>{t.nav.files}</h1><p>{copy.subtitle}</p></div><input ref={inputRef} className="visually-hidden" type="file" onChange={(event)=>{const file=event.target.files?.[0];if(file)onUpload(file);event.target.value="";}}/><div><button className="primary-button" onClick={()=>onNavigate?.("marketplace")}><Plus size={17}/>{copy.create}<CaretDown size={13}/></button><button className="secondary-button" onClick={chooseFile}><CloudArrowUp size={17}/>{copy.upload}<CaretDown size={13}/></button></div></section>
    <nav className="files-scope-tabs">{[["all",copy.all],["generated",copy.generated],["favorite",copy.favorite]].map(([id,label])=><button className={scope===id?"active":""} key={id} onClick={()=>{setScope(id);setPage(1);}}>{label}{id==="favorite"&&favoriteFileIds.size?<small>{favoriteFileIds.size}</small>:null}</button>)}</nav>
    <section className="surface files-overview">{[[copy.total,files.length,Database,"total",isEn?"files":"个"],[copy.types,Object.keys(categoryCounts).length,FolderOpen,"types",isEn?"types":"类"],[copy.storage,`${Math.round(quotaPercent)}%`,HardDrives,"storage",`${quotaUsed}/${quotaLimit}`],[copy.month,files.filter((file)=>file.createdAt>=dayStart).length,Star,"month",isEn?"files":"个"],[copy.outputs,generatedCount,Sparkle,"outputs",isEn?"files":"个"]].map(([label,value,Icon,tone,unit])=><article key={label}><span className={tone}><Icon size={18} weight="duotone"/></span><div><small>{label}</small><strong>{typeof value==="number"?value.toLocaleString():value}<em>{unit}</em></strong></div></article>)}</section>
    <section className="surface files-browser"><header className="files-filter-header"><div><label className="files-search"><MagnifyingGlass size={15}/><input value={search} onChange={(event)=>{setSearch(event.target.value);setPage(1);}} placeholder={copy.search}/></label><label className="files-sort"><select value={category} onChange={(event)=>{setCategory(event.target.value);setPage(1);}}>{categoryTabs.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><CaretDown size={13}/></label><label className="files-sort"><select value={sourceFilter} onChange={(event)=>{setSourceFilter(event.target.value);setPage(1);}}><option value="all">{copy.allSources}</option>{sourceOptions.map((source)=><option key={source} value={source}>{source}</option>)}</select><CaretDown size={13}/></label><label className="files-sort"><select value={sort} onChange={(event)=>{setSort(event.target.value);setPage(1);}}><option value="newest">{copy.newest}</option><option value="oldest">{copy.oldest}</option><option value="largest">{copy.largest}</option></select><CaretDown size={13}/></label><button className="files-clear-filter" onClick={clearFilters}><Funnel size={14}/>{copy.clearFilters}</button></div><div><label className="files-select-visible"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible}/><span/>{copy.selectAll}</label><div className="files-layout-toggle"><button className={layout==="list"?"active":""} onClick={()=>setLayout("list")} title={copy.list}><ListChecks size={16}/></button><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")} title={copy.grid}><GridFour size={16}/></button></div></div></header>
      {selectedIds.size>0&&<div className="files-selection-bar"><div><CheckSquare size={18} weight="fill"/><strong>{selectedIds.size}</strong><span>{copy.selected}</span></div>{confirmingDelete?<div className="files-delete-confirm"><span><strong>{copy.confirmDelete}</strong><small>{copy.confirmBody}</small></span><button onClick={()=>setConfirmingDelete(false)} disabled={deleting}>{copy.cancel}</button><button className="danger" onClick={deleteSelection} disabled={deleting}><Trash size={15}/>{deleting?copy.deleting:copy.confirm}</button></div>:<div><button onClick={clearSelection}>{copy.clear}</button><button className="danger" onClick={()=>setConfirmingDelete(true)}><Trash size={15}/>{copy.deleteSelected}</button></div>}</div>}
      {layout==="list"?<div className="files-list"><div className="files-list-head"><label className="file-checkbox"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label={copy.selectAll}/><span/></label><span>{copy.name}</span><span>{copy.type}</span><span>{copy.source}</span><span>{copy.size}</span><span>{copy.time}</span><span>{copy.action}</span></div>{visible.map((file)=>{const [label,Icon,tone]=typeMeta[fileType(file.mimeType,file.name)];const favorite=favoriteFileIds.has(file.id);return <article className={selectedIds.has(file.id)?"selected":""} key={file.id}><label className="file-checkbox"><input type="checkbox" checked={selectedIds.has(file.id)} onChange={()=>toggleFile(file.id)} aria-label={`${copy.name}: ${file.name}`}/><span/></label>{tone==="image"?<span className="files-image-thumb"><img src={`/api/files/${file.id}/thumbnail`} alt="" loading="lazy" decoding="async"/></span>:<span className={`files-type-icon ${tone}`}><Icon size={18} weight="duotone"/></span>}<a className="files-file-name" href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer" title={file.name}>{file.name}{favorite&&<Star size={12} weight="fill"/>}</a><span className={`files-type-pill ${tone}`}>{label}</span><span className="files-source-name">{(isEn?file.sourceNameEn:file.sourceNameZh)||copy.uploaded}</span><span>{formatBytes(file.sizeBytes)}</span><time>{formatDate(file.createdAt,locale)}</time><div><button className={favorite?"favorite":""} onClick={()=>onToggleFavorite(fileType(file.mimeType,file.name)==="image"?"material":"file",file.id)} title={copy.favorite}><Star size={15} weight={favorite?"fill":"regular"}/></button><a href={`/api/files/${file.id}/download`} title={copy.download}><DownloadSimple size={16}/></a><button onClick={()=>onDelete(file.id)} title={copy.remove}><Trash size={16}/></button></div></article>})}</div>:<div className="files-grid">{visible.map((file)=>{const [label,Icon,tone]=typeMeta[fileType(file.mimeType,file.name)];const favorite=favoriteFileIds.has(file.id);return <article className={selectedIds.has(file.id)?"selected":""} key={file.id}><label className="file-checkbox grid"><input type="checkbox" checked={selectedIds.has(file.id)} onChange={()=>toggleFile(file.id)} aria-label={`${copy.name}: ${file.name}`}/><span/></label>{tone==="image"?<span className="files-grid-preview"><img src={`/api/files/${file.id}/thumbnail`} alt="" loading="lazy" decoding="async"/></span>:<span className={`files-type-icon ${tone}`}><Icon size={24} weight="duotone"/></span>}<div><strong title={file.name}>{file.name}</strong><small>{label} · {formatBytes(file.sizeBytes)}</small></div><footer><time>{formatDate(file.createdAt,locale)}</time><button className={favorite?"favorite":""} onClick={()=>onToggleFavorite(tone==="image"?"material":"file",file.id)}><Star size={15} weight={favorite?"fill":"regular"}/></button><a href={`/api/files/${file.id}/download`} title={copy.download}><DownloadSimple size={16}/></a><button onClick={()=>onDelete(file.id)} title={copy.remove}><Trash size={16}/></button></footer></article>})}</div>}
      {!visible.length&&<div className="files-empty"><FolderOpen size={27}/><strong>{copy.empty}</strong><button onClick={chooseFile}>{t.upload}</button></div>}<footer><span>{filtered.length.toLocaleString()} {isEn?"files":"个文件"}</span><div><button disabled={safePage<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))}><ArrowLeft size={15}/></button><strong>{safePage}</strong><span>/ {pageCount} {copy.page}</span><button disabled={safePage>=pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}><ArrowRight size={15}/></button></div></footer></section>
  </main><aside className="files-side"><article className="surface files-quota-card"><header><h2>{copy.storageTitle}</h2><button onClick={()=>onNavigate?.("plans")}>{copy.storageManage}<ArrowRight size={13}/></button></header><div><span><FileQuotaDonut value={quotaPercent}/><strong>{Math.round(quotaPercent)}%</strong><small>{copy.quotaUsed}</small></span><div><strong>{quotaUsed.toLocaleString()} / {quotaLimit.toLocaleString()} {copy.quotaUnit}</strong><p>{formatBytes(totalBytes)} · {copy.storageBody}</p></div></div></article><article className="surface files-source-card"><header><h2>{copy.sources}</h2><button onClick={()=>{setSourceFilter("all");setScope("all");}}>{copy.viewAll}<ArrowRight size={13}/></button></header>{sourceGroups.map(({label,count,file})=>{const [,Icon,tone]=typeMeta[fileType(file.mimeType,file.name)];return <button key={label} onClick={()=>{setSourceFilter(label);setPage(1);}}><span className={`files-type-icon ${tone}`}><Icon size={15} weight="duotone"/></span><strong>{label}</strong><em>{count}</em></button>})}{!sourceGroups.length&&<p className="account-empty">{copy.empty}</p>}</article><article className="surface files-recent-card"><header><h2>{copy.recent}</h2><button onClick={()=>{setSort("newest");setScope("all");}}>{copy.viewAll}<ArrowRight size={13}/></button></header>{files.slice(0,5).map((file)=>{const [,Icon,tone]=typeMeta[fileType(file.mimeType,file.name)];return <a key={file.id} href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer"><span className={`files-type-icon ${tone}`}><Icon size={15} weight="duotone"/></span><p><strong>{file.name}</strong><small>{(isEn?file.sourceNameEn:file.sourceNameZh)||copy.uploaded} · {formatDate(file.createdAt,locale)}</small></p></a>})}{!files.length&&<p className="account-empty">{copy.empty}</p>}</article></aside></div>;
}

function Account({ user, health, credits, billing, locale, onLogout, onUserChange, onLocaleChange, onNotice, onNavigate }) {
  const t = dictionary[locale];
  const isEn = locale === "en";
  const [profile, setProfile] = useState({ name: user.name, locale });
  const [credentials, setCredentials] = useState({ currentPassword: "", newPassword: "", email: "" });
  const [sessions, setSessions] = useState([]);
  const [section, setSection] = useState("profile");
  const [preferences, setPreferences] = useState(() => {
    try { return { notifications: true, productUpdates: true, timezone: "Asia/Shanghai", dateFormat: "YYYY-MM-DD", pageSize: "20", ...JSON.parse(localStorage.getItem("oneshowtools-account-preferences") || "{}") }; }
    catch { return { notifications: true, productUpdates: true, timezone: "Asia/Shanghai", dateFormat: "YYYY-MM-DD", pageSize: "20" }; }
  });
  const copy = isEn ? {
    title:"Account", subtitle:"Manage your profile, security, active sessions and account data.", profile:"Profile", security:"Security", sessions:"Login sessions", privacy:"Data & privacy", overview:"Account overview", plan:"Membership", expires:"Member since", balance:"Available credits", spent:"Total credits used", month:"Used this month", profileTitle:"Account information", name:"Name", email:"Email address", language:"Language", save:"Save changes", verified:"Verified", pending:"Verification pending", securityTitle:"Security information", password:"Password", passwordHint:"Use a unique password with at least 10 characters.", changePassword:"Change password", currentPassword:"Current password", newPassword:"New password", emailTitle:"Change email", emailHint:"A verification link will be sent to the new address.", newEmail:"New email address", sendVerification:"Send verification", sessionTitle:"Active sessions", sessionHint:"Review devices currently signed in to your account.", current:"Current session", browser:"Browser session", lastActive:"Last active", expiresAt:"Expires", revoke:"Sign out", revokeOthers:"Sign out other sessions", dataTitle:"Your account data", export:"Export account data", exportHint:"Download a JSON archive of your profile, credits, tasks and files.", exportAction:"Create export", deleteTitle:"Delete account", deleteHint:"A deletion request enters a 7-day safety period before execution.", deleteAction:"Request deletion", unavailable:"Account deletion is not enabled on this deployment.", quick:"Quick actions", runtime:"Manage model connections", credits:"View credit ledger", billing:"Billing and membership", logout:"Sign out", help:"Account protection", helpText:"Email changes require password confirmation and every session can be revoked.", free:"Free", status:"Account status", active:"Active", joined:"Joined", noSessions:"No active sessions found.", api:"AI Runtime",
  } : {
    title:"设置中心", subtitle:"管理你的账户设置与偏好。", profile:"账户设置", security:"安全设置", sessions:"登录会话", privacy:"数据与隐私", overview:"账户概览", plan:"会员等级", expires:"加入时间", balance:"可用积分", spent:"总消耗积分", month:"本月消耗", profileTitle:"基本信息", name:"用户名", email:"电子邮箱", language:"语言设置", save:"保存更改", verified:"已验证", pending:"待验证", securityTitle:"安全设置", password:"登录密码", passwordHint:"建议使用至少 10 位且不与其他网站重复的密码。", changePassword:"修改密码", currentPassword:"当前密码", newPassword:"新密码", emailTitle:"更换邮箱", emailHint:"新邮箱会收到验证链接，验证后才会正式生效。", newEmail:"新邮箱地址", sendVerification:"发送验证邮件", sessionTitle:"登录会话", sessionHint:"查看当前正在使用你账户的设备，并可随时下线。", current:"当前登录", browser:"浏览器会话", lastActive:"最近活跃", expiresAt:"有效期至", revoke:"下线", revokeOthers:"下线其他设备", dataTitle:"账户数据", export:"导出我的数据", exportHint:"下载包含资料、积分、任务和文件清单的 JSON 数据包。", exportAction:"创建并下载", deleteTitle:"注销账户", deleteHint:"提交后进入 7 天安全等待期，避免误操作。", deleteAction:"申请注销", unavailable:"当前部署未开放账户注销能力。", quick:"其他设置", runtime:"API 设置", credits:"积分与套餐", billing:"积分与套餐", logout:"退出登录", help:"帮助与支持", helpText:"更换邮箱需要密码确认，所有登录会话都可独立下线。", free:"免费版", status:"账户状态", active:"正常", joined:"加入时间", noSessions:"暂无有效登录会话。", api:"API 设置",
  };
  const ledger = credits?.ledger || [];
  const totalSpent = ledger.filter((item)=>Number(item.amount)<0).reduce((sum,item)=>sum+Math.abs(Number(item.amount)),0);
  const monthStart = new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
  const monthSpent = ledger.filter((item)=>Number(item.amount)<0&&Number(item.createdAt)>=monthStart).reduce((sum,item)=>sum+Math.abs(Number(item.amount)),0);
  const planName = billing?.subscription ? (isEn ? billing.subscription.nameEn : billing.subscription.nameZh) : copy.free;
  const refreshSessions = useCallback(() => api("/api/account/sessions").then((result) => setSessions(result.sessions)).catch(() => setSessions([])), []);
  useEffect(() => { refreshSessions(); }, [refreshSessions]);
  useEffect(() => { api("/api/account/preferences").then((result)=>setPreferences(result.preferences)).catch(()=>{}); }, []);
  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const result = await api("/api/account/profile", jsonOptions("PATCH", profile));
      onUserChange(result.user);
      onLocaleChange(result.user.locale);
      onNotice(t.saveProfile);
    } catch { onNotice(t.error); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    try {
      await api("/api/account/password", jsonOptions("POST", credentials));
      setCredentials({ ...credentials, currentPassword: "", newPassword: "" });
      onNotice(t.changePassword);
      refreshSessions();
    } catch { onNotice(t.error); }
  };
  const changeEmail = async (event) => {
    event.preventDefault();
    try {
      await api("/api/account/email", jsonOptions("POST", { email: credentials.email, password: credentials.currentPassword }));
      onNotice(t.verificationPending);
    } catch { onNotice(t.error); }
  };
  const exportData = async () => {
    try {
      const result = await api("/api/account/export", { method: "POST" });
      location.assign(`/api/account/exports/${result.export.id}/download`);
    } catch { onNotice(t.error); }
  };
  const deleteAccount = async () => {
    if (!credentials.currentPassword) return onNotice(t.invalid);
    try {
      await api("/api/account/deletion", jsonOptions("POST", { password: credentials.currentPassword }));
      onLogout();
    } catch { onNotice(health.accountDeletionEnabled ? t.error : t.deletionUnavailable); }
  };
  const revokeSession = async (id) => { await api(`/api/account/sessions/${id}`, { method:"DELETE" }).catch(()=>onNotice(t.error)); refreshSessions(); };
  const sessionName = (value="") => /Edg\//.test(value) ? "Microsoft Edge" : /Chrome\//.test(value) ? "Google Chrome" : /Safari\//.test(value) ? "Safari" : /Firefox\//.test(value) ? "Firefox" : copy.browser;
  const savePreferences = async (next = preferences) => {
    setPreferences(next);
    try { const result = await api("/api/account/preferences", jsonOptions("PATCH", next)); setPreferences(result.preferences); onNotice(copy.save); }
    catch { onNotice(t.error); }
  };
  const settingsTabs = isEn
    ? [["profile",User,"Account"],["security",ShieldCheck,"Security"],["notifications",Bell,"Notifications"],["preferences",GearSix,"Preferences"],["sessions",HardDrives,"Sessions"],["runtime",PlugsConnected,"API settings"],["privacy",LockKey,"Data & privacy"]]
    : [["profile",User,"账户设置"],["security",ShieldCheck,"安全设置"],["notifications",Bell,"通知设置"],["preferences",GearSix,"偏好设置"],["sessions",HardDrives,"登录会话"],["runtime",PlugsConnected,"API 设置"],["privacy",LockKey,"数据与隐私"]];
  return <div className="account-dashboard-layout settings-v3"><main className="account-page"><section className="account-heading"><div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></section><nav className="account-tabs">{settingsTabs.map(([id,Icon,label])=><button key={id} className={section===id?"active":""} onClick={()=>id==="runtime"?onNavigate?.("runtime"):setSection(id)}><Icon size={15}/>{label}</button>)}</nav>
    <div className="account-center">
      {section==="profile"&&<><article className="surface account-panel settings-profile-panel"><header><div><h2>{copy.profileTitle}</h2><p>{isEn?"Manage your personal information and account profile.":"管理你的个人信息和账户资料。"}</p></div></header><div className="settings-profile-content"><div className="settings-avatar-column"><span className="account-avatar">{user.name.slice(0,1).toUpperCase()}</span><button type="button" aria-label={isEn?"Edit avatar":"编辑头像"}><NotePencil size={14}/></button></div><form className="account-profile-form settings-profile-form" onSubmit={saveProfile}><label>{copy.name}<input required maxLength={80} value={profile.name} onChange={(event)=>setProfile({...profile,name:event.target.value})}/></label><label>{copy.email}<div className="account-readonly"><span>{user.email}</span><strong className={user.emailVerified?"verified":"pending"}><CheckCircle size={12} weight="fill"/>{user.emailVerified?copy.verified:copy.pending}</strong></div></label><label className="wide">{isEn?"Phone":"手机号"}<div className="account-readonly"><span>{user.phone || (isEn?"Not linked":"暂未绑定")}</span><LockKey size={14}/></div></label><label className="wide">{copy.language}<select value={profile.locale} onChange={(event)=>setProfile({...profile,locale:event.target.value})}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label><button className="primary-button settings-save" type="submit">{copy.save}</button></form></div></article><article className="surface account-panel settings-preferences-preview"><header><div><h2>{isEn?"Account preferences":"账户偏好"}</h2><p>{isEn?"Customize language, time and information density.":"自定义你的使用体验。"}</p></div><button className="text-button" onClick={()=>setSection("preferences")}>{isEn?"Manage":"管理偏好"}<ArrowRight size={13}/></button></header><div className="settings-preference-summary"><span><Translate size={17}/><strong>{profile.locale==="en"?"English":"简体中文"}</strong><small>{copy.language}</small></span><span><Clock size={17}/><strong>{preferences.timezone}</strong><small>{isEn?"Timezone":"时区"}</small></span><span><ListChecks size={17}/><strong>{preferences.pageSize}</strong><small>{isEn?"Items per page":"每页数量"}</small></span></div></article></>}
      {section==="security"&&<><article className="surface account-panel"><header><div><h2>{copy.securityTitle}</h2><p>{copy.passwordHint}</p></div><span className="account-security-icon"><ShieldCheck size={20} weight="duotone"/></span></header><form className="account-profile-form" onSubmit={changePassword}><label>{copy.currentPassword}<input type="password" required autoComplete="current-password" value={credentials.currentPassword} onChange={(event)=>setCredentials({...credentials,currentPassword:event.target.value})}/></label><label>{copy.newPassword}<input type="password" required minLength={10} autoComplete="new-password" value={credentials.newPassword} onChange={(event)=>setCredentials({...credentials,newPassword:event.target.value})}/></label><button className="primary-button wide" type="submit">{copy.changePassword}</button></form></article><article className="surface account-panel"><header><div><h2>{copy.emailTitle}</h2><p>{copy.emailHint}</p></div></header><form className="account-profile-form" onSubmit={changeEmail}><label>{copy.newEmail}<input type="email" required value={credentials.email} onChange={(event)=>setCredentials({...credentials,email:event.target.value})}/></label><label>{copy.currentPassword}<input type="password" required value={credentials.currentPassword} onChange={(event)=>setCredentials({...credentials,currentPassword:event.target.value})}/></label><button className="secondary-button wide" type="submit">{copy.sendVerification}</button></form></article></>}
      {section==="notifications"&&<article className="surface account-panel settings-choice-panel"><header><div><h2>{isEn?"Notification settings":"通知设置"}</h2><p>{isEn?"Choose the product updates you want to receive.":"选择你希望接收的平台通知。"}</p></div></header>{[["notifications",isEn?"Task and account notifications":"任务与账户通知",isEn?"Important task status and account security reminders.":"接收重要任务状态和账户安全提醒。"],["productUpdates",isEn?"Product updates":"产品更新",isEn?"New tools, feature changes and service announcements.":"接收新工具、功能变更与服务公告。"]].map(([key,title,body])=><label className="settings-switch-row" key={key}><span><Bell size={18}/><span><strong>{title}</strong><small>{body}</small></span></span><input type="checkbox" checked={preferences[key]} onChange={(event)=>savePreferences({...preferences,[key]:event.target.checked})}/></label>)}</article>}
      {section==="preferences"&&<article className="surface account-panel settings-choice-panel"><header><div><h2>{isEn?"Preferences":"偏好设置"}</h2><p>{isEn?"These settings follow your account across devices.":"这些偏好会跟随账户同步到不同设备。"}</p></div></header><div className="settings-select-grid"><label>{isEn?"Timezone":"时区设置"}<select value={preferences.timezone} onChange={(event)=>savePreferences({...preferences,timezone:event.target.value})}><option value="Asia/Shanghai">(GMT+08:00) 北京、上海、香港</option><option value="UTC">UTC</option><option value="America/Los_Angeles">(GMT-08:00) Los Angeles</option></select></label><label>{isEn?"Date format":"日期格式"}<select value={preferences.dateFormat} onChange={(event)=>savePreferences({...preferences,dateFormat:event.target.value})}><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></label><label>{isEn?"Items per page":"每页显示数量"}<select value={preferences.pageSize} onChange={(event)=>savePreferences({...preferences,pageSize:event.target.value})}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label></div></article>}
      {section==="sessions"&&<article className="surface account-panel account-sessions"><header><div><h2>{copy.sessionTitle}</h2><p>{copy.sessionHint}</p></div>{sessions.length>1&&<button className="text-button" onClick={async()=>{await api("/api/account/sessions/others",{method:"DELETE"});refreshSessions();}}>{copy.revokeOthers}</button>}</header>{sessions.map((session)=><div className="account-session-row" key={session.id}><span><HardDrives size={18}/></span><div><strong>{sessionName(session.userAgent)}{session.current&&<em>{copy.current}</em>}</strong><small>{copy.lastActive} · {formatDate(session.lastSeenAt||session.createdAt,locale)}</small></div><time>{copy.expiresAt} · {formatDate(session.expiresAt,locale)}</time>{!session.current&&<button onClick={()=>revokeSession(session.id)}>{copy.revoke}</button>}</div>)}{!sessions.length&&<p className="account-empty-state">{copy.noSessions}</p>}</article>}
      {section==="privacy"&&<article className="surface account-panel account-privacy"><header><div><h2>{copy.dataTitle}</h2><p>{copy.helpText}</p></div></header><section><span><DownloadSimple size={21}/></span><div><h3>{copy.export}</h3><p>{copy.exportHint}</p></div><button className="secondary-button" onClick={exportData}>{copy.exportAction}</button></section><section className="danger"><span><Trash size={21}/></span><div><h3>{copy.deleteTitle}</h3><p>{health.accountDeletionEnabled?copy.deleteHint:copy.unavailable}</p></div><button className="secondary-button danger" disabled={!health.accountDeletionEnabled} onClick={deleteAccount}>{copy.deleteAction}</button></section></article>}
    </div></main><aside className="account-side settings-side"><article className="surface settings-account-overview"><h2>{copy.overview}</h2><p>{isEn?"Review your account usage.":"查看你的账户使用情况。"}</p><div><small>{copy.balance}</small><strong>{Number(credits?.balance||0).toLocaleString()}</strong><span>Credits</span><img src="/credits/credits-wallet.webp" alt="" aria-hidden="true"/></div><button onClick={()=>onNavigate?.("plans")}>{copy.credits}<ArrowRight size={13}/></button></article><article className="surface account-quick settings-security-summary"><h2>{copy.securityTitle}</h2>{[[LockKey,copy.password,copy.changePassword,"security"],[ShieldCheck,copy.email,user.emailVerified?copy.verified:copy.pending,"security"],[HardDrives,copy.sessions,`${sessions.length} ${isEn?"active":"个有效会话"}`,"sessions"]].map(([Icon,label,detail,target])=><button key={label} onClick={()=>setSection(target)}><span><Icon size={16}/></span><p><strong>{label}</strong><small>{detail}</small></p><ArrowRight size={14}/></button>)}</article><article className="surface account-quick"><h2>{copy.quick}</h2>{[[Bell,isEn?"Notification settings":"通知设置","notifications"],[PlugsConnected,copy.runtime,"runtime"],[DownloadSimple,copy.export,"privacy"]].map(([Icon,label,target])=><button key={target} onClick={()=>target==="runtime"?onNavigate?.("runtime"):setSection(target)}><span><Icon size={16}/></span><strong>{label}</strong><ArrowRight size={14}/></button>)}<button className="logout" onClick={onLogout}><span><SignOut size={16}/></span><strong>{copy.logout}</strong><ArrowRight size={14}/></button></article><article className="surface settings-help"><h2>{copy.help}</h2><p>{copy.helpText}</p><div><button onClick={()=>onNotice(isEn?"Please use the support assistant to submit a ticket.":"请使用左侧智能客服提交工单。")}><ShieldCheck size={14}/>{isEn?"Help center":"帮助中心"}</button><button onClick={()=>onNotice(isEn?"Please use the support assistant to submit a ticket.":"请使用左侧智能客服提交工单。")}><Bell size={14}/>{isEn?"Feedback":"反馈建议"}</button></div></article></aside></div>;
}
function SystemRow({ icon: Icon, name, detail, ok }) {
  return <div className="system-row"><span className="system-icon"><Icon size={20} /></span><div><strong>{name}</strong><small>{detail}</small></div>{ok ? <CheckCircle size={20} weight="fill" /> : <Warning size={20} />}</div>;
}

function CapabilityNetwork({ locale }) {
  const canvasRef = useRef(null);
  const visualRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const visual = visualRef.current;
    if (!canvas || !visual) return undefined;
    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = visual.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      const motionTime = reducedMotion ? 0 : time * 0.00018;
      const centerX = width * 0.53 + pointerRef.current.x * 8;
      const centerY = height * 0.5 + pointerRef.current.y * 6;
      const rings = [
        { rx: width * 0.22, ry: height * 0.18, speed: 0.7, alpha: 0.32 },
        { rx: width * 0.32, ry: height * 0.27, speed: -0.45, alpha: 0.24 },
        { rx: width * 0.42, ry: height * 0.36, speed: 0.3, alpha: 0.18 },
      ];
      const ringRotation = -0.08;

      context.lineWidth = 1;
      rings.forEach((ring, index) => {
        context.strokeStyle = `rgba(23, 105, 232, ${ring.alpha})`;
        context.setLineDash(index === 2 ? [4, 5] : []);
        context.beginPath();
        context.ellipse(centerX, centerY, ring.rx, ring.ry, ringRotation, 0, Math.PI * 2);
        context.stroke();

        const packetCount = index === 1 ? 4 : 3;
        for (let packet = 0; packet < packetCount; packet += 1) {
          const angle = motionTime * ring.speed * Math.PI * 2 + packet * (Math.PI * 2 / packetCount) + index;
          const localX = Math.cos(angle) * ring.rx;
          const localY = Math.sin(angle) * ring.ry;
          const x = centerX + localX * Math.cos(ringRotation) - localY * Math.sin(ringRotation);
          const y = centerY + localX * Math.sin(ringRotation) + localY * Math.cos(ringRotation);
          const colors = ["#1769e8", "#8eb8f4", "#a7e8d3", "#f4c7ce"];
          context.fillStyle = colors[(packet + index) % colors.length];
          context.globalAlpha = packet === 0 ? 0.95 : 0.7;
          context.beginPath();
          context.roundRect(x - 4, y - 4, 8, 8, 2.5);
          context.fill();
        }
      });

      context.globalAlpha = 1;
      context.setLineDash([]);

      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      const bounds = visual.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - bounds.left) / bounds.width - 0.5,
        y: (event.clientY - bounds.top) / bounds.height - 0.5,
      };
    };
    const onPointerLeave = () => { pointerRef.current = { x: 0, y: 0 }; };
    const observer = new ResizeObserver(() => { resize(); if (reducedMotion) draw(); });
    observer.observe(visual);
    visual.addEventListener("pointermove", onPointerMove);
    visual.addEventListener("pointerleave", onPointerLeave);
    resize();
    draw();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      visual.removeEventListener("pointermove", onPointerMove);
      visual.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const labels = locale === "en"
    ? [["discover", MagnifyingGlass, "Discover capabilities", "Always expanding"], ["run", RocketLaunch, "Run tasks", "Smart routing"], ["result", CheckCircle, "Generate results", "Reliable output"]]
    : [["discover", MagnifyingGlass, "发现能力", "持续接入中"], ["run", RocketLaunch, "运行任务", "智能处理"], ["result", CheckCircle, "生成结果", "高效输出"]];

  return <div className="capability-visual" ref={visualRef} aria-label={locale === "en" ? "Animated OneShowTools capability network" : "OneShowTools 平台能力网络动效"}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <div className="capability-core"><span><img src="/brand/oneshowtools-mark-192.png" alt="" /></span><strong>OneShowTools</strong></div>
    <div className="capability-statuses">{labels.map(([key, Icon, title, detail]) => <div className={`capability-status ${key}`} key={key}><span><Icon size={17} /></span><div><strong>{title}</strong><small><i />{detail}</small></div></div>)}</div>
  </div>;
}

function GuestHome({ locale, tools, catalogStatus, onReload, onAuth, onLocale, onRun }) {
  const t = dictionary[locale];
  const [guestQuery, setGuestQuery] = useState("");
  const heroOrbitRef = useRef(null);
  const isEn = locale === "en";
  const visibleTools = useMemo(() => tools.filter((tool) => {
    const haystack = `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase();
    return !guestQuery.trim() || haystack.includes(guestQuery.trim().toLowerCase());
  }), [guestQuery, tools]);
  const featuredTools = useMemo(() => {
    const preferred = ["ai-writer", "seo-workbench", "ai-music-studio", "lyrics-generator", "pdf-summary", "image-compressor"];
    const ordered = preferred.map((slug) => tools.find((tool) => tool.slug === slug)).filter(Boolean);
    return [...ordered, ...tools.filter((tool) => !preferred.includes(tool.slug))].slice(0, 6);
  }, [tools]);
  const agentTools = useMemo(() => tools.filter((tool) => tool.category === "agent").slice(0, 4), [tools]);
  const copy = isEn ? {
    nav: ["Tool Marketplace", "AI Runtime", "AI Agents", "How it works", "Pricing"],
    badge: "ONE ACCOUNT · EVERY AI WORKFLOW",
    titleA: "One account for",
    titleB: "all your AI tools",
    subtitle: `Use ${tools.length} real tools with one account across writing, SEO, images, PDF, media, data, and AI agents.`,
    search: "Search tools or describe what you want to accomplish...",
    popular: "Popular:", free: "Start free", browse: "Browse all tools",
    trust: ["No card required", "Unified account and credits", "Bring your own model", "Traceable tasks and files"],
    hello: "Hello, creator", today: "What do you want to accomplish today?", quick: "Quick access", recent: "Platform overview",
    available: "Available tools", categories: "Capability groups", newCredits: "New-user credits", ready: "Ready",
    why: "Why OneShowTools", whySub: "A practical foundation for moving from an idea to a delivered result.",
    strengths: [
      [`${tools.length} real tools`, "Continuously expanding practical capabilities"],
      ["Unified AI Runtime", "OneShowModel and personal connections"],
      ["Unified credits", "One balance across supported AI tools"],
      ["Task-oriented agents", "Turn multi-step work into clear workflows"],
      ["Files and history", "Keep outputs and tasks under your account"],
      ["Commercial foundation", "Accounts, permissions and usage records built in"],
    ],
    featured: "Popular AI tools", featuredSub: "Start with the capabilities already available today.", seeAll: "View all tools",
    agents: "AI Agents", agentsSub: "Specialized agents for work that needs multiple steps and structured output.",
    stepsTitle: "How OneShowTools works", steps: [["Choose a tool", "Find the right capability by category or search"], ["Describe the task", "Provide goals, materials and output preferences"], ["AI processes", "The platform routes the task to the right runtime"], ["Get the result", "Review, download and continue from task history"]],
    cta: "Ready to put AI to work?", ctaSub: "Create one account and start with the tools you need today.",
    footer: "A unified AI tools platform for everyday work.", product: "Product", resources: "Resources", company: "Company", support: "Support",
    liveEyebrow: "CORE EXPERIENCES", liveTitle: "Create, manage, and keep every result", liveBody: "Use the tools already online while the same account, credits, tasks, and files stay connected behind every workflow.", liveProof: "Outputs saved to your account", liveIllustration: "OneShowTools creative capability showcase", retryCatalog: "Retry tool catalog", catalogUnavailable: "The tool catalog is temporarily unavailable. Retry to see the tools currently online.", catalogEmpty: "No tools are public yet. Check back after the next release.", openTool: "Open tool",
    stories: [["AI Music Studio", "Turn an idea into a complete song", "Create from inspiration, lyrics, or instrumental mode."], ["AI Visual Tools", "Make image creation feel effortless", "Try on outfits while preserving identity and manage the result in one place."], ["Unified workspace", "One workflow from prompt to delivery", "Tasks, credits, and generated files remain traceable under one account."]],
    proof: [["100+", "AI tools"], ["100K+", "Active users"], ["1M+", "Tasks completed"], ["100TB+", "Files processed"], ["98%+", "User satisfaction"]],
    capabilityCards: [["50+ powerful AI tools", "Writing, design, development and analysis in one practical toolkit."], ["Unified AI Runtime", "Connect and manage multiple models through one stable runtime."], ["AI Agents that execute", "Build repeatable workflows and let AI complete multi-step work."], ["One credit system", "One balance across supported tools with transparent usage."], ["Files and task management", "Keep every output and task organized, traceable and ready to continue."]],
    howSub: "Four simple steps from an idea to a usable result.",
    ctaTitle: "Hand the next task to AI", ctaBody: "50+ AI tools. One account to get started.",
  } : {
    nav: ["工具市场", "AI Runtime", "AI Agent", "使用方式", "定价"],
    badge: "一个账户 · 无缝使用 AI 能力",
    titleA: "一个账号，使用",
    titleB: "所有 AI 工具",
    subtitle: "AI 音乐、图片处理、视频生成、AI 写作、SEO 优化、数据分析、PDF 工具、AI Agent… 在一个平台完成所有工作。",
    search: "搜索工具，或输入你想完成的任务...",
    popular: "热门搜索：", free: "免费开始使用", browse: "浏览所有工具",
    trust: ["无需绑定银行卡", "统一账户与积分", "支持自配模型", "任务与文件可追溯"],
    hello: "你好，创作者", today: "今天想完成什么工作？", quick: "快捷访问", recent: "平台能力概览",
    available: "可用工具", categories: "能力分类", newCredits: "新用户积分", ready: "可运行",
    why: "为什么选择 OneShowTools", whySub: "从一个想法到可交付结果，为真实工作提供完整底座。",
    strengths: [
      [`${tools.length} 个真实工具`, "持续扩展高频、实用的工具能力"],
      ["统一 AI Runtime", "支持 OneShowModel 与个人模型连接"],
      ["统一积分", "支持的 AI 工具共享同一账户余额"],
      ["任务型 AI Agent", "把多步骤工作变成清晰的执行流程"],
      ["文件与历史记录", "产出文件和任务都归属于你的账户"],
      ["商业化底座", "账户、权限与使用记录已统一接入"],
    ],
    featured: "热门 AI 工具", featuredSub: "从目前已经上线、可以真实使用的能力开始。", seeAll: "查看全部工具",
    agents: "AI Agent", agentsSub: "面向多步骤任务和结构化交付的专业智能体。",
    stepsTitle: "如何使用 OneShowTools", steps: [["选择工具", "按分类或搜索找到适合的能力"], ["输入需求", "提供目标、素材与输出偏好"], ["AI 处理", "平台将任务路由到合适的运行能力"], ["获取结果", "查看、下载并在任务历史中继续处理"]],
    cta: "准备好让 AI 成为你的工作助手了吗？", ctaSub: "创建一个账户，从今天真正需要的工具开始。",
    footer: "解决日常小需求的一站式 AI 工具平台。", product: "产品", resources: "资源", company: "公司", support: "支持",
    liveEyebrow: "核心体验", liveTitle: "从创作到交付，都在一个平台完成", liveBody: "先使用已经上线的真实工具，同时让账户、积分、任务与文件贯穿每一次创作。", liveProof: "生成结果自动进入账户记录", liveIllustration: "OneShowTools 创作能力场景", retryCatalog: "重新加载工具", catalogUnavailable: "工具目录暂时没有加载成功，请重试查看当前已上线能力。", catalogEmpty: "目前暂无公开工具，请等待下一次能力上线。", openTool: "打开工具",
    stories: [["AI 音乐工作室", "从灵感到成品，只需几分钟", "支持灵感、自定义歌词和纯音乐创作，作品统一保存。"], ["AI 图片工具", "让创意图像处理更简单", "保持人物身份完成一键换装，并在同一账户管理结果。"], ["统一工作台", "一次登录，贯穿完整创作流程", "积分、任务和生成文件统一记录，随时回来继续处理。"]],
    proof: [["100+", "AI 工具"], ["10W+", "活跃用户"], ["100W+", "任务完成"], ["100TB+", "文件处理"], ["98%+", "用户满意度"]],
    capabilityCards: [["50+ 强大 AI 工具", "覆盖写作、设计、开发、数据分析等多个领域，满足高频多样化需求。"], ["统一 AI Runtime", "支持多种模型接入与统一管理，使用更稳定、更可靠。"], ["AI Agent 自动执行", "创建属于你的 AI Agent，自动完成重复、复杂的多步骤任务。"], ["统一积分体系", "一个积分，多场景使用，消费清晰透明。"], ["文件与任务管理", "所有文件和任务集中管理，结果随时可追踪。"]],
    howSub: "简单 4 步，让 AI 帮你完成更多工作。",
    ctaTitle: "把下一项工作交给 AI", ctaBody: "50+ AI 工具，一个账号即可开始。",
  };
  const catalogLoading = catalogStatus === "loading";
  const catalogUnavailable = catalogStatus === "error";
  const publicSubtitle = catalogLoading
    ? (isEn ? "Syncing the tools currently available on OneShowTools…" : "正在同步 OneShowTools 当前已上线的工具…")
    : catalogUnavailable
      ? copy.catalogUnavailable
      : copy.subtitle;
  const strengthRows = copy.strengths.map((row, index) => index === 0
    ? [catalogLoading || catalogUnavailable ? (isEn ? "Live tool catalog" : "真实工具目录") : row[0], catalogLoading ? (isEn ? "Syncing published capabilities" : "正在同步已发布能力") : catalogUnavailable ? copy.catalogUnavailable : row[1]]
    : row);
  const showResults = (event) => {
    event.preventDefault();
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  };
  const chooseSearch = (tool) => { setGuestQuery(isEn ? tool.nameEn : tool.nameZh); requestAnimationFrame(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })); };
  const stepIcons = [SquaresFour, NotePencil, Robot, DownloadSimple];
  const navHrefs = ["#tools", "#platform", "#agents", "#how", "#pricing"];
  const heroToolCatalog = useMemo(() => {
    const bySlug = (slug) => tools.find((tool) => tool.slug === slug);
    return [
      { tool: bySlug("ai-music-studio"), label: isEn ? "AI Music Studio" : "AI 音乐工作室", detail: isEn ? "Create original songs" : "生成原创歌曲", Icon: Headphones, tone: "music", asset: "/tool-icons-v2/optimized/ai-music-studio.png" },
      { tool: bySlug("ai-outfit-changer"), label: isEn ? "AI Outfit Changer" : "AI 一键换装", detail: isEn ? "Try on any style" : "轻松更换造型", Icon: UserFocus, tone: "outfit", asset: "/tool-icons-v2/optimized/ai-outfit-changer.png" },
      { tool: bySlug("ai-product-photo") || bySlug("ai-portrait-studio"), label: isEn ? "AI Image" : "图片生成", detail: isEn ? "Create visual assets" : "生成创意图片", Icon: ImageSquare, tone: "image", asset: "/tool-icons-v2/optimized/ai-image-generation.png" },
      { tool: bySlug("seo-workbench"), label: isEn ? "SEO Analysis" : "SEO 分析", detail: isEn ? "Find growth opportunities" : "发现增长机会", Icon: ChartLineUp, tone: "seo", asset: "/tool-icons-v2/optimized/seo-analysis.png" },
      { tool: bySlug("ai-writer"), label: isEn ? "AI Writing" : "AI 写作", detail: isEn ? "Draft polished content" : "生成优质内容", Icon: PenNib, tone: "writing", asset: "/tool-icons-v2/optimized/ai-writing.png" },
      { tool: bySlug("pdf-summary") || bySlug("pdf-merge"), label: isEn ? "PDF Tools" : "PDF 工具", detail: isEn ? "Read and transform PDFs" : "阅读与处理 PDF", Icon: FilePdf, tone: "pdf", asset: "/tool-icons-v2/optimized/pdf-tools.png" },
      { tool: tools.find((tool) => tool.category === "agent"), label: "AI Agent", detail: isEn ? "Complete multi-step work" : "完成多步骤任务", Icon: Robot, tone: "agent" },
      { tool: tools.find((tool) => tool.category === "data"), label: isEn ? "Data Tools" : "数据工具", detail: isEn ? "Turn data into answers" : "让数据变成答案", Icon: ChartBar, tone: "data" },
      { tool: tools.find((tool) => tool.category === "audio"), label: isEn ? "Audio Tools" : "音频工具", detail: isEn ? "Edit and transform audio" : "编辑与转换音频", Icon: Microphone, tone: "audio" },
      { tool: tools.find((tool) => tool.category === "video"), label: isEn ? "Video Tools" : "视频工具", detail: isEn ? "Create video faster" : "更快完成视频创作", Icon: VideoCamera, tone: "video" },
      { tool: tools.find((tool) => tool.category === "developer"), label: isEn ? "Developer Tools" : "开发工具", detail: isEn ? "Ship with less friction" : "提升开发效率", Icon: Code, tone: "developer" },
      { tool: tools.find((tool) => tool.category === "marketing"), label: isEn ? "Marketing Copy" : "营销文案", detail: isEn ? "Make campaigns convert" : "生成营销内容", Icon: Megaphone, tone: "marketing" },
    ];
  }, [isEn, tools]);
  const landingStoryFeatures = isEn
    ? [["Multiple music styles", "Original compositions", "Downloadable results", "High-quality output"], ["AI image generation", "Smart cutout", "Background replacement", "Image enhancement"], ["Article writing", "Content generation", "Rewrite and polish", "Multilingual output"]]
    : [["多种音乐风格", "可创作歌曲", "可商用下载", "高品质导出"], ["AI 生成图片", "智能抠图", "背景替换", "图像增强"], ["文章写作", "文案生成", "改写润色", "多平台适配"]];
  useEffect(() => {
    const orbit = heroOrbitRef.current;
    if (!orbit || typeof window === "undefined") return undefined;
    const cards = [...orbit.querySelectorAll("[data-orbit-card]")];
    if (!cards.length) return undefined;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let startedAt = 0;
    const placeCards = (time = 0) => {
      if (!startedAt) startedAt = time;
      const bounds = orbit.getBoundingClientRect();
      const maxCardWidth = Math.max(...cards.map((card) => card.getBoundingClientRect().width));
      const maxCardHeight = Math.max(...cards.map((card) => card.getBoundingClientRect().height));
      const radiusX = Math.max(105, Math.min(bounds.width * .39, bounds.width / 2 - maxCardWidth / 2 - 3));
      const radiusY = Math.max(94, Math.min(bounds.height * .36, bounds.height / 2 - maxCardHeight / 2 - 8));
      const progress = reducedMotion ? 0 : (time - startedAt) * .000022;
      cards.forEach((card, index) => {
        const angle = progress * Math.PI * 2 + index * (Math.PI * 2 / cards.length) - Math.PI / 2;
        const depth = (Math.sin(angle) + 1) / 2;
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(.88 + depth * .12).toFixed(3)})`;
        card.style.zIndex = String(2 + Math.round(depth * 4));
        card.style.opacity = String(.82 + depth * .18);
      });
      if (!reducedMotion) frame = window.requestAnimationFrame(placeCards);
    };
    placeCards(performance.now());
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [heroToolCatalog.length]);
  return <div className="guest-shell commercial-home">
    <header className="guest-header commercial-header"><a href="#top" aria-label="OneShowTools home"><Brand /></a><nav>{copy.nav.map((item, index) => <a key={item} href={navHrefs[index]}>{item}</a>)}</nav><div><button className="locale-button" onClick={onLocale}><Translate size={16} />{t.language}</button><button className="landing-login" onClick={onAuth}>{t.login}</button><button className="primary-button" onClick={onAuth}>{copy.free}<ArrowRight size={15} /></button></div></header>
    <main id="top">
      <section className="landing-hero">
        <div className="landing-hero-copy"><span className="landing-badge"><Sparkle size={14} weight="fill" />{copy.badge}</span><h1>{copy.titleA}<br /><span>{copy.titleB}</span></h1><p>{publicSubtitle}</p>
          <form className="landing-search" onSubmit={showResults}><MagnifyingGlass size={21} /><input value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} placeholder={copy.search} /><button>{t.searchAction}<ArrowRight size={16} /></button></form>
          {featuredTools.length > 0 && <div className="landing-popular"><span>{copy.popular}</span>{featuredTools.slice(0, 5).map((tool) => <button key={tool.id} onClick={() => chooseSearch(tool)}>{isEn ? tool.nameEn : tool.nameZh}</button>)}</div>}
          <div className="hero-actions"><button className="primary-button" onClick={onAuth}>{copy.free}<ArrowRight size={18} /></button><a className="secondary-button" href="#tools">{copy.browse}</a></div>
          <div className="landing-trust">{copy.trust.map((item, index) => { const Icon = [CreditCard, UserCircle, PlugsConnected, ShieldCheck][index]; return <span key={item}><Icon size={16} />{item}</span>; })}</div>
        </div>
        <div className="landing-orbit" id="platform" ref={heroOrbitRef} aria-label={isEn ? "OneShowTools connected AI workspace" : "OneShowTools 一站式 AI 工作平台"}>
          <span className="orbit-haze" aria-hidden="true" />
          <span className="orbit-track orbit-track-one" aria-hidden="true"><i /><i /></span>
          <span className="orbit-track orbit-track-two" aria-hidden="true"><i /><i /></span>
          <span className="orbit-track orbit-track-three" aria-hidden="true"><i /><i /></span>
          <div className="orbit-core"><span className="orbit-aura" /><img src="/brand/oneshowtools-mark-512.png" alt="OneShowTools" /></div>
          <div className="orbit-tool-layer" aria-live="off">
            {heroToolCatalog.slice(0, 6).map(({ tool, label, detail, Icon, tone, asset }, index) => {
              const name = tool ? (isEn ? tool.nameEn : tool.nameZh) : label;
              const iconUrl = resolveToolIconUrl(tool, asset);
              const content = <><span className={`orbit-card-icon tone-${tone}`}>{iconUrl ? <img src={iconUrl} alt="" /> : <Icon size={35} weight="duotone" />}</span><span className="orbit-card-copy"><strong>{name || label}</strong><small>{detail}</small><i aria-hidden="true"><b /><b /></i></span></>;
              return <button
                key={`orbit-slot-${index}`}
                type="button"
                data-orbit-card
                className="orbit-card"
                disabled={!tool}
                onClick={tool ? () => onRun(tool) : undefined}
              >{content}</button>;
            })}
          </div>
        </div>
      </section>

      <section id="tools" className="landing-section landing-hot-tools">
        <header><div><h2>{copy.featured}</h2><p>{copy.featuredSub}</p></div><a href="#how">{copy.seeAll}<ArrowRight size={15} /></a></header>
        <div className="landing-hot-list">{heroToolCatalog.slice(0, 6).map(({ tool, label, detail, Icon, tone, asset }, index) => {
          const toolName = tool ? (isEn ? tool.nameEn : tool.nameZh) : label;
          const iconUrl = resolveToolIconUrl(tool, asset);
          return <button key={`hot-${index}-${tool?.id || label}`} type="button" disabled={!tool} onClick={tool ? () => onRun(tool) : undefined}>
            <span className={`landing-hot-icon tone-${tone}`}>{iconUrl ? <img src={iconUrl} alt="" /> : <Icon size={38} weight="duotone" />}</span>
            <span><strong>{toolName}</strong><small>{detail}</small></span><ArrowRight size={15} />
            <em>{index < 2 ? (isEn ? "Popular" : "最热门") : index === 2 ? (isEn ? "New" : "新上线") : (isEn ? "Featured" : "推荐")}</em>
          </button>;
        })}</div>
      </section>

      <section className="landing-product-stories" aria-label={isEn ? "Featured OneShowTools products" : "OneShowTools 核心产品展示"}>
        {copy.stories.map(([title, subtitle], index) => {
          const target = index === 0
            ? heroToolCatalog[0]?.tool
            : index === 1
              ? heroToolCatalog[1]?.tool
              : null;
          return <article className={`product-story story-${index + 1}`} key={title}>
            <img src="/landing/creative-suite-triptych.webp" alt="" loading="lazy" decoding="async" />
            <div>
              <span>{index === 0 ? (isEn ? "FEATURED" : "核心体验") : "ONSHOWTOOLS"}</span>
              <h2>{title}</h2>
              <h3>{subtitle}</h3>
              <ul>{landingStoryFeatures[index].map((feature) => <li key={feature}><CheckCircle size={12} weight="fill" />{feature}</li>)}</ul>
              {target
                ? <button type="button" onClick={() => onRun(target)}>{isEn ? "Try now" : "立即体验"}<ArrowRight size={13} /></button>
                : <a href="#how">{isEn ? "See how it works" : "了解工作方式"}<ArrowRight size={13} /></a>}
            </div>
          </article>;
        })}
      </section>

      <section className="landing-proof-bar" aria-label={isEn ? "OneShowTools platform facts" : "OneShowTools 平台数据"}>{copy.proof.map(([value, label], index) => { const Icon = [SquaresFour, UserCircle, CheckSquare, FolderOpen, Crown][index]; return <div key={`${value}-${label}`}><span><Icon size={21} weight="duotone" /></span><strong>{value}</strong><small>{label}</small></div>; })}</section>

      <section className="landing-section landing-capabilities"><header><h2>{copy.why}</h2><p>{copy.whySub}</p></header><div className="landing-capability-mosaic">{copy.capabilityCards.map(([title, body], index) => <article key={title} className={`capability-card capability-${index + 1}`}><div><h3>{title}</h3><p>{body}</p></div><img src={["/dashboard/oneshowtools-ai-toolkit-900.webp", "/runtime/oneshow-runtime-platform.webp", "/landing-v2/ai-agent-robot.webp", "/credits/credits-coin-stack.webp", "/landing-v2/files-and-tasks.webp"][index]} alt="" loading="lazy" decoding="async" /></article>)}</div></section>

      <section id="how" className="landing-section landing-how"><header><h2>{copy.stepsTitle}</h2><p>{copy.howSub}</p></header><div>{copy.steps.map(([title, body], index) => { const Icon = stepIcons[index]; return <article key={title}><span><Icon size={24} weight="duotone" /></span><div><h3>{title}</h3><p>{body}</p></div>{index < copy.steps.length - 1 && <ArrowRight className="step-arrow" size={18} />}</article>; })}</div></section>

      <section id="pricing" className="landing-cta landing-cta-v2"><img src="/landing-v2/cta-ai-platform.webp" alt="" loading="lazy" decoding="async" /><div><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p><span><button onClick={onAuth}>{copy.free}<ArrowRight size={17} /></button><a href="#tools">{copy.browse}</a></span></div></section>
    </main>
    <footer className="landing-footer"><div className="footer-brand"><Brand /><p>{copy.footer}</p></div><div><strong>{copy.product}</strong><a href="#tools">{copy.nav[0]}</a><a href="#platform">AI Runtime</a><a href="#agents">AI Agent</a></div><div><strong>{copy.resources}</strong><a href="#how">{copy.nav[3]}</a><button onClick={onAuth}>{isEn ? "Account" : "账户中心"}</button></div><div><strong>{copy.company}</strong><a href="https://www.oneshowailab.com/" target="_blank" rel="noreferrer">OneShow AI Lab</a></div><div><strong>{copy.support}</strong><button onClick={onAuth}>{t.login}</button><button onClick={onLocale}>{t.language}</button><a href="/legal/terms">{isEn ? "Terms" : "用户协议"}</a><a href="/legal/privacy">{isEn ? "Privacy" : "隐私政策"}</a><a href="/legal/credits">{isEn ? "Credits & refunds" : "积分与退款"}</a></div><div className="landing-footer-record"><span>© 2026 OneShowTools. All rights reserved.</span><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026052190号-2</a></div></footer>
  </div>;
}

export function App() {
  const [locale, setLocale] = useState(() => localStorage.getItem("ost_locale") === "en" ? "en" : "zh-CN");
  const [view, setView] = useState(() => {
    if (location.pathname.startsWith("/tools/")) return "tool";
    const requestedView = new URLSearchParams(location.search).get("view");
    if (["credits", "billing"].includes(requestedView)) return "plans";
    return ["dashboard", "marketplace", "recent", "favorites", "agent", "runtime", "plans", "tasks", "files", "projects", "settings", "account"].includes(requestedView) ? requestedView : "dashboard";
  });
  const [session, setSession] = useState(undefined);
  const [health, setHealth] = useState({});
  const [tools, setTools] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [plans, setPlans] = useState([]);
  const [writingCatalog, setWritingCatalog] = useState(null);
  const [seoCatalog, setSeoCatalog] = useState(null);
  const [privateData, setPrivateData] = useState({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [], projects: [], favorites: [], favoriteCollections: [], favoriteCounts: { tool: 0, file: 0, prompt: 0, material: 0 }, fileQuota: { used: 0, limit: 100, remaining: 100 } });
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(() => Boolean(new URLSearchParams(location.search).get("resetToken")));
  const [routeSlug, setRouteSlug] = useState(() => location.pathname.match(/^\/tools\/([^/]+)$/)?.[1] || null);
  const [routeTaskId, setRouteTaskId] = useState(() => new URLSearchParams(location.search).get("task"));
  const [toast, setToast] = useState("");
  const favoritesMigrationRef = useRef("");
  const t = dictionary[locale];

  const loadPublic = useCallback(async () => {
    setCatalogStatus("loading");
    const [sessionResult, healthResult, toolsResult, plansResult] = await Promise.all([
      api("/api/auth/session").catch(() => ({ user: null })), api("/api/health").catch(() => ({})),
      api("/api/tools").catch(() => null), api("/api/plans").catch(() => ({ plans: [] })),
    ]);
    setSession(sessionResult.user || null); setHealth(healthResult); setTools(toolsResult?.tools || []); setCatalogStatus(toolsResult ? "ready" : "error"); setPlans(plansResult.plans);
  }, []);
  const loadPrivate = useCallback(async (requestedAreas) => {
    if (!session) return;
    const allAreas = ["dashboard", "runtime", "credits", "billing", "tasks", "files", "projects", "favorites"];
    const areas = Array.isArray(requestedAreas) ? allAreas.filter((area) => requestedAreas.includes(area)) : allAreas;
    const loaders = {
      dashboard: () => api("/api/dashboard"), runtime: () => api("/api/runtime/status"), credits: () => api("/api/credits"),
      billing: () => api("/api/billing/status"), tasks: () => api("/api/tasks"), files: () => api("/api/files?limit=100"),
      projects: () => api("/api/projects").catch(() => ({ projects: [] })),
      favorites: () => api("/api/favorites").catch(() => ({ favorites: [], collections: [], counts: { tool: 0, file: 0, prompt: 0, material: 0 } })),
    };
    const values = await Promise.all(areas.map((area) => loaders[area]()));
    const results = Object.fromEntries(areas.map((area, index) => [area, values[index]]));
    setPrivateData((current) => ({
      ...current,
      ...(results.dashboard ? { dashboard: results.dashboard } : {}), ...(results.runtime ? { runtime: results.runtime } : {}),
      ...(results.credits ? { credits: results.credits } : {}), ...(results.billing ? { billing: results.billing } : {}),
      ...(results.tasks ? { tasks: results.tasks.tasks } : {}),
      ...(results.files ? { files: results.files.files, fileQuota: results.files.quota || current.fileQuota } : {}),
      ...(results.projects ? { projects: results.projects.projects || [] } : {}),
      ...(results.favorites ? { favorites: results.favorites.favorites || [], favoriteCollections: results.favorites.collections || [], favoriteCounts: results.favorites.counts || current.favoriteCounts } : {}),
    }));
  }, [session]);

  useEffect(() => { loadPublic(); }, [loadPublic]);
  useEffect(() => {
    if (!routeSlug || !tools.length || (writingCatalog && seoCatalog)) return undefined;
    let cancelled = false;
    Promise.all([
      writingCatalog || api("/api/writing/catalog").catch(() => null),
      seoCatalog || api("/api/seo/catalog").catch(() => null),
    ]).then(([writingResult, seoResult]) => {
      if (cancelled) return;
      if (writingResult) setWritingCatalog(writingResult);
      if (seoResult) setSeoCatalog(seoResult);
    });
    return () => { cancelled = true; };
  }, [routeSlug, tools.length, writingCatalog, seoCatalog]);
  useEffect(() => { if (session) loadPrivate().catch(() => setToast(t.error)); }, [session, loadPrivate, t.error]);
  useEffect(() => {
    if (!session?.id || !tools.length || favoritesMigrationRef.current === session.id) return;
    favoritesMigrationRef.current = session.id;
    let legacy = [];
    try { legacy = JSON.parse(localStorage.getItem(`ost_favorites_${session.id}`) || "[]"); } catch { legacy = []; }
    if (!Array.isArray(legacy) || !legacy.length) return;
    Promise.all(legacy.filter((id)=>tools.some((tool)=>tool.id===id)).map((itemId)=>api("/api/favorites",jsonOptions("POST",{itemType:"tool",itemId}))))
      .then(()=>api("/api/favorites"))
      .then((result)=>{setPrivateData((current)=>({...current,favorites:result.favorites||[],favoriteCollections:result.collections||[],favoriteCounts:result.counts||current.favoriteCounts}));localStorage.removeItem(`ost_favorites_${session.id}`);})
      .catch(()=>{});
  }, [session, tools]);
  useEffect(() => { document.documentElement.lang = locale; localStorage.setItem("ost_locale", locale); document.title = "OneShowTools Platform"; }, [locale]);
  useEffect(() => {
    const authStatus = new URLSearchParams(location.search).get("auth");
    if (!authStatus) return;
    setToast(authStatus === "verified" ? t.verified : authStatus === "email-changed" ? t.verified : t.invalid);
    history.replaceState({}, "", location.pathname + location.hash);
  }, [t.invalid, t.verified]);
  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (location.pathname.startsWith("/tools/")) {
          history.pushState({}, "", "/");
          setRouteSlug(null);
          setRouteTaskId(null);
        }
        setView("marketplace");
        setTimeout(() => document.querySelector(".command-search input")?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const updateRoute = () => {
      const slug = location.pathname.match(/^\/tools\/([^/]+)$/)?.[1] || null;
      setRouteSlug(slug);
      setRouteTaskId(new URLSearchParams(location.search).get("task"));
      if (slug) setView("tool");
    };
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);
  useEffect(() => {
    if (session === undefined || !routeSlug || tools.some((tool) => tool.slug === routeSlug)) return;
    history.replaceState({}, "", session ? "/?view=marketplace" : "/#tools");
    setRouteSlug(null);
    setRouteTaskId(null);
    setView(session ? "marketplace" : "dashboard");
    setToast(locale === "en" ? "This tool is not currently available." : "该工具暂未上线，请先使用已开放的工具。");
  }, [locale, routeSlug, session, tools]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const normalized = query.trim();
    if (!session || view !== "marketplace" || normalized.length < 2) return undefined;
    const resultCount = tools.filter((tool) => `${tool.nameZh} ${tool.nameEn} ${tool.descriptionZh} ${tool.descriptionEn}`.toLowerCase().includes(normalized.toLowerCase())).length;
    const timer = setTimeout(() => api("/api/marketplace/search-events", jsonOptions("POST", { query: normalized, resultCount })).catch(() => {}), 900);
    return () => clearTimeout(timer);
  }, [query, session, tools, view]);

  const logout = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setSession(null); setView("dashboard"); setPrivateData({ dashboard: null, runtime: null, credits: null, billing: null, tasks: [], files: [], projects: [], favorites: [], favoriteCollections: [], favoriteCounts: { tool: 0, file: 0, prompt: 0, material: 0 } }); };
  const applyFavoriteData = (result) => setPrivateData((current) => ({ ...current, favorites: result.favorites || [], favoriteCollections: result.collections || [], favoriteCounts: result.counts || { tool: 0, file: 0, prompt: 0, material: 0 } }));
  const toggleLibraryFavorite = async (itemType, itemId) => {
    const existing = privateData.favorites.find((item) => item.itemType === itemType && item.itemId === itemId);
    try {
      const result = existing ? await api(`/api/favorites/${existing.id}`, { method: "DELETE" }) : await api("/api/favorites", jsonOptions("POST", { itemType, itemId }));
      applyFavoriteData(result);
    } catch { setToast(t.error); }
  };
  const toggleFavorite = (toolId) => toggleLibraryFavorite("tool", toolId);
  const removeFavorite = async (favoriteId) => { try { applyFavoriteData(await api(`/api/favorites/${favoriteId}`, { method: "DELETE" })); } catch { setToast(t.error); } };
  const moveFavorite = async (favoriteId, collectionId) => { try { applyFavoriteData(await api(`/api/favorites/${favoriteId}`, jsonOptions("PATCH", { collectionId }))); } catch { setToast(t.error); } };
  const createFavoriteCollection = async (name) => { try { applyFavoriteData(await api("/api/favorite-collections", jsonOptions("POST", { name }))); } catch { setToast(t.error); } };
  const openTool = (tool) => {
    if (session) api("/api/marketplace/behavior-events", jsonOptions("POST", { eventKind: "tool_open", toolSlug: tool.slug, category: tool.category, query: query.trim() || null })).catch(() => {});
    history.pushState({}, "", `/tools/${tool.slug}`);
    setRouteSlug(tool.slug);
    setRouteTaskId(null);
    setView("tool");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openTask = (task) => {
    if (!task.toolSlug) return;
    history.pushState({}, "", `/tools/${task.toolSlug}?task=${encodeURIComponent(task.id)}`);
    setRouteSlug(task.toolSlug); setRouteTaskId(task.id); setView("tool");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const leaveTool = () => {
    history.pushState({}, "", session ? "/" : "/#tools");
    setRouteSlug(null);
    setRouteTaskId(null);
    setView(session ? "marketplace" : "dashboard");
    if (!session) setTimeout(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  const navigateView = (nextView) => {
    const normalizedView = ["credits", "billing"].includes(nextView) ? "plans" : nextView;
    if (routeSlug) {
      history.pushState({}, "", "/");
      setRouteSlug(null);
      setRouteTaskId(null);
    }
    setView(normalizedView);
  };
  const upload = async (file) => {
    const form = new FormData(); form.append("file", file);
    try { await api("/api/files", { method: "POST", body: form }); await loadPrivate(["dashboard", "files"]); } catch (caught) { setToast(caught.message === "USER_FILE_LIMIT_REACHED" ? t.fileLimit : t.error); }
  };
  const fileDeleteError = (code) => {
    const storageFailure = ["OSS_DELETE_FAILED", "OSS_DELETE_FORBIDDEN", "OSS_OBJECT_SCOPE_INVALID", "OSS_STORAGE_NOT_CONFIGURED"].includes(code);
    if (locale === "en") return storageFailure ? "The storage service could not delete this file. Please retry or submit a support ticket with the error code." : "The file could not be deleted. Please retry.";
    return storageFailure ? `存储服务未能删除该文件，请重试；若仍失败，请提交工单并附上错误码：${code}` : "文件删除失败，请稍后重试。";
  };
  const deleteFile = async (id) => {
    try {
      await api(`/api/files/${id}`, { method: "DELETE" });
      await loadPrivate(["dashboard", "files", "favorites"]);
      setToast(locale === "en" ? "File deleted." : "文件已删除。");
      return true;
    } catch (caught) {
      setToast(fileDeleteError(caught.message));
      return false;
    }
  };
  const deleteFiles = async (ids) => {
    try {
      const result = await api("/api/files/bulk-delete", jsonOptions("POST", { ids }));
      await loadPrivate(["dashboard", "files", "favorites"]);
      if (result.failedIds?.length) {
        const code = result.failures?.[0]?.code || "FILE_DELETE_FAILED";
        setToast(locale === "en" ? `${result.failedIds.length} files could not be deleted (${code}).` : `${result.failedIds.length} 个文件删除失败（错误码：${code}）。`);
      }
      else setToast(locale === "en" ? `${result.deletedIds.length} files deleted.` : `已删除 ${result.deletedIds.length} 个文件。`);
      return result;
    } catch {
      setToast(t.error);
      return { deletedIds: [], failedIds: ids };
    }
  };
  const deleteTasks = async (ids) => {
    try {
      const result = await api("/api/tasks/bulk-delete", jsonOptions("POST", { ids }));
      await loadPrivate(["dashboard", "tasks", "projects", "favorites"]);
      if (result.failed?.length) setToast(locale === "en" ? `${result.failed.length} active tasks were not deleted.` : `${result.failed.length} 个运行中任务未删除，请先取消任务。`);
      else setToast(locale === "en" ? `${result.deletedIds.length} task records deleted.` : `已删除 ${result.deletedIds.length} 条任务记录。`);
      return result;
    } catch {
      setToast(t.error);
      return { deletedIds: [], failed: ids.map((id)=>({ id, code: "REQUEST_FAILED" })) };
    }
  };
  const cancelTask = async (id) => { await api(`/api/tasks/${id}/cancel`, { method: "POST" }).catch(() => setToast(t.error)); await loadPrivate(["dashboard", "credits", "tasks"]); };
  const checkout = async (planId, provider) => { try { const result = await api("/api/billing/checkout", jsonOptions("POST", { planId, provider })); if (result.presentation === "redirect" && result.url) location.assign(result.url); return result; } catch (error) {
    const paymentErrors = locale === "en" ? {
      PAYMENT_PROVIDER_NOT_CONFIGURED: "This payment channel is not available yet.",
      WECHAT_PAY_ORDER_FAILED: "WeChat Pay could not create the order. Check the merchant configuration or try again later.",
      WECHAT_PAY_NETWORK_FAILED: "WeChat Pay is temporarily unreachable. No charge was recorded.",
      WECHAT_PAY_RESPONSE_SIGNATURE_INVALID: "The WeChat Pay response could not be verified. No charge was recorded.",
      PAYMENT_CREDENTIAL_DECRYPTION_FAILED: "The payment credential cannot be read. Ask an administrator to rotate it.",
    } : {
      PAYMENT_PROVIDER_NOT_CONFIGURED: "该支付通道尚未启用，请选择其他支付方式。",
      WECHAT_PAY_ORDER_FAILED: "微信支付下单失败，请检查商户配置或稍后重试。",
      WECHAT_PAY_NETWORK_FAILED: "暂时无法连接微信支付，本次未扣款，请稍后重试。",
      WECHAT_PAY_RESPONSE_SIGNATURE_INVALID: "微信支付响应验签失败，本次未记账，请联系管理员检查微信支付公钥。",
      PAYMENT_CREDENTIAL_DECRYPTION_FAILED: "支付密钥读取失败，请管理员在后台重新配置密钥。",
    };
    setToast(paymentErrors[error.message] || t.billingUnavailable); return null;
  } };
  const openBillingPortal = async () => { try { const result = await api("/api/billing/portal", { method: "POST" }); location.assign(result.url); } catch { setToast(t.billingUnavailable); } };

  if (session === undefined) return <Loading locale={locale} />;
  const favorites = privateData.favorites.filter((item) => item.itemType === "tool").map((item) => item.itemId);
  const routeTool = routeSlug ? tools.find((tool) => tool.slug === routeSlug) : null;
  const routeTask = routeTaskId ? privateData.tasks.find((task) => task.id === routeTaskId) : null;
  const specialistCatalog = seoCatalogForTool(seoCatalog, routeTool);
  const activeCatalog = routeTool?.slug === "ai-writer" ? writingCatalog : (specialistCatalog || writingCatalog);
  if (!session) return <Suspense fallback={<Loading locale={locale} />}>{routeTool ? <PublicToolShell tool={routeTool} catalog={activeCatalog} locale={locale} authenticated={false} onBack={leaveTool} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} /> : <GuestHome locale={locale} tools={tools} catalogStatus={catalogStatus} onReload={loadPublic} onAuth={() => setAuthOpen(true)} onLocale={() => setLocale(locale === "en" ? "zh-CN" : "en")} onRun={openTool} />}{authOpen && <AuthDialog locale={locale} registrationEnabled={health.registrationEnabled} smsAuthEnabled={health.smsAuthEnabled} onClose={() => setAuthOpen(false)} onAuthenticated={setSession} />}</Suspense>;

  const navGroups = [
    { items: [["dashboard", House], ["marketplace", SquaresFour], ["recent", Clock], ["favorites", Star]] },
    { label: locale === "en" ? "AI CAPABILITIES" : "AI 能力", items: [["agent", Robot, "Beta"], ["runtime", RocketLaunch]] },
    { label: locale === "en" ? "MY WORK" : "我的工作", items: [["tasks", ListChecks, privateData.tasks.length], ["files", FolderOpen, privateData.files.length], ["projects", Database]] },
    { label: locale === "en" ? "ACCOUNT" : "账户", items: [["plans", Coins], ["settings", GearSix]] },
  ];
  const content = {
    dashboard: <Dashboard data={privateData.dashboard} tools={tools} runtime={privateData.runtime} projects={privateData.projects} locale={locale} onNavigate={setView} onSearch={(value) => { setQuery(value); setView("marketplace"); }} onRun={openTool} />,
    marketplace: <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} data={privateData.dashboard} runtime={privateData.runtime} tasks={privateData.tasks} onNavigate={setView} favorites={favorites} onToggleFavorite={toggleFavorite} />,
    recent: <RecentUsagePage tools={tools} tasks={privateData.tasks} files={privateData.files} locale={locale} onRun={openTool} onOpenTask={openTask} onNavigate={setView} />,
    favorites: <FavoritesPage tools={tools} tasks={privateData.tasks} files={privateData.files} favorites={privateData.favorites} collections={privateData.favoriteCollections} counts={privateData.favoriteCounts} locale={locale} onRun={openTool} onOpenTask={openTask} onNavigate={setView} onAdd={toggleLibraryFavorite} onRemove={removeFavorite} onMove={moveFavorite} onCreateCollection={createFavoriteCollection} />,
    agent: <AgentHubPage tools={tools} tasks={privateData.tasks} favorites={favorites} locale={locale} onRun={openTool} onToggleFavorite={toggleFavorite} onNavigate={setView} />,
    runtime: <Runtime data={privateData.runtime} dashboard={privateData.dashboard} tasks={privateData.tasks} locale={locale} onRefresh={loadPrivate} onNotice={setToast} onNavigate={setView} />,
    credits: <Credits data={privateData.credits} user={session} billing={privateData.billing} tasks={privateData.tasks} locale={locale} onNavigate={setView} />,
    billing: <Billing plans={plans} status={privateData.billing} credits={privateData.credits} user={session} tasks={privateData.tasks} locale={locale} onCheckout={checkout} onPortal={openBillingPortal} onNavigate={navigateView} />,
    tasks: <Tasks tasks={privateData.tasks} user={session} credits={privateData.credits} billing={privateData.billing} locale={locale} onRefresh={loadPrivate} onCancel={cancelTask} onDeleteMany={deleteTasks} onOpenTask={openTask} onNavigate={setView} />,
    files: <Files files={privateData.files} quota={privateData.fileQuota} user={session} billing={privateData.billing} favorites={privateData.favorites} locale={locale} onUpload={upload} onDelete={deleteFile} onDeleteMany={deleteFiles} onToggleFavorite={toggleLibraryFavorite} onNavigate={setView} />,
    projects: <ProjectCenter projects={privateData.projects} locale={locale} onNavigate={setView} onRefresh={loadPrivate} onNotice={setToast} />,
    plans: <Billing plans={plans} status={privateData.billing} credits={privateData.credits} user={session} tasks={privateData.tasks} locale={locale} onCheckout={checkout} onPortal={openBillingPortal} onNavigate={navigateView} />,
    settings: <Account user={session} health={health} credits={privateData.credits} billing={privateData.billing} locale={locale} onLogout={logout} onUserChange={setSession} onLocaleChange={setLocale} onNotice={setToast} onNavigate={setView} />,
    account: <Account user={session} health={health} credits={privateData.credits} billing={privateData.billing} locale={locale} onLogout={logout} onUserChange={setSession} onLocaleChange={setLocale} onNotice={setToast} onNavigate={setView} />,
    tool: routeTool ? <ToolPage tool={routeTool} catalog={activeCatalog} task={routeTask} historyTasks={privateData.tasks.filter((task) => task.toolId === routeTool.id)} locale={locale} authenticated runtime={privateData.runtime} account={{ session, credits: privateData.credits }} onBack={leaveTool} onAuth={() => setAuthOpen(true)} onModelChange={async (toolId, modelConnectionId) => { await api(`/api/tools/${toolId}/model`, jsonOptions("PATCH", { modelConnectionId })); await loadPrivate(["runtime"]); setToast(t.modelRouteSaved); }} onCompleted={async () => { api("/api/marketplace/behavior-events", jsonOptions("POST", { eventKind: "tool_complete", toolSlug: routeTool.slug, category: routeTool.category })).catch(() => {}); setToast(t.taskCreated); await loadPrivate(["dashboard", "runtime", "credits", "tasks", "files"]); }} /> : <Marketplace tools={tools} locale={locale} query={query} onQuery={setQuery} onRun={openTool} data={privateData.dashboard} runtime={privateData.runtime} tasks={privateData.tasks} onNavigate={setView} favorites={favorites} onToggleFavorite={toggleFavorite} />,
  }[view];

  const isWriter = ["ai-writer", "lyrics-generator", "seo-workbench", "seo-agent"].includes(routeTool?.slug) || Boolean(seoSpecialistFor(seoCatalog, routeTool?.slug));
  const isToolWorkspace = Boolean(routeTool);
  const usesFullWorkspace = ["dashboard", "marketplace", "recent", "favorites", "agent", "runtime", "plans", "projects"].includes(view) || isToolWorkspace;
  const planLabel = privateData.billing?.subscription ? (locale === "en" ? privateData.billing.subscription.nameEn : privateData.billing.subscription.nameZh) : t.free;
  return <div className="platform-shell"><aside className="sidebar"><Brand /><nav className="sidebar-nav-groups">{navGroups.map((group, index) => <section key={group.label || index}>{group.label && <small>{group.label}</small>}{group.items.map(([key, Icon, badge]) => <button className={view === key ? "active" : ""} onClick={() => navigateView(key)} key={key}><Icon size={19} weight={view === key ? "fill" : "regular"} /><span>{t.nav[key]}</span>{badge !== undefined && <em>{badge}</em>}</button>)}</section>)}</nav><div className="sidebar-upgrade"><Crown size={18} weight="fill" /><strong>{locale === "en" ? "Upgrade your plan" : "升级到专业版"}</strong><small>{locale === "en" ? "Unlock more AI tools and capabilities" : "解锁更多 AI 工具与高级能力"}</small><button onClick={() => navigateView("plans")}>{locale === "en" ? "Upgrade" : "立即升级"}<ArrowRight size={14} /></button></div><SupportWidget locale={locale} /><div className="sidebar-footer"><button className="mini-profile" onClick={() => navigateView("settings")}><span>{session.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.name}</strong><small>{privateData.credits?.balance?.toLocaleString() ?? "—"} {locale === "en" ? "credits" : "积分"}</small></div><ArrowRight size={15} /></button></div></aside>
    <div className="main-column"><header className="platform-header"><button className="global-search" onClick={() => navigateView("marketplace")}><MagnifyingGlass size={19} /><span>{t.search}</span><kbd>⌘ K</kbd></button><div className="header-actions"><button className="header-icon-button" aria-label={locale === "en" ? "Plans" : "套餐"} onClick={() => navigateView("plans")}><Gift size={20} /></button><button className="header-icon-button notification" aria-label={locale === "en" ? "Tasks" : "任务"} onClick={() => navigateView("tasks")}><Bell size={20} />{privateData.dashboard?.metrics?.running > 0 && <i>{Math.min(privateData.dashboard.metrics.running, 99)}</i>}</button><button className="header-credit-pill" onClick={() => navigateView("plans")}><Coins size={18} weight="fill" /><strong>{privateData.credits?.balance?.toLocaleString() ?? "—"}</strong><span>{locale === "en" ? "credits" : "积分"}</span></button><button className="header-plan-pill" onClick={() => navigateView("plans")}><Crown size={20} weight="fill" /><span><strong>{planLabel}</strong><small>{locale === "en" ? "View plans" : "升级套餐"}</small></span></button></div></header>
      <div className={`workspace-layout ${usesFullWorkspace ? "marketplace-layout" : ""}`}><main className={`workspace-main ${view === "marketplace" ? "marketplace-workspace" : view === "runtime" ? "runtime-workspace" : view === "plans" ? "billing-workspace" : isWriter ? "writer-workspace" : isToolWorkspace ? "tool-workspace" : ""}`}><Suspense fallback={<Loading locale={locale} />}>{content}</Suspense></main>{!usesFullWorkspace && <aside className="context-panel"><div className="account-summary"><span className="avatar small">{session.name.slice(0, 1).toUpperCase()}</span><h3>{session.name}</h3><p>{session.email}</p></div><div className="context-stat"><span>{t.creditsBalance}</span><strong><Coins size={18} />{privateData.credits?.balance?.toLocaleString() ?? "—"}</strong></div><div className="context-stat"><span>{t.currentPlan}</span><strong><CreditCard size={18} />{privateData.billing?.subscription ? (locale === "en" ? privateData.billing.subscription.nameEn : privateData.billing.subscription.nameZh) : t.free}</strong></div><div className="context-divider" /><SectionTitle title={t.recentTasks} />{privateData.tasks.slice(0, 4).map((task) => <div className="mini-task" key={task.id}><span className={`dot ${task.status}`} /><div><strong>{locale === "en" ? task.toolNameEn : task.toolNameZh}</strong><small>{statusLabel(task.status, locale)}</small></div></div>)}{!privateData.tasks.length && <p className="context-empty">{t.recentEmpty}</p>}<button className="secondary-button full context-action" onClick={() => setView("tasks")}>{t.nav.tasks}<ArrowRight size={16} /></button></aside>}</div>
    </div>{toast && <div className="toast"><CheckCircle size={19} weight="fill" />{toast}</div>}</div>;
}
