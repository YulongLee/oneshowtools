import { randomUUID } from "node:crypto";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import engData from "@tesseract.js-data/eng";
import chiSimData from "@tesseract.js-data/chi_sim";
import { audit, dataDirectory, db } from "./database.mjs";
import { assertUserFileCapacity } from "./file-quota.mjs";
import { editPlatformImage, recognizePlatformImageText } from "./image-edit-provider.mjs";
import { invokePlatformModel } from "./model-gateway.mjs";
import { deleteStoredFile, putStoredFile, readStoredFile } from "./object-storage.mjs";

const error = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const parse = (value, fallback = {}) => { try { return JSON.parse(value || "") || fallback; } catch { return fallback; } };
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const clean = (value, max = 500) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const pptxMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const decodeXml = (value) => String(value || "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const encodeXml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function parsePptShape(shapeXml, slideWidth, slideHeight) {
  const text = [...shapeXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => decodeXml(match[1])).join("").trim();
  if (!text) return null;
  const offset = shapeXml.match(/<a:off[^>]*\bx="(\d+)"[^>]*\by="(\d+)"/);
  const extent = shapeXml.match(/<a:ext[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const size = Number(shapeXml.match(/<a:rPr[^>]*\bsz="(\d+)"/)?.[1] || shapeXml.match(/<a:defRPr[^>]*\bsz="(\d+)"/)?.[1] || 2400) / 100;
  const color = shapeXml.match(/<a:srgbClr[^>]*\bval="([0-9A-Fa-f]{6})"/)?.[1];
  return {
    text: clean(text, 2000),
    bbox: { x: Number(offset?.[1] || 0) / slideWidth, y: Number(offset?.[2] || 0) / slideHeight, width: Math.max(.08, Number(extent?.[1] || slideWidth * .4) / slideWidth), height: Math.max(.05, Number(extent?.[2] || slideHeight * .12) / slideHeight) },
    style: { fontSize: clamp(size, 8, 96), color: color ? `#${color}` : "#17264d", bold: /\bb="1"/.test(shapeXml), align: "left" },
  };
}

async function parsePptx(buffer) {
  const archive = await JSZip.loadAsync(buffer).catch(() => null);
  if (!archive?.file("ppt/presentation.xml")) throw error("PPT_FILE_INVALID", 422);
  const presentation = await archive.file("ppt/presentation.xml").async("string");
  const slideWidth = Number(presentation.match(/<p:sldSz[^>]*\bcx="(\d+)"/)?.[1] || 12192000);
  const slideHeight = Number(presentation.match(/<p:sldSz[^>]*\bcy="(\d+)"/)?.[1] || 6858000);
  const slideFiles = Object.keys(archive.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  if (slideFiles.length > 200) throw error("PPT_FILE_TOO_COMPLEX", 422);
  const slides = [];
  let itemCount = 0;
  for (let index = 0; index < slideFiles.length; index += 1) {
    const xml = await archive.file(slideFiles[index]).async("string");
    const shapes = [...xml.matchAll(/<p:sp(?:\s[^>]*)?>[\s\S]*?<\/p:sp>/g)];
    const items = shapes.map((match, shapeIndex) => {
      const parsed = parsePptShape(match[0], slideWidth, slideHeight);
      return parsed ? { shapeIndex, ...parsed } : null;
    }).filter(Boolean);
    itemCount += items.length;
    if (itemCount > 5000) throw error("PPT_FILE_TOO_COMPLEX", 422);
    slides.push({ number: index + 1, items });
  }
  if (!slides.length) throw error("PPT_FILE_INVALID", 422);
  return { archive, slideWidth, slideHeight, slides };
}

async function ocrLanguageDirectory() {
  const directory = join(dataDirectory, "ocr-languages");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    copyFile(join(engData.langPath, "eng.traineddata.gz"), join(directory, "eng.traineddata.gz")).catch((cause) => { if (cause.code !== "EEXIST") throw cause; }),
    copyFile(join(chiSimData.langPath, "chi_sim.traineddata.gz"), join(directory, "chi_sim.traineddata.gz")).catch((cause) => { if (cause.code !== "EEXIST") throw cause; }),
  ]);
  return directory;
}

export class OCRProvider {
  async detect() { throw error("OCR_PROVIDER_NOT_IMPLEMENTED", 500); }
}

export class TesseractOCRProvider extends OCRProvider {
  async detect(buffer) {
    const langPath = await ocrLanguageDirectory();
    const cachePath = join(dataDirectory, "ocr-cache");
    await mkdir(cachePath, { recursive: true });
    const worker = await createWorker("chi_sim+eng", 1, { langPath, cachePath, gzip: true, logger: () => {} });
    let result;
    try { result = await worker.recognize(buffer, {}, { text: true, blocks: true }); }
    finally { await worker.terminate(); }
    const lines = (result?.data?.blocks || []).flatMap((block) => block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []);
    return lines.map((line) => ({
      text: clean(line.text, 500),
      confidence: clamp(line.confidence, 0, 100) / 100,
      bbox: { x: line.bbox.x0, y: line.bbox.y0, width: line.bbox.x1 - line.bbox.x0, height: line.bbox.y1 - line.bbox.y0 },
      rotation: 0,
    })).filter((item) => item.text && item.bbox.width > 4 && item.bbox.height > 4);
  }
}

export class ModelOCRProvider extends OCRProvider {
  async detect(buffer) { return recognizePlatformImageText({ buffer, mimeType: "image/png" }); }
}

export class HybridOCRProvider extends OCRProvider {
  constructor(primary = new ModelOCRProvider(), fallback = new TesseractOCRProvider()) { super(); this.primary = primary; this.fallback = fallback; }
  async detect(buffer) {
    try {
      const result = await this.primary.detect(buffer);
      if (result?.length) return result;
    } catch { /* Keep uploads available while the managed OCR model is disabled or temporarily unavailable. */ }
    return this.fallback.detect(buffer);
  }
}

export class TextStyleAnalyzer {
  analyze(detection) {
    return { fontFamily: "auto", fontSize: Math.max(12, Math.round(detection.bbox.height * .78)), color: "#17264d", bold: true, italic: false, underline: false, align: "center", letterSpacing: 0, ...(detection.style || {}) };
  }
}

export class ImageInpaintingProvider {
  async repair(buffer, mimeType, prompt) {
    return editPlatformImage({ purpose: "image_editing", buffer, mimeType, prompt });
  }
}

export class TranslationProvider {
  async rewrite(text, mode) {
    const instruction = mode === "polish"
      ? "润色用户提供的短文案，保留原意、长度接近，只输出结果，不要解释。"
      : "将用户提供的短文案翻译为另一种语言；中文翻译成自然英文，其他语言翻译成简体中文。只输出译文。";
    const result = await invokePlatformModel({ purpose: "oneshow_home_chat", service: "image-text-editor", instruction, messages: [{ role: "user", content: text }], timeoutMs: 45_000 });
    return clean(result.text, 500);
  }
}

export class StorageProvider {
  async put(input) { return putStoredFile(input); }
  async read(input) { return readStoredFile(input); }
}

const ocrProvider = new HybridOCRProvider();
const styleAnalyzer = new TextStyleAnalyzer();
const inpaintingProvider = new ImageInpaintingProvider();
const translationProvider = new TranslationProvider();
const storageProvider = new StorageProvider();

function fileRow(fileId, userId) {
  return db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ? AND f.user_id = ?`).get(fileId, userId);
}

function publicDetection(row) {
  return { id: row.id, originalText: row.original_text, currentText: row.current_text, bbox: parse(row.bbox_json), confidence: row.confidence, rotation: row.rotation, style: parse(row.style_json) };
}

function publicAsset(row) {
  const fileId = row.current_file_id || row.original_file_id;
  return { id: row.id, projectId: row.project_id, name: row.name, width: row.width, height: row.height, status: row.status,
    originalFileId: row.original_file_id, currentFileId: row.current_file_id, imageUrl: `/api/files/${fileId}/download`, originalUrl: `/api/files/${row.original_file_id}/download`,
    detections: db.prepare("SELECT * FROM image_text_detections WHERE asset_id = ? ORDER BY created_at").all(row.id).map(publicDetection) };
}

export function getImageTextProject(userId, projectId) {
  const project = db.prepare("SELECT * FROM image_text_projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw error("IMAGE_TEXT_PROJECT_NOT_FOUND", 404);
  return { id: project.id, name: project.name, status: project.status, createdAt: project.created_at, updatedAt: project.updated_at,
    assets: db.prepare("SELECT * FROM image_text_assets WHERE project_id = ? ORDER BY created_at").all(project.id).map(publicAsset) };
}

function publicPptItem(row) {
  return { id: row.id, slideNumber: row.slide_number, shapeIndex: row.shape_index, originalText: row.original_text, currentText: row.current_text, bbox: parse(row.bbox_json), style: parse(row.style_json) };
}

export function getPptTextProject(userId, projectId) {
  const project = db.prepare("SELECT * FROM ppt_text_projects WHERE id=? AND user_id=?").get(clean(projectId, 64), userId);
  if (!project) throw error("PPT_PROJECT_NOT_FOUND", 404);
  const items = db.prepare("SELECT * FROM ppt_text_items WHERE project_id=? ORDER BY slide_number,shape_index").all(project.id).map(publicPptItem);
  return {
    id: project.id, name: project.name, slideCount: project.slide_count, slideWidth: project.slide_width, slideHeight: project.slide_height,
    status: project.status, sourceFileId: project.source_file_id, currentFileId: project.current_file_id,
    downloadUrl: project.current_file_id ? `/api/files/${project.current_file_id}/download` : null,
    slides: Array.from({ length: project.slide_count }, (_, index) => ({ number: index + 1, items: items.filter((item) => item.slideNumber === index + 1) })),
  };
}

export async function uploadPptTextProject(request, user) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw error("PPT_FILE_REQUIRED");
  if (!/\.pptx$/i.test(file.name) && file.type !== pptxMime) throw error("PPT_FILE_UNSUPPORTED", 415);
  if (file.size > 50 * 1024 * 1024) throw error("PPT_FILE_TOO_LARGE", 413);
  assertUserFileCapacity(user.id);
  const source = Buffer.from(await file.arrayBuffer());
  const parsedPpt = await parsePptx(source);
  const fileId = randomUUID(); const projectId = randomUUID(); const timestamp = Date.now();
  const stored = await storageProvider.put({ userId: user.id, fileId, fileName: clean(file.name, 180) || "slides.pptx", mimeType: pptxMime, buffer: source });
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(fileId, user.id, clean(file.name, 180), stored.storageName, pptxMime, source.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?, 'available',?,?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.prepare("INSERT INTO ppt_text_projects (id,user_id,source_file_id,name,slide_count,slide_width,slide_height,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'ready',?,?)")
      .run(projectId, user.id, fileId, clean(file.name.replace(/\.pptx$/i, ""), 120) || "未命名演示文稿", parsedPpt.slides.length, parsedPpt.slideWidth, parsedPpt.slideHeight, timestamp, timestamp);
    const insert = db.prepare("INSERT INTO ppt_text_items (id,project_id,slide_number,shape_index,original_text,current_text,bbox_json,style_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    for (const slide of parsedPpt.slides) for (const item of slide.items) insert.run(randomUUID(), projectId, slide.number, item.shapeIndex, item.text, item.text, JSON.stringify(item.bbox), JSON.stringify(item.style), timestamp, timestamp);
    db.exec("COMMIT");
    audit(user.id, "image_text.ppt_upload", "ppt_text_project", projectId, { slideCount: parsedPpt.slides.length });
    return getPptTextProject(user.id, projectId);
  } catch (cause) {
    try { db.exec("ROLLBACK"); } catch { /* no active transaction */ }
    await deleteStoredFile(stored).catch(() => {});
    if (cause?.code) throw cause;
    throw error("PPT_UPLOAD_FAILED", 500);
  }
}

export function updatePptTextItem(userId, itemId, payload) {
  const row = db.prepare(`SELECT i.*,p.user_id,p.id AS project_id FROM ppt_text_items i
    JOIN ppt_text_projects p ON p.id=i.project_id WHERE i.id=? AND p.user_id=?`).get(clean(itemId, 64), userId);
  if (!row) throw error("PPT_TEXT_NOT_FOUND", 404);
  const currentText = clean(payload.text ?? row.current_text, 2000);
  if (!currentText) throw error("IMAGE_TEXT_REPLACEMENT_REQUIRED", 422);
  db.prepare("UPDATE ppt_text_items SET current_text=?,updated_at=? WHERE id=?").run(currentText, Date.now(), row.id);
  return publicPptItem(db.prepare("SELECT * FROM ppt_text_items WHERE id=?").get(row.id));
}

export function createPptTextExportTask(user, tool, payload) {
  const project = db.prepare("SELECT * FROM ppt_text_projects WHERE id=? AND user_id=?").get(clean(payload.projectId, 64), user.id);
  if (!project) throw error("PPT_PROJECT_NOT_FOUND", 404);
  const available = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance);
  if (available < tool.creditCost) throw error("INSUFFICIENT_CREDITS", 402);
  assertUserFileCapacity(user.id);
  const taskId = randomUUID(); const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO tasks (id,user_id,tool_id,status,input_json,output_json,credit_cost,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?,?,?)")
      .run(taskId, user.id, tool.id, JSON.stringify({ mode: "ppt-export", projectId: project.id, sourceFileId: project.source_file_id }), JSON.stringify({ progress: 8, phase: "preparing", mode: "ppt" }), tool.creditCost, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'consumption',?,?,?,'task',?,?)")
        .run(randomUUID(), user.id, -tool.creditCost, `导出${tool.nameZh} PPT`, `Exported ${tool.nameEn} PPT`, taskId, timestamp);
      db.prepare("INSERT OR IGNORE INTO task_settlements (id,task_id,kind,amount,created_at) VALUES (?,?,'reserve',?,?)").run(randomUUID(), taskId, tool.creditCost, timestamp);
    }
    db.prepare("INSERT INTO execution_jobs (id,task_id,status,attempts,max_attempts,next_attempt_at,created_at,updated_at) VALUES (?,?,'queued',0,2,?,?,?)")
      .run(randomUUID(), taskId, timestamp, timestamp, timestamp);
    db.prepare("UPDATE ppt_text_projects SET status='processing',updated_at=? WHERE id=?").run(timestamp, project.id);
    db.exec("COMMIT");
  } catch (cause) { db.exec("ROLLBACK"); throw cause; }
  audit(user.id, "image_text.ppt_export", "task", taskId, { projectId: project.id });
  return { id: taskId, status: "queued", creditCost: tool.creditCost, output: { progress: 8, phase: "preparing", mode: "ppt" } };
}

export async function uploadImageTextAsset(request, user) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw error("IMAGE_REQUIRED");
  if (!supportedTypes.has(file.type)) throw error("IMAGE_TEXT_FILE_UNSUPPORTED", 415);
  if (file.size > 20 * 1024 * 1024) throw error("IMAGE_TEXT_FILE_TOO_LARGE", 413);
  assertUserFileCapacity(user.id);
  const source = Buffer.from(await file.arrayBuffer());
  const normalized = await sharp(source).rotate().toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!normalized?.info?.width || !normalized?.info?.height) throw error("IMAGE_INVALID", 422);
  if (normalized.info.width < 240 || normalized.info.height < 160) throw error("IMAGE_TEXT_RESOLUTION_TOO_LOW", 422);

  const fileId = randomUUID();
  const stored = await storageProvider.put({ userId: user.id, fileId, fileName: clean(file.name, 180) || "image.png", mimeType: file.type, buffer: normalized.data });
  const projectId = clean(form.get("projectId"), 64) || randomUUID();
  const assetId = randomUUID();
  const timestamp = Date.now();
  try {
    const detections = await ocrProvider.detect(normalized.data);
    db.exec("BEGIN IMMEDIATE");
    const existing = db.prepare("SELECT id FROM image_text_projects WHERE id = ? AND user_id = ?").get(projectId, user.id);
    if (!existing) db.prepare("INSERT INTO image_text_projects (id,user_id,name,status,created_at,updated_at) VALUES (?,?,?,'ready',?,?)")
      .run(projectId, user.id, clean(file.name.replace(/\.[^.]+$/, ""), 120) || "未命名图片项目", timestamp, timestamp);
    db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(fileId, user.id, clean(file.name, 180), stored.storageName, file.type, normalized.data.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?, 'available',?,?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.prepare("INSERT INTO image_text_assets (id,project_id,original_file_id,name,width,height,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'ready',?,?)")
      .run(assetId, projectId, fileId, clean(file.name, 180), normalized.info.width, normalized.info.height, timestamp, timestamp);
    const insert = db.prepare("INSERT INTO image_text_detections (id,asset_id,original_text,current_text,bbox_json,confidence,rotation,style_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    for (const item of detections) insert.run(randomUUID(), assetId, item.text, item.text, JSON.stringify(item.bbox), item.confidence, item.rotation, JSON.stringify(styleAnalyzer.analyze(item)), timestamp, timestamp);
    db.prepare("UPDATE image_text_projects SET updated_at = ? WHERE id = ?").run(timestamp, projectId);
    db.exec("COMMIT");
    audit(user.id, "image_text.upload", "image_text_project", projectId, { assetId, detectionCount: detections.length });
    return getImageTextProject(user.id, projectId);
  } catch (cause) {
    try { db.exec("ROLLBACK"); } catch { /* no active transaction */ }
    await deleteStoredFile(stored).catch(() => {});
    if (cause?.code) throw cause;
    throw error("IMAGE_TEXT_OCR_FAILED", 502);
  }
}

export function updateImageTextDetection(userId, detectionId, payload) {
  const row = db.prepare(`SELECT d.*, a.project_id, p.user_id FROM image_text_detections d
    JOIN image_text_assets a ON a.id=d.asset_id JOIN image_text_projects p ON p.id=a.project_id WHERE d.id=? AND p.user_id=?`).get(detectionId, userId);
  if (!row) throw error("IMAGE_TEXT_DETECTION_NOT_FOUND", 404);
  const before = { text: row.current_text, style: parse(row.style_json) };
  const currentText = clean(payload.text ?? row.current_text, 500);
  if (!currentText) throw error("IMAGE_TEXT_REPLACEMENT_REQUIRED", 422);
  const suppliedStyle = payload.style && typeof payload.style === "object" ? payload.style : {};
  const style = { ...before.style,
    fontFamily: ["auto", "sans", "serif"].includes(suppliedStyle.fontFamily) ? suppliedStyle.fontFamily : before.style.fontFamily,
    fontSize: clamp(suppliedStyle.fontSize ?? before.style.fontSize, 8, 300), color: /^#[0-9a-f]{6}$/i.test(suppliedStyle.color) ? suppliedStyle.color : before.style.color,
    bold: suppliedStyle.bold == null ? before.style.bold : Boolean(suppliedStyle.bold), align: ["left", "center", "right"].includes(suppliedStyle.align) ? suppliedStyle.align : before.style.align };
  const timestamp = Date.now();
  db.prepare("UPDATE image_text_detections SET current_text=?, style_json=?, updated_at=? WHERE id=?").run(currentText, JSON.stringify(style), timestamp, detectionId);
  db.prepare("INSERT INTO image_text_operations (id,project_id,asset_id,detection_id,operation_type,before_json,after_json,created_at) VALUES (?,?,?,?, 'update_text',?,?,?)")
    .run(randomUUID(), row.project_id, row.asset_id, detectionId, JSON.stringify(before), JSON.stringify({ text: currentText, style }), timestamp);
  return publicDetection(db.prepare("SELECT * FROM image_text_detections WHERE id=?").get(detectionId));
}

export async function redetectImageTextAsset(userId, assetId) {
  const asset = db.prepare(`SELECT a.*, p.user_id FROM image_text_assets a
    JOIN image_text_projects p ON p.id=a.project_id WHERE a.id=? AND p.user_id=?`).get(clean(assetId, 64), userId);
  if (!asset) throw error("IMAGE_TEXT_ASSET_NOT_FOUND", 404);
  const sourceFile = fileRow(asset.current_file_id || asset.original_file_id, userId);
  if (!sourceFile) throw error("IMAGE_TEXT_SOURCE_MISSING", 404);
  try {
    const source = await storageProvider.read({ provider: sourceFile.storage_provider, objectKey: sourceFile.object_key, storageName: sourceFile.storage_name });
    const detections = await ocrProvider.detect(source);
    const timestamp = Date.now();
    db.exec("BEGIN IMMEDIATE");
    db.prepare("DELETE FROM image_text_detections WHERE asset_id=?").run(asset.id);
    const insert = db.prepare("INSERT INTO image_text_detections (id,asset_id,original_text,current_text,bbox_json,confidence,rotation,style_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    for (const item of detections) insert.run(randomUUID(), asset.id, item.text, item.text, JSON.stringify(item.bbox), item.confidence, item.rotation, JSON.stringify(styleAnalyzer.analyze(item)), timestamp, timestamp);
    db.prepare("UPDATE image_text_assets SET status='ready',updated_at=? WHERE id=?").run(timestamp, asset.id);
    db.prepare("UPDATE image_text_projects SET status='ready',updated_at=? WHERE id=?").run(timestamp, asset.project_id);
    db.exec("COMMIT");
    audit(userId, "image_text.redetect", "image_text_asset", asset.id, { detectionCount: detections.length });
    return publicAsset(db.prepare("SELECT * FROM image_text_assets WHERE id=?").get(asset.id));
  } catch (cause) {
    try { db.exec("ROLLBACK"); } catch { /* no active transaction */ }
    if (cause?.code) throw cause;
    throw error("IMAGE_TEXT_OCR_FAILED", 502);
  }
}

export async function rewriteImageText(userId, payload) {
  const text = clean(payload.text, 500);
  if (!text) throw error("IMAGE_TEXT_REPLACEMENT_REQUIRED", 422);
  try { return { text: await translationProvider.rewrite(text, payload.mode === "translate" ? "translate" : "polish") }; }
  catch (cause) { throw error(cause.code === "PLATFORM_MODEL_UNAVAILABLE" ? "IMAGE_TEXT_ASSISTANT_UNAVAILABLE" : "IMAGE_TEXT_ASSISTANT_FAILED", cause.status || 502, cause.retryable); }
}

export function createImageTextEditTask(user, tool, payload) {
  const detection = db.prepare(`SELECT d.*, a.project_id, a.original_file_id, a.current_file_id, a.width, a.height, p.user_id
    FROM image_text_detections d JOIN image_text_assets a ON a.id=d.asset_id JOIN image_text_projects p ON p.id=a.project_id
    WHERE d.id=? AND a.id=? AND p.user_id=?`).get(clean(payload.detectionId, 64), clean(payload.assetId, 64), user.id);
  if (!detection) throw error("IMAGE_TEXT_DETECTION_NOT_FOUND", 404);
  const available = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance);
  if (available < tool.creditCost) throw error("INSUFFICIENT_CREDITS", 402);
  assertUserFileCapacity(user.id);
  const taskId = randomUUID(); const timestamp = Date.now();
  const input = { assetId: detection.asset_id, detectionId: detection.id, sourceFileId: detection.current_file_id || detection.original_file_id,
    useAiRepair: payload.useAiRepair !== false, preserveStyle: payload.preserveStyle !== false };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO tasks (id,user_id,tool_id,status,input_json,output_json,credit_cost,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?,?,?)")
      .run(taskId, user.id, tool.id, JSON.stringify(input), JSON.stringify({ progress: 8, phase: "preparing" }), tool.creditCost, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'consumption',?,?,?,'task',?,?)")
        .run(randomUUID(), user.id, -tool.creditCost, `使用${tool.nameZh}`, `Used ${tool.nameEn}`, taskId, timestamp);
      db.prepare("INSERT OR IGNORE INTO task_settlements (id,task_id,kind,amount,created_at) VALUES (?,?,'reserve',?,?)").run(randomUUID(), taskId, tool.creditCost, timestamp);
    }
    db.prepare("INSERT INTO execution_jobs (id,task_id,status,attempts,max_attempts,next_attempt_at,created_at,updated_at) VALUES (?,?,'queued',0,2,?,?,?)")
      .run(randomUUID(), taskId, timestamp, timestamp, timestamp);
    db.prepare("UPDATE image_text_assets SET status='processing',updated_at=? WHERE id=?").run(timestamp, detection.asset_id);
    db.prepare("UPDATE image_text_projects SET status='processing',updated_at=? WHERE id=?").run(timestamp, detection.project_id);
    db.exec("COMMIT");
  } catch (cause) { db.exec("ROLLBACK"); throw cause; }
  audit(user.id, "image_text.apply", "task", taskId, { assetId: detection.asset_id, detectionId: detection.id });
  return { id: taskId, status: "queued", creditCost: tool.creditCost, output: { progress: 8, phase: "preparing" } };
}

const xml = (value) => String(value).replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
function textWidthUnits(text) {
  return [...String(text || "")].reduce((total, char) => total + (/^[\u0000-\u024f]$/.test(char) ? .56 : 1), 0);
}

export function textOverlay(text, style, width, height) {
  const font = style.fontFamily === "serif" ? "Noto Serif CJK SC,serif" : "Noto Sans CJK SC,PingFang SC,Microsoft YaHei,sans-serif";
  const anchor = style.align === "left" ? "start" : style.align === "right" ? "end" : "middle";
  const x = style.align === "left" ? 2 : style.align === "right" ? width - 2 : width / 2;
  const requestedSize = clamp(style.fontSize, 8, 300);
  const fittedSize = Math.max(8, Math.min(requestedSize, height * .8, (width - 6) / Math.max(1, textWidthUnits(text)) * .92));
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${height / 2}" dominant-baseline="central" text-anchor="${anchor}" fill="${xml(style.color || "#17264d")}" font-family="${xml(font)}" font-size="${fittedSize}" font-weight="${style.bold ? 700 : 400}">${xml(text)}</text></svg>`);
}

