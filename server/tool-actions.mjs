import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PDFParse } from "pdf-parse";
import { audit, db } from "./database.mjs";
import { invokeModel, toolModelCapability, toolModelSelection } from "./model-gateway.mjs";
import { deleteStoredFile, putStoredFile } from "./object-storage.mjs";
import { assertUserFileCapacity } from "./file-quota.mjs";
import { generateWriting } from "./writing-engine.mjs";
import { generateLyrics } from "./lyrics-engine.mjs";
import { generateSeo } from "./seo-engine.mjs";
import { seoSpecialistBySlug } from "./seo-specialists.mjs";
import { imageToolSlugs, processImageTool } from "./image-tools.mjs";
import { aiImageToolSlugs, processAiImageTool } from "./ai-image-tools.mjs";
import { pdfToolSlugSet, processPdfTool } from "./pdf-tools.mjs";
import { processUtilityTool, utilityToolSlugs } from "./utility-tools.mjs";
import { mediaToolSlugs, processMediaTool } from "./media-tools.mjs";
import { dataFileToolSlugs, processDataFileTool } from "./data-tools.mjs";
import { analyzeFoodNutrition } from "./food-nutrition.mjs";
import { analyzeFridgeRecipes } from "./fridge-recipes.mjs";
import { processTierList } from "./tier-list-generator.mjs";
import { buildMbtiReport, MBTI_ASSESSMENT_VERSION, mbtiQuestions } from "../shared/mbti-assessment.mjs";

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

