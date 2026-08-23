import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-admin-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.REGISTRATION_ENABLED = "true";
process.env.ALLOW_DEV_EMAIL_DELIVERY = "true";
process.env.ACCOUNT_DELETION_ENABLED = "false";
process.env.ADMIN_MFA_ENFORCED = "false";
process.env.ADMIN_MFA_ENCRYPTION_KEY = "test-commercial-admin-encryption-key";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.ADMIN_CREDIT_APPROVAL_THRESHOLD = "1000";

const { handleApi } = await import(`../server/api.mjs?admin=${Date.now()}`);
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
const authenticatedJson = (path, cookie, data, options = {}) => authenticated(path, cookie, {
  method: options.method || "POST",
  headers: { "content-type": "application/json", ...(options.headers || {}) },
  body: JSON.stringify(data),
});
const latestToken = () => {
  const message = db.prepare("SELECT text FROM email_outbox WHERE kind = 'verify' ORDER BY created_at DESC LIMIT 1").get();
  return new URL(message.text.match(/https?:\/\/\S+/)[0]).searchParams.get("token");
};
const createVerifiedUser = async (email, name) => {
  await handleApi(jsonRequest("/api/auth/register", { email, name, password: "StrongAdminPass123!", locale: "en" }));
  await handleApi(request(`/api/auth/verify?token=${latestToken()}`));
  const login = await handleApi(jsonRequest("/api/auth/login", { email, password: "StrongAdminPass123!" }));
  return {
    id: db.prepare("SELECT id FROM users WHERE email = ?").get(email).id,
    cookie: login.headers.get("set-cookie").split(";")[0],
  };
};
const base32Decode = (value) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = value.split("").map((character) => alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
};
const totp = (secret) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
};

