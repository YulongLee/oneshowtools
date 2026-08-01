import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PDFParse } from "pdf-parse";
import { audit, db } from "./database.mjs";
import { invokeModel, toolModelSelection } from "./model-gateway.mjs";
import { deleteStoredFile, putStoredFile } from "./object-storage.mjs";
import { generateWriting } from "./writing-engine.mjs";
import { generateSeo } from "./seo-engine.mjs";

const toolError = (code, status = 400) => Object.assign(new Error(code), { code, status });

function localPolish(value) {
  return String(value)
    .trim()
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([，。！？；：,.!?;:])/g, "$1")
    .replace(/([，。！？；：,.!?;:])\1+/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^|[.!?。！？]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function extractiveSummary(value, locale) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) throw toolError("PDF_TEXT_NOT_FOUND", 422);
  const sentences = text.split(/(?<=[。！？.!?])\s*/).filter((sentence) => sentence.length > 20);
  const selected = (sentences.length ? sentences : [text]).slice(0, 7);
  const title = locale === "en" ? "Document summary" : "文档摘要";
  const keyPoints = locale === "en" ? "Key points" : "核心要点";
  return `# ${title}\n\n${selected[0]}\n\n## ${keyPoints}\n\n${selected.slice(1).map((sentence) => `- ${sentence}`).join("\n") || `- ${selected[0]}`}`;
}

async function modelText(user, instruction, text, connectionId = null, capability = "text") {
  try {
    const result = await invokeModel({
      userId: user.id,
      capability,
      connectionId: connectionId || null,
      instruction,
      text,
    });
    return { text: result.text, route: result.route };
  } catch (error) {
    if (error.code === "ONESH​OW_MODEL_UNAVAILABLE".replace("\u200b", "")) return null;
    throw toolError(error.code || "MODEL_REQUEST_FAILED", error.status || 502);
  }
}

async function processBackground(file, form) {
  if (!file?.size) throw toolError("IMAGE_REQUIRED");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input).rotate().ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const positions = [
    0,
    (info.width - 1) * 4,
    (info.height - 1) * info.width * 4,
    ((info.height - 1) * info.width + info.width - 1) * 4,
  ];
  const background = positions.reduce((acc, offset) => {
    acc[0] += data[offset];
    acc[1] += data[offset + 1];
    acc[2] += data[offset + 2];
    return acc;
  }, [0, 0, 0]).map((channel) => channel / positions.length);
  const tolerance = Math.min(120, Math.max(12, Number(form.get("tolerance") || 48)));
  const threshold = tolerance * tolerance * 3;
  let transparentPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const distance = (data[offset] - background[0]) ** 2
      + (data[offset + 1] - background[1]) ** 2
      + (data[offset + 2] - background[2]) ** 2;
    if (distance <= threshold) {
      data[offset + 3] = Math.round(255 * Math.min(1, distance / threshold));
      transparentPixels += 1;
    }
  }
  const output = await sharp(data, { raw: info }).png().toBuffer();
  return {
    buffer: output,
    extension: ".png",
    mimeType: "image/png",
    name: `${file.name.replace(/\.[^.]+$/, "")}-no-background.png`,
    output: { width: info.width, height: info.height, transparentPixels, tolerance },
  };
}

async function processCompression(file, form) {
  if (!file?.size) throw toolError("IMAGE_REQUIRED");
  const input = Buffer.from(await file.arrayBuffer());
  const quality = Math.min(95, Math.max(30, Number(form.get("quality") || 75)));
  const output = await sharp(input).rotate().webp({ quality, effort: 4 }).toBuffer();
  const metadata = await sharp(output).metadata();
  return {
    buffer: output,
    extension: ".webp",
    mimeType: "image/webp",
    name: `${file.name.replace(/\.[^.]+$/, "")}-compressed.webp`,
    output: {
      width: metadata.width,
      height: metadata.height,
      originalBytes: file.size,
      compressedBytes: output.length,
      savedPercent: Math.max(0, Math.round((1 - output.length / file.size) * 100)),
      quality,
    },
  };
}

async function processPdf(file, locale, user, connectionId) {
  if (!file?.size || file.type !== "application/pdf") throw toolError("PDF_REQUIRED");
  const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }
  const text = result.text?.slice(0, 120000) || "";
  const aiSummary = await modelText(
    user,
    locale === "en"
      ? "Summarize this document with a short overview and clear bullet-point key ideas."
      : "请将这份文档整理为简洁摘要，包含概述和清晰的核心要点。",
    text,
    connectionId,
    "pdf-summary",
  );
  return {
    output: {
      text: aiSummary?.text || extractiveSummary(text, locale),
      pages: result.total || result.pages?.length || null,
      characters: text.length,
      mode: aiSummary ? "ai" : "local-extractive",
      ...(aiSummary ? { route: aiSummary.route } : {}),
    },
  };
}

async function processText(slug, payload, locale, user) {
  const text = String(payload.text || "").trim();
  if (!text) throw toolError("TEXT_REQUIRED");
  if (slug === "copy-polish") {
    const aiText = await modelText(
      user,
      locale === "en"
        ? "Polish the following copy. Preserve its meaning and return only the improved copy."
        : "润色下面的文案，保留原意，只输出改进后的文案。",
      text,
      payload.modelConnectionId,
      "copy-polish",
    );
    return {
      output: {
        text: aiText?.text || localPolish(text),
        mode: aiText ? "ai" : "local-rules",
        ...(aiText ? { route: aiText.route } : {}),
      },
    };
  }
  if (slug === "speech-to-text") {
    return { output: { text, mode: "browser-speech-recognition" } };
  }
  throw toolError("TOOL_ACTION_NOT_SUPPORTED", 404);
}