function extractiveAnswer(value, question, locale) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) throw toolError("PDF_TEXT_NOT_FOUND", 422);
  const terms = [...new Set(String(question).toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])];
  const passages = text.split(/(?<=[。！？.!?])\s*/).filter((item) => item.length >= 8);
  const ranked = passages.map((passage, index) => ({
    passage,
    index,
    score: terms.reduce((sum, term) => sum + (passage.toLowerCase().includes(term) ? Math.min(4, term.length) : 0), 0),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = ranked.filter((item) => item.score > 0).slice(0, 5);
  if (!selected.length) {
    return locale === "en"
      ? "The document's text layer does not contain a passage that directly matches this question. Try a more specific term or use an AI model for semantic Q&A."
      : "在文档文字层中没有找到与该问题直接匹配的内容。可以尝试使用更具体的关键词，或配置模型进行语义问答。";
  }
  const heading = locale === "en" ? "Relevant passages from the document" : "文档中的相关内容";
  return `## ${heading}\n\n${selected.map((item) => `- ${item.passage}`).join("\n")}`;
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

async function processPdf(file, locale, user, connectionId, question = "") {
  if (!file?.size || file.type !== "application/pdf") throw toolError("PDF_REQUIRED");
  const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }
  const text = result.text?.slice(0, 120000) || "";
  const userQuestion = String(question || "").trim().slice(0, 1000);
  const aiSummary = await modelText(
    user,
    userQuestion
      ? (locale === "en"
        ? `Answer the user's question using only the supplied document. State clearly when the document does not contain the answer. User question: ${userQuestion}`
        : `请仅依据所提供的文档回答用户问题；如果文档没有答案，请明确说明。用户问题：${userQuestion}`)
      : (locale === "en"
        ? "Summarize this document with a short overview, key conclusions, and clear bullet-point ideas."
        : "请将这份文档整理为结构清晰的摘要，包含概述、核心结论和清晰的要点。"),
    text,
    connectionId,
    "pdf-summary",
  );
  return {
    output: {
      text: aiSummary?.text || (userQuestion ? extractiveAnswer(text, userQuestion, locale) : extractiveSummary(text, locale)),
      pages: result.total || result.pages?.length || null,
      characters: text.length,
      mode: aiSummary ? "ai" : "local-extractive",
      requestKind: userQuestion ? "question" : "summary",
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

function storeCompletedTask({ user, tool, input, output, resultFile, resultFiles = [], writingRun = null, seoRun = null, rankSnapshots = [] }) {
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
    const filesToStore = resultFiles.length ? resultFiles : (resultFile ? [resultFile] : []);
    for (const storedFile of filesToStore) {
      db.prepare(`
        INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(storedFile.id, user.id, storedFile.name, storedFile.storageName, storedFile.mimeType, storedFile.sizeBytes, timestamp);
      db.prepare(`
        INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'available', ?, ?)
      `).run(storedFile.id, storedFile.provider, storedFile.objectKey, storedFile.etag, timestamp, timestamp);
      db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(taskId, storedFile.id);
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
    for (const snapshot of rankSnapshots) {
      db.prepare(`
        INSERT INTO seo_rank_snapshots
        (id, user_id, website, keyword, country, language, search_engine, device, rank, result_url, source, observed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), user.id, snapshot.website, snapshot.keyword, snapshot.country || null,
        snapshot.language || null, snapshot.searchEngine || "google", snapshot.device || "desktop",
        snapshot.rank ?? null, snapshot.resultUrl || null,
        snapshot.source, snapshot.observedAt || timestamp);
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
    file: resultFile ? { id: resultFile.id, name: resultFile.name, mimeType: resultFile.mimeType, sizeBytes: resultFile.sizeBytes, downloadUrl: `/api/files/${resultFile.id}/download` } : null,
    files: resultFiles.map((item) => ({ id: item.id, name: item.name, mimeType: item.mimeType, sizeBytes: item.sizeBytes, direction: item.direction, level: item.level, downloadUrl: `/api/files/${item.id}/download` })),
  };
}

export async function runToolAction(request, user, tool) {
  const available = Number(db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?",
  ).get(user.id).balance);
  if (available < tool.creditCost) throw toolError("INSUFFICIENT_CREDITS", 402);
  const alwaysCreatesFile = tool.slug === "background-remover" || tool.slug === "image-compressor"
    || tool.slug === "hang-la-tier-list-generator"
    || tool.slug === "ai-fridge-recipe"
    || imageToolSlugs.has(tool.slug) || aiImageToolSlugs.has(tool.slug) || pdfToolSlugSet.has(tool.slug)
    || mediaToolSlugs.has(tool.slug) || dataFileToolSlugs.has(tool.slug);
  if (alwaysCreatesFile) assertUserFileCapacity(user.id, tool.slug === "sliding-ancestor-generator" ? 10 : 1);

  let processed;
  let input;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const uploadedFiles = form.getAll("files").filter((item) => item?.size);
    const requestedModelConnectionId = String(form.get("modelConnectionId") || "") || null;
    const modelConnectionId = toolModelCapability(tool.runtimeKind).userConfigurable
      ? toolModelSelection(user.id, tool.id, requestedModelConnectionId)
      : null;
    input = { fileName: file?.name || null, fileSize: file?.size || 0, fileNames: uploadedFiles.map((item) => item.name), fileCount: uploadedFiles.length || (file?.size ? 1 : 0), modelConnectionId };
    if (tool.slug === "ai-outfit-changer") {
      input.outfitMode = uploadedFiles.length > 1 ? "reference" : "description";
      input.outfit = String(form.get("outfit") || "").trim().slice(0, 300);
      input.prompt = String(form.get("prompt") || "").trim().slice(0, 1200);
    }
    if (tool.slug === "food-nutrition-analyzer") {
      processed = await analyzeFoodNutrition(form, { userId: user.id, modelConnectionId });
      input = processed.safeInput;
      input.modelConnectionId = modelConnectionId;
    }
    else if (tool.slug === "ai-fridge-recipe") {
      processed = await analyzeFridgeRecipes(form, { userId: user.id, modelConnectionId });
      input = processed.safeInput;
      input.modelConnectionId = modelConnectionId;
    }
    else if (tool.slug === "hang-la-tier-list-generator") {
      processed = await processTierList(form);
      input = {
        title: processed.output.title,
        layout: processed.output.layout,
        template: processed.output.template,
        tierCount: processed.output.tierCount,
        itemCount: processed.output.itemCount,
      };
    }
    else if (tool.slug === "background-remover") processed = await processBackground(file, form);
    else if (tool.slug === "image-compressor") processed = await processCompression(file, form);
    else if (imageToolSlugs.has(tool.slug)) processed = await processImageTool(tool.slug, form);
    else if (aiImageToolSlugs.has(tool.slug)) processed = await processAiImageTool(tool.slug, form);
    else if (pdfToolSlugSet.has(tool.slug)) processed = await processPdfTool(tool.slug, form);
    else if (mediaToolSlugs.has(tool.slug)) processed = await processMediaTool(tool.slug, form);
    else if (dataFileToolSlugs.has(tool.slug)) processed = await processDataFileTool(tool.slug, form);
    else if (tool.slug === "pdf-summary") processed = await processPdf(file, user.locale, user, modelConnectionId, form.get("question"));
    else throw toolError("TOOL_ACTION_NOT_SUPPORTED", 404);
  } else {
    const payload = await request.json().catch(() => ({}));
    const modelConnectionId = toolModelCapability(tool.runtimeKind).userConfigurable
      ? toolModelSelection(user.id, tool.id, payload.modelConnectionId)
      : null;
    payload.modelConnectionId = modelConnectionId;
    if (tool.slug === "mbti-personality-test") {
      if (String(payload.version || MBTI_ASSESSMENT_VERSION) !== MBTI_ASSESSMENT_VERSION) throw toolError("MBTI_VERSION_UNSUPPORTED", 409);
      processed = {
        safeInput: { version: MBTI_ASSESSMENT_VERSION, answerCount: mbtiQuestions.length },
        output: { ...buildMbtiReport(payload.answers, payload.locale || user.locale, { durationSeconds: payload.durationSeconds }), assessedAt: new Date().toISOString() },
      };
      input = processed.safeInput;
    } else if (tool.slug === "ai-writer") {
      processed = await generateWriting({ user, payload, connectionId: modelConnectionId });
      input = processed.safeInput;
    } else if (tool.slug === "lyrics-generator") {
      processed = await generateLyrics({ user, payload, connectionId: modelConnectionId });
      input = processed.safeInput;
    } else if (tool.slug === "seo-workbench" || seoSpecialistBySlug.has(tool.slug)) {
      const specialist = seoSpecialistBySlug.get(tool.slug);
      if (specialist && !specialist.templateIds.includes(String(payload.templateId || ""))) {
        throw toolError("SEO_AGENT_CAPABILITY_NOT_ALLOWED", 403);
      }
      processed = await generateSeo({ user, payload, connectionId: modelConnectionId });
      input = processed.safeInput;
    } else if (utilityToolSlugs.has(tool.slug)) {
      processed = await processUtilityTool({
        slug: tool.slug,
        payload,
        locale: user.locale,
        modelText: (instruction, source, capability) => modelText(user, instruction, source, modelConnectionId, capability),
      });
      input = processed.safeInput;
    } else {
      input = { text: String(payload.text || "").slice(0, 50000), modelConnectionId };
      processed = await processText(tool.slug, payload, user.locale, user);
    }
  }

  let resultFile = null;
  const resultFiles = [];
  if (processed.buffer) {
    assertUserFileCapacity(user.id);
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
  if (processed.files?.length) {
    assertUserFileCapacity(user.id, processed.files.length);
    try {
      for (const item of processed.files) {
        const id = randomUUID();
        const stored = await putStoredFile({ userId: user.id, fileId: id, fileName: item.name, mimeType: item.mimeType, buffer: item.buffer });
        resultFiles.push({ id, ...stored, name: item.name, mimeType: item.mimeType, sizeBytes: item.buffer.length, direction: item.direction, level: item.level });
      }
    } catch (error) {
      await Promise.all(resultFiles.map((item) => deleteStoredFile(item).catch(() => {})));
      throw error;
    }
  }
  const publicResultFiles = resultFiles.map((item) => ({ id: item.id, name: item.name, mimeType: item.mimeType, sizeBytes: item.sizeBytes, direction: item.direction, level: item.level, downloadUrl: `/api/files/${item.id}/download` }));
  const output = { ...processed.output, ...(resultFile ? { resultFileId: resultFile.id } : {}), ...(resultFiles.length ? { resultFileIds: resultFiles.map((item) => item.id), resultFiles: publicResultFiles } : {}) };
  try {
    return storeCompletedTask({ user, tool, input, output, resultFile, resultFiles, writingRun: processed.writingRun, seoRun: processed.seoRun, rankSnapshots: processed.rankSnapshots || [] });
  } catch (error) {
    if (resultFile) await deleteStoredFile(resultFile).catch(() => {});
    await Promise.all(resultFiles.map((item) => deleteStoredFile(item).catch(() => {})));
    throw error;
  }
}
