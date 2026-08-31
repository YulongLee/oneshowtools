import { db } from "./database.mjs";

const clean = (value, max) => String(value || "").replace(/\u0000/g, "").trim().slice(0, max);

function payload(row) {
  return row && {
    toolId: row.tool_id, slug: row.slug, toolNameZh: row.name_zh, toolNameEn: row.name_en,
    titleZh: row.title_zh, titleEn: row.title_en, summaryZh: row.summary_zh, summaryEn: row.summary_en,
    contentZh: row.content_zh, contentEn: row.content_en, status: row.status,
    homepageVisible: Boolean(row.homepage_visible), supportEnabled: Boolean(row.support_enabled),
    url: `/help/${row.slug}`, updatedAt: row.updated_at,
  };
}

const select = `SELECT m.*, t.slug, t.name_zh, t.name_en FROM tool_manuals m JOIN tools t ON t.id = m.tool_id`;

export function listPublicToolManuals({ homepageOnly = false } = {}) {
  const where = homepageOnly ? "m.status = 'published' AND m.homepage_visible = 1" : "m.status = 'published'";
  return db.prepare(`${select} WHERE ${where} AND t.active = 1 ORDER BY m.updated_at DESC`).all().map(payload);
}

export function publicToolManual(slug) {
  return payload(db.prepare(`${select} WHERE t.slug = ? AND t.active = 1 AND m.status = 'published'`).get(slug));
}

export function toolManualForAdmin(toolId) {
  return payload(db.prepare(`${select} WHERE t.id = ?`).get(toolId));
}

export function saveToolManual(toolId, input, adminUserId) {
  const tool = db.prepare("SELECT id FROM tools WHERE id = ?").get(toolId);
  if (!tool) throw Object.assign(new Error("TOOL_NOT_FOUND"), { code: "TOOL_NOT_FOUND", status: 404 });
  const next = {
    titleZh: clean(input.titleZh, 120), titleEn: clean(input.titleEn, 120),
    summaryZh: clean(input.summaryZh, 300), summaryEn: clean(input.summaryEn, 300),
    contentZh: clean(input.contentZh, 12000), contentEn: clean(input.contentEn, 12000),
    status: input.status === "published" ? "published" : "draft",
    homepageVisible: input.homepageVisible === true ? 1 : 0,
    supportEnabled: input.supportEnabled !== false ? 1 : 0,
  };
  if (next.status === "published" && (!next.titleZh || !next.summaryZh || !next.contentZh)) {
    throw Object.assign(new Error("TOOL_MANUAL_CONTENT_REQUIRED"), { code: "TOOL_MANUAL_CONTENT_REQUIRED", status: 400 });
  }
  const timestamp = Date.now();
  db.prepare(`INSERT INTO tool_manuals (tool_id,title_zh,title_en,summary_zh,summary_en,content_zh,content_en,status,homepage_visible,support_enabled,updated_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tool_id) DO UPDATE SET title_zh=excluded.title_zh,title_en=excluded.title_en,summary_zh=excluded.summary_zh,summary_en=excluded.summary_en,content_zh=excluded.content_zh,content_en=excluded.content_en,status=excluded.status,homepage_visible=excluded.homepage_visible,support_enabled=excluded.support_enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
    .run(toolId,next.titleZh,next.titleEn,next.summaryZh,next.summaryEn,next.contentZh,next.contentEn,next.status,next.homepageVisible,next.supportEnabled,adminUserId,timestamp,timestamp);
  return toolManualForAdmin(toolId);
}

export function supportToolManuals(locale = "zh-CN") {
  return db.prepare(`${select} WHERE m.status='published' AND m.support_enabled=1 AND t.active=1 ORDER BY m.updated_at DESC`).all().map((row) => ({
    id: `manual:${row.tool_id}`,
    title: locale === "en" ? (row.title_en || row.title_zh) : row.title_zh,
    question: locale === "en" ? `How do I use ${row.name_en}?` : `${row.name_zh}怎么使用？`,
    answer: `${locale === "en" ? (row.summary_en || row.summary_zh) : row.summary_zh}\n${locale === "en" ? "Guide" : "使用手册"}：https://oneshowtools.com/help/${row.slug}`,
    keywords: `${row.slug} ${row.name_zh} ${row.name_en} ${row.title_zh} ${row.title_en}`,
    locale, updatedAt: row.updated_at,
  }));
}
