import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const testDataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-api-"));
process.env.DATA_DIR = testDataDirectory;
process.env.APP_URL = "http://localhost";
process.env.REGISTRATION_ENABLED = "true";
process.env.ALLOW_DEV_EMAIL_DELIVERY = "true";
process.env.ONESHOW_MODEL_EXECUTION_ENABLED = "false";
process.env.MODEL_CONNECTIONS_ENABLED = "false";
const { handleApi } = await import(`../server/api.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const request = (path, options = {}) => new Request(`http://localhost${path}`, options);
const authenticated = (path, cookie, options = {}) => request(path, {
  ...options,
  headers: { cookie, ...(options.headers || {}) },
});

test("real platform lifecycle stores user, credits, tasks, and files", async () => {
  const register = await handleApi(request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Platform Test",
      email: `platform-${Date.now()}@example.com`,
      password: "StrongPass123!",
      locale: "zh-CN",
    }),
  }));
  assert.equal(register.status, 202);
  assert.equal(register.headers.get("set-cookie"), null);
  const verification = db.prepare("SELECT text FROM email_outbox WHERE kind = 'verify' ORDER BY created_at DESC LIMIT 1").get();
  const token = new URL(verification.text.match(/https?:\/\/\S+/)[0]).searchParams.get("token");
  const verified = await handleApi(request(`/api/auth/verify?token=${encodeURIComponent(token)}`));
  assert.equal(verified.status, 302);
  const login = await handleApi(request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: db.prepare("SELECT email FROM users ORDER BY created_at DESC LIMIT 1").get().email, password: "StrongPass123!" }),
  }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const dashboard = await (await handleApi(authenticated("/api/dashboard", cookie))).json();
  assert.equal(dashboard.metrics.credits, 200);
  assert.equal(dashboard.metrics.tasks, 0);

  const taskResponse = await handleApi(authenticated("/api/tasks", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolId: "tool_polish", text: "Test copy", locale: "en" }),
  }));
  assert.equal(taskResponse.status, 201);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const tasks = await (await handleApi(authenticated("/api/tasks", cookie))).json();
  assert.equal(tasks.tasks.length, 1);
  assert.equal(tasks.tasks[0].status, "waiting_for_runtime");

  const credits = await (await handleApi(authenticated("/api/credits", cookie))).json();
  assert.equal(credits.balance, 200);
  assert.equal(credits.ledger.length, 3);

  const polish = await handleApi(authenticated("/api/tool-actions/copy-polish", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "  this   is a test...  " }),
  }));
  assert.equal(polish.status, 201);
  const polishResult = await polish.json();
  assert.equal(polishResult.task.status, "completed");
  assert.equal(polishResult.output.text, "This is a test.");

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const compressionForm = new FormData();
  compressionForm.append("file", new File([png], "pixel.png", { type: "image/png" }));
  compressionForm.append("quality", "70");
  const compression = await handleApi(authenticated("/api/tool-actions/image-compressor", cookie, {
    method: "POST",
    body: compressionForm,
  }));
  assert.equal(compression.status, 201);
  const compressionResult = await compression.json();
  assert.equal(compressionResult.task.status, "completed");
  assert.equal(compressionResult.file.mimeType, "image/webp");

  const form = new FormData();
  form.append("file", new File(["real file content"], "platform.txt", { type: "text/plain" }));
  const upload = await handleApi(authenticated("/api/files", cookie, { method: "POST", body: form }));
  assert.equal(upload.status, 201);
  const uploaded = (await upload.json()).file;
  assert.equal(uploaded.sizeBytes, 17);

  const download = await handleApi(authenticated(`/api/files/${uploaded.id}/download`, cookie));
  assert.equal(await download.text(), "real file content");
  const deletion = await handleApi(authenticated(`/api/files/${uploaded.id}`, cookie, { method: "DELETE" }));
  assert.equal(deletion.status, 200);
});

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});
