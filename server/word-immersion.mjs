import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { audit, db } from "./database.mjs";
import { invokeModel, toolModelSelection } from "./model-gateway.mjs";
import { assertUserFileCapacity } from "./file-quota.mjs";
import { deleteStoredFile, putStoredFile } from "./object-storage.mjs";

const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;
const MAX_SOURCE_CHARACTERS = 50_000;
const CHAPTER_TARGET_CHARACTERS = 4_500;
const allowedLevels = new Set([10, 20, 30, 50, 70]);
const supportedFiles = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["text/plain", "txt"],
  ["text/markdown", "markdown"],
]);

const immersionError = (code, status = 400, retryable = false) =>
  Object.assign(new Error(code), { code, status, retryable });

const builtinBooks = [
  ["vocab_cet4", "cet4", "CET-4 四级", "CET-4", "大学英语四级核心词汇", "Core vocabulary commonly used for CET-4"],
  ["vocab_cet6", "cet6", "CET-6 六级", "CET-6", "大学英语六级核心词汇", "Core vocabulary commonly used for CET-6"],
  ["vocab_postgraduate", "postgraduate", "考研英语", "Postgraduate English", "研究生入学考试常用词汇", "Common vocabulary for postgraduate entrance exams"],
  ["vocab_ielts", "ielts", "IELTS 雅思", "IELTS", "雅思常用与学术词汇", "Common and academic IELTS vocabulary"],
  ["vocab_toefl", "toefl", "TOEFL 托福", "TOEFL", "托福常用与学术词汇", "Common and academic TOEFL vocabulary"],
  ["vocab_gre", "gre", "GRE", "GRE", "GRE 高频及进阶词汇", "High-frequency and advanced GRE vocabulary"],
];

const seedWords = {
  cet4: [["achieve", "达到；实现"], ["adapt", "适应；改编"], ["benefit", "益处；受益"], ["challenge", "挑战"], ["consider", "考虑"], ["develop", "发展"], ["environment", "环境"], ["improve", "改善"], ["influence", "影响"], ["require", "需要"]],
  cet6: [["adopt", "采用"], ["consequence", "后果"], ["crucial", "至关重要的"], ["emerge", "出现"], ["maintain", "维持"], ["perspective", "视角"], ["significant", "显著的；重要的"], ["sustain", "维持；支撑"], ["transform", "转变"], ["valid", "有效的；合理的"]],
  postgraduate: [["approach", "方法；接近"], ["assumption", "假设"], ["constitute", "构成"], ["derive", "获得；源自"], ["evaluate", "评估"], ["indicate", "表明"], ["interpret", "解释"], ["principle", "原则"], ["relevant", "相关的"], ["structure", "结构"]],
  ielts: [["allocate", "分配"], ["coherent", "连贯的"], ["decline", "下降；衰退"], ["diverse", "多样的"], ["evident", "明显的"], ["fluctuate", "波动"], ["impact", "影响"], ["proportion", "比例"], ["sustainable", "可持续的"], ["trend", "趋势"]],
  toefl: [["accumulate", "积累"], ["contribute", "促进；贡献"], ["distinct", "明显不同的"], ["establish", "建立；证实"], ["factor", "因素"], ["fundamental", "根本的"], ["implement", "实施"], ["obtain", "获得"], ["retain", "保留"], ["vary", "变化"]],
  gre: [["ambiguous", "模棱两可的"], ["bolster", "支持；增强"], ["concede", "承认；让步"], ["disparate", "迥然不同的"], ["elucidate", "阐明"], ["mitigate", "缓解"], ["nuance", "细微差别"], ["pragmatic", "务实的"], ["scrutinize", "仔细审查"], ["ubiquitous", "无处不在的"]],
};

