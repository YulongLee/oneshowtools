import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-multiclient-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "https://www.oneshowtools.com";
process.env.WECHAT_MINIPROGRAM_APP_ID = "wx-test-app";
process.env.WECHAT_MINIPROGRAM_APP_SECRET = "test-secret";

const originalFetch = global.fetch;
global.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname === "api.weixin.qq.com") {
    assert.equal(url.searchParams.get("appid"), "wx-test-app");
    assert.equal(url.searchParams.get("secret"), "test-secret");
    assert.equal(url.searchParams.get("js_code"), "temporary-code");
    return new Response(JSON.stringify({ openid: "openid-owner-1", session_key: "server-only" }), {
      headers: { "content-type": "application/json" },
    });
  }
  return originalFetch(input, options);
};

const { handleApi } = await import(`../server/api.mjs?multiclient=${Date.now()}`);
const { db } = await import("../server/database.mjs");
const { hashPassword } = await import("../server/security.mjs");

const email = "mobile@example.com";
const password = "StrongMobilePass123!";
const userId = randomUUID();
const timestamp = Date.now();
db.prepare(`INSERT INTO users
  (id, name, email, password_hash, locale, email_verified, status, created_at, updated_at)
  VALUES (?, 'Mobile User', ?, ?, 'zh-CN', 1, 'active', ?, ?)`)
  .run(userId, email, await hashPassword(password), timestamp, timestamp);

const nativeJson = (path, data, client = "mobile") => new Request(`https://api.oneshowtools.com${path}`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-oneshow-client": client },
  body: JSON.stringify(data),
});

test("native login returns a bearer session without changing the web cookie contract", async () => {
  const nativeLogin = await handleApi(nativeJson("/api/auth/login", { email, password }));
  assert.equal(nativeLogin.status, 200);
  const nativePayload = await nativeLogin.json();
  assert.match(nativePayload.accessToken, /^[A-Za-z0-9_-]{32,}$/);
  assert.ok(nativePayload.expiresAt > Date.now());

  const dashboard = await handleApi(new Request("https://api.oneshowtools.com/api/dashboard", {
    headers: { authorization: `Bearer ${nativePayload.accessToken}`, "x-oneshow-client": "mobile" },
  }));
  assert.equal(dashboard.status, 200);
  assert.equal((await dashboard.json()).user.email, email);

  const logout = await handleApi(new Request("https://api.oneshowtools.com/api/auth/logout", {
    method: "POST",
    headers: { authorization: `Bearer ${nativePayload.accessToken}`, "x-oneshow-client": "mobile" },
  }));
  assert.equal(logout.status, 200);
  assert.equal((await handleApi(new Request("https://api.oneshowtools.com/api/dashboard", {
    headers: { authorization: `Bearer ${nativePayload.accessToken}`, "x-oneshow-client": "mobile" },
  }))).status, 401);

  const webLogin = await handleApi(new Request("https://www.oneshowtools.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.oneshowtools.com" },
    body: JSON.stringify({ email, password }),
  }));
  assert.equal(webLogin.status, 200);
  assert.ok(webLogin.headers.get("set-cookie"));
  assert.equal((await webLogin.json()).accessToken, undefined);
});

test("WeChat code exchange keeps the provider secret server-side and creates one account", async () => {
  const response = await handleApi(nativeJson("/api/auth/wechat-miniprogram", {
    code: "temporary-code", name: "微信测试用户", locale: "zh-CN",
  }, "wechat-miniprogram"));
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.match(payload.accessToken, /^[A-Za-z0-9_-]{32,}$/);
  assert.equal(JSON.stringify(payload).includes("session_key"), false);
  assert.equal(payload.user.email, null);
  assert.deepEqual(payload.user.authMethods, ["wechat"]);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM provider_accounts WHERE provider = 'wechat_miniprogram'").get().count, 1);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id = ?").get(payload.user.id).balance, 200);
});

test.after(async () => {
  global.fetch = originalFetch;
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