function taskProgress(taskId, progress, phase) {
  db.prepare("UPDATE tasks SET output_json=?,updated_at=? WHERE id=?").run(JSON.stringify({ progress, phase }), Date.now(), taskId);
}

export async function restoreTextBackground(patch, width, height, useAiRepair = true, provider = inpaintingProvider) {
  let restored; let repairMode = "local-smart-fill";
  if (useAiRepair) {
    try {
      const generated = await provider.repair(patch, "image/png", "Remove every letter, word, number, logo-like glyph and text mark from this image crop. Reconstruct only the natural background behind the removed text. Preserve the exact colors, lighting, texture and composition. Do not add any text, symbols, watermark, border or new object.");
      restored = await sharp(generated.buffer).resize(width, height, { fit: "fill" }).png().toBuffer();
      repairMode = "ai-inpainting";
    } catch { /* Provider rejection, timeout or outage must not prevent the local repair fallback. */ }
  }
  if (!restored) restored = await sharp(patch).blur(Math.max(8, Math.round(Math.min(width, height) / 18))).png().toBuffer();
  return { buffer: restored, repairMode };
}

async function executePptTextExportTask(task, input) {
  const project = db.prepare("SELECT * FROM ppt_text_projects WHERE id=? AND user_id=?").get(input.projectId, task.user_id);
  const sourceFile = project && fileRow(project.source_file_id, task.user_id);
  if (!project || !sourceFile) throw error("PPT_PROJECT_NOT_FOUND", 404);
  const source = await storageProvider.read({ provider: sourceFile.storage_provider, objectKey: sourceFile.object_key, storageName: sourceFile.storage_name });
  const { archive } = await parsePptx(source);
  const items = db.prepare("SELECT * FROM ppt_text_items WHERE project_id=? ORDER BY slide_number,shape_index").all(project.id);
  taskProgress(task.id, 42, "rendering");
  const slideFiles = Object.keys(archive.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  for (let slideIndex = 0; slideIndex < slideFiles.length; slideIndex += 1) {
    const name = slideFiles[slideIndex]; const xmlText = await archive.file(name).async("string"); let shapeIndex = -1;
    const changed = xmlText.replace(/<p:sp(?:\s[^>]*)?>[\s\S]*?<\/p:sp>/g, (shapeXml) => {
      shapeIndex += 1;
      const item = items.find((entry) => entry.slide_number === slideIndex + 1 && entry.shape_index === shapeIndex);
      if (!item) return shapeXml;
      let textRun = 0;
      return shapeXml.replace(/<a:t>([\s\S]*?)<\/a:t>/g, () => `<a:t>${textRun++ === 0 ? encodeXml(item.current_text) : ""}</a:t>`);
    });
    archive.file(name, changed);
  }
  taskProgress(task.id, 76, "packaging");
  const output = await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const fileId = randomUUID(); const fileName = `${clean(project.name, 100) || "presentation"}-改字版.pptx`;
  const stored = await storageProvider.put({ userId: task.user_id, fileId, fileName, mimeType: pptxMime, buffer: output });
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(fileId, task.user_id, fileName, stored.storageName, pptxMime, output.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?, 'available',?,?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.prepare("INSERT INTO task_files (task_id,file_id) VALUES (?,?)").run(task.id, fileId);
    db.prepare("UPDATE ppt_text_projects SET current_file_id=?,status='ready',updated_at=? WHERE id=?").run(fileId, timestamp, project.id);
    db.exec("COMMIT");
  } catch (cause) { db.exec("ROLLBACK"); await deleteStoredFile(stored).catch(() => {}); throw cause; }
  return { status: "completed", output: { progress: 100, phase: "completed", mode: "ppt", projectId: project.id, resultFileId: fileId, downloadUrl: `/api/files/${fileId}/download` } };
}

export async function executeImageTextEditTask(task, input) {
  if (input.mode === "ppt-export") return executePptTextExportTask(task, input);
  const detection = db.prepare(`SELECT d.*, a.project_id, a.width, a.height FROM image_text_detections d
    JOIN image_text_assets a ON a.id=d.asset_id WHERE d.id=? AND a.id=?`).get(input.detectionId, input.assetId);
  const sourceFile = fileRow(input.sourceFileId, task.user_id);
  if (!detection || !sourceFile) throw error("IMAGE_TEXT_SOURCE_MISSING", 500);
  const source = await storageProvider.read({ provider: sourceFile.storage_provider, objectKey: sourceFile.object_key, storageName: sourceFile.storage_name });
  const bbox = parse(detection.bbox_json); const style = parse(detection.style_json);
  const x = Math.round(clamp(bbox.x, 0, detection.width - 1)); const y = Math.round(clamp(bbox.y, 0, detection.height - 1));
  const width = Math.max(8, Math.round(clamp(bbox.width, 8, detection.width - x))); const height = Math.max(8, Math.round(clamp(bbox.height, 8, detection.height - y)));
  const padding = Math.max(8, Math.round(Math.min(width, height) * .18));
  const patchBox = { left: Math.max(0, x - padding), top: Math.max(0, y - padding) };
  patchBox.width = Math.min(detection.width - patchBox.left, width + padding * 2);
  patchBox.height = Math.min(detection.height - patchBox.top, height + padding * 2);
  taskProgress(task.id, 24, "erasing");
  const patch = await sharp(source).extract(patchBox).png().toBuffer();
  taskProgress(task.id, 48, "repairing");
  const repair = await restoreTextBackground(patch, patchBox.width, patchBox.height, input.useAiRepair);
  const restored = repair.buffer; const repairMode = repair.repairMode;
  taskProgress(task.id, 76, "rendering");
  const cleanBase = await sharp(source).composite([{ input: restored, left: patchBox.left, top: patchBox.top }]).png().toBuffer();
  const overlay = textOverlay(detection.current_text, style, width, height);
  const output = await sharp(cleanBase).composite([{ input: overlay, left: x, top: y }]).png().toBuffer();
  const fileId = randomUUID(); const fileName = `${detection.asset_id.slice(0, 8)}-edited.png`;
  const stored = await storageProvider.put({ userId: task.user_id, fileId, fileName, mimeType: "image/png", buffer: output });
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(fileId, task.user_id, fileName, stored.storageName, "image/png", output.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?, 'available',?,?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.prepare("INSERT INTO task_files (task_id,file_id) VALUES (?,?)").run(task.id, fileId);
    db.prepare("UPDATE image_text_assets SET current_file_id=?,status='ready',updated_at=? WHERE id=?").run(fileId, timestamp, input.assetId);
    db.prepare("UPDATE image_text_projects SET status='ready',updated_at=? WHERE id=?").run(timestamp, detection.project_id);
    db.prepare("INSERT INTO image_text_operations (id,project_id,asset_id,detection_id,task_id,operation_type,before_json,after_json,created_at) VALUES (?,?,?,?,?,'apply',?,?,?)")
      .run(randomUUID(), detection.project_id, input.assetId, input.detectionId, task.id, JSON.stringify({ fileId: input.sourceFileId }), JSON.stringify({ fileId, repairMode }), timestamp);
    db.exec("COMMIT");
  } catch (cause) { db.exec("ROLLBACK"); await deleteStoredFile(stored).catch(() => {}); throw cause; }
  return { status: "completed", output: { progress: 100, phase: "completed", projectId: detection.project_id, assetId: input.assetId, resultFileId: fileId, downloadUrl: `/api/files/${fileId}/download`, repairMode } };
}

export function failImageTextTask(taskId) {
  const task = db.prepare("SELECT input_json FROM tasks WHERE id=?").get(taskId); const input = parse(task?.input_json);
  if (input.mode === "ppt-export" && input.projectId) {
    db.prepare("UPDATE ppt_text_projects SET status='failed',updated_at=? WHERE id=?").run(Date.now(), input.projectId);
    return;
  }
  if (!input.assetId) return;
  const asset = db.prepare("SELECT project_id FROM image_text_assets WHERE id=?").get(input.assetId);
  db.prepare("UPDATE image_text_assets SET status='failed',updated_at=? WHERE id=?").run(Date.now(), input.assetId);
  if (asset) db.prepare("UPDATE image_text_projects SET status='failed',updated_at=? WHERE id=?").run(Date.now(), asset.project_id);
}
