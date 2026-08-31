import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { analyzeFridgeRecipes } from "../server/fridge-recipes.mjs";

async function sampleImage() {
  return sharp({ create: { width: 720, height: 540, channels: 3, background: "#dce9db" } }).jpeg().toBuffer();
}

const modelPayload = {
  isFridge: true,
  fridgeSummary: "冰箱内有鸡蛋、番茄和青椒等食材。",
  confidence: "high",
  ingredients: [
    { id: "egg", name: "鸡蛋", category: "protein", quantity: "6 个", confidence: "high", expiryHintDays: 5 },
    { id: "tomato", name: "番茄", category: "vegetable", quantity: "3 个", confidence: "high", expiryHintDays: 2 },
    { id: "pepper", name: "青椒", category: "vegetable", quantity: "1 个", confidence: "medium", expiryHintDays: 4 },
  ],
  recipes: Array.from({ length: 6 }, (_, index) => ({
    id: `recipe-${index + 1}`,
    name: index === 0 ? "西红柿炒鸡蛋" : `家常菜 ${index + 1}`,
    summary: "使用冰箱现有食材制作。",
    matchPercent: 100 - index * 5,
    cookTimeMinutes: 15 + index,
    servings: 2,
    caloriesKcalPerServing: 320,
    difficulty: "easy",
    tags: ["快手菜", "家常菜"],
    useIngredients: ["鸡蛋", "番茄"],
    missingIngredients: index ? ["葱"] : [],
    steps: [{ title: "备料", detail: "番茄切块，鸡蛋打散。" }, { title: "炒制", detail: "依次炒熟并调味。" }],
    imagePrompt: "Photorealistic Chinese tomato scrambled eggs, natural daylight, no text",
  })),
  shoppingList: ["葱"],
  safetyNotes: ["食用前确认鸡蛋和蔬菜新鲜度。"],
};

test("AI 冰箱食谱输出可执行食谱并生成菜品图", async () => {
  const form = new FormData();
  const image = await sampleImage();
  form.set("file", new File([image], "fridge.jpg", { type: "image/jpeg" }));
  form.set("locale", "zh"); form.set("maxCookTime", "45"); form.set("servings", "2");
  form.set("generateDishImage", "true");
  let receivedCapability = "";
  const result = await analyzeFridgeRecipes(form, {
    userId: "user-test",
    modelInvoker: async (request) => {
      receivedCapability = request.capability;
      assert.equal(request.latencyOptimized, true);
      assert.equal(request.maxOutputTokens, 3200);
      return { text: JSON.stringify(modelPayload), modelId: "OneShowModel" };
    },
    imageGenerator: async () => ({ buffer: await sharp(image).resize(512, 512).png().toBuffer(), mimeType: "image/png", extension: "png" }),
  });
  assert.equal(receivedCapability, "vision:fridge_recipe");
  assert.equal(result.output.ingredients.length, 3);
  assert.equal(result.output.recipes.length, 6);
  assert.equal(result.output.recipes[0].steps.length, 2);
  assert.equal(result.output.recipes[0].name, "西红柿炒鸡蛋");
  assert.ok(result.buffer.length > 100);
  assert.equal(result.safeInput.allergies, "not_provided");
});

test("AI 冰箱食谱默认跳过慢速菜品图以优先返回结果", async () => {
  const form = new FormData();
  const image = await sampleImage();
  form.set("file", new File([image], "fridge-fast.jpg", { type: "image/jpeg" }));
  let imageCalls = 0;
  const result = await analyzeFridgeRecipes(form, {
    userId: "user-fast",
    modelInvoker: async () => ({ text: JSON.stringify(modelPayload), modelId: "OneShowModel" }),
    imageGenerator: async () => { imageCalls += 1; throw new Error("should not run"); },
  });
  assert.equal(imageCalls, 0);
  assert.equal(result.buffer, undefined);
  assert.equal(result.output.generatedImageModel, false);
  assert.equal(result.safeInput.generateDishImage, false);
});

test("非冰箱或未识别食材时返回明确错误", async () => {
  const form = new FormData();
  const image = await sampleImage();
  form.set("file", new File([image], "other.jpg", { type: "image/jpeg" }));
  await assert.rejects(() => analyzeFridgeRecipes(form, {
    modelInvoker: async () => ({ text: JSON.stringify({ isFridge: false, ingredients: [], recipes: [] }), modelId: "OneShowModel" }),
    imageGenerator: async () => { throw new Error("should not run"); },
  }), (error) => error.code === "FRIDGE_FOOD_NOT_RECOGNIZED");
});
