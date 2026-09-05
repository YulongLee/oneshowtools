import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-image-text-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { db } = await import("../server/database.mjs");
const { createImageTextEditTask, createPptTextExportTask, executeImageTextEditTask, exportVisualProject, generateCrispTextImage, getImageTextProject, getPptTextProject, redetectImageTextAsset, restoreTextBackground, TextStyleAnalyzer, textOverlay, textStrokeMask, updateImageTextDetection, updatePptTextItem, uploadImageTextAsset, uploadPptTextProject } = await import(`../server/image-text-editor.mjs?test=${Date.now()}`);
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
  assert.match(source, /草稿已保存，可继续修改其他文字后统一处理/);
  assert.match(source, /detectionIds: edits\.map/);
  assert.match(source, /生成结果预览/);
  assert.match(source, /确认满意，下载图片/);
  assert.match(source, /请人工确认/);
  assert.match(source, /Promise\.all\(edits\.map/);
  assert.doesNotMatch(source, /ite-direct-edit-hint/);
});

test("image repair provider failure cannot silently fall back to blur", async () => {
  const patch = await sharp({ create: { width: 180, height: 48, channels: 3, background: "#f4eddb" } }).png().toBuffer();
  const rejectedProvider = { repair: async () => { throw Object.assign(new Error("rejected"), { code: "IMAGE_PROVIDER_REJECTED" }); } };
  await assert.rejects(restoreTextBackground(patch, 180, 48, true, rejectedProvider), { code: "IMAGE_PROVIDER_REJECTED" });
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

test("text removal mask falls back to detected glyph contrast instead of replacing the whole box when the stored color is wrong", async () => {
  const source = await sharp({ create: { width: 320, height: 120, channels: 3, background: "#f8ede1" } })
    .composite([{ input: Buffer.from('<svg width="320" height="120"><text x="55" y="82" font-size="52" font-family="Arial" font-weight="700" fill="#16305d">TITLE</text></svg>') }]).png().toBuffer();
  const mask = await textStrokeMask(source, { left: 40, top: 25, width: 230, height: 70 }, "#ff00ff");
  const stats = await sharp(mask).stats();
  assert.equal(stats.channels[0].max, 255);
  assert.ok(stats.channels[0].mean < 115, "a wrong stored color must not turn the complete OCR rectangle into a repair mask");
});

test("commercial image text output renders crisp text after the model repairs only the old glyph background", async () => {
  const source = await sharp({ create: { width: 600, height: 240, channels: 3, background: "#f5f0e8" } })
    .composite([{ input: Buffer.from('<svg width="600" height="240"><text x="150" y="145" font-size="64" font-family="Arial" font-weight="700" fill="#17345f">OLD TEXT</text></svg>') }]).png().toBuffer();
  const edit = { id: "edit-1", originalText: "OLD TEXT", currentText: "NEW TEXT", bbox: { x: 135, y: 75, width: 340, height: 90 }, style: { fontFamily: "sans", fontSize: 64, color: "#17345f", bold: true, align: "center" } };
  let modelPrompt = "";
  const result = await generateCrispTextImage({ source, edits: [edit],
    generate: async ({ buffer, prompt }) => { modelPrompt = prompt; const meta = await sharp(buffer).metadata(); return { buffer: await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: "#f5f0e8" } }).png().toBuffer() }; },
    recognize: async () => [{ text: "NEW TEXT" }],
  });
  assert.equal(result.textVerified, true);
  assert.match(modelPrompt, /只移除/);
  assert.ok(!modelPrompt.includes("NEW TEXT"), "the image model must not generate the replacement glyphs");
  const output = await sharp(result.buffer).removeAlpha().raw().toBuffer();
  const original = await sharp(source).removeAlpha().raw().toBuffer();
  assert.deepEqual([...output.subarray(0, 120)], [...original.subarray(0, 120)], "pixels outside the edited region stay unchanged");
  assert.ok((await sharp(result.buffer).extract({ left: 135, top: 75, width: 340, height: 90 }).stats()).channels.some((channel) => channel.min < 80));
});

