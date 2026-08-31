import sharp from "sharp";
import { invokeVisionModel } from "./model-gateway.mjs";
import { generatePlatformImage } from "./image-provider.mjs";

const fridgeError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function parseJson(text) {
  const source = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw fridgeError("FRIDGE_ANALYSIS_INVALID_RESPONSE", 502);
  try { return JSON.parse(source.slice(start, end + 1)); }
  catch { throw fridgeError("FRIDGE_ANALYSIS_INVALID_RESPONSE", 502); }
}

const text = (value, max = 160) => String(value || "").trim().slice(0, max);
const list = (value, max = 12, itemMax = 120) => Array.isArray(value) ? value.slice(0, max).map((item) => text(item, itemMax)).filter(Boolean) : [];
const number = (value, min = 0, max = 100_000) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(Math.min(max, Math.max(min, parsed))) : min;
};

function sanitizeIngredient(item, index) {
  return {
    id: text(item?.id || `ingredient-${index + 1}`, 80),
    name: text(item?.name || `食材 ${index + 1}`, 60),
    category: ["protein", "vegetable", "staple", "dairy", "fruit", "condiment", "other"].includes(item?.category) ? item.category : "other",
    quantity: text(item?.quantity || "可见适量", 60),
    confidence: ["high", "medium", "low"].includes(item?.confidence) ? item.confidence : "low",
    expiryHintDays: item?.expiryHintDays == null ? null : number(item.expiryHintDays, 0, 30),
  };
}

function sanitizeRecipe(item, index) {
  const steps = Array.isArray(item?.steps) ? item.steps.slice(0, 12).map((step, stepIndex) => ({
    order: stepIndex + 1,
    title: text(step?.title || `步骤 ${stepIndex + 1}`, 60),
    detail: text(step?.detail || step, 320),
  })).filter((step) => step.detail) : [];
  return {
    id: text(item?.id || `recipe-${index + 1}`, 80),
    name: text(item?.name || `推荐食谱 ${index + 1}`, 80),
    summary: text(item?.summary, 260),
    matchPercent: number(item?.matchPercent, 0, 100),
    cookTimeMinutes: number(item?.cookTimeMinutes, 1, 240),
    servings: number(item?.servings, 1, 12),
    caloriesKcalPerServing: number(item?.caloriesKcalPerServing, 0, 3000),
    difficulty: ["easy", "medium", "advanced"].includes(item?.difficulty) ? item.difficulty : "easy",
    tags: list(item?.tags, 5, 30),
    useIngredients: list(item?.useIngredients, 20, 80),
    missingIngredients: list(item?.missingIngredients, 10, 80),
    steps,
    imagePrompt: text(item?.imagePrompt, 600),
  };
}

function sanitizeAnalysis(raw, modelId) {
  const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients.slice(0, 40).map(sanitizeIngredient) : [];
  const recipes = Array.isArray(raw?.recipes) ? raw.recipes.slice(0, 6).map(sanitizeRecipe).filter((item) => item.steps.length) : [];
  if (raw?.isFridge === false || ingredients.length === 0) throw fridgeError("FRIDGE_FOOD_NOT_RECOGNIZED");
  if (!recipes.length) throw fridgeError("FRIDGE_RECIPE_NOT_GENERATED", 502);
  return {
    version: "1.0",
    fridgeSummary: text(raw?.fridgeSummary || `识别到 ${ingredients.length} 种可用食材。`, 320),
    confidence: ["high", "medium", "low"].includes(raw?.confidence) ? raw.confidence : "medium",
    ingredients,
    recipes,
    shoppingList: list(raw?.shoppingList, 16, 100),
    safetyNotes: list(raw?.safetyNotes, 8, 180),
    modelId,
    disclaimer: "食材识别、保质期和营养信息来自图片推断，仅供烹饪参考。食用前请人工确认食材的新鲜度、过敏原与是否彻底熟制。",
  };
}

