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
  const result = await analyzeFoodNutrition(form, { modelInvoker: async ({ imageDataUrl, purpose }) => {
    assert.equal(purpose, "food_nutrition");
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
  await assert.rejects(
    analyzeFoodNutrition(form, { modelInvoker: async () => ({ modelId: "vision-test", text: '{"isFood":false,"items":[]}' }) }),
    (error) => error.code === "FOOD_NOT_RECOGNIZED" && error.status === 422,
  );
});

test("food nutrition analyzer rejects unsupported files before model invocation", async () => {
  const form = new FormData();
  form.set("file", new File(["hello"], "meal.txt", { type: "text/plain" }));
  await assert.rejects(analyzeFoodNutrition(form), (error) => error.code === "IMAGE_FORMAT_UNSUPPORTED" && error.status === 415);
});
