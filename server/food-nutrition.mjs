import sharp from "sharp";
import { invokePlatformVisionModel } from "./model-gateway.mjs";

const nutritionError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function parseJson(text) {
  const source = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw nutritionError("FOOD_ANALYSIS_INVALID_RESPONSE", 502);
  try { return JSON.parse(source.slice(start, end + 1)); }
  catch { throw nutritionError("FOOD_ANALYSIS_INVALID_RESPONSE", 502); }
}

function number(value, min = 0, max = 100_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed * 10) / 10)) : 0;
}

function metric(value, fallbackSpread = 0.25) {
  const estimate = number(value?.estimate ?? value);
  const min = number(value?.min ?? estimate * (1 - fallbackSpread));
  const max = number(value?.max ?? estimate * (1 + fallbackSpread));
  return { estimate, min: Math.min(min, estimate), max: Math.max(max, estimate) };
}

function sanitizeAnalysis(raw, modelId) {
  if (raw?.isFood === false || !Array.isArray(raw?.items) || raw.items.length === 0) {
    throw nutritionError("FOOD_NOT_RECOGNIZED");
  }
  const confidence = ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : "low";
  const spread = confidence === "high" ? 0.15 : confidence === "medium" ? 0.25 : 0.4;
  const items = raw.items.slice(0, 12).map((item, index) => ({
    name: String(item?.name || `食物 ${index + 1}`).slice(0, 80),
    portionDescription: String(item?.portionDescription || "图片可见份量").slice(0, 120),
    estimatedWeightG: number(item?.estimatedWeightG, 0, 10_000),
    caloriesKcal: metric(item?.caloriesKcal, spread),
    proteinG: metric(item?.proteinG, spread),
    carbsG: metric(item?.carbsG, spread),
    fatG: metric(item?.fatG, spread),
    fiberG: metric(item?.fiberG, spread),
    sodiumMg: metric(item?.sodiumMg, spread),
    confidence: ["high", "medium", "low"].includes(item?.confidence) ? item.confidence : confidence,
    assumptions: Array.isArray(item?.assumptions) ? item.assumptions.slice(0, 5).map((entry) => String(entry).slice(0, 160)) : [],
  }));
  const sum = (key) => items.reduce((total, item) => total + item[key].estimate, 0);
  const total = {
    caloriesKcal: metric(raw?.total?.caloriesKcal ?? sum("caloriesKcal"), spread),
    proteinG: metric(raw?.total?.proteinG ?? sum("proteinG"), spread),
    carbsG: metric(raw?.total?.carbsG ?? sum("carbsG"), spread),
    fatG: metric(raw?.total?.fatG ?? sum("fatG"), spread),
    fiberG: metric(raw?.total?.fiberG ?? sum("fiberG"), spread),
    sodiumMg: metric(raw?.total?.sodiumMg ?? sum("sodiumMg"), spread),
  };
  return {
    version: "1.0",
    mealName: String(raw.mealName || items.map((item) => item.name).join("、")).slice(0, 120),
    summary: String(raw.summary || "已根据照片中的食物和可见份量完成营养估算。").slice(0, 500),
    confidence,
    total,
    items,
    visibleEvidence: Array.isArray(raw.visibleEvidence) ? raw.visibleEvidence.slice(0, 8).map((entry) => String(entry).slice(0, 180)) : [],
    hiddenUncertainties: Array.isArray(raw.hiddenUncertainties) ? raw.hiddenUncertainties.slice(0, 8).map((entry) => String(entry).slice(0, 180)) : [],
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 6).map((entry) => String(entry).slice(0, 180)) : [],
    analysisMethod: "ai_visual_estimate",
    modelId,
    disclaimer: "结果由图片视觉估算得出，份量、配方、烹饪用油和调味料会造成明显误差，仅供日常饮食记录参考，不用于医疗诊断或治疗决策。",
  };
}

function buildPrompt({ portionHint, mealContext, locale }) {
  return `你是 OneShowTools 的食物营养估算引擎。请分析用户上传的食物照片，仅返回一个 JSON 对象，不要 Markdown，不要解释。

任务规则：
1. 识别每一种可见食物，并估算可见份量、克重、热量、蛋白质、碳水、脂肪、膳食纤维和钠。
2. 所有营养值都必须同时给出 estimate、min、max。区间必须真实反映份量、烹饪油、酱汁和隐藏配料的不确定性，不能伪造精确值。
3. 总计应覆盖整张图片中准备食用的食物；餐具和包装不要计入。
4. 看不清或无法确认的菜品要降低 confidence，并写入 hiddenUncertainties；不要臆测品牌、疾病或食用者身份。
5. tips 只给普通、温和、非医疗性的饮食记录建议，不诊断、不提供治疗或减肥处方。
6. 如果图片不是食物，返回 {"isFood":false,"items":[]}。

用户补充份量：${portionHint || "未提供"}
用餐场景：${mealContext || "unspecified"}
界面语言：${locale === "en" ? "English" : "简体中文"}

JSON Schema：
{"isFood":true,"mealName":"","summary":"","confidence":"high|medium|low","total":{"caloriesKcal":{"estimate":0,"min":0,"max":0},"proteinG":{"estimate":0,"min":0,"max":0},"carbsG":{"estimate":0,"min":0,"max":0},"fatG":{"estimate":0,"min":0,"max":0},"fiberG":{"estimate":0,"min":0,"max":0},"sodiumMg":{"estimate":0,"min":0,"max":0}},"items":[{"name":"","portionDescription":"","estimatedWeightG":0,"caloriesKcal":{"estimate":0,"min":0,"max":0},"proteinG":{"estimate":0,"min":0,"max":0},"carbsG":{"estimate":0,"min":0,"max":0},"fatG":{"estimate":0,"min":0,"max":0},"fiberG":{"estimate":0,"min":0,"max":0},"sodiumMg":{"estimate":0,"min":0,"max":0},"confidence":"high|medium|low","assumptions":[]}],"visibleEvidence":[],"hiddenUncertainties":[],"tips":[]}`;
}

export async function analyzeFoodNutrition(form, { modelInvoker = invokePlatformVisionModel } = {}) {
  const file = form.get("file");
  if (!file?.size) throw nutritionError("IMAGE_REQUIRED", 400);
  if (file.size > 12 * 1024 * 1024) throw nutritionError("IMAGE_TOO_LARGE", 413);
  if (!allowedTypes.has(file.type)) throw nutritionError("IMAGE_FORMAT_UNSUPPORTED", 415);
  const source = Buffer.from(await file.arrayBuffer());
  let optimized;
  try {
    optimized = await sharp(source, { limitInputPixels: 24_000_000 })
      .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  } catch { throw nutritionError("IMAGE_INVALID", 422); }

  const portionHint = String(form.get("portionHint") || "").trim().slice(0, 300);
  const mealContext = String(form.get("mealContext") || "unspecified").slice(0, 30);
  const locale = String(form.get("locale") || "zh") === "en" ? "en" : "zh";
  const result = await modelInvoker({
    purpose: "food_nutrition",
    service: "food-nutrition-analyzer",
    instruction: "Return valid JSON only. Never include markdown fences.",
    prompt: buildPrompt({ portionHint, mealContext, locale }),
    imageDataUrl: `data:image/jpeg;base64,${optimized.toString("base64")}`,
    timeoutMs: 90_000,
  });
  return {
    output: sanitizeAnalysis(parseJson(result.text), result.modelId),
    safeInput: { fileName: String(file.name || "food-photo").slice(0, 160), fileSize: file.size, portionHint, mealContext },
  };
}