test("commercial admin enforces roles, MFA, idempotency, approvals, and audit redaction", async () => {
  const superEmail = `owner-${Date.now()}@example.com`;
  process.env.ADMIN_EMAILS = superEmail;
  const owner = await createVerifiedUser(superEmail, "Owner");
  const customer = await createVerifiedUser(`customer-${Date.now()}@example.com`, "Customer");
  const support = await createVerifiedUser(`support-${Date.now()}@example.com`, "Support");
  const finance = await createVerifiedUser(`finance-${Date.now()}@example.com`, "Finance");
  const invited = await createVerifiedUser(`operator-${Date.now()}@example.com`, "Operator");

  const ownerSession = await handleApi(authenticated("/api/admin/v1/session", owner.cookie));
  assert.equal(ownerSession.status, 200);
  assert.deepEqual((await ownerSession.json()).roles, ["super_admin"]);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url) === "https://api.dataforseo.com/v3/appendix/user_data") {
      assert.match(options.headers.authorization, /^Basic /);
      return new Response(JSON.stringify({ tasks: [{ status_code: 20000, result: [{ money: { balance: 1, currency: "USD" } }] }] }), { status: 200 });
    }
    return originalFetch(url, options);
  };
  try {
    assert.equal((await handleApi(authenticated("/api/admin/v1/seo-provider", owner.cookie))).status, 200);
    const testedProvider = await handleApi(authenticatedJson("/api/admin/v1/seo-provider/test", owner.cookie, {
      login: "admin@example.com", password: "seo-provider-secret",
    }));
    assert.equal(testedProvider.status, 200);
    assert.equal((await testedProvider.json()).status, "healthy");
    const savedProvider = await handleApi(authenticatedJson("/api/admin/v1/seo-provider", owner.cookie, {
      login: "admin@example.com", password: "seo-provider-secret", reason: "Enable production SEO metrics",
    }, { method: "PUT" }));
    assert.equal(savedProvider.status, 200);
    assert.doesNotMatch(JSON.stringify(await savedProvider.json()), /seo-provider-secret/);
    const redactedProvider = await handleApi(authenticated("/api/admin/v1/seo-provider", owner.cookie));
    assert.doesNotMatch(JSON.stringify(await redactedProvider.json()), /seo-provider-secret|admin@example\.com/);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const timestamp = Date.now();
  for (const [user, role] of [[support, "support"], [finance, "finance"]]) {
    db.prepare(`
      INSERT INTO admin_memberships
      (user_id, status, mfa_required, version, created_by, created_at, updated_at)
      VALUES (?, 'active', 1, 1, ?, ?, ?)
    `).run(user.id, owner.id, timestamp, timestamp);
    db.prepare(`
      INSERT INTO admin_membership_roles (user_id, role_id, assigned_by, assigned_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, `admin_role_${role}`, owner.id, timestamp);
  }

  assert.equal((await handleApi(authenticated("/api/admin/v1/users", support.cookie))).status, 200);
  assert.equal((await handleApi(authenticated("/api/admin/v1/administrators", support.cookie))).status, 403);
  assert.equal(
    (await handleApi(authenticatedJson(`/api/admin/v1/tools/tool_polish/lifecycle`, support.cookie, {
      state: "maintenance", reason: "unauthorized test",
    }))).status,
    403,
  );

  const invitedEmail = db.prepare("SELECT email FROM users WHERE id = ?").get(invited.id).email;
  const createAdministrator = await handleApi(authenticatedJson("/api/admin/v1/administrators", owner.cookie, {
    email: invitedEmail, role: "operations", reason: "Expand the operations team",
  }));
  assert.equal(createAdministrator.status, 201);
  assert.deepEqual(
    (await handleApi(authenticated("/api/admin/v1/session", invited.cookie)).then((response) => response.json())).roles,
    ["operations"],
  );
  assert.equal((await handleApi(authenticatedJson("/api/admin/v1/administrators", owner.cookie, {
    email: invitedEmail, role: "operations", reason: "Duplicate test",
  }))).status, 409);
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/administrators/${owner.id}/status`, owner.cookie, {
    status: "suspended", reason: "Self lockout test",
  }))).status, 409);
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/administrators/${invited.id}/role`, owner.cookie, {
    role: "support", reason: "Move to customer support",
  }))).status, 200);
  assert.deepEqual(
    (await handleApi(authenticated("/api/admin/v1/session", invited.cookie)).then((response) => response.json())).roles,
    ["support"],
  );
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/administrators/${invited.id}/status`, owner.cookie, {
    status: "suspended", reason: "Temporary access suspension",
  }))).status, 200);
  assert.equal((await handleApi(authenticated("/api/admin/v1/session", invited.cookie))).status, 401);
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/administrators/${invited.id}/status`, owner.cookie, {
    status: "active", reason: "Access review completed",
  }))).status, 200);

  const adjustmentHeaders = { "idempotency-key": "admin-adjustment-small-1" };
  const smallAdjustment = await handleApi(authenticatedJson(`/api/admin/v1/users/${customer.id}/credits`, support.cookie, {
    amount: 25, reasonCode: "customer_support", note: "Support goodwill credit",
  }, { headers: adjustmentHeaders }));
  assert.equal(smallAdjustment.status, 201);
  const firstAdjustment = await smallAdjustment.json();
  const replay = await handleApi(authenticatedJson(`/api/admin/v1/users/${customer.id}/credits`, support.cookie, {
    amount: 25, reasonCode: "customer_support", note: "Support goodwill credit",
  }, { headers: adjustmentHeaders }));
  assert.deepEqual(await replay.json(), firstAdjustment);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM credit_ledger WHERE reference_id = ?").get("admin-adjustment-small-1").count,
    1,
  );
  assert.equal(
    db.prepare("SELECT balance_after - balance_before AS delta FROM credit_ledger_metadata WHERE ledger_id = ?")
      .get(firstAdjustment.ledgerId).delta,
    25,
  );

  const largeAdjustment = await handleApi(authenticatedJson(`/api/admin/v1/users/${customer.id}/credits`, support.cookie, {
    amount: 2500, reasonCode: "service_compensation", note: "Extended service incident",
  }, { headers: { "idempotency-key": "admin-adjustment-large-1" } }));
  assert.equal(largeAdjustment.status, 202);
  const approvalId = (await largeAdjustment.json()).approvalId;
  assert.ok(approvalId);
  const approved = await handleApi(authenticatedJson(`/api/admin/v1/approvals/${approvalId}/approve`, finance.cookie, {}));
  assert.equal(approved.status, 200);

  assert.equal(
    (await handleApi(authenticatedJson("/api/admin/v1/tools/tool_polish/lifecycle", owner.cookie, {
      state: "maintenance", reason: "planned maintenance",
    }))).status,
    200,
  );

  const publishedTool = db.prepare("SELECT id, slug FROM tools WHERE active = 1 ORDER BY slug LIMIT 1").get();
  assert.ok(publishedTool);
  const brandingForm = new FormData();
  brandingForm.set("reason", "Create a distinct commercial product identity");
  brandingForm.set("iconColor", "#123456");
  brandingForm.set("iconBackground", "#EEF2FF");
  brandingForm.set("icon", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMwTvv/H4QZYAwAV1QKXcAZOnAAAAAASUVORK5CYII=", "base64")], "product.png", { type: "image/png" }));
  const branded = await handleApi(authenticated(`/api/admin/v1/tools/${publishedTool.id}/branding`, owner.cookie, {
    method: "PUT", body: brandingForm,
  }));
  assert.equal(branded.status, 200);
  const brandedBody = await branded.json();
  assert.equal(brandedBody.branding.iconColor, "#123456");
  assert.match(brandedBody.branding.iconUrl, new RegExp(`/api/tools/${publishedTool.slug}/icon\\?v=`));
  assert.equal(/objectKey|storageName|storage_provider/.test(JSON.stringify(brandedBody)), false);
  const publicTools = await handleApi(request("/api/tools"));
  const publicTool = (await publicTools.json()).tools.find((tool) => tool.id === publishedTool.id);
  assert.equal(publicTool.iconBackground, "#EEF2FF");
  const publicIcon = await handleApi(request(publicTool.iconUrl));
  assert.equal(publicIcon.status, 200);
  assert.equal(publicIcon.headers.get("content-type"), "image/webp");
  assert.equal(Buffer.from(await publicIcon.arrayBuffer()).subarray(0, 4).toString("ascii"), "RIFF");
  const unauthorizedBranding = new FormData();
  unauthorizedBranding.set("reason", "Unauthorized branding change");
  assert.equal((await handleApi(authenticated(`/api/admin/v1/tools/${publishedTool.id}/branding`, support.cookie, {
    method: "PUT", body: unauthorizedBranding,
  }))).status, 403);
  const resetBranding = await handleApi(authenticatedJson(`/api/admin/v1/tools/${publishedTool.id}/branding`, owner.cookie, {
    reason: "Return to the default product identity",
  }, { method: "DELETE" }));
  assert.equal(resetBranding.status, 200);
  assert.equal((await resetBranding.json()).branding.iconUrl, null);

  process.env.ADMIN_MFA_ENFORCED = "true";
  const mfaBlocked = await handleApi(authenticated("/api/admin/v1/overview", owner.cookie));
  assert.equal(mfaBlocked.status, 428);
  assert.equal((await mfaBlocked.json()).error.code, "ADMIN_MFA_ENROLLMENT_REQUIRED");
  const enrollment = await handleApi(authenticatedJson("/api/admin/v1/mfa/enroll", owner.cookie, {}));
  assert.equal(enrollment.status, 201);
  const enrollmentBody = await enrollment.json();
  const activation = await handleApi(authenticatedJson("/api/admin/v1/mfa/activate", owner.cookie, {
    factorId: enrollmentBody.factorId,
    code: totp(enrollmentBody.secret),
  }));
  assert.equal(activation.status, 200);
  assert.equal((await activation.json()).recoveryCodes.length, 8);
  assert.equal((await handleApi(authenticated("/api/admin/v1/overview", owner.cookie))).status, 200);
  const unifiedModels = await handleApi(authenticated("/api/admin/v1/platform-models", owner.cookie));
  assert.equal(unifiedModels.status, 200);
  const unifiedModelsBody = await unifiedModels.json();
  assert.equal(Array.isArray(unifiedModelsBody.models), true);
  assert.equal(unifiedModelsBody.music.configured, false);
  assert.equal(/key_ciphertext|key_iv|key_tag/i.test(JSON.stringify(unifiedModelsBody)), false);
  for (const path of [
    "/api/admin/v1/command-center",
    "/api/admin/v1/credits/ledger",
    "/api/admin/v1/finance",
    "/api/admin/v1/analytics/tools",
    "/api/admin/v1/infrastructure/overview",
  ]) {
    const response = await handleApi(authenticated(path, owner.cookie));
    assert.equal(response.status, 200, path);
    assert.equal(/password_hash|secret_encrypted|token_hash|key_ciphertext/i.test(JSON.stringify(await response.json())), false);
  }
  process.env.ADMIN_MFA_ENFORCED = "false";
  assert.equal((await handleApi(authenticated("/api/admin/v1/finance", support.cookie))).status, 403);
  assert.equal((await handleApi(authenticated("/api/admin/v1/infrastructure/overview", finance.cookie))).status, 403);
  process.env.ADMIN_MFA_ENFORCED = "false";

  const assignMembership = await handleApi(authenticatedJson(`/api/admin/v1/users/${customer.id}/membership`, owner.cookie, {
    planId: "plan_pro", expiresAt: Date.now() + 30 * 86400000, reason: "Commercial account upgrade",
  }));
  assert.equal(assignMembership.status, 200);
  assert.equal((await assignMembership.json()).membership.code, "pro-monthly");
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/users/${customer.id}/membership`, support.cookie, {
    planId: "plan_max", reason: "Unauthorized membership change",
  }))).status, 403);

  const customerDetail = await handleApi(authenticated(`/api/admin/v1/users/${customer.id}`, owner.cookie));
  const customerDetailBody = await customerDetail.json();
  assert.equal(customerDetailBody.membership.code, "pro-monthly");
  assert.equal(customerDetailBody.fileQuota.limit, 500);
  const configurableTool = db.prepare("SELECT id FROM tools ORDER BY id LIMIT 1").get();
  const makeToolFree = await handleApi(authenticatedJson(`/api/admin/v1/tools/${configurableTool.id}`, owner.cookie, {
    creditCost: 0, reason: "No-token utility should be free",
  }, { method: "PATCH" }));
  assert.equal(makeToolFree.status, 200);
  assert.equal(db.prepare("SELECT credit_cost FROM tools WHERE id = ?").get(configurableTool.id).credit_cost, 0);
  assert.equal((await handleApi(authenticatedJson(`/api/admin/v1/tools/${configurableTool.id}`, support.cookie, {
    creditCost: 10, reason: "Unauthorized pricing change",
  }, { method: "PATCH" }))).status, 403);
  const serialized = JSON.stringify(customerDetailBody);
  assert.equal(/password_hash|secret_encrypted|token_hash/i.test(serialized), false);
  const auditResponse = await handleApi(authenticated("/api/admin/v1/audit", owner.cookie));
  assert.equal(auditResponse.status, 200);
  assert.equal(/StrongAdminPass|secret_encrypted|password_hash/.test(JSON.stringify(await auditResponse.json())), false);
});

test.after(async () => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_MFA_ENFORCED;
  await rm(dataDirectory, { recursive: true, force: true });
});
