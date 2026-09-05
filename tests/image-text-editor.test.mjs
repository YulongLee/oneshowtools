import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import JSZip from "jszip";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-image-text-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { db } = await import("../server/database.mjs");
const { createImageTextEditTask, createPptTextExportTask, executeImageTextEditTask, getImageTextProject, getPptTextProject, redetectImageTextAsset, restoreTextBackground, TextStyleAnalyzer, textOverlay, textStrokeMask, updateImageTextDetection, updatePptTextItem, uploadImageTextAsset, uploadPptTextProject } = await import(`../server/image-text-editor.mjs?test=${Date.now()}`);
const { readStoredFile } = await import("../server/object-storage.mjs");

function userWithCredits() {
  const id = randomUUID(); const timestamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,'Image text tester',?,'unused',1,?,?)")
    .run(id, `image-text-${id}@example.com`, timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'grant',100,'测试','Test','test',?,?)")
    .run(randomUUID(), id, id, timestamp);
  return { id };
}

test("image text editor is an administrator-only testing tool with configurable pricing", () => {
  const tool = db.prepare("SELECT * FROM tools WHERE slug='image-text-editor'").get();
  assert.equal(tool.id, "tool_image_text_editor");
  assert.equal(tool.credit_cost, 30);
  assert.equal(tool.active, 0);
  assert.equal(db.prepare("SELECT lifecycle_state FROM tool_versions WHERE tool_id=? ORDER BY version DESC LIMIT 1").get(tool.id).lifecycle_state, "testing");
});

test("image text edits persist as a draft when the input loses focus", async () => {
  const source = await readFile(new URL("../src/ImageTextEditor.jsx", import.meta.url), "utf8");
  assert.match(source, /onBlur=\{\(\) => saveDraft\(item\)\}/);
  assert.match(source, /onBlur=\{\(\) => saveDraft\(selected\)\}/);
  assert.match(source, /文字草稿已保存；应用到图片后生成最终结果/);
  assert.doesNotMatch(source, /ite-direct-edit-hint/);
});

test("image repair provider failures fall back locally instead of failing the paid task", async () => {
  const patch = await sharp({ create: { width: 180, height: 48, channels: 3, background: "#f4eddb" } }).png().toBuffer();
  const rejectedProvider = { repair: async () => { throw Object.assign(new Error("rejected"), { code: "IMAGE_PROVIDER_REJECTED" }); } };
  const result = await restoreTextBackground(patch, 180, 48, true, rejectedProvider);
  assert.equal(result.repairMode, "local-smart-fill");
  assert.deepEqual(await sharp(result.buffer).metadata().then(({ width, height, format }) => ({ width, height, format })), { width: 180, height: 48, format: "png" });
});