export function seedVocabularyBooks() {
  const timestamp = Date.now();
  const insertBook = db.prepare(`INSERT OR IGNORE INTO vocabulary_books
    (id, owner_user_id, code, name_zh, name_en, description_zh, description_en, kind, active, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, 'built_in', 1, ?, ?)`);
  const insertWord = db.prepare(`INSERT OR IGNORE INTO vocabulary_words
    (id, book_id, word, phonetic, translation_zh, difficulty, created_at) VALUES (?, ?, ?, '', ?, ?, ?)`);
  for (const [id, code, nameZh, nameEn, descriptionZh, descriptionEn] of builtinBooks) {
    insertBook.run(id, code, nameZh, nameEn, descriptionZh, descriptionEn, timestamp, timestamp);
    for (const [index, [word, translation]] of (seedWords[code] || []).entries()) {
      insertWord.run(`word_${code}_${word}`, id, word, translation, Math.min(5, 1 + Math.floor(index / 2)), timestamp);
    }
  }
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function extractDocument(file) {
  if (!file?.size) throw immersionError("IMMERSION_SOURCE_REQUIRED");
  if (file.size > MAX_DOCUMENT_BYTES) throw immersionError("IMMERSION_FILE_TOO_LARGE", 413);
  const extension = String(file.name || "").toLowerCase().split(".").pop();
  const kind = supportedFiles.get(file.type) || ({ pdf: "pdf", docx: "docx", txt: "txt", md: "markdown", markdown: "markdown" })[extension];
  if (!kind) throw immersionError("IMMERSION_FILE_UNSUPPORTED", 415);
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (kind === "pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { text = (await parser.getText()).text || ""; } finally { await parser.destroy(); }
  } else if (kind === "docx") {
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw immersionError("IMMERSION_DOCUMENT_PARSE_FAILED", 422);
    text = decodeXml(xml.replace(/<w:tab\/?\s*>/g, "\t").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""));
  } else {
    text = buffer.toString("utf8");
  }
  text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
  if (text.length < 20) throw immersionError("IMMERSION_TEXT_NOT_FOUND", 422);
  if (text.length > MAX_SOURCE_CHARACTERS) throw immersionError("IMMERSION_DOCUMENT_TOO_LONG", 413);
  return { buffer, text, kind };
}

