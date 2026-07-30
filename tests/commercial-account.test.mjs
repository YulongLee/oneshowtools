import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-commercial-account-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.REGISTRATION_ENABLED = "true";
process.env.ALLOW_DEV_EMAIL_DELIVERY = "true";
process.env.ACCOUNT_DELETION_ENABLED = "false";

const { handleApi } = await import(`../server/api.mjs?commercial=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const request = (path, options = {}) => new Request(`http://localhost${path}`, options);
const jsonRequest = (path, data, options = {}) => request(path, {
  method: options.method || "POST",
  headers: { "content-type": "application/json", ...(options.headers || {}) },
  body: JSON.stringify(data),
});
const authenticated = (path, cookie, options = {}) => request(path, {
  ...options,
  headers: { cookie, ...(options.headers || {}) },
});
const latestEmailToken = (kind) => {
  const message = db.prepare("SELECT text FROM email_outbox WHERE kind = ? ORDER BY created_at DESC LIMIT 1").get(kind);
  const url = new URL(message.text.match(/https?:\/\/\S+/)[0]);
  return url.searchParams.get("token") || url.searchParams.get("resetToken");
};

test("commercial account lifecycle verifies ownership and resists enumeration", async () => {
  const email = `commercial-${Date.now()}@example.com`;
  const registration = await handleApi(jsonRequest("/api/auth/register", {
    name: "Commercial User",
    email,
    password: "StrongPass123!",
    locale: "en",
  }));
  assert.equal(registration.status, 202);
  assert.equal(registration.headers.get("set-cookie"), null);

  const duplicate = await handleApi(jsonRequest("/api/auth/register", {
    name: "Different Name",
    email,
    password: "DifferentPass123!",
    locale: "zh-CN",
  }));
  assert.equal(duplicate.status, registration.status);
  assert.deepEqual(await duplicate.json(), await registration.json());

  const unverifiedLogin = await handleApi(jsonRequest("/api/auth/login", {
    email,
    password: "StrongPass123!",
  }));
  assert.equal(unverifiedLogin.status, 403);
  assert.equal((await unverifiedLogin.json()).error.code, "EMAIL_UNVERIFIED");

  const verificationToken = latestEmailToken("verify");
  assert.equal((await handleApi(request(`/api/auth/verify?token=${verificationToken}`))).status, 302);
  assert.equal((await handleApi(request(`/api/auth/verify?token=${verificationToken}`))).status, 302);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM credit_ledger WHERE type = 'welcome'").get().count,
    1,
  );

  const firstLogin = await handleApi(jsonRequest("/api/auth/login", { email, password: "StrongPass123!" }));
  assert.equal(firstLogin.status, 200);
  const firstCookie = firstLogin.headers.get("set-cookie").split(";")[0];
  const secondLogin = await handleApi(jsonRequest("/api/auth/login", { email, password: "StrongPass123!" }));
  const secondCookie = secondLogin.headers.get("set-cookie").split(";")[0];

  const sessions = await (await handleApi(authenticated("/api/account/sessions", secondCookie))).json();
  assert.equal(sessions.sessions.length, 2);
  assert.equal(sessions.sessions.filter((session) => session.current).length, 1);
  assert.equal(
    (await handleApi(authenticated("/api/account/sessions/others", secondCookie, { method: "DELETE" }))).status,
    200,
  );
  assert.equal((await handleApi(authenticated("/api/dashboard", firstCookie))).status, 401);

  const profile = await handleApi(authenticated("/api/account/profile", secondCookie, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Updated User", locale: "zh-CN" }),
  }));
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.name, "Updated User");

  const exportResponse = await handleApi(authenticated("/api/account/export", secondCookie, { method: "POST" }));
  assert.equal(exportResponse.status, 201);
  const exportId = (await exportResponse.json()).export.id;
  const downloaded = await handleApi(authenticated(`/api/account/exports/${exportId}/download`, secondCookie));
  assert.equal(downloaded.status, 200);
  assert.equal((await downloaded.json()).account.email, email);

  const otherEmail = `commercial-other-${Date.now()}@example.com`;
  await handleApi(jsonRequest("/api/auth/register", {
    name: "Other User",
    email: otherEmail,
    password: "OtherStrongPass123!",
    locale: "en",
  }));
  const otherVerificationToken = latestEmailToken("verify");
  await handleApi(request(`/api/auth/verify?token=${otherVerificationToken}`));
  const otherLogin = await handleApi(jsonRequest("/api/auth/login", {
    email: otherEmail,
    password: "OtherStrongPass123!",
  }));
  const otherCookie = otherLogin.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await handleApi(authenticated(`/api/account/exports/${exportId}/download`, otherCookie))).status,
    404,
  );

  const forgotKnown = await handleApi(jsonRequest("/api/auth/forgot-password", { email }));
  const forgotUnknown = await handleApi(jsonRequest("/api/auth/forgot-password", { email: "unknown@example.com" }));
  assert.equal(forgotKnown.status, forgotUnknown.status);
  assert.deepEqual(await forgotKnown.json(), await forgotUnknown.json());

  const resetToken = latestEmailToken("reset");
  const reset = await handleApi(jsonRequest("/api/auth/reset-password", {
    token: resetToken,
    password: "ReplacementPass123!",
  }));
  assert.equal(reset.status, 200);
  assert.equal((await handleApi(authenticated("/api/dashboard", secondCookie))).status, 401);
  assert.equal(
    (await handleApi(jsonRequest("/api/auth/reset-password", {
      token: resetToken,
      password: "AnotherPass123!",
    }))).status,
    400,
  );

  const newLogin = await handleApi(jsonRequest("/api/auth/login", {
    email,
    password: "ReplacementPass123!",
  }));
  assert.equal(newLogin.status, 200);
  const newCookie = newLogin.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await handleApi(authenticated("/api/account/deletion", newCookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "ReplacementPass123!" }),
    }))).status,
    503,
  );

  process.env.ACCOUNT_DELETION_ENABLED = "true";
  const deletion = await handleApi(authenticated("/api/account/deletion", newCookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "ReplacementPass123!" }),
  }));
  assert.equal(deletion.status, 202);
  assert.equal(
    (await handleApi(authenticated("/api/tasks", newCookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolId: "tool_pdf_summary", locale: "en" }),
    }))).status,
    403,
  );
  assert.equal(
    (await handleApi(authenticated("/api/account/deletion", newCookie, { method: "DELETE" }))).status,
    200,
  );
  assert.equal((await handleApi(authenticated("/api/dashboard", newCookie))).status, 200);
  process.env.ACCOUNT_DELETION_ENABLED = "false";
});

test("production cookie mutations reject cross-origin requests", async () => {
  process.env.APP_URL = "https://oneshowtools.com";
  const response = await handleApi(jsonRequest("/api/auth/login", {
    email: "nobody@example.com",
    password: "StrongPass123!",
  }, { headers: { origin: "https://evil.example" } }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "ORIGIN_NOT_ALLOWED");
  process.env.APP_URL = "http://localhost";
});

test.after(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
});