test("OCR uncertainty never discards a deterministically rendered editable result", async () => {
  const source = await sharp({ create: { width: 400, height: 180, channels: 3, background: "#ffffff" } }).png().toBuffer();
  const edit = { id: "edit-2", originalText: "OLD", currentText: "EXACT", bbox: { x: 80, y: 50, width: 220, height: 70 }, style: { fontFamily: "sans", fontSize: 50, color: "#111111", bold: true, align: "center" } };
  const result = await generateCrispTextImage({ source, edits: [edit], generate: async ({ buffer }) => ({ buffer }), recognize: async () => [{ text: "WRONG" }] });
  assert.equal(result.textVerified, false);
  assert.equal(result.qualityStatus, "needs-review");
  assert.deepEqual(result.failedRegionIndices, [0]);
  assert.equal((await sharp(result.buffer).metadata()).format, "png");
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
  const secondDetectionId = randomUUID(); const now = Date.now();
  db.prepare("INSERT INTO image_text_detections (id,asset_id,original_text,current_text,bbox_json,confidence,rotation,style_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(secondDetectionId, project.assets[0].id, "SECOND", "SECOND AI", JSON.stringify({ x: 40, y: 35, width: 180, height: 52 }), .95, 0, JSON.stringify({ fontFamily: "sans", fontSize: 36, color: "#315be8", bold: true, align: "center", appearanceAnalyzed: true }), now, now);
  updateImageTextDetection(user.id, secondDetectionId, { text: "SECOND AI" });
  const tool = db.prepare("SELECT id,slug,name_zh AS nameZh,name_en AS nameEn,credit_cost AS creditCost FROM tools WHERE slug='image-text-editor'").get();
  const queued = createImageTextEditTask(user, tool, { assetId: project.assets[0].id, detectionIds: [detection.id], applyAllPending: true, useAiRepair: false, preserveStyle: true });
  const duplicate = createImageTextEditTask(user, tool, { assetId: project.assets[0].id, detectionIds: [detection.id], applyAllPending: true });
  assert.equal(duplicate.id, queued.id, "double submit must reuse the active task");
  assert.equal(duplicate.duplicate, true);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70, "double submit charges once");
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(queued.id);
  assert.deepEqual(JSON.parse(task.input_json).detectionIds, [detection.id, secondDetectionId]);
  let recognizeIndex = 0;
  const result = await executeImageTextEditTask(task, JSON.parse(task.input_json), {
    generate: async ({ buffer, prompt }) => { assert.ok(prompt.includes("只移除")); return { buffer }; },
    recognize: async () => [{ text: ["HELLO AI", "SECOND AI"][recognizeIndex++] }],
  });
  assert.equal(result.status, "completed");
  assert.equal(result.output.editCount, 2);
  db.prepare("UPDATE tasks SET status='completed',output_json=? WHERE id=?").run(JSON.stringify(result.output), task.id);
  const resultFile = db.prepare(`SELECT f.storage_name,COALESCE(s.provider,'local') AS provider,s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id=f.id WHERE f.id=?`).get(result.output.resultFileId);
  assert.equal((await sharp(await readStoredFile({ provider: resultFile.provider, objectKey: resultFile.object_key, storageName: resultFile.storage_name })).metadata()).format, "png");
  const fresh = getImageTextProject(user.id, project.id);
  assert.ok(fresh.assets[0].currentFileId);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id=?").get(task.id).count, 2, "the task retains both the flattened preview and clean editable background");
  assert.ok(fresh.assets[0].backgroundFileId, "visual reconstruction keeps a separate clean background");
  const editablePpt = await exportVisualProject(user.id, { projectId: project.id, format: "pptx" });
  const editableRow = db.prepare(`SELECT f.storage_name,COALESCE(s.provider,'local') AS provider,s.object_key FROM files f LEFT JOIN file_storage_objects s ON s.file_id=f.id WHERE f.id=?`).get(editablePpt.fileId);
  const editableArchive = await JSZip.loadAsync(await readStoredFile({ provider: editableRow.provider, objectKey: editableRow.object_key, storageName: editableRow.storage_name }));
  assert.ok(editableArchive.file("ppt/slides/slide1.xml"), "an image project exports a real editable PPTX");
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70);
  updateImageTextDetection(user.id, detection.id, { text: "HELLO AGAIN" });
  const reapplied = createImageTextEditTask(user, tool, { assetId: project.assets[0].id, detectionId: detection.id, useAiRepair: false, preserveStyle: true });
  assert.equal(JSON.parse(db.prepare("SELECT input_json FROM tasks WHERE id=?").get(reapplied.id).input_json).sourceFileId, project.assets[0].originalFileId);
  const replay = JSON.parse(db.prepare("SELECT input_json FROM tasks WHERE id=?").get(reapplied.id).input_json);
  assert.deepEqual(replay.detectionIds, [detection.id, secondDetectionId]);
  updateImageTextDetection(user.id, detection.id, { text: "UNSUBMITTED CHANGE" });
  assert.equal(replay.edits[0].currentText, "HELLO AGAIN", "queued edits must be an immutable snapshot");
  const { failTaskExecution } = await import("../server/runtime.mjs");
  failTaskExecution(reapplied.id, "IMAGE_TEXT_QUALITY_REJECTED");
  failTaskExecution(reapplied.id, "IMAGE_TEXT_QUALITY_REJECTED");
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70, "failed generation refunds once");
  assert.equal(getImageTextProject(user.id, project.id).assets[0].currentFileId, fresh.assets[0].currentFileId, "failure retains the previous valid result");
});