test("Chinese replacement text uses a CJK font and is fitted inside its OCR box", async () => {
  const svg = textOverlay("营业执照1", { fontFamily: "sans", fontSize: 180, color: "#17264d", bold: true, align: "center" }, 420, 90).toString();
  assert.match(svg, /font-family="Noto Sans CJK SC/);
  const fontSize = Number(svg.match(/font-size="([\d.]+)"/)?.[1]);
  assert.ok(fontSize <= 72);
  const rendered = await sharp(Buffer.from(svg)).png().toBuffer();
  assert.deepEqual(await sharp(rendered).metadata().then(({ width, height, format }) => ({ width, height, format })), { width: 420, height: 90, format: "png" });
});

test("original foreground color and display weight are inferred from the uploaded image", async () => {
  const source = await sharp({ create: { width: 640, height: 220, channels: 3, background: "#f8ede1" } })
    .composite([{ input: Buffer.from('<svg width="640" height="220"><text x="120" y="145" font-size="90" font-family="serif" font-weight="900" fill="#bd7517">营业执照</text></svg>') }]).png().toBuffer();
  const [style] = await new TextStyleAnalyzer().analyzeAll(source, [{ text: "营业执照", bbox: { x: 105, y: 55, width: 430, height: 110 } }]);
  assert.equal(style.appearanceAnalyzed, true);
  assert.notEqual(style.color, "#17264d");
  assert.equal(style.fontFamily, "serif");
  assert.equal(style.bold, true);
  const mask = await textStrokeMask(source, { left: 105, top: 55, width: 430, height: 110 }, style.color);
  const stats = await sharp(mask).stats();
  assert.equal(stats.channels[0].max, 255);
  assert.ok(stats.channels[0].mean < 90, "background repair must be limited to text strokes instead of replacing a rectangle");
});

test("upload, OCR, text update, async edit and file archival form one working flow", async () => {
  const user = userWithCredits();
  const source = await sharp({ create: { width: 900, height: 420, channels: 3, background: "#f1f5ff" } })
    .composite([{ input: Buffer.from('<svg width="900" height="420"><text x="140" y="225" font-size="76" font-family="Arial" font-weight="700" fill="#17264d">HELLO WORLD</text></svg>') }]).png().toBuffer();
  const form = new FormData(); form.append("file", new File([source], "poster.png", { type: "image/png" }));
  const project = await uploadImageTextAsset(new Request("http://localhost/api/image-text/assets", { method: "POST", body: form }), user);
  assert.equal(project.assets.length, 1);
  assert.ok(project.assets[0].detections.length >= 1);
  const redetected = await redetectImageTextAsset(user.id, project.assets[0].id);
  assert.ok(redetected.detections.length >= 1);
  const detection = redetected.detections[0];
  const updated = updateImageTextDetection(user.id, detection.id, { text: "HELLO AI", style: { color: "#315be8", fontSize: 72, bold: true, align: "center" } });
  assert.equal(updated.currentText, "HELLO AI");
  const tool = db.prepare("SELECT id,slug,name_zh AS nameZh,name_en AS nameEn,credit_cost AS creditCost FROM tools WHERE slug='image-text-editor'").get();
  const queued = createImageTextEditTask(user, tool, { assetId: project.assets[0].id, detectionId: detection.id, useAiRepair: false, preserveStyle: true });
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(queued.id);
  const result = await executeImageTextEditTask(task, JSON.parse(task.input_json));
  assert.equal(result.status, "completed");
  const resultFile = db.prepare(`SELECT f.storage_name,COALESCE(s.provider,'local') AS provider,s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id=f.id WHERE f.id=?`).get(result.output.resultFileId);
  assert.equal((await sharp(await readStoredFile({ provider: resultFile.provider, objectKey: resultFile.object_key, storageName: resultFile.storage_name })).metadata()).format, "png");
  const fresh = getImageTextProject(user.id, project.id);
  assert.ok(fresh.assets[0].currentFileId);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id=?").get(task.id).count, 1);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70);
  updateImageTextDetection(user.id, detection.id, { text: "HELLO AGAIN" });
  const reapplied = createImageTextEditTask(user, tool, { assetId: project.assets[0].id, detectionId: detection.id, useAiRepair: false, preserveStyle: true });
  assert.equal(JSON.parse(db.prepare("SELECT input_json FROM tasks WHERE id=?").get(reapplied.id).input_json).sourceFileId, project.assets[0].originalFileId);
});

test("PPTX text layers can be uploaded, edited and exported without replacing the source file", async () => {
  const user = userWithCredits();
  const archive = new JSZip();
  archive.file("ppt/presentation.xml", '<?xml version="1.0"?><p:presentation xmlns:p="p"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
  archive.file("ppt/media/image1.png", await sharp({ create: { width: 8, height: 8, channels: 3, background: "#315be8" } }).png().toBuffer());
  archive.file("ppt/slides/slide1.xml", '<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="5486400" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="3600" b="1"/><a:t>Original headline</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
  const buffer = await archive.generateAsync({ type: "nodebuffer" });
  const form = new FormData(); form.append("file", new File([buffer], "deck.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  const project = await uploadPptTextProject(new Request("http://localhost/api/image-text/ppt/projects", { method: "POST", body: form }), user);
  assert.equal(project.slideCount, 1);
  assert.equal(project.slides[0].items[0].originalText, "Original headline");
  updatePptTextItem(user.id, project.slides[0].items[0].id, { text: "New AI headline" });
  const tool = db.prepare("SELECT id,slug,name_zh AS nameZh,name_en AS nameEn,credit_cost AS creditCost FROM tools WHERE slug='image-text-editor'").get();
  const queued = createPptTextExportTask(user, tool, { projectId: project.id });
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(queued.id);
  const result = await executeImageTextEditTask(task, JSON.parse(task.input_json));
  assert.equal(result.status, "completed");
  const resultFile = db.prepare(`SELECT f.storage_name,COALESCE(s.provider,'local') AS provider,s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id=f.id WHERE f.id=?`).get(result.output.resultFileId);
  const exported = await JSZip.loadAsync(await readStoredFile({ provider: resultFile.provider, objectKey: resultFile.object_key, storageName: resultFile.storage_name }));
  assert.match(await exported.file("ppt/slides/slide1.xml").async("string"), /New AI headline/);
  assert.ok(exported.file("ppt/media/image1.png"), "existing slide media should remain in the exported archive");
  const fresh = getPptTextProject(user.id, project.id);
  assert.ok(fresh.currentFileId);
  assert.notEqual(fresh.currentFileId, fresh.sourceFileId);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70);
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