function storeCompletedTask({ user, tool, input, output, resultFile, writingRun = null, seoRun = null }) {
  const taskId = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const available = Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance);
    if (available < tool.creditCost) throw toolError("INSUFFICIENT_CREDITS", 402);
    db.prepare(`
      INSERT INTO tasks (id, user_id, tool_id, status, input_json, output_json, credit_cost, created_at, updated_at, completed_at)
      VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)
    `).run(taskId, user.id, tool.id, JSON.stringify(input), JSON.stringify(output), tool.creditCost, timestamp, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare(`
        INSERT INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'consumption', ?, ?, ?, 'task', ?, ?)
      `).run(randomUUID(), user.id, -tool.creditCost, `使用${tool.nameZh}`, `Used ${tool.nameEn}`, taskId, timestamp);
    }
    if (resultFile) {
      db.prepare(`
        INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(resultFile.id, user.id, resultFile.name, resultFile.storageName, resultFile.mimeType, resultFile.sizeBytes, timestamp);
      db.prepare(`
        INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'available', ?, ?)
      `).run(resultFile.id, resultFile.provider, resultFile.objectKey, resultFile.etag, timestamp, timestamp);
      db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(taskId, resultFile.id);
    }
    if (writingRun) {
      db.prepare(`
        INSERT INTO writing_runs (task_id, user_id, module_id, template_id, prompt_version,
          output_language, output_length, tone, word_count, quality_score, model_route, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, user.id, writingRun.moduleId, writingRun.templateId, writingRun.promptVersion,
        writingRun.outputLanguage, writingRun.outputLength, writingRun.tone, writingRun.wordCount,
        writingRun.qualityScore, writingRun.modelRoute, timestamp);
    }
    if (seoRun) {
      db.prepare(`
        INSERT INTO seo_runs (task_id, user_id, module_id, template_id, website, data_source,
          data_quality, score, report_markdown, structured_json, model_route, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, user.id, seoRun.moduleId, seoRun.templateId, seoRun.website,
        seoRun.dataSource, seoRun.dataQuality, seoRun.score, seoRun.reportMarkdown,
        JSON.stringify(seoRun.structured || {}), seoRun.modelRoute, timestamp);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(user.id, "tool.run", "task", taskId, { toolId: tool.id });
  return {
    task: { id: taskId, status: "completed", creditCost: tool.creditCost, createdAt: timestamp },
    output,
    file: resultFile ? {
      id: resultFile.id,
      name: resultFile.name,
      mimeType: resultFile.mimeType,
      sizeBytes: resultFile.sizeBytes,
      downloadUrl: `/api/files/${resultFile.id}/download`,
    } : null,
  };
}

export async function runToolAction(request, user, tool) {
  const available = Number(db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?",
  ).get(user.id).balance);
  if (available < tool.creditCost) throw toolError("INSUFFICIENT_CREDITS", 402);

  let processed;
  let input;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const requestedModelConnectionId = String(form.get("modelConnectionId") || "") || null;
    const modelConnectionId = tool.runtimeKind === "openai"
      ? toolModelSelection(user.id, tool.id, requestedModelConnectionId)
      : null;
    input = { fileName: file?.name || null, fileSize: file?.size || 0, modelConnectionId };
    if (tool.slug === "background-remover") processed = await processBackground(file, form);
    else if (tool.slug === "image-compressor") processed = await processCompression(file, form);
    else if (tool.slug === "pdf-summary") processed = await processPdf(file, user.locale, user, modelConnectionId);
    else throw toolError("TOOL_ACTION_NOT_SUPPORTED", 404);
  } else {
    const payload = await request.json().catch(() => ({}));
    const modelConnectionId = tool.runtimeKind === "openai"
      ? toolModelSelection(user.id, tool.id, payload.modelConnectionId)
      : null;
    payload.modelConnectionId = modelConnectionId;
    if (tool.slug === "ai-writer") {
      processed = await generateWriting({ user, payload, connectionId: modelConnectionId });
      input = processed.safeInput;
    } else if (tool.slug === "seo-workbench") {
      processed = await generateSeo({ user, payload, connectionId: modelConnectionId });
      input = processed.safeInput;
    } else {
      input = { text: String(payload.text || "").slice(0, 50000), modelConnectionId };
      processed = await processText(tool.slug, payload, user.locale, user);
    }
  }

  let resultFile = null;
  if (processed.buffer) {
    const id = randomUUID();
    const stored = await putStoredFile({ userId: user.id, fileId: id, fileName: processed.name, mimeType: processed.mimeType, buffer: processed.buffer });
    resultFile = {
      id,
      ...stored,
      name: processed.name,
      mimeType: processed.mimeType,
      sizeBytes: processed.buffer.length,
    };
  }
  const output = { ...processed.output, ...(resultFile ? { resultFileId: resultFile.id } : {}) };
  try {
    return storeCompletedTask({ user, tool, input, output, resultFile, writingRun: processed.writingRun, seoRun: processed.seoRun });
  } catch (error) {
    if (resultFile) await deleteStoredFile(resultFile).catch(() => {});
    throw error;
  }
}
