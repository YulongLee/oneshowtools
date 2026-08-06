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
  imageEditProviderConfiguration, saveImageEditProviderConfiguration,
} = await import(`../server/image-edit-provider.mjs?test=${Date.now()}`);
const { aiImageToolSlugs, processAiImageTool } = await import(`../server/ai-image-tools.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");
const { runToolAction } = await import(`../server/tool-actions.mjs?test=${Date.now()}`);

const resultPng = await sharp({ create: { width: 768, height: 1024, channels: 3, background: "#ffffff" } }).png().toBuffer();
const sourcePng = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#87aade" } }).png().toBuffer();
const prompts = [];
const providerFetch = async (url, options = {}) => {
  if (String(url) === "https://provider.example/result.png") return new Response(resultPng, { status: 200, headers: { "content-type": "image/png" } });
  assert.equal(options.headers.authorization, "Bearer image-edit-secret-1234");
  const payload = JSON.parse(options.body);
  assert.equal(payload.model, "qwen-image-3.0-pro");
  assert.ok(payload.input.messages[0].content[0].image.startsWith("data:image/png;base64,"));
  prompts.push(payload.input.messages[0].content.at(-1).text);
  return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://provider.example/result.png" }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
};

test("image editing configuration is encrypted, redacted, and activates all commercial image tools", async () => {
  const saved = await saveImageEditProviderConfiguration("image_editing", {
    adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-3.0-pro",
    apiKey: "image-edit-secret-1234", creditCost: 30, status: "active",
  }, "admin-test", providerFetch);
  assert.equal(saved.configured, true);
  assert.equal(saved.keyHint, "••••1234");
  assert.doesNotMatch(JSON.stringify(saved), /image-edit-secret/);
  const stored = db.prepare("SELECT * FROM image_provider_configs WHERE purpose = 'image_editing'").get();
  assert.notEqual(stored.key_ciphertext, "image-edit-secret-1234");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tools WHERE runtime_kind = 'platform-image-edit' AND runtime_status = 'ready'").get().count, 7);
  assert.equal(imageEditProviderConfiguration("image_upscaling").configured, false);
});

test("all eight AI image tools run through the real provider adapter and return valid PNG files", async () => {
  for (const slug of aiImageToolSlugs) {
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

test("outfit changer accepts a second clothing reference image", async () => {
  const form = new FormData();
  form.append("files", new File([sourcePng], "person.png", { type: "image/png" }));
  form.append("files", new File([sourcePng], "outfit.png", { type: "image/png" }));
  const before = prompts.length;
  const result = await processAiImageTool("ai-outfit-changer", form, providerFetch);
  assert.equal(result.output.referenceImages, 2);
  assert.match(prompts[before], /image 1 as the person and image 2 as the clothing reference/i);
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