test("a PDF page imports as an OCR-backed visual reconstruction asset", async () => {
  const user = userWithCredits();
  const pdf = await PDFDocument.create(); const page = pdf.addPage([640, 360]);
  const artwork = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#ffffff" } })
    .composite([{ input: Buffer.from('<svg width="640" height="360"><text x="100" y="190" font-size="62" font-family="Arial" fill="#111827">EDITABLE PAGE</text></svg>') }]).png().toBuffer();
  const embedded = await pdf.embedPng(artwork); page.drawImage(embedded, { x: 0, y: 0, width: 640, height: 360 });
  const form = new FormData(); form.append("file", new File([await pdf.save()], "poster.pdf", { type: "application/pdf" }));
  const project = await uploadImageTextAsset(new Request("http://localhost/api/image-text/assets", { method: "POST", body: form }), user);
  assert.equal(project.assets.length, 1);
  assert.match(project.assets[0].name, /poster-1\.png/);
  assert.ok(project.assets[0].detections.length >= 1);
});

test("PPTX text layers can be uploaded, edited and exported without replacing the source file", async () => {
  const user = userWithCredits();
  const archive = new JSZip();
  archive.file("ppt/presentation.xml", '<?xml version="1.0"?><p:presentation xmlns:p="p"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
  archive.file("ppt/media/image1.png", await sharp({ create: { width: 8, height: 8, channels: 3, background: "#315be8" } }).png().toBuffer());
  const untouchedShape = '<p:sp><p:spPr><a:xfrm><a:off x="914400" y="2743200"/><a:ext cx="5486400" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="1800"/><a:t>Do not </a:t></a:r><a:r><a:rPr sz="1800" i="1"/><a:t>touch</a:t></a:r></a:p></p:txBody></p:sp>';
  archive.file("ppt/slides/slide1.xml", `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="5486400" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="3600" b="1" solidFill="A"/><a:t xml:space="preserve">Original </a:t></a:r><a:r><a:rPr sz="3600" b="1" solidFill="B"/><a:t>headline</a:t></a:r></a:p></p:txBody></p:sp>${untouchedShape}</p:spTree></p:cSld></p:sld>`);
  const buffer = await archive.generateAsync({ type: "nodebuffer" });
  const form = new FormData(); form.append("file", new File([buffer], "deck.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  const project = await uploadPptTextProject(new Request("http://localhost/api/image-text/ppt/projects", { method: "POST", body: form }), user);
  assert.equal(project.slideCount, 1);
  assert.equal(project.slides[0].items[0].originalText, "Original headline");
  updatePptTextItem(user.id, project.slides[0].items[0].id, { text: "New AI headline" });
  const tool = db.prepare("SELECT id,slug,name_zh AS nameZh,name_en AS nameEn,credit_cost AS creditCost FROM tools WHERE slug='image-text-editor'").get();
  const queued = createPptTextExportTask(user, tool, { projectId: project.id });
  const duplicate = createPptTextExportTask(user, tool, { projectId: project.id });
  assert.equal(duplicate.id, queued.id, "double submit must reuse the active PPT export");
  assert.equal(duplicate.duplicate, true);
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(queued.id);
  assert.equal(JSON.parse(task.input_json).edits.length, 1);
  const result = await executeImageTextEditTask(task, JSON.parse(task.input_json));
  assert.equal(result.status, "completed");
  const resultFile = db.prepare(`SELECT f.storage_name,COALESCE(s.provider,'local') AS provider,s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id=f.id WHERE f.id=?`).get(result.output.resultFileId);
  const exported = await JSZip.loadAsync(await readStoredFile({ provider: resultFile.provider, objectKey: resultFile.object_key, storageName: resultFile.storage_name }));
  const exportedSlide = await exported.file("ppt/slides/slide1.xml").async("string");
  assert.match(exportedSlide, /<a:rPr sz="3600" b="1" solidFill="A"\/>/);
  assert.match(exportedSlide, /<a:rPr sz="3600" b="1" solidFill="B"\/>/);
  assert.ok(exportedSlide.includes(untouchedShape), "unmodified text objects must remain byte-for-byte unchanged");
  assert.equal(result.output.editCount, 1);
  assert.equal(result.output.sourcePreserved, true);
  assert.ok(exported.file("ppt/media/image1.png"), "existing slide media should remain in the exported archive");
  const fresh = getPptTextProject(user.id, project.id);
  assert.ok(fresh.currentFileId);
  assert.notEqual(fresh.currentFileId, fresh.sourceFileId);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 70);
});

test("PPTX export rejects a project with no text changes before charging credits", async () => {
  const user = userWithCredits();
  const archive = new JSZip();
  archive.file("ppt/presentation.xml", '<?xml version="1.0"?><p:presentation xmlns:p="p"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
  archive.file("ppt/slides/slide1.xml", '<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000" cy="1000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>Unchanged</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
  const form = new FormData(); form.append("file", new File([await archive.generateAsync({ type: "nodebuffer" })], "unchanged.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  const project = await uploadPptTextProject(new Request("http://localhost/api/image-text/ppt/projects", { method: "POST", body: form }), user);
  const tool = db.prepare("SELECT id,slug,name_zh AS nameZh,name_en AS nameEn,credit_cost AS creditCost FROM tools WHERE slug='image-text-editor'").get();
  assert.throws(() => createPptTextExportTask(user, tool, { projectId: project.id }), { code: "PPT_NO_CHANGES" });
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 100);
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
