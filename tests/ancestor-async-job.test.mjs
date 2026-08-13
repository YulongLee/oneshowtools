import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-ancestor-async-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { db } = await import("../server/database.mjs");
const { saveImageEditProviderConfiguration } = await import("../server/image-edit-provider.mjs");
const { createAncestorTask, executeAncestorTask } = await import("../server/ancestor-jobs.mjs");

const sourcePng = await sharp({ create: { width: 480, height: 640, channels: 3, background: "#88aadd" } }).png().toBuffer();
const resultPng = await sharp({ create: { width: 480, height: 640, channels: 3, background: "#dddddd" } }).png().toBuffer();
let generations = 0;
const providerFetch = async (url) => {
  if (String(url) === "https://provider.example/result.png") return new Response(resultPng, { status: 200 });
  generations += 1;
  return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://provider.example/result.png" }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
};

test("sliding generator queues immediately, rejects duplicate work, reports progress, and bills once", async () => {
  await saveImageEditProviderConfiguration("image_editing", {
    adapter: "dashscope", baseUrl: "https://dashscope.aliyuncs.com/api/v1", modelId: "qwen-image-2.0",
    apiKey: "async-image-secret", status: "active", creditCost: 30,
  }, null, providerFetch);
  generations = 0;
  const userId = randomUUID();
  const timestamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,'Async tester',?,'unused',1,?,?)")
    .run(userId, `async-${userId}@example.com`, timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'grant',500,'测试','Test','test',?,?)")
    .run(randomUUID(), userId, userId, timestamp);
  const row = db.prepare("SELECT * FROM tools WHERE slug = 'sliding-ancestor-generator'").get();
  const tool = { id: row.id, slug: row.slug, nameZh: row.name_zh, nameEn: row.name_en, creditCost: row.credit_cost };
  const form = new FormData();
  form.append("file", new File([sourcePng], "portrait.png", { type: "image/png" }));
  form.append("style", "realistic");
  const first = await createAncestorTask(new Request("http://localhost/api/tool-actions/sliding-ancestor-generator", { method: "POST", body: form }), { id: userId }, tool);
  assert.equal(first.task.status, "queued");
  assert.equal(first.task.output.progress.completed, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM execution_jobs WHERE task_id = ?").get(first.task.id).count, 1);
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId).balance, 380);

  const duplicateForm = new FormData();
  duplicateForm.append("file", new File([sourcePng], "portrait-again.png", { type: "image/png" }));
  duplicateForm.append("style", "chaos");
  const duplicate = await createAncestorTask(new Request("http://localhost/api/tool-actions/sliding-ancestor-generator", { method: "POST", body: duplicateForm }), { id: userId }, tool);
  assert.equal(duplicate.reused, true);
  assert.equal(duplicate.task.id, first.task.id);
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId).balance, 380);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(first.task.id);
  const output = await executeAncestorTask(task, JSON.parse(task.input_json), providerFetch);
  assert.equal(output.status, "completed");
  assert.equal(output.output.progress.completed, 10);
  assert.equal(output.output.resultFiles.length, 10);
  assert.equal(generations, 10);
  assert.deepEqual(output.output.resultFiles.map((item) => item.level), [1,2,3,4,5,6,7,8,9,10]);
  const stored = JSON.parse(db.prepare("SELECT output_json FROM tasks WHERE id = ?").get(first.task.id).output_json);
  assert.equal(stored.progress.completed, 10);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id = ?").get(first.task.id).count, 10);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(userId).count, 10);
});

test("custom sliding jobs persist prompts and optional stage references through the background queue", async () => {
  generations = 0;
  const userId = randomUUID();
  const timestamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,'Custom tester',?,'unused',1,?,?)")
    .run(userId, `custom-${userId}@example.com`, timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'grant',500,'测试','Test','test',?,?)")
    .run(randomUUID(), userId, userId, timestamp);
  const row = db.prepare("SELECT * FROM tools WHERE slug = 'sliding-ancestor-generator'").get();
  const tool = { id: row.id, slug: row.slug, nameZh: row.name_zh, nameEn: row.name_en, creditCost: row.credit_cost };
  const customPrompts = Array.from({ length: 10 }, (_, index) => `后台自定义第${index + 1}级，保持同一人物。`);
  const form = new FormData();
  form.append("file", new File([sourcePng], "portrait.png", { type: "image/png" }));
  form.append("style", "custom");
  form.append("customPrompts", JSON.stringify(customPrompts));
  form.append("reference2", new File([sourcePng], "reference.png", { type: "image/png" }));
  const created = await createAncestorTask(new Request("http://localhost/api/tool-actions/sliding-ancestor-generator", { method: "POST", body: form }), { id: userId }, tool);
  const storedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(created.task.id);
  const storedInput = JSON.parse(storedTask.input_json);
  assert.equal(storedInput.style, "custom");
  assert.deepEqual(storedInput.customPrompts, customPrompts);
  assert.equal(storedInput.referenceFiles[1].mimeType, "image/png");
  const completed = await executeAncestorTask(storedTask, storedInput, providerFetch);
  assert.equal(completed.status, "completed");
  assert.equal(completed.output.resultFiles.length, 10);
  assert.deepEqual(completed.output.customPrompts, customPrompts);
  assert.equal(completed.output.referenceCount, 1);
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
