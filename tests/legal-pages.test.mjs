import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-legal-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.REGISTRATION_ENABLED = "true";
process.env.ALLOW_DEV_EMAIL_DELIVERY = "true";
const { handleApi } = await import(`../server/api.mjs?legal=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const root = resolve(import.meta.dirname, "..");
const request = (path, data) => new Request(`http://localhost${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

test("public legal routes and registration entry points are present", () => {
  const main = readFileSync(resolve(root, "src/main.jsx"), "utf8");
  const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
  const legal = readFileSync(resolve(root, "src/LegalPage.jsx"), "utf8");
  for (const path of ["/legal/terms", "/legal/privacy", "/legal/credits"]) {
    assert.match(app + legal, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(main, /resolveLegalDocument/);
  assert.match(app, /legalAccepted/);
});

test("email registration requires and records current policy versions", async () => {
  const email = `legal-${Date.now()}@example.com`;
  const base = { name: "Legal Test", email, password: "StrongPass123!", locale: "zh-CN" };
  const refused = await handleApi(request("/api/auth/register", base));
  assert.equal(refused.status, 400);
  assert.equal((await refused.json()).error.code, "LEGAL_CONSENT_REQUIRED");
  const accepted = await handleApi(request("/api/auth/register", { ...base, legalAccepted: true, termsVersion: "2026-08-24", privacyVersion: "2026-08-24" }));
  assert.equal(accepted.status, 202);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  const policies = db.prepare("SELECT policy_type, policy_version FROM policy_acceptances WHERE user_id = ? ORDER BY policy_type").all(user.id).map((row) => ({ ...row }));
  assert.deepEqual(policies, [
    { policy_type: "privacy", policy_version: "2026-08-24" },
    { policy_type: "terms", policy_version: "2026-08-24" },
  ]);
});

test.after(async () => { db.close(); await rm(dataDirectory, { recursive: true, force: true }); });
