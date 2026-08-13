import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-ai-image-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const {
  imageEditProviderConfiguration, saveImageEditProviderConfiguration, testImageEditProviderConfiguration,
} = await import(`../server/image-edit-provider.mjs?test=${Date.now()}`);
const { aiImageToolSlugs, ancestorStagePrompt, processAiImageTool } = await import(`../server/ai-image-tools.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");
const { runToolAction } = await import(`../server/tool-actions.mjs?test=${Date.now()}`);

const resultPng = await sharp({ create: { width: 768, height: 1024, channels: 3, background: "#ffffff" } }).png().toBuffer();
const sourcePng = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#87aade" } }).png().toBuffer();
const prompts = [];
const providerRequests = [];
const providerFetch = async (url, options = {}) => {
  if (String(url) === "https://provider.example/result.png") return new Response(resultPng, { status: 200, headers: { "content-type": "image/png" } });
  assert.equal(options.headers.authorization, "Bearer image-edit-secret-1234");
  const payload = JSON.parse(options.body);
  providerRequests.push(payload);
  assert.equal(payload.model, "qwen-image-3.0-pro");
  assert.ok(payload.input.messages[0].content[0].image.startsWith("data:image/png;base64,"));
  prompts.push(payload.input.messages[0].content.at(-1).text);
  return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://provider.example/result.png" }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
};

test("image editing configuration is encrypted, redacted, and activates all commercial image tools", async () => {
  const configuration = {
    adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-3.0-pro",
    apiKey: "image-edit-secret-1234", creditCost: 30, status: "active",
  };
  const promptCount = prompts.length;
  await testImageEditProviderConfiguration("image_editing", configuration, providerFetch);
  const saved = await saveImageEditProviderConfiguration("image_editing", configuration, "admin-test", providerFetch);
  assert.equal(prompts.length, promptCount + 1, "save reuses a recent successful test instead of calling the provider twice");
  assert.equal(saved.configured, true);
  assert.equal(saved.keyHint, "••••1234");
  assert.doesNotMatch(JSON.stringify(saved), /image-edit-secret/);
  const stored = db.prepare("SELECT * FROM image_provider_configs WHERE purpose = 'image_editing'").get();
  assert.notEqual(stored.key_ciphertext, "image-edit-secret-1234");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tools WHERE runtime_kind = 'platform-image-edit' AND runtime_status = 'ready'").get().count, 8);
  assert.equal(imageEditProviderConfiguration("image_upscaling").configured, false);
});

test("all standard AI image tools run through the real provider adapter and return valid PNG files", async () => {
  for (const slug of [...aiImageToolSlugs].filter((item) => item !== "sliding-ancestor-generator")) {
    const form = new FormData();
    form.append("file", new File([sourcePng], `${slug}.png`, { type: "image/png" }));
    form.append("outfit", "dark professional suit");
    form.append("background", "modern bright studio");
    form.append("style", "commercial photography");
    form.append("prompt", "natural and realistic");
    const result = await processAiImageTool(slug, form, providerFetch);
    assert.equal(result.mimeType, "image/png");
    assert.ok(result.buffer.length > 100);
    assert.equal(result.output.mode, "ai");
    assert.equal((await sharp(result.buffer).metadata()).format, "png");
  }
  assert.equal(prompts.length, 9); // one admin test plus eight product executions
  assert.ok(prompts.some((prompt) => /Preserve the product/.test(prompt)));
  assert.ok(prompts.some((prompt) => /transparent|#FFFFFF/.test(prompt)));
  assert.ok(prompts.some((prompt) => /Restore and enhance/.test(prompt)));
});

test("sliding power-up generator creates ten individually generated ordered stages", async () => {
  const form = new FormData();
  form.append("file", new File([sourcePng], "portrait.png", { type: "image/png" }));
  form.append("style", "realistic");
  const before = prompts.length;
  const result = await processAiImageTool("sliding-ancestor-generator", form, providerFetch);
  assert.equal(result.files.length, 10);
  assert.equal(result.output.frameCount, 10);
  assert.equal(result.output.generatedFrameCount, 10);
  assert.equal(prompts.length, before + 10);
  assert.deepEqual(result.files.map((item) => item.level), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(result.files.slice(0, 5).map((item) => item.direction), Array(5).fill("xu"));
  assert.deepEqual(result.files.slice(5).map((item) => item.direction), Array(5).fill("han"));
  for (const file of result.files) assert.equal((await sharp(file.buffer).metadata()).format, "png");
  const stagePrompts = prompts.slice(before, before + 10);
  assert.equal(new Set(stagePrompts).size, 10);
  stagePrompts.forEach((prompt, index) => {
    assert.match(prompt, new RegExp(`stage ${index + 1} of 10`, "i"));
    assert.match(prompt, /strictly ordered series from weakest to strongest/i);
    assert.match(prompt, /preserve the original head position, framing, background geometry, clothing identity/i);
    assert.match(prompt, /final self-check/i);
  });
  assert.match(prompts[before], /same-person power progression/i);
  assert.match(prompts[before], /must not depict ancestry/i);
  assert.match(prompts[before + 4], /stage 5 of 10/i);
  assert.match(prompts[before + 5], /stage 6 of 10/i);
  assert.match(prompts[before + 9], /stage 10 of 10/i);
  assert.match(prompts[before + 9], /maximum natural power/i);
});

test("sliding generator styles use three complete and visibly distinct ten-stage prompt systems", () => {
  const profiles = ["realistic", "cinematic", "chaos"].map((style) =>
    Array.from({ length: 10 }, (_, index) => ancestorStagePrompt(index + 1, style)));
  for (const promptsForStyle of profiles) {
    assert.equal(promptsForStyle.length, 10);
    assert.equal(new Set(promptsForStyle).size, 10);
    promptsForStyle.forEach((prompt, index) => assert.match(prompt, new RegExp(`stage ${index + 1} of 10`, "i")));
  }
  assert.match(profiles[0][9], /elite bodybuilder-level/i);
  assert.match(profiles[0][9], /No fantasy aura/i);
  assert.match(profiles[1][9], /ultimate blockbuster powerhouse/i);
  assert.match(profiles[1][9], /teal-amber film color/i);
  assert.match(profiles[2][9], /maximum abstract power form/i);
  assert.match(profiles[2][9], /surreal internet-meme escalation/i);
  assert.notEqual(profiles[0][5], profiles[1][5]);
  assert.notEqual(profiles[1][5], profiles[2][5]);
});

test("custom sliding sequence uses ten user prompts and keeps each reference image in its assigned frame", async () => {
  const form = new FormData();
  const customPrompts = Array.from({ length: 10 }, (_, index) => `CUSTOM-FRAME-${index + 1}: preserve identity and create a distinct transformation.`);
  form.append("file", new File([sourcePng], "portrait.png", { type: "image/png" }));
  form.append("style", "custom");
  form.append("customPrompts", JSON.stringify(customPrompts));
  form.append("reference3", new File([sourcePng], "frame-3-reference.png", { type: "image/png" }));
  const requestOffset = providerRequests.length;
  const promptOffset = prompts.length;
  const result = await processAiImageTool("sliding-ancestor-generator", form, providerFetch);
  assert.equal(result.files.length, 10);
  assert.equal(result.output.style, "custom");
  assert.equal(result.output.referenceCount, 1);
  assert.deepEqual(result.output.customPrompts, customPrompts);
  const customOutputs = prompts.slice(promptOffset, promptOffset + 10);
  customOutputs.forEach((prompt, index) => {
    assert.match(prompt, new RegExp(`FRAME ${index + 1} OF 10`, "i"));
    assert.match(prompt, new RegExp(`CUSTOM-FRAME-${index + 1}`));
  });
  assert.match(customOutputs[2], /IMAGE 2 is a visual reference for this frame only/i);
  assert.match(customOutputs[1], /There is no additional reference image/i);
  const customRequests = providerRequests.slice(requestOffset, requestOffset + 10);
  assert.equal(customRequests[2].input.messages[0].content.filter((item) => item.image).length, 2);
  assert.equal(customRequests[1].input.messages[0].content.filter((item) => item.image).length, 1);
  assert.match(customRequests[2].parameters.negative_prompt, /swapping image roles/i);
});

test("outfit changer accepts a second clothing reference image", async () => {
  const form = new FormData();
  form.append("files", new File([sourcePng], "person.png", { type: "image/png" }));
  form.append("files", new File([sourcePng], "outfit.png", { type: "image/png" }));
  const before = prompts.length;
  const result = await processAiImageTool("ai-outfit-changer", form, providerFetch);
  assert.equal(result.output.referenceImages, 2);
  assert.match(prompts[before], /image 1 = target person and target scene/i);
  assert.match(prompts[before], /only person allowed in the output/i);
  assert.match(prompts[before], /may show clothing on another person, on a mannequin, as a flat-lay/i);
  assert.match(prompts[before], /do not copy its face, hair, skin, body, pose/i);
  assert.match(prompts[before], /clothing design comes from image 2; the person, pose and scene always come from image 1/i);
  assert.match(prompts[before], /success check before returning/i);
  assert.equal(providerRequests.at(-1).parameters.prompt_extend, false);
  assert.match(providerRequests.at(-1).parameters.negative_prompt, /reference person's face/i);
  assert.match(providerRequests.at(-1).parameters.negative_prompt, /swapping image roles/i);
});

test("an AI image action bills credits and archives the generated asset in the task and file centers", async () => {
  const userId = randomUUID();
  const timestamp = Date.now();
  db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, 'Image tester', ?, 'unused', 1, ?, ?)").run(userId, `image-${userId}@example.com`, timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES (?, ?, 'grant', 200, '测试积分', 'Test credits', 'test', ?, ?)").run(randomUUID(), userId, userId, timestamp);
  const row = db.prepare("SELECT * FROM tools WHERE slug = 'ai-background-replacer'").get();
  const tool = { id: row.id, slug: row.slug, nameZh: row.name_zh, nameEn: row.name_en, creditCost: row.credit_cost, runtimeKind: row.runtime_kind };
  const form = new FormData();
  form.append("file", new File([sourcePng], "portrait.png", { type: "image/png" }));
  form.append("background", "bright modern office");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = providerFetch;
  try {
    const result = await runToolAction(new Request("http://localhost/api/tool-actions/ai-background-replacer", { method: "POST", body: form }), { id: userId, locale: "zh-CN" }, tool);
    assert.equal(result.task.status, "completed");
    assert.match(result.file.downloadUrl, /^\/api\/files\//);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id = ?").get(result.task.id).count, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM file_storage_objects WHERE file_id = ? AND status = 'available'").get(result.file.id).count, 1);
    assert.equal(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId).balance, 175);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