export function splitImmersionChapters(source, fallbackTitle = "开始阅读") {
  const text = String(source || "").trim();
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chapters = [];
  let current = { title: fallbackTitle, paragraphs: [] };
  const heading = /^(?:#{1,3}\s+.+|第[一二三四五六七八九十百零〇0-9]+[章节回篇].*|chapter\s+\d+.*)$/i;
  for (const paragraph of paragraphs) {
    if (heading.test(paragraph) && current.paragraphs.length) {
      chapters.push(current);
      current = { title: paragraph.replace(/^#{1,3}\s+/, "").slice(0, 120), paragraphs: [] };
      continue;
    }
    const length = current.paragraphs.join("\n\n").length;
    if (length >= CHAPTER_TARGET_CHARACTERS && current.paragraphs.length) {
      chapters.push(current);
      current = { title: `${fallbackTitle} ${chapters.length + 1}`, paragraphs: [] };
    }
    current.paragraphs.push(paragraph);
  }
  if (current.paragraphs.length) chapters.push(current);
  return chapters.slice(0, 16).map((chapter, index) => ({
    title: chapter.title || `${fallbackTitle} ${index + 1}`,
    text: chapter.paragraphs.join("\n\n"),
  }));
}

function serializeBook(row) {
  return row && { id: row.id, code: row.code, nameZh: row.name_zh, nameEn: row.name_en, descriptionZh: row.description_zh, descriptionEn: row.description_en, kind: row.kind, wordCount: Number(row.word_count || 0) };
}

export function immersionCatalog(userId) {
  const books = db.prepare(`SELECT b.*, COUNT(w.id) AS word_count FROM vocabulary_books b
    LEFT JOIN vocabulary_words w ON w.book_id = b.id
    WHERE b.active = 1 AND (b.owner_user_id IS NULL OR b.owner_user_id = ?)
    GROUP BY b.id ORDER BY b.kind, b.created_at`).all(userId).map(serializeBook);
  return { books, levels: [
    { value: 10, name: "轻度", description: "保持阅读流畅，少量接触目标词" },
    { value: 20, name: "日常", description: "推荐模式，阅读与学习更平衡" },
    { value: 30, name: "进阶", description: "提高词汇和短语出现频率" },
    { value: 50, name: "深度", description: "大量目标词进入正文" },
    { value: 70, name: "挑战", description: "接近中英混合阅读" },
  ], limits: { maxCharacters: MAX_SOURCE_CHARACTERS, maxFileBytes: MAX_DOCUMENT_BYTES } };
}

export function createCustomVocabularyBook(userId, payload) {
  const name = String(payload.name || "").trim().slice(0, 60);
  const lines = String(payload.words || "").split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).slice(0, 500);
  if (!name || !lines.length) throw immersionError("IMMERSION_CUSTOM_VOCABULARY_REQUIRED");
  const id = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO vocabulary_books
      (id, owner_user_id, code, name_zh, name_en, description_zh, description_en, kind, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '用户上传词库', 'User vocabulary list', 'custom', 1, ?, ?)`)
      .run(id, userId, `custom-${id.slice(0, 8)}`, name, name, timestamp, timestamp);
    const insert = db.prepare(`INSERT OR IGNORE INTO vocabulary_words
      (id, book_id, word, phonetic, translation_zh, difficulty, created_at) VALUES (?, ?, ?, '', ?, 2, ?)`);
    for (const line of lines) {
      const [word, ...translation] = line.split(/[\t:：]/);
      if (/^[A-Za-z][A-Za-z'-]{1,48}$/.test(word?.trim() || "")) insert.run(randomUUID(), id, word.trim().toLowerCase(), translation.join(" ").trim(), timestamp);
    }
    const count = db.prepare("SELECT COUNT(*) AS count FROM vocabulary_words WHERE book_id = ?").get(id).count;
    if (!count) throw immersionError("IMMERSION_CUSTOM_VOCABULARY_INVALID");
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return serializeBook(db.prepare(`SELECT b.*, COUNT(w.id) AS word_count FROM vocabulary_books b LEFT JOIN vocabulary_words w ON w.book_id=b.id WHERE b.id=? GROUP BY b.id`).get(id));
}

export async function createImmersionDocument(request, user) {
  let title;
  let sourceText;
  let sourceKind = "paste";
  let originalFile = null;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const extracted = await extractDocument(file);
    sourceText = extracted.text;
    sourceKind = extracted.kind;
    title = String(form.get("title") || file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 120);
    assertUserFileCapacity(user.id);
    const fileId = randomUUID();
    const stored = await putStoredFile({ userId: user.id, fileId, fileName: file.name, mimeType: file.type || "application/octet-stream", buffer: extracted.buffer });
    originalFile = { id: fileId, name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, ...stored };
  } else {
    const payload = await request.json().catch(() => ({}));
    title = String(payload.title || "我的沉浸阅读").trim().slice(0, 120);
    sourceText = String(payload.text || "").replace(/\r\n?/g, "\n").trim();
    if (sourceText.length < 20) throw immersionError("IMMERSION_SOURCE_REQUIRED");
    if (sourceText.length > MAX_SOURCE_CHARACTERS) throw immersionError("IMMERSION_DOCUMENT_TOO_LONG", 413);
  }
  const chapters = splitImmersionChapters(sourceText, title || "开始阅读");
  if (!chapters.length) throw immersionError("IMMERSION_TEXT_NOT_FOUND", 422);
  const id = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (originalFile) {
      db.prepare(`INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)`)
        .run(originalFile.id, user.id, originalFile.name, originalFile.storageName, originalFile.mimeType, originalFile.sizeBytes, timestamp);
      db.prepare(`INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?, 'available',?,?)`)
        .run(originalFile.id, originalFile.provider, originalFile.objectKey, originalFile.etag, timestamp, timestamp);
    }
    db.prepare(`INSERT INTO immersion_documents
      (id,user_id,original_file_id,title,source_kind,source_text,status,immersion_level,word_count,chapter_count,created_at,updated_at)
      VALUES (?,?,?,?,?,?,'draft',20,?,?,?,?)`).run(id, user.id, originalFile?.id || null, title || "我的沉浸阅读", sourceKind, sourceText, sourceText.length, chapters.length, timestamp, timestamp);
    const insertChapter = db.prepare(`INSERT INTO immersion_chapters
      (id,document_id,chapter_index,title,source_text,status,word_count,created_at,updated_at)
      VALUES (?,?,?,?,?,'draft',?,?,?)`);
    chapters.forEach((chapter, index) => insertChapter.run(randomUUID(), id, index, chapter.title, chapter.text, chapter.text.length, timestamp, timestamp));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    if (originalFile) await deleteStoredFile(originalFile).catch(() => {});
    throw error;
  }
  audit(user.id, "immersion.document.create", "immersion_document", id, { sourceKind, chapterCount: chapters.length });
  return getImmersionDocument(user.id, id, false);
}

function documentRow(userId, documentId) {
  return db.prepare(`SELECT d.*, b.name_zh AS book_name_zh, b.name_en AS book_name_en,
    COALESCE(r.percentage,0) AS reading_percentage, COALESCE(r.chapter_index,0) AS reading_chapter
    FROM immersion_documents d LEFT JOIN vocabulary_books b ON b.id=d.vocabulary_book_id
    LEFT JOIN immersion_reading_progress r ON r.document_id=d.id AND r.user_id=d.user_id
    WHERE d.id=? AND d.user_id=?`).get(documentId, userId);
}

function serializeDocument(row) {
  return row && { id: row.id, title: row.title, sourceKind: row.source_kind, status: row.status, immersionLevel: row.immersion_level, wordCount: row.word_count, chapterCount: row.chapter_count, generatedChapters: row.generated_chapters, errorCode: row.error_code, vocabularyBook: row.vocabulary_book_id ? { id: row.vocabulary_book_id, nameZh: row.book_name_zh, nameEn: row.book_name_en } : null, readingProgress: row.reading_percentage || 0, readingChapter: row.reading_chapter || 0, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function listImmersionDocuments(userId) {
  return db.prepare(`SELECT d.*, b.name_zh AS book_name_zh, b.name_en AS book_name_en,
    COALESCE(r.percentage,0) AS reading_percentage, COALESCE(r.chapter_index,0) AS reading_chapter
    FROM immersion_documents d LEFT JOIN vocabulary_books b ON b.id=d.vocabulary_book_id
    LEFT JOIN immersion_reading_progress r ON r.document_id=d.id AND r.user_id=d.user_id
    WHERE d.user_id=? ORDER BY d.updated_at DESC`).all(userId).map(serializeDocument);
}

export function getImmersionDocument(userId, documentId, includeSource = false) {
  const row = documentRow(userId, documentId);
  if (!row) throw immersionError("IMMERSION_DOCUMENT_NOT_FOUND", 404);
  const chapters = db.prepare(`SELECT id,chapter_index,title,source_text,segments_json,status,word_count
    FROM immersion_chapters WHERE document_id=? ORDER BY chapter_index`).all(documentId).map((chapter) => ({
      id: chapter.id, index: chapter.chapter_index, title: chapter.title, status: chapter.status, wordCount: chapter.word_count,
      ...(includeSource ? { sourceText: chapter.source_text } : {}),
      segments: chapter.status === "ready" ? JSON.parse(chapter.segments_json || "[]") : [],
    }));
  const generation = db.prepare(`SELECT t.status,t.completed_chapters AS completedChapters,t.total_chapters AS totalChapters,t.error_code AS errorCode
    FROM immersion_generation_tasks t WHERE t.document_id=? ORDER BY t.created_at DESC LIMIT 1`).get(documentId) || null;
  return { ...serializeDocument(row), chapters, generation };
}

export function createImmersionGeneration(user, documentId, payload) {
  const document = documentRow(user.id, documentId);
  if (!document) throw immersionError("IMMERSION_DOCUMENT_NOT_FOUND", 404);
  if (["queued", "generating"].includes(document.status)) throw immersionError("IMMERSION_GENERATION_IN_PROGRESS", 409);
  const level = Number(payload.immersionLevel || 20);
  if (!allowedLevels.has(level)) throw immersionError("IMMERSION_LEVEL_INVALID");
  const book = db.prepare("SELECT id FROM vocabulary_books WHERE id=? AND active=1 AND (owner_user_id IS NULL OR owner_user_id=?)").get(String(payload.vocabularyBookId || ""), user.id);
  if (!book) throw immersionError("IMMERSION_VOCABULARY_NOT_FOUND", 404);
  const tool = db.prepare("SELECT * FROM tools WHERE slug='word-immersion'").get();
  const available = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance);
  if (available < tool.credit_cost) throw immersionError("INSUFFICIENT_CREDITS", 402);
  const taskId = randomUUID();
  const timestamp = Date.now();
  const modelConnectionId = toolModelSelection(user.id, tool.id, payload.modelConnectionId || null);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`UPDATE immersion_documents SET vocabulary_book_id=?,immersion_level=?,status='queued',generated_chapters=0,error_code=NULL,updated_at=? WHERE id=?`).run(book.id, level, timestamp, documentId);
    db.prepare(`UPDATE immersion_chapters SET segments_json='[]',status='draft',updated_at=? WHERE document_id=?`).run(timestamp, documentId);
    db.prepare(`INSERT INTO tasks (id,user_id,tool_id,status,input_json,credit_cost,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?,?)`)
      .run(taskId, user.id, tool.id, JSON.stringify({ documentId, vocabularyBookId: book.id, immersionLevel: level, modelConnectionId }), tool.credit_cost, timestamp, timestamp);
    db.prepare(`INSERT INTO immersion_generation_tasks (task_id,document_id,status,total_chapters,created_at,updated_at) VALUES (?,?,'queued',?,?,?)`).run(taskId, documentId, document.chapter_count, timestamp, timestamp);
    if (tool.credit_cost > 0) {
      db.prepare(`INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at)
        VALUES (?,?,'consumption',?,'生成词浸沉浸阅读','Generated WordIn immersion reading','task',?,?)`).run(randomUUID(), user.id, -tool.credit_cost, taskId, timestamp);
      db.prepare(`INSERT INTO task_settlements (id,task_id,kind,amount,created_at) VALUES (?,?,'reserve',?,?)`).run(randomUUID(), taskId, tool.credit_cost, timestamp);
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return { id: taskId, status: "queued", creditCost: tool.credit_cost };
}

function parseModelSegments(raw) {
  const compact = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let payload;
  try { payload = JSON.parse(compact); } catch { throw immersionError("IMMERSION_INVALID_MODEL_OUTPUT", 502, true); }
  const source = Array.isArray(payload) ? payload : payload.segments;
  if (!Array.isArray(source) || !source.length || source.length > 800) throw immersionError("IMMERSION_INVALID_MODEL_OUTPUT", 502, true);
  return source.map((segment) => {
    if (segment?.type === "word") {
      const word = String(segment.word || "").trim().slice(0, 60);
      const text = String(segment.text || word).slice(0, 100);
      if (!word || !text) throw immersionError("IMMERSION_INVALID_MODEL_OUTPUT", 502, true);
      return { type: "word", text, word, original: String(segment.original || "").slice(0, 80), translation: String(segment.translation || "").slice(0, 120), phonetic: String(segment.phonetic || "").slice(0, 100), exposureLevel: Math.min(4, Math.max(1, Number(segment.exposureLevel || 1))) };
    }
    const text = String(segment?.text || "");
    if (!text) throw immersionError("IMMERSION_INVALID_MODEL_OUTPUT", 502, true);
    return { type: "normal", text };
  });
}

export async function executeImmersionTask(task, input, modelInvoker = invokeModel) {
  const document = documentRow(task.user_id, input.documentId);
  if (!document) throw immersionError("IMMERSION_DOCUMENT_NOT_FOUND", 404);
  const chapters = db.prepare("SELECT * FROM immersion_chapters WHERE document_id=? ORDER BY chapter_index").all(document.id);
  const words = db.prepare(`SELECT word,phonetic,translation_zh AS translation FROM vocabulary_words WHERE book_id=? ORDER BY difficulty,word LIMIT 160`).all(input.vocabularyBookId);
  if (!words.length) throw immersionError("IMMERSION_VOCABULARY_EMPTY", 422);
  const learned = db.prepare(`SELECT word,exposure_count AS exposureCount,known_status AS knownStatus,familiarity_score AS familiarityScore
    FROM user_vocabulary_progress WHERE user_id=? ORDER BY last_seen_at DESC LIMIT 60`).all(task.user_id);
  const timestamp = Date.now();
  db.prepare("UPDATE immersion_documents SET status='generating',updated_at=? WHERE id=?").run(timestamp, document.id);
  db.prepare("UPDATE immersion_generation_tasks SET status='running',updated_at=? WHERE task_id=?").run(timestamp, task.id);
  for (const [chapterNumber, chapter] of chapters.entries()) {
    db.prepare("UPDATE immersion_chapters SET status='generating',updated_at=? WHERE id=?").run(Date.now(), chapter.id);
    const result = await modelInvoker({
      userId: task.user_id,
      taskId: task.id,
      capability: "word-immersion",
      connectionId: input.modelConnectionId || null,
      timeoutMs: 120_000,
      instruction: `你是“词浸”沉浸式阅读改写引擎。保持原文事实、人物、数字、专业术语和逻辑完全不变，只在语义自然时把中文词语或表达融入目标英文词汇。沉浸度 ${input.immersionLevel}% 代表大致密度，不是机械字符比例。首次接触可在英文后保留简短中文提示，熟悉后减少提示。不要强行插词或制造病句。只输出严格 JSON：{"segments":[{"type":"normal","text":"原文"},{"type":"word","text":"significant（显著的）","word":"significant","original":"显著的","translation":"显著的；重要的","phonetic":"","exposureLevel":1}]}。normal 与 word 片段连续拼接后必须构成完整正文。`,
      text: `目标词库：${JSON.stringify(words)}\n用户近期词汇记忆：${JSON.stringify(learned)}\n需要改写的章节：\n${chapter.source_text}`,
    });
    const segments = parseModelSegments(result.text);
    db.exec("BEGIN IMMEDIATE");
    try {
      const seenAt = Date.now();
      db.prepare("UPDATE immersion_chapters SET segments_json=?,status='ready',updated_at=? WHERE id=?").run(JSON.stringify(segments), seenAt, chapter.id);
      const insertExposure = db.prepare(`INSERT INTO word_exposures (id,user_id,document_id,chapter_id,word,context_text,exposure_level,created_at) VALUES (?,?,?,?,?,?,?,?)`);
      const upsertProgress = db.prepare(`INSERT INTO user_vocabulary_progress
        (id,user_id,word,translation_zh,phonetic,exposure_count,first_seen_at,last_seen_at,next_review_at,created_at,updated_at)
        VALUES (?,?,?,?,?,1,?,?,?,?,?) ON CONFLICT(user_id,word) DO UPDATE SET
          translation_zh=CASE WHEN excluded.translation_zh<>'' THEN excluded.translation_zh ELSE translation_zh END,
          phonetic=CASE WHEN excluded.phonetic<>'' THEN excluded.phonetic ELSE phonetic END,
          exposure_count=exposure_count+1,last_seen_at=excluded.last_seen_at,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at`);
      for (const segment of segments.filter((item) => item.type === "word")) {
        insertExposure.run(randomUUID(), task.user_id, document.id, chapter.id, segment.word.toLowerCase(), segment.text, segment.exposureLevel, seenAt);
        upsertProgress.run(randomUUID(), task.user_id, segment.word.toLowerCase(), segment.translation, segment.phonetic, seenAt, seenAt, seenAt + 86_400_000, seenAt, seenAt);
      }
      db.prepare("UPDATE immersion_documents SET generated_chapters=?,updated_at=? WHERE id=?").run(chapterNumber + 1, seenAt, document.id);
      db.prepare("UPDATE immersion_generation_tasks SET completed_chapters=?,updated_at=? WHERE task_id=?").run(chapterNumber + 1, seenAt, task.id);
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  const completedAt = Date.now();
  db.prepare("UPDATE immersion_documents SET status='ready',error_code=NULL,updated_at=? WHERE id=?").run(completedAt, document.id);
  db.prepare("UPDATE immersion_generation_tasks SET status='completed',updated_at=? WHERE task_id=?").run(completedAt, task.id);
  return { status: "completed", output: { documentId: document.id, chapterCount: chapters.length, immersionLevel: input.immersionLevel, vocabularyBookId: input.vocabularyBookId } };
}

export function failImmersionTask(taskId, errorCode) {
  const generation = db.prepare("SELECT document_id FROM immersion_generation_tasks WHERE task_id=?").get(taskId);
  if (!generation) return;
  db.prepare("UPDATE immersion_generation_tasks SET status='failed',error_code=?,updated_at=? WHERE task_id=?").run(errorCode, Date.now(), taskId);
  db.prepare("UPDATE immersion_documents SET status='failed',error_code=?,updated_at=? WHERE id=?").run(errorCode, Date.now(), generation.document_id);
  db.prepare("UPDATE immersion_chapters SET status=CASE WHEN status='ready' THEN status ELSE 'failed' END,updated_at=? WHERE document_id=?").run(Date.now(), generation.document_id);
}

export async function deleteImmersionDocument(user, documentId) {
  const row = db.prepare(`SELECT d.id,f.storage_name AS storageName,s.provider,s.object_key AS objectKey
    FROM immersion_documents d LEFT JOIN files f ON f.id=d.original_file_id LEFT JOIN file_storage_objects s ON s.file_id=f.id
    WHERE d.id=? AND d.user_id=?`).get(documentId, user.id);
  if (!row) throw immersionError("IMMERSION_DOCUMENT_NOT_FOUND", 404);
  if (row.storageName) await deleteStoredFile(row).catch(() => {});
  db.exec("BEGIN IMMEDIATE");
  try {
    const fileId = db.prepare("SELECT original_file_id AS fileId FROM immersion_documents WHERE id=?").get(documentId)?.fileId;
    db.prepare("DELETE FROM immersion_documents WHERE id=? AND user_id=?").run(documentId, user.id);
    if (fileId) db.prepare("DELETE FROM files WHERE id=? AND user_id=?").run(fileId, user.id);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  audit(user.id, "immersion.document.delete", "immersion_document", documentId);
  return { ok: true };
}

export function updateReadingProgress(userId, documentId, payload) {
  if (!documentRow(userId, documentId)) throw immersionError("IMMERSION_DOCUMENT_NOT_FOUND", 404);
  const percentage = Math.min(100, Math.max(0, Number(payload.percentage || 0)));
  const chapterIndex = Math.max(0, Number(payload.chapterIndex || 0));
  const paragraphIndex = Math.max(0, Number(payload.paragraphIndex || 0));
  db.prepare(`INSERT INTO immersion_reading_progress (user_id,document_id,chapter_index,paragraph_index,percentage,updated_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,document_id) DO UPDATE SET chapter_index=excluded.chapter_index,paragraph_index=excluded.paragraph_index,percentage=excluded.percentage,updated_at=excluded.updated_at`)
    .run(userId, documentId, chapterIndex, paragraphIndex, percentage, Date.now());
  return { documentId, chapterIndex, paragraphIndex, percentage };
}

export function recordVocabularyAction(userId, payload) {
  const word = String(payload.word || "").trim().toLowerCase().slice(0, 60);
  const action = String(payload.action || "view");
  if (!word || !["view", "save", "known", "unknown"].includes(action)) throw immersionError("IMMERSION_WORD_ACTION_INVALID");
  const row = db.prepare("SELECT * FROM user_vocabulary_progress WHERE user_id=? AND word=?").get(userId, word);
  if (!row) throw immersionError("IMMERSION_WORD_NOT_FOUND", 404);
  const status = action === "known" ? "known" : action === "unknown" ? "unknown" : row.known_status;
  const familiarity = action === "known" ? Math.min(100, row.familiarity_score + 20) : action === "unknown" ? Math.max(0, row.familiarity_score - 10) : action === "save" ? Math.max(10, row.familiarity_score) : row.familiarity_score;
  db.prepare(`UPDATE user_vocabulary_progress SET click_count=click_count+1,known_status=?,familiarity_score=?,next_review_at=?,updated_at=? WHERE id=?`)
    .run(status, familiarity, Date.now() + (status === "known" ? 7 : 1) * 86_400_000, Date.now(), row.id);
  if (payload.exposureId) db.prepare("UPDATE word_exposures SET clicked_at=? WHERE id=? AND user_id=?").run(Date.now(), String(payload.exposureId), userId);
  return userVocabulary(userId).words.find((item) => item.word === word);
}

export function userVocabulary(userId) {
  const rows = db.prepare(`SELECT * FROM user_vocabulary_progress WHERE user_id=? ORDER BY
    CASE known_status WHEN 'unknown' THEN 0 WHEN 'learning' THEN 1 ELSE 2 END,last_seen_at DESC`).all(userId);
  const words = rows.map((row) => ({ id: row.id, word: row.word, translation: row.translation_zh, phonetic: row.phonetic, exposureCount: row.exposure_count, clickCount: row.click_count, knownStatus: row.known_status, familiarityScore: row.familiarity_score, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at, nextReviewAt: row.next_review_at }));
  return { words, stats: { encountered: words.length, learning: words.filter((item) => item.knownStatus === "learning").length, known: words.filter((item) => item.knownStatus === "known").length, unknown: words.filter((item) => item.knownStatus === "unknown").length } };
}
