import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import sharp from "sharp";

process.env.APP_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), "oneshow-food-test-"));
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = "test-only-key-for-food-nutrition-analyzer";

const { analyzeFoodNutrition } = await import("../server/food-nutrition.mjs");

async function imageFile() {
  const buffer = await sharp({ create: { width: 80, height: 80, channels: 3, background: "#d89b55" } }).jpeg().toBuffer();
  return new File([buffer], "meal.jpg", { type: "image/jpeg" });
}

test("food nutrition analyzer returns structured estimates and safe input", async () => {
  const form = new FormData();
  form.set("file", await imageFile());
  form.set("portionHint", "米饭半碗");
  form.set("mealContext", "lunch");
  const result = await analyzeFoodNutrition(form, { userId: "user_food", modelConnectionId: "managed", modelInvoker: async ({ imageDataUrl, capability, purpose, userId, connectionId, latencyOptimized, maxOutputTokens, timeoutMs }) => {
    assert.equal(capability, "vision:food_nutrition");
    assert.equal(purpose, "food_nutrition");
    assert.equal(userId, "user_food");
    assert.equal(connectionId, "managed");
    assert.equal(latencyOptimized, true);
    assert.equal(maxOutputTokens, 1400);
    assert.equal(timeoutMs, 35_000);
    assert.match(imageDataUrl, /^data:image\/jpeg;base64,/);
    return { modelId: "vision-test", text: JSON.stringify({
      isFood: true, mealName: "鸡肉米饭", summary: "一份鸡肉米饭", confidence: "medium",
      total: { caloriesKcal: { estimate: 520, min: 430, max: 650 }, proteinG: 31, carbsG: 62, fatG: 17, fiberG: 5, sodiumMg: 780 },
      items: [{ name: "鸡肉米饭", portionDescription: "约一盘", estimatedWeightG: 420, caloriesKcal: 520, proteinG: 31, carbsG: 62, fatG: 17, fiberG: 5, sodiumMg: 780, confidence: "medium", assumptions: ["烹饪油不可见"] }],
      hiddenUncertainties: ["烹饪油用量不可见"], tips: ["称重可提高准确度"], visibleEvidence: ["可见米饭和鸡肉"],
    }) };
  } });
  assert.equal(result.output.mealName, "鸡肉米饭");
  assert.equal(result.output.total.caloriesKcal.estimate, 520);
  assert.equal(result.output.items[0].proteinG.estimate, 31);
  assert.match(result.output.disclaimer, /估算/);
  assert.deepEqual(result.safeInput.mealContext, "lunch");
  assert.equal(result.safeInput.fileName, "meal.jpg");
});

test("food nutrition analyzer rejects a non-food result", async () => {
  const form = new FormData();
  form.set("file", await imageFile());
  let attempts = 0;
  await assert.rejects(
    analyzeFoodNutrition(form, { modelInvoker: async () => { attempts += 1; return { modelId: "vision-test", text: '{"isFood":false,"items":[]}' }; } }),
    (error) => error.code === "FOOD_NOT_RECOGNIZED" && error.status === 422,
  );
  assert.equal(attempts, 2);
});

test("food nutrition analyzer recovers from one conservative false negative", async () => {
  const form = new FormData();
  form.set("file", await imageFile());
  const prompts = [];
  const result = await analyzeFoodNutrition(form, { modelInvoker: async ({ prompt }) => {
    prompts.push(prompt);
    if (prompts.length === 1) return { modelId: "vision-test", text: '{"isFood":false,"items":[]}' };
    return { modelId: "vision-test", text: JSON.stringify({
      isFood: true, mealName: "家常饭", confidence: "low",
      items: [{ name: "米饭", caloriesKcal: 230, proteinG: 4, carbsG: 50, fatG: 1, fiberG: 1, sodiumMg: 5 }],
      hiddenUncertainties: ["拍摄角度有限"],
    }) };
  } });
  assert.equal(result.output.mealName, "家常饭");
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /食物识别复核/);
});

test("food nutrition analyzer rejects unsupported files before model invocation", async () => {
  const form = new FormData();
  form.set("file", new File(["hello"], "meal.txt", { type: "text/plain" }));
  await assert.rejects(analyzeFoodNutrition(form), (error) => error.code === "IMAGE_FORMAT_UNSUPPORTED" && error.status === 415);
});

test("food nutrition analyzer accepts common provider aliases", async () => {
  const form = new FormData();
  form.set("file", await imageFile());
  const result = await analyzeFoodNutrition(form, { modelInvoker: async () => ({ modelId: "qwen-vision-test", text: JSON.stringify({
    is_food: true,
    meal_name: "牛肉面",
    confidence: "中等",
    foods: [{ food_name: "牛肉面", portion: "一碗", weight_g: 520, calories: 680, protein: 32, carbohydrates: 84, fat: 21, fiber: 6, sodium: 1200 }],
    uncertainties: ["汤汁摄入量不可见"],
    suggestions: ["可补充实际份量"],
  }) }) });
  assert.equal(result.output.mealName, "牛肉面");
  assert.equal(result.output.items[0].caloriesKcal.estimate, 680);
  assert.equal(result.output.items[0].carbsG.estimate, 84);
  assert.deepEqual(result.output.hiddenUncertainties, ["汤汁摄入量不可见"]);
});

test("food nutrition analyzer retries a malformed first response", async () => {
  const form = new FormData();
  form.set("file", await imageFile());
  let attempts = 0;
  const result = await analyzeFoodNutrition(form, { modelInvoker: async ({ timeoutMs }) => {
    attempts += 1;
    if (attempts === 1) return { modelId: "vision-test", text: "无法分析" };
    assert.equal(timeoutMs, 45_000);
    return { modelId: "vision-test", text: JSON.stringify({ mealName: "水果拼盘", confidence: "low", total: { calories: 260, carbs: 61 } }) };
  } });
  assert.equal(attempts, 2);
  assert.equal(result.output.mealName, "水果拼盘");
  assert.equal(result.output.total.caloriesKcal.estimate, 260);
  assert.equal(result.output.items.length, 1);
});