function buildPrompt({ locale, dietaryPreference, allergies, maxCookTime, servings }) {
  return `你是 OneShowTools 的 AI 冰箱食谱规划引擎。请查看冰箱照片，识别可见食材并推荐真正能执行的家常食谱。仅返回一个 JSON 对象，不要 Markdown。

规则：
1. 只记录图片中可见或高概率可确认的食材；模糊包装、遮挡物要降低 confidence，不猜品牌。
2. ingredients 最多 40 项，按 protein、vegetable、staple、dairy、fruit、condiment、other 分类；quantity 用自然语言描述。
3. 推荐 6 道差异明显的食谱，优先消耗现有和容易过期食材。matchPercent 必须根据已有/缺少食材真实计算，不可全部写 100。
4. 每道食谱包含 4–6 个简洁但可执行的步骤；每步 detail 不超过 80 个中文字符。包含用到的食材、缺少食材、时间、份数、单份热量估算、难度和标签。
5. 缺少食材集中写入 shoppingList；不确定是否变质的内容写入 safetyNotes。不要提供医疗建议。
6. imagePrompt 只需一句简短英文菜品摄影描述。
7. 若不是冰箱/橱柜/食材照片，返回 {"isFridge":false,"ingredients":[],"recipes":[]}。

饮食偏好：${dietaryPreference || "不限"}
过敏原/忌口：${allergies || "未提供"}
最长烹饪时间：${maxCookTime || 45} 分钟
计划份数：${servings || 2}
输出语言：${locale === "en" ? "English" : "简体中文"}

JSON Schema：
{"isFridge":true,"fridgeSummary":"","confidence":"high|medium|low","ingredients":[{"id":"","name":"","category":"protein|vegetable|staple|dairy|fruit|condiment|other","quantity":"","confidence":"high|medium|low","expiryHintDays":null}],"recipes":[{"id":"","name":"","summary":"","matchPercent":0,"cookTimeMinutes":0,"servings":0,"caloriesKcalPerServing":0,"difficulty":"easy|medium|advanced","tags":[],"useIngredients":[],"missingIngredients":[],"steps":[{"title":"","detail":""}],"imagePrompt":""}],"shoppingList":[],"safetyNotes":[]}`;
}

export async function analyzeFridgeRecipes(form, {
  userId = null,
  modelConnectionId = null,
  modelInvoker = invokeVisionModel,
  imageGenerator = generatePlatformImage,
} = {}) {
  const file = form.get("file");
  if (!file?.size) throw fridgeError("IMAGE_REQUIRED", 400);
  if (file.size > 15 * 1024 * 1024) throw fridgeError("IMAGE_TOO_LARGE", 413);
  if (!allowedTypes.has(file.type)) throw fridgeError("IMAGE_FORMAT_UNSUPPORTED", 415);
  const source = Buffer.from(await file.arrayBuffer());
  let optimized;
  try {
    optimized = await sharp(source, { limitInputPixels: 32_000_000 })
      .rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, chromaSubsampling: "4:2:0" }).toBuffer();
  } catch { throw fridgeError("IMAGE_INVALID", 422); }

  const locale = String(form.get("locale") || "zh") === "en" ? "en" : "zh";
  const dietaryPreference = text(form.get("dietaryPreference"), 100);
  const allergies = text(form.get("allergies"), 180);
  const maxCookTime = number(form.get("maxCookTime") || 45, 10, 180);
  const servings = number(form.get("servings") || 2, 1, 12);
  const generateDishImage = String(form.get("generateDishImage") || "false") === "true";
  const result = await modelInvoker({
    userId,
    connectionId: modelConnectionId,
    capability: "vision:fridge_recipe",
    service: "ai-fridge-recipe",
    instruction: "Return valid JSON only. Never include markdown fences.",
    prompt: buildPrompt({ locale, dietaryPreference, allergies, maxCookTime, servings }),
    imageDataUrl: `data:image/jpeg;base64,${optimized.toString("base64")}`,
    timeoutMs: 75_000,
    maxOutputTokens: 3200,
    latencyOptimized: true,
  });
  const output = sanitizeAnalysis(parseJson(result.text), result.modelId);
  const primary = output.recipes[0];
  const generated = generateDishImage
    ? await imageGenerator(primary.imagePrompt || `Photorealistic home-cooked dish: ${primary.name}, natural daylight, single plate, no text, no watermark`)
    : null;
  return {
    output: { ...output, primaryRecipeId: primary.id, generatedImageModel: Boolean(generated) },
    safeInput: {
      fileName: text(file.name || "fridge-photo", 160), fileSize: file.size,
      dietaryPreference, allergies: allergies ? "provided" : "not_provided", maxCookTime, servings, generateDishImage,
    },
    ...(generated ? {
      buffer: generated.buffer,
      name: `fridge-recipe-${Date.now()}.${generated.extension || "png"}`,
      mimeType: generated.mimeType || "image/png",
    } : {}),
  };
}
