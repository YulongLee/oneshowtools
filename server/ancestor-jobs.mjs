import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { audit, dataDirectory, db } from "./database.mjs";
import { assertUserFileCapacity } from "./file-quota.mjs";
import { processAncestorStage } from "./ai-image-tools.mjs";
import { deleteStoredFile, putStoredFile } from "./object-storage.mjs";

const slug = "sliding-ancestor-generator";
const inputDirectory = resolve(dataDirectory, "job-inputs");
const error = (code, status = 400) => Object.assign(new Error(code), { code, status });
const parse = (value, fallback = {}) => { try { return JSON.parse(value || "") || fallback; } catch { return fallback; } };

function publicTask(task) {
  const output = parse(task.output_json, null);
  return {
    id: task.id, status: task.status, errorCode: task.error_code || null,
    creditCost: task.credit_cost, createdAt: task.created_at, updatedAt: task.updated_at,
    completedAt: task.completed_at, output,
  };
}

export async function createAncestorTask(request, user, tool) {
  const existing = db.prepare(`
    SELECT t.* FROM tasks t WHERE t.user_id = ? AND t.tool_id = ? AND t.status IN ('queued','running')
    ORDER BY t.created_at DESC LIMIT 1
  `).get(user.id, tool.id);
  if (existing) return { task: publicTask(existing), reused: true };

  const form = await request.formData();
  const file = form.get("file");
  if (!file?.size) throw error("IMAGE_REQUIRED", 400);
  if (file.size > 25 * 1024 * 1024) throw error("IMAGE_TOO_LARGE", 413);
  const style = String(form.get("style") || "realistic");
  if (!["realistic", "cinematic", "chaos", "custom"].includes(style)) throw error("ANCESTOR_STYLE_INVALID", 400);
  let customPrompts = [];
  if (style === "custom") {
    try { customPrompts = JSON.parse(String(form.get("customPrompts") || "[]")); } catch { throw error("ANCESTOR_CUSTOM_PROMPTS_INVALID", 400); }
    if (!Array.isArray(customPrompts) || customPrompts.length !== 10) throw error("ANCESTOR_CUSTOM_PROMPTS_INVALID", 400);
    customPrompts = customPrompts.map((value) => String(value || "").replace(/\0/g, "").trim().slice(0, 1200));
    if (customPrompts.some((value) => !value)) throw error("ANCESTOR_CUSTOM_PROMPT_REQUIRED", 400);
  }

  const available = Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance);
  if (available < tool.creditCost) throw error("INSUFFICIENT_CREDITS", 402);
  assertUserFileCapacity(user.id, 10);

  await mkdir(inputDirectory, { recursive: true });
  const id = randomUUID();
  const inputName = `${id}.source`;
  const inputPath = resolve(inputDirectory, inputName);
  await writeFile(inputPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  const referenceFiles = [];
  if (style === "custom") {
    try {
      let totalReferenceBytes = 0;
      for (let stage = 1; stage <= 10; stage += 1) {
        const reference = form.get(`reference${stage}`);
        if (!reference?.size) { referenceFiles.push(null); continue; }
        totalReferenceBytes += reference.size;
        if (reference.size > 10 * 1024 * 1024 || totalReferenceBytes > 80 * 1024 * 1024 || !String(reference.type || "").startsWith("image/")) {
          throw error(reference.size > 10 * 1024 * 1024 || totalReferenceBytes > 80 * 1024 * 1024 ? "ANCESTOR_REFERENCE_TOO_LARGE" : "IMAGE_INVALID", reference.size > 10 * 1024 * 1024 || totalReferenceBytes > 80 * 1024 * 1024 ? 413 : 422);
        }
        const referenceName = `${id}.reference-${stage}`;
        await writeFile(resolve(inputDirectory, referenceName), Buffer.from(await reference.arrayBuffer()), { flag: "wx" });
        referenceFiles.push({ jobInputName: referenceName, mimeType: reference.type || "image/jpeg", fileName: String(reference.name || `reference-${stage}.png`).slice(0, 180) });
      }
    } catch (caught) {
      await rm(inputPath, { force: true });
      await Promise.all(referenceFiles.filter(Boolean).map((item) => rm(resolve(inputDirectory, item.jobInputName), { force: true })));
      throw caught;
    }
  }
  const timestamp = Date.now();
  const input = { fileName: String(file.name || "portrait.png").slice(0, 180), mimeType: file.type || "image/jpeg", fileSize: file.size, style, jobInputName: inputName, ...(style === "custom" ? { customPrompts, referenceFiles } : {}) };
  const output = { mode: style === "custom" ? "ai-custom-ten-frame-series" : "ai-ordered-power-series", style, ...(style === "custom" ? { customPrompts, referenceCount: referenceFiles.filter(Boolean).length } : {}), progress: { completed: 0, total: 10, currentStage: 1 }, resultFiles: [] };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO tasks (id,user_id,tool_id,status,input_json,output_json,credit_cost,created_at,updated_at) VALUES (?,?,?,'queued',?,?,?,?,?)`)
      .run(id, user.id, tool.id, JSON.stringify(input), JSON.stringify(output), tool.creditCost, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare(`INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'consumption',?,?,?,'task',?,?)`)
        .run(randomUUID(), user.id, -tool.creditCost, `使用${tool.nameZh}`, `Used ${tool.nameEn}`, id, timestamp);
      db.prepare(`INSERT OR IGNORE INTO task_settlements (id,task_id,kind,amount,created_at) VALUES (?,?,'reserve',?,?)`)
        .run(randomUUID(), id, tool.creditCost, timestamp);
    }
    db.prepare(`
      INSERT OR IGNORE INTO execution_jobs
        (id, task_id, status, attempts, max_attempts, next_attempt_at, created_at, updated_at)
      VALUES (?, ?, 'queued', 0, 3, ?, ?, ?)
    `).run(randomUUID(), id, timestamp, timestamp, timestamp);
    db.exec("COMMIT");
  } catch (caught) {
    db.exec("ROLLBACK");
    await rm(inputPath, { force: true });
    await Promise.all(referenceFiles.filter(Boolean).map((item) => rm(resolve(inputDirectory, item.jobInputName), { force: true })));
    throw caught;
  }
  audit(user.id, "task.create", "task", id, { toolId: tool.id, async: true });
  return { task: publicTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id)), reused: false };
}

export async function executeAncestorTask(task, input, fetchImpl = fetch) {
  const inputPath = resolve(inputDirectory, String(input.jobInputName || ""));
  if (!input.jobInputName || !inputPath.startsWith(`${inputDirectory}/`)) throw error("ANCESTOR_SOURCE_MISSING", 500);
  const source = await readFile(inputPath).catch(() => null);
  if (!source) throw error("ANCESTOR_SOURCE_MISSING", 500);
  const prior = parse(task.output_json, {});
  const resultFiles = Array.isArray(prior.resultFiles) ? prior.resultFiles : [];
  const completedLevels = new Set(resultFiles.map((item) => Number(item.level)));
  const startedAt = Date.now();
  let dimensions = {};
  try {
    for (let stage = 1; stage <= 10; stage += 1) {
      if (completedLevels.has(stage)) continue;
      const latest = db.prepare("SELECT status FROM tasks WHERE id = ?").get(task.id);
      if (latest?.status === "cancelled") return { status: "cancelled", output: prior };
      const referenceMeta = input.referenceFiles?.[stage - 1];
      const referenceBuffer = referenceMeta?.jobInputName ? await readFile(resolve(inputDirectory, referenceMeta.jobInputName)).catch(() => null) : null;
      const generated = await processAncestorStage({ buffer: source, mimeType: input.mimeType, name: input.fileName, stage, style: input.style, customPrompt: input.customPrompts?.[stage - 1] || "", referenceBuffer, referenceMimeType: referenceMeta?.mimeType || "image/png" }, fetchImpl);
      assertUserFileCapacity(task.user_id, 1);
      const fileId = randomUUID();
      const stored = await putStoredFile({ userId: task.user_id, fileId, fileName: generated.name, mimeType: generated.mimeType, buffer: generated.buffer });
      const timestamp = Date.now();
      const publicFile = { id: fileId, name: generated.name, mimeType: generated.mimeType, sizeBytes: generated.buffer.length, direction: generated.direction, level: stage, downloadUrl: `/api/files/${fileId}/download` };
      resultFiles.push(publicFile);
      dimensions = { width: generated.width, height: generated.height, sourceWidth: generated.sourceWidth, sourceHeight: generated.sourceHeight };
      const output = { ...prior, ...dimensions, resultFiles, resultFileIds: resultFiles.map((item) => item.id), frameCount: resultFiles.length, generatedFrameCount: resultFiles.length, progress: { completed: resultFiles.length, total: 10, currentStage: Math.min(10, stage + 1) } };
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("INSERT INTO files (id,user_id,name,storage_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)")
          .run(fileId, task.user_id, generated.name, stored.storageName, generated.mimeType, generated.buffer.length, timestamp);
        db.prepare("INSERT INTO file_storage_objects (file_id,provider,object_key,etag,status,created_at,updated_at) VALUES (?,?,?,?,\'available\',?,?)")
          .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
        db.prepare("INSERT INTO task_files (task_id,file_id) VALUES (?,?)").run(task.id, fileId);
        db.prepare("UPDATE tasks SET output_json = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(output), timestamp, task.id);
        db.exec("COMMIT");
      } catch (caught) {
        db.exec("ROLLBACK");
        await deleteStoredFile(stored).catch(() => {});
        throw caught;
      }
    }
    await rm(inputPath, { force: true }).catch(() => {});
    await Promise.all((input.referenceFiles || []).filter(Boolean).map((item) => rm(resolve(inputDirectory, item.jobInputName), { force: true }).catch(() => {})));
    return { status: "completed", output: { ...prior, ...dimensions, resultFiles, resultFileIds: resultFiles.map((item) => item.id), frameCount: 10, generatedFrameCount: 10, progress: { completed: 10, total: 10, currentStage: 10 }, latencyMs: Date.now() - startedAt, entertainmentOnly: true } };
  } catch (caught) {
    throw caught;
  }
}

export async function cleanupAncestorTaskInput(taskId) {
  const task = db.prepare("SELECT input_json FROM tasks WHERE id = ?").get(taskId);
  const input = parse(task?.input_json, {});
  if (!input.jobInputName) return;
  const path = resolve(inputDirectory, String(input.jobInputName));
  if (path.startsWith(`${inputDirectory}/`)) await rm(path, { force: true }).catch(() => {});
  await Promise.all((input.referenceFiles || []).filter(Boolean).map((item) => {
    const referencePath = resolve(inputDirectory, String(item.jobInputName || ""));
    return referencePath.startsWith(`${inputDirectory}/`) ? rm(referencePath, { force: true }).catch(() => {}) : Promise.resolve();
  }));
}
