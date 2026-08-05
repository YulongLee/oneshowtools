import {
  createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual,
} from "node:crypto";
import { audit, db } from "./database.mjs";
import { createSessionToken, hashIdentifier, hashToken, requestClient } from "./security.mjs";
import { collectSystemMetrics } from "./observability.mjs";
import {
  askMarketIntelligence, generateMarketIntelligenceReport, getMarketIntelligenceConversation,
  getMarketIntelligenceReport, listMarketIntelligenceReports, marketIntelligenceStatus,
} from "./market-intelligence.mjs";
import {
  listPlatformModelConfigurations, savePlatformModelConfiguration, testPlatformModelConfiguration,
} from "./model-gateway.mjs";
import { objectStorageStatus } from "./object-storage.mjs";
import {
  saveSeoProviderConfiguration, seoProviderConfiguration, testSeoProviderConfiguration,
} from "./seo-provider-config.mjs";
import {
  musicProviderConfiguration, saveMusicProviderConfiguration, testMusicProviderConfiguration,
} from "./music-provider.mjs";

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const fail = (code, status = 400, details) => json({ error: { code, ...(details ? { details } : {}) } }, status);
const parseBody = async (request) => {
  try { return await request.json(); } catch { return {}; }
};
const now = () => Date.now();
const safeJson = (value) => JSON.stringify(value ?? null);
const parseJson = (value, fallback = null) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

const permissions = [
  ["dashboard.read", "View commercial and operational dashboard"],
  ["users.read", "View customer records"],
  ["users.manage", "Manage customer account lifecycle and sessions"],
  ["credits.adjust", "Request governed credit adjustments"],
  ["credits.approve", "Approve high-value credit adjustments"],
  ["credits.read", "View credit balances and immutable ledger"],
  ["credits.manage", "Create governed credit ledger commands"],
  ["finance.read", "View internal financial subledger and reconciliation"],
  ["finance.manage", "Create and post internal financial journals"],
  ["finance.close", "Close or reopen internal financial periods"],
  ["analytics.read", "View privacy-safe tool usage analytics"],
  ["intelligence.read", "View market intelligence reports and evidence"],
  ["intelligence.manage", "Run the market intelligence agent"],
  ["models.read", "View redacted platform model configuration"],
  ["models.manage", "Test and rotate platform model configuration"],
  ["seo_sources.read", "View redacted SEO data source configuration"],
  ["seo_sources.manage", "Test and rotate SEO data source credentials"],
  ["infrastructure.read", "View infrastructure metrics and health"],
  ["alerts.manage", "Acknowledge and resolve operational alerts"],
  ["metrics.export", "Export bounded metric and finance views"],
  ["billing.read", "View commercial records"],
  ["billing.manage", "Manage refunds and commercial exceptions"],
  ["tools.read", "View tool governance records"],
  ["tools.manage", "Edit and publish tools"],
  ["privacy.read", "View privacy operations"],
  ["privacy.manage", "Manage exports, deletion, and legal holds"],
  ["jobs.read", "View operational jobs and alerts"],
  ["jobs.manage", "Retry and resolve operational jobs"],
  ["audit.read", "View and export administrative audit"],
  ["admins.manage", "Manage administrators and roles"],
];
const roleDefinitions = {
  super_admin: permissions.map(([code]) => code),
  operations: ["dashboard.read", "users.read", "users.manage", "credits.read", "credits.adjust", "credits.manage", "tools.read", "jobs.read", "jobs.manage", "infrastructure.read", "alerts.manage", "intelligence.read", "intelligence.manage", "models.read", "seo_sources.read", "audit.read"],
  support: ["dashboard.read", "users.read", "users.manage", "credits.read", "credits.adjust", "credits.manage", "billing.read", "jobs.read"],
  finance: ["dashboard.read", "users.read", "credits.read", "credits.adjust", "credits.manage", "credits.approve", "billing.read", "billing.manage", "finance.read", "finance.manage", "finance.close", "metrics.export", "audit.read"],
  tool_manager: ["dashboard.read", "tools.read", "tools.manage", "jobs.read", "analytics.read", "intelligence.read", "intelligence.manage", "models.read", "models.manage", "seo_sources.read", "seo_sources.manage"],
  privacy: ["dashboard.read", "users.read", "privacy.read", "privacy.manage", "audit.read"],
  read_only: ["dashboard.read", "users.read", "credits.read", "billing.read", "finance.read", "tools.read", "analytics.read", "intelligence.read", "models.read", "seo_sources.read", "infrastructure.read", "privacy.read", "jobs.read", "audit.read"],
};
const roleNames = {
  super_admin: ["超级管理员", "Super Administrator"],
  operations: ["运营管理员", "Operations"],
  support: ["客户支持", "Customer Support"],
  finance: ["财务管理员", "Finance"],
  tool_manager: ["工具管理员", "Tool Manager"],
  privacy: ["隐私管理员", "Privacy"],
  read_only: ["只读审计员", "Read-only Auditor"],
};

export function seedAdminGovernance() {
  const timestamp = now();
  const insertPermission = db.prepare("INSERT OR IGNORE INTO admin_permissions (code, description) VALUES (?, ?)");
  for (const permission of permissions) insertPermission.run(...permission);
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO admin_roles (id, code, name_zh, name_en, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMapping = db.prepare(`
    INSERT OR IGNORE INTO admin_role_permissions (role_id, permission_code) VALUES (?, ?)
  `);
  for (const [code, granted] of Object.entries(roleDefinitions)) {
    const id = `admin_role_${code}`;
    insertRole.run(id, code, roleNames[code][0], roleNames[code][1], timestamp);
    for (const permission of granted) insertMapping.run(id, permission);
  }
}
seedAdminGovernance();

function cleanAdminUser(user) {
  return user && {
    id: user.id, name: user.name, email: user.email, locale: user.locale,
    emailVerified: Boolean(user.email_verified), createdAt: user.created_at,
  };
}

function bootstrapAdmin(user) {
  let membership = db.prepare("SELECT * FROM admin_memberships WHERE user_id = ?").get(user.id);
  if (membership) return membership;
  const allowed = new Set(String(process.env.ADMIN_EMAILS || "").split(",")
    .map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(user.email.toLowerCase()) || !user.email_verified || user.status !== "active") return null;
  const timestamp = now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT OR IGNORE INTO admin_memberships
      (user_id, status, mfa_required, version, created_by, created_at, updated_at)
      VALUES (?, 'active', 1, 1, ?, ?, ?)
    `).run(user.id, user.id, timestamp, timestamp);
    db.prepare(`
      INSERT OR IGNORE INTO admin_membership_roles (user_id, role_id, assigned_by, assigned_at)
      VALUES (?, 'admin_role_super_admin', ?, ?)
    `).run(user.id, user.id, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  richAudit({
    actor: user, roles: ["super_admin"], permission: "admins.manage",
    action: "admin.bootstrap", targetType: "administrator", targetId: user.id,
    reason: "ADMIN_EMAILS bootstrap migration", result: "success",
  });
  return db.prepare("SELECT * FROM admin_memberships WHERE user_id = ?").get(user.id);
}

function rolesAndPermissions(userId) {
  const rows = db.prepare(`
    SELECT r.code AS roleCode, rp.permission_code AS permission
    FROM admin_membership_roles mr
    JOIN admin_roles r ON r.id = mr.role_id
    LEFT JOIN admin_role_permissions rp ON rp.role_id = r.id
    WHERE mr.user_id = ?
  `).all(userId);
  return {
    roles: [...new Set(rows.map((row) => row.roleCode))],
    permissions: [...new Set(rows.map((row) => row.permission).filter(Boolean))],
  };
}

function correlationId(request) {
  return String(request?.headers?.get("x-correlation-id") || randomUUID()).slice(0, 100);
}

function redact(value) {
  if (!value || typeof value !== "object") return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, child] of Object.entries(value)) {
    if (/password|secret|token|credential|api.?key|access.?key|payload_json/i.test(key)) output[key] = "[REDACTED]";
    else output[key] = child && typeof child === "object" ? redact(child) : child;
  }
  return output;
}

function richAudit({
  request, actor, roles = [], permission = null, action, targetType = null, targetId = null,
  reason = null, before = null, after = null, approvalId = null, result = "success",
}) {
  db.prepare(`
    INSERT INTO admin_audit_events
    (id, actor_user_id, actor_email, role_codes, permission, action, target_type, target_id,
      reason, correlation_id, before_json, after_json, approval_id, result, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), actor?.id || null, actor?.email || null, safeJson(roles), permission, action,
    targetType, targetId, reason, correlationId(request), before ? safeJson(redact(before)) : null,
    after ? safeJson(redact(after)) : null, approvalId, result, now(),
  );
}

function encryptionKey() {
  const source = process.env.ADMIN_MFA_ENCRYPTION_KEY || (
    String(process.env.APP_URL || "").startsWith("https://") ? "" : "oneshowtools-local-admin-mfa-key"
  );
  if (!source) throw Object.assign(new Error("ADMIN_MFA_KEY_REQUIRED"), { code: "ADMIN_MFA_KEY_REQUIRED" });
  return createHash("sha256").update(source).digest();
}
function encryptSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function decryptSecret(encoded) {
  const [iv, tag, encrypted] = String(encoded).split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) result += base32Alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return result;
}
function base32Decode(value) {
  const bits = String(value).toUpperCase().replace(/=+$/, "").split("")
    .map((character) => base32Alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}
function totp(secret, timestamp = now()) {
  const counter = Math.floor(timestamp / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String(((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)).padStart(6, "0");
}
function verifyTotp(secret, code) {
  const supplied = Buffer.from(String(code || "").padStart(6, "0"));
  return [-30000, 0, 30000].some((offset) => {
    const expected = Buffer.from(totp(secret, now() + offset));
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}

function mfaState(userId, sessionId) {
  const factor = db.prepare(`
    SELECT * FROM admin_mfa_factors WHERE user_id = ? AND active = 1 ORDER BY verified_at DESC LIMIT 1
  `).get(userId);
  const authSession = sessionId ? db.prepare(`
    SELECT * FROM admin_auth_sessions WHERE session_id = ? AND user_id = ?
  `).get(sessionId, userId) : null;
  return { factor, authSession };
}

function parsePage(request, maximum = 100) {
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
  const pageSize = Math.max(10, Math.min(maximum, Number(url.searchParams.get("pageSize")) || 25));
  return { url, page, pageSize, offset: (page - 1) * pageSize };
}

function getAdminContext(request, dependencies) {
  const user = dependencies.currentUser(request);
  if (!user) return { response: fail("UNAUTHENTICATED", 401) };
  const membership = bootstrapAdmin(user);
  if (!membership || membership.status !== "active") {
    richAudit({ request, actor: user, action: "admin.access", targetType: "administrator", targetId: user.id, result: "denied" });
    return { response: fail("ADMIN_FORBIDDEN", 403) };
  }
  const access = rolesAndPermissions(user.id);
  const session = dependencies.currentSession(request);
  if (!session) return { response: fail("UNAUTHENTICATED", 401) };
  const mfa = mfaState(user.id, session.id);
  return { user, membership, session, ...access, ...mfa };
}

function requirePermission(context, permission) {
  if (context.permissions.includes(permission)) return null;
  return fail("ADMIN_PERMISSION_DENIED", 403, { permission });
}

function mfaEnforced(context) {
  return process.env.ADMIN_MFA_ENFORCED === "true" && Boolean(context.membership.mfa_required);
}

function requireAdminMfa(context) {
  if (!mfaEnforced(context)) return null;
  if (!context.factor) return fail("ADMIN_MFA_ENROLLMENT_REQUIRED", 428);
  if (!context.authSession?.mfa_verified_at || context.authSession.mfa_verified_at + 12 * 3600000 < now()) {
    return fail("ADMIN_MFA_REQUIRED", 428);
  }
  return null;
}

function adminSessionPayload(context) {
  const mfaRequired = mfaEnforced(context);
  return {
    admin: cleanAdminUser(context.user),
    roles: context.roles,
    permissions: context.permissions,
    mfa: {
      enforced: mfaRequired,
      enrolled: Boolean(context.factor),
      verified: !mfaRequired || Boolean(context.authSession?.mfa_verified_at && context.authSession.mfa_verified_at + 12 * 3600000 > now()),
      stepUpUntil: context.authSession?.step_up_until || null,
    },
  };
}

function upsertAdminAuthSession(context, values = {}) {
  db.prepare(`
    INSERT INTO admin_auth_sessions (session_id, user_id, mfa_verified_at, step_up_until, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      mfa_verified_at = COALESCE(excluded.mfa_verified_at, admin_auth_sessions.mfa_verified_at),
      step_up_until = COALESCE(excluded.step_up_until, admin_auth_sessions.step_up_until)
  `).run(context.session.id, context.user.id, values.mfaVerifiedAt || null, values.stepUpUntil || null, now());
}

async function handleMfa(request, path, context) {
  if (path === "/api/admin/v1/mfa/enroll" && request.method === "POST") {
    if (context.factor) return fail("ADMIN_MFA_ALREADY_ENROLLED", 409);
    db.prepare("DELETE FROM admin_mfa_factors WHERE user_id = ? AND active = 0").run(context.user.id);
    const secret = base32Encode(randomBytes(20));
    const id = randomUUID();
    db.prepare(`
      INSERT INTO admin_mfa_factors (id, user_id, kind, label, secret_encrypted, active, created_at)
      VALUES (?, ?, 'totp', ?, ?, 0, ?)
    `).run(id, context.user.id, context.user.email, encryptSecret(secret), now());
    richAudit({ request, actor: context.user, roles: context.roles, permission: "admins.manage", action: "admin.mfa.enroll.start", targetType: "administrator", targetId: context.user.id });
    return json({
      factorId: id, secret,
      otpauthUrl: `otpauth://totp/${encodeURIComponent(`OneShowTools:${context.user.email}`)}?secret=${secret}&issuer=OneShowTools`,
    }, 201);
  }
  if (path === "/api/admin/v1/mfa/activate" && request.method === "POST") {
    const data = await parseBody(request);
    const factor = db.prepare("SELECT * FROM admin_mfa_factors WHERE id = ? AND user_id = ? AND active = 0")
      .get(String(data.factorId || ""), context.user.id);
    if (!factor || !verifyTotp(decryptSecret(factor.secret_encrypted), data.code)) return fail("ADMIN_MFA_CODE_INVALID", 400);
    const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase());
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE admin_mfa_factors SET active = 1, verified_at = ? WHERE id = ?").run(now(), factor.id);
      db.prepare("DELETE FROM admin_recovery_codes WHERE user_id = ?").run(context.user.id);
      const insert = db.prepare(`
        INSERT INTO admin_recovery_codes (id, user_id, code_hash, created_at) VALUES (?, ?, ?, ?)
      `);
      for (const code of recoveryCodes) insert.run(randomUUID(), context.user.id, hashToken(code), now());
      upsertAdminAuthSession(context, { mfaVerifiedAt: now(), stepUpUntil: now() + 15 * 60000 });
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    richAudit({ request, actor: context.user, roles: context.roles, permission: "admins.manage", action: "admin.mfa.activate", targetType: "administrator", targetId: context.user.id });
    return json({ ok: true, recoveryCodes });
  }
  if (path === "/api/admin/v1/mfa/verify" && request.method === "POST") {
    const data = await parseBody(request);
    let valid = context.factor && verifyTotp(decryptSecret(context.factor.secret_encrypted), data.code);
    if (!valid && data.recoveryCode) {
      const code = db.prepare(`
        SELECT * FROM admin_recovery_codes WHERE user_id = ? AND code_hash = ? AND consumed_at IS NULL
      `).get(context.user.id, hashToken(String(data.recoveryCode).toUpperCase()));
      if (code) {
        db.prepare("UPDATE admin_recovery_codes SET consumed_at = ? WHERE id = ?").run(now(), code.id);
        valid = true;
      }
    }
    if (!valid) {
      richAudit({ request, actor: context.user, roles: context.roles, action: "admin.mfa.verify", targetType: "administrator", targetId: context.user.id, result: "denied" });
      return fail("ADMIN_MFA_CODE_INVALID", 400);
    }
    upsertAdminAuthSession(context, { mfaVerifiedAt: now(), stepUpUntil: now() + 15 * 60000 });
    richAudit({ request, actor: context.user, roles: context.roles, action: "admin.mfa.verify", targetType: "administrator", targetId: context.user.id });
    return json({ ok: true, stepUpUntil: now() + 15 * 60000 });
  }
  return null;
}

function overview(request) {
  const { url } = parsePage(request);
  const days = [7, 30, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 30;
  const since = now() - days * 86400000;
  const count = (sql, ...params) => Number(db.prepare(sql).get(...params)?.count || 0);
  const sum = (sql, ...params) => Number(db.prepare(sql).get(...params)?.total || 0);
  return {
    windowDays: days,
    metrics: {
      users: count("SELECT COUNT(*) AS count FROM users"),
      newUsers: count("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?", since),
      verifiedUsers: count("SELECT COUNT(*) AS count FROM users WHERE email_verified = 1"),
      suspendedUsers: count("SELECT COUNT(*) AS count FROM users WHERE status = 'suspended'"),
      activeUsers: count("SELECT COUNT(DISTINCT user_id) AS count FROM sessions WHERE last_seen_at >= ?", since),
      tasks: count("SELECT COUNT(*) AS count FROM tasks"),
      recentTasks: count("SELECT COUNT(*) AS count FROM tasks WHERE created_at >= ?", since),
      failedTasks: count("SELECT COUNT(*) AS count FROM tasks WHERE status IN ('failed','waiting_for_runtime') AND created_at >= ?", since),
      files: count("SELECT COUNT(*) AS count FROM files"),
      storageBytes: sum("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files"),
      creditLiability: sum("SELECT COALESCE(SUM(amount),0) AS total FROM credit_ledger"),
      subscriptions: count("SELECT COUNT(*) AS count FROM subscriptions WHERE status IN ('active','trialing')"),
      orders: count("SELECT COUNT(*) AS count FROM commercial_orders"),
      paymentVolumeMinor: sum("SELECT COALESCE(SUM(amount_minor),0) AS total FROM commercial_orders WHERE status = 'paid'"),
      tools: count("SELECT COUNT(*) AS count FROM tools WHERE active = 1"),
      openAlerts: count("SELECT COUNT(*) AS count FROM operational_alerts WHERE status = 'open'"),
      queuedJobs: count("SELECT COUNT(*) AS count FROM operational_jobs WHERE status IN ('queued','retrying','quarantined')"),
      emailFailures: count("SELECT COUNT(*) AS count FROM operational_jobs WHERE kind = 'email' AND status IN ('failed','quarantined')"),
    },
    trends: db.prepare(`
      SELECT date(created_at / 1000, 'unixepoch') AS day,
        SUM(CASE WHEN action = 'user.register' THEN 1 ELSE 0 END) AS registrations,
        SUM(CASE WHEN action = 'user.login' THEN 1 ELSE 0 END) AS logins
      FROM audit_events WHERE created_at >= ? GROUP BY day ORDER BY day
    `).all(since),
  };
}

function listUsers(request) {
  const { url, page, pageSize, offset } = parsePage(request);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 100);
  const status = String(url.searchParams.get("status") || "");
  const verified = String(url.searchParams.get("verified") || "");
  const conditions = ["(u.email LIKE ? OR u.name LIKE ? OR u.id LIKE ?)"];
  const params = [`%${query}%`, `%${query}%`, `%${query}%`];
  if (["active", "suspended"].includes(status)) { conditions.push("u.status = ?"); params.push(status); }
  if (["true", "false"].includes(verified)) { conditions.push("u.email_verified = ?"); params.push(verified === "true" ? 1 : 0); }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const total = Number(db.prepare(`SELECT COUNT(*) AS count FROM users u ${where}`).get(...params).count);
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.locale, u.email_verified AS emailVerified, u.status,
      u.created_at AS createdAt, u.updated_at AS updatedAt,
      COALESCE((SELECT SUM(amount) FROM credit_ledger WHERE user_id = u.id), 0) AS credits,
      (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS tasks,
      (SELECT COUNT(*) FROM files WHERE user_id = u.id) AS files,
      (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = u.id) AS lastSeenAt,
      (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND status IN ('active','trialing')) AS activeSubscriptions
    FROM users u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset).map((row) => ({ ...row, emailVerified: Boolean(row.emailVerified) }));
  return { users, page, pageSize, total, pages: Math.ceil(total / pageSize) };
}

function customerDetail(userId) {
  const user = db.prepare(`
    SELECT id, name, email, locale, email_verified AS emailVerified, status,
      created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?
  `).get(userId);
  if (!user) return null;
  return {
    user: { ...user, emailVerified: Boolean(user.emailVerified) },
    balance: Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId).balance),
    sessions: db.prepare(`
      SELECT id, created_at AS createdAt, last_seen_at AS lastSeenAt, expires_at AS expiresAt, user_agent AS userAgent
      FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 20
    `).all(userId),
    securityEvents: db.prepare(`
      SELECT action, result, correlation_id AS correlationId, created_at AS createdAt
      FROM security_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(userId),
    credits: db.prepare(`
      SELECT id, type, amount, description_zh AS descriptionZh, description_en AS descriptionEn,
        reference_type AS referenceType, reference_id AS referenceId, created_at AS createdAt
      FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(userId),
    tasks: db.prepare(`
      SELECT t.id, t.status, t.credit_cost AS creditCost, t.created_at AS createdAt,
        tools.name_zh AS toolNameZh, tools.name_en AS toolNameEn
      FROM tasks t JOIN tools ON tools.id = t.tool_id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 30
    `).all(userId),
    files: db.prepare(`
      SELECT id, name, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
      FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(userId),
    subscriptions: db.prepare(`
      SELECT s.id, s.provider, s.status, s.current_period_end AS currentPeriodEnd,
        p.name_zh AS nameZh, p.name_en AS nameEn
      FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.created_at DESC
    `).all(userId),
    invoices: db.prepare(`
      SELECT id, provider, status, amount_paid AS amountPaid, currency, hosted_url AS hostedUrl, created_at AS createdAt
      FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(userId),
    notes: db.prepare(`
      SELECT n.id, n.category, n.body, n.created_at AS createdAt, a.email AS authorEmail
      FROM support_notes n LEFT JOIN users a ON a.id = n.author_user_id
      WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50
    `).all(userId),
    deletion: db.prepare(`
      SELECT status, execute_after AS executeAfter, created_at AS createdAt, cancelled_at AS cancelledAt
      FROM deletion_requests WHERE user_id = ?
    `).get(userId) || null,
    legalHolds: db.prepare(`
      SELECT id, reason, status, review_at AS reviewAt, created_at AS createdAt
      FROM legal_holds WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId),
  };
}

function idempotentResult(key, actorId, action) {
  if (!key) return null;
  const row = db.prepare("SELECT * FROM admin_idempotency WHERE key = ?").get(key);
  if (!row) return null;
  if (row.actor_user_id !== actorId || row.action !== action) return { conflict: true };
  return { response: parseJson(row.response_json, {}) };
}
function saveIdempotent(key, actorId, action, response) {
  if (!key) return;
  db.prepare(`
    INSERT INTO admin_idempotency (key, actor_user_id, action, response_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, actorId, action, safeJson(response), now());
}

async function customerCommands(request, path, context, dependencies) {
  let match = path.match(/^\/api\/admin\/v1\/users\/([^/]+)\/status$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "users.manage"); if (denied) return denied;
    const data = await parseBody(request);
    if (!["active", "suspended"].includes(data.status) || !String(data.reason || "").trim()) return fail("INVALID_ACCOUNT_ACTION");
    if (match[1] === context.user.id && data.status === "suspended") return fail("CANNOT_SUSPEND_SELF", 409);
    const before = db.prepare("SELECT id, status FROM users WHERE id = ?").get(match[1]);
    if (!before) return fail("USER_NOT_FOUND", 404);
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(data.status, now(), match[1]);
    if (data.status === "suspended") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(match[1]);
    richAudit({ request, actor: context.user, roles: context.roles, permission: "users.manage", action: "admin.user.status", targetType: "user", targetId: match[1], reason: String(data.reason), before, after: { ...before, status: data.status } });
    return json({ ok: true });
  }
  match = path.match(/^\/api\/admin\/v1\/users\/([^/]+)\/sessions\/revoke$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "users.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const changes = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(match[1]).changes;
    richAudit({ request, actor: context.user, roles: context.roles, permission: "users.manage", action: "admin.user.sessions.revoke", targetType: "user", targetId: match[1], reason: String(data.reason || "security_support"), after: { revokedSessions: changes } });
    return json({ ok: true, revokedSessions: changes });
  }
  match = path.match(/^\/api\/admin\/v1\/users\/([^/]+)\/message$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "users.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const target = db.prepare("SELECT * FROM users WHERE id = ?").get(match[1]);
    if (!target) return fail("USER_NOT_FOUND", 404);
    if (!["verify", "reset"].includes(data.kind)) return fail("INVALID_MESSAGE_KIND");
    if (data.kind === "verify" && target.email_verified) return fail("EMAIL_ALREADY_VERIFIED", 409);
    await dependencies.issueAccountToken(request, target, data.kind);
    richAudit({ request, actor: context.user, roles: context.roles, permission: "users.manage", action: `admin.user.message.${data.kind}`, targetType: "user", targetId: target.id, reason: String(data.reason || "customer_support") });
    return json({ ok: true }, 202);
  }
  match = path.match(/^\/api\/admin\/v1\/users\/([^/]+)\/notes$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "users.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const body = String(data.body || "").trim().slice(0, 2000);
    const category = String(data.category || "general").trim().slice(0, 60);
    if (!body || !db.prepare("SELECT id FROM users WHERE id = ?").get(match[1])) return fail("INVALID_SUPPORT_NOTE");
    const id = randomUUID();
    db.prepare(`
      INSERT INTO support_notes (id, user_id, author_user_id, category, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, match[1], context.user.id, category, body, now());
    richAudit({ request, actor: context.user, roles: context.roles, permission: "users.manage", action: "admin.support.note", targetType: "user", targetId: match[1], reason: category, after: { noteId: id } });
    return json({ ok: true, id }, 201);
  }
  match = path.match(/^\/api\/admin\/v1\/users\/([^/]+)\/credits$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "credits.adjust"); if (denied) return denied;
    const data = await parseBody(request);
    const amount = Number(data.amount);
    const reasonCode = String(data.reasonCode || "").trim().slice(0, 60);
    const note = String(data.note || "").trim().slice(0, 240);
    const key = String(request.headers.get("idempotency-key") || data.idempotencyKey || "").trim().slice(0, 120);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1000000 || !reasonCode || !note || !key) {
      return fail("INVALID_CREDIT_ADJUSTMENT");
    }
    const replay = idempotentResult(key, context.user.id, "credits.adjust");
    if (replay?.conflict) return fail("IDEMPOTENCY_CONFLICT", 409);
    if (replay?.response) return json(replay.response);
    const target = db.prepare("SELECT id, email FROM users WHERE id = ?").get(match[1]);
    if (!target) return fail("USER_NOT_FOUND", 404);
    const beforeBalance = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(target.id).balance);
    const threshold = Math.max(1, Number(process.env.ADMIN_CREDIT_APPROVAL_THRESHOLD || 1000));
    if (Math.abs(amount) >= threshold && !context.permissions.includes("credits.approve")) {
      const approvalId = randomUUID();
      db.prepare(`
        INSERT INTO admin_approvals
        (id, action, target_type, target_id, payload_json, requested_by, status, reason, created_at)
        VALUES (?, 'credits.adjust', 'user', ?, ?, ?, 'pending', ?, ?)
      `).run(approvalId, target.id, safeJson({ amount, reasonCode, note, key, beforeBalance }), context.user.id, reasonCode, now());
      const response = { ok: true, pendingApproval: true, approvalId, balance: beforeBalance };
      saveIdempotent(key, context.user.id, "credits.adjust", response);
      richAudit({ request, actor: context.user, roles: context.roles, permission: "credits.adjust", action: "admin.credits.adjust.request", targetType: "user", targetId: target.id, reason: `${reasonCode}: ${note}`, before: { balance: beforeBalance }, approvalId, result: "pending" });
      return json(response, 202);
    }
    const ledgerId = randomUUID();
    db.prepare(`
      INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'admin_adjustment', ?, ?, ?, 'admin_adjustment', ?, ?)
    `).run(ledgerId, target.id, amount, `${reasonCode}: ${note}`, `${reasonCode}: ${note}`, key, now());
    const afterBalance = beforeBalance + amount;
    db.prepare(`
      INSERT INTO credit_ledger_metadata
      (ledger_id, actor_user_id, permission_code, reason_code, operator_note,
        correlation_id, balance_before, balance_after, created_at)
      VALUES (?, ?, 'credits.adjust', ?, ?, ?, ?, ?, ?)
    `).run(ledgerId, context.user.id, reasonCode, note, correlationId(request), beforeBalance, afterBalance, now());
    const response = { ok: true, ledgerId, balance: afterBalance, beforeBalance };
    saveIdempotent(key, context.user.id, "credits.adjust", response);
    richAudit({ request, actor: context.user, roles: context.roles, permission: "credits.adjust", action: "admin.credits.adjust", targetType: "user", targetId: target.id, reason: `${reasonCode}: ${note}`, before: { balance: beforeBalance }, after: { balance: afterBalance, amount, ledgerId } });
    return json(response, 201);
  }
  return null;
}

async function approveAction(request, path, context) {
  const match = path.match(/^\/api\/admin\/v1\/approvals\/([^/]+)\/approve$/);
  if (!match || request.method !== "POST") return null;
  const denied = requirePermission(context, "credits.approve"); if (denied) return denied;
  const approval = db.prepare("SELECT * FROM admin_approvals WHERE id = ?").get(match[1]);
  if (!approval) return fail("APPROVAL_NOT_FOUND", 404);
  if (approval.status !== "pending") return fail("APPROVAL_ALREADY_RESOLVED", 409);
  if (approval.requested_by === context.user.id) return fail("APPROVER_MUST_DIFFER", 409);
  if (approval.action !== "credits.adjust") return fail("APPROVAL_ACTION_UNSUPPORTED", 409);
  const payload = parseJson(approval.payload_json, {});
  const beforeBalance = Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(approval.target_id).balance);
  const ledgerId = randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'admin_adjustment', ?, ?, ?, 'admin_approval', ?, ?)
    `).run(ledgerId, approval.target_id, payload.amount, `${payload.reasonCode}: ${payload.note}`, `${payload.reasonCode}: ${payload.note}`, approval.id, now());
    db.prepare(`
      INSERT INTO credit_ledger_metadata
      (ledger_id, actor_user_id, permission_code, reason_code, operator_note, approval_id,
        correlation_id, balance_before, balance_after, created_at)
      VALUES (?, ?, 'credits.approve', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ledgerId, context.user.id, payload.reasonCode, payload.note, approval.id,
      correlationId(request), beforeBalance, beforeBalance + payload.amount, now(),
    );
    db.prepare("UPDATE admin_approvals SET status = 'approved', approved_by = ?, resolved_at = ? WHERE id = ? AND status = 'pending'")
      .run(context.user.id, now(), approval.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  richAudit({ request, actor: context.user, roles: context.roles, permission: "credits.approve", action: "admin.credits.adjust.approve", targetType: "user", targetId: approval.target_id, reason: approval.reason, before: { balance: beforeBalance }, after: { balance: beforeBalance + payload.amount, amount: payload.amount }, approvalId: approval.id });
  return json({ ok: true, ledgerId, balance: beforeBalance + payload.amount });
}

function listTools() {
  return db.prepare(`
    SELECT t.id, t.slug, t.name_zh AS nameZh, t.name_en AS nameEn,
      t.description_zh AS descriptionZh, t.description_en AS descriptionEn,
      t.category, t.icon, t.credit_cost AS creditCost, t.runtime_kind AS runtimeKind,
      t.runtime_status AS runtimeStatus, t.active,
      COALESCE((SELECT lifecycle_state FROM tool_versions WHERE tool_id = t.id ORDER BY version DESC LIMIT 1),
        CASE WHEN t.active = 1 THEN 'published' ELSE 'draft' END) AS lifecycleState,
      (SELECT version FROM tool_versions WHERE tool_id = t.id ORDER BY version DESC LIMIT 1) AS version,
      (SELECT status FROM tool_health_reports WHERE tool_id = t.id ORDER BY reported_at DESC LIMIT 1) AS healthStatus,
      (SELECT latency_ms FROM tool_health_reports WHERE tool_id = t.id ORDER BY reported_at DESC LIMIT 1) AS latencyMs,
      (SELECT reported_at FROM tool_health_reports WHERE tool_id = t.id ORDER BY reported_at DESC LIMIT 1) AS healthReportedAt
    FROM tools t ORDER BY t.name_en
  `).all().map((tool) => ({ ...tool, active: Boolean(tool.active) }));
}

async function toolCommands(request, path, context) {
  let match = path.match(/^\/api\/admin\/v1\/tools\/([^/]+)$/);
  if (match && request.method === "PATCH") {
    const denied = requirePermission(context, "tools.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const tool = db.prepare("SELECT * FROM tools WHERE id = ?").get(match[1]);
    if (!tool) return fail("TOOL_NOT_FOUND", 404);
    const updated = {
      nameZh: String(data.nameZh ?? tool.name_zh).trim().slice(0, 120),
      nameEn: String(data.nameEn ?? tool.name_en).trim().slice(0, 120),
      descriptionZh: String(data.descriptionZh ?? tool.description_zh).trim().slice(0, 500),
      descriptionEn: String(data.descriptionEn ?? tool.description_en).trim().slice(0, 500),
      category: String(data.category ?? tool.category).trim().slice(0, 60),
      creditCost: Number(data.creditCost ?? tool.credit_cost),
    };
    if (!updated.nameZh || !updated.nameEn || !updated.descriptionZh || !updated.descriptionEn
      || !updated.category || !Number.isInteger(updated.creditCost) || updated.creditCost < 0) return fail("INVALID_TOOL_METADATA");
    const version = Number(db.prepare("SELECT COALESCE(MAX(version),0) AS version FROM tool_versions WHERE tool_id = ?").get(tool.id).version) + 1;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        UPDATE tools SET name_zh = ?, name_en = ?, description_zh = ?, description_en = ?,
          category = ?, credit_cost = ?, updated_at = ? WHERE id = ?
      `).run(updated.nameZh, updated.nameEn, updated.descriptionZh, updated.descriptionEn, updated.category, updated.creditCost, now(), tool.id);
      db.prepare(`
        INSERT INTO tool_versions
        (id, tool_id, version, lifecycle_state, visibility, name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, contract_version, runtime_kind, created_by, created_at)
        VALUES (?, ?, ?, 'draft', 'public', ?, ?, ?, ?, ?, ?, ?, 'v1', ?, ?, ?)
      `).run(randomUUID(), tool.id, version, updated.nameZh, updated.nameEn, updated.descriptionZh, updated.descriptionEn, updated.category, tool.icon, updated.creditCost, tool.runtime_kind, context.user.id, now());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    richAudit({ request, actor: context.user, roles: context.roles, permission: "tools.manage", action: "admin.tool.update", targetType: "tool", targetId: tool.id, reason: String(data.reason || "metadata_update"), before: tool, after: { ...updated, version } });
    return json({ ok: true, version });
  }
  match = path.match(/^\/api\/admin\/v1\/tools\/([^/]+)\/lifecycle$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "tools.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const state = String(data.state || "");
    if (!["draft", "staged", "published", "maintenance", "retired"].includes(state) || !String(data.reason || "").trim()) {
      return fail("INVALID_TOOL_LIFECYCLE");
    }
    const tool = db.prepare("SELECT * FROM tools WHERE id = ?").get(match[1]);
    if (!tool) return fail("TOOL_NOT_FOUND", 404);
    let version = db.prepare("SELECT * FROM tool_versions WHERE tool_id = ? ORDER BY version DESC LIMIT 1").get(tool.id);
    if (!version) {
      db.prepare(`
        INSERT INTO tool_versions
        (id, tool_id, version, lifecycle_state, visibility, name_zh, name_en, description_zh,
          description_en, category, icon, credit_cost, contract_version, runtime_kind, created_by, created_at)
        VALUES (?, ?, 1, ?, 'public', ?, ?, ?, ?, ?, ?, ?, 'v1', ?, ?, ?)
      `).run(randomUUID(), tool.id, state, tool.name_zh, tool.name_en, tool.description_zh, tool.description_en, tool.category, tool.icon, tool.credit_cost, tool.runtime_kind, context.user.id, now());
      version = { version: 1, lifecycle_state: state };
    } else {
      db.prepare("UPDATE tool_versions SET lifecycle_state = ?, published_at = ? WHERE id = ?")
        .run(state, state === "published" ? now() : version.published_at, version.id);
    }
    db.prepare("UPDATE tools SET active = ?, runtime_status = ?, updated_at = ? WHERE id = ?")
      .run(state === "published" ? 1 : 0, state === "maintenance" ? "maintenance" : tool.runtime_status, now(), tool.id);
    richAudit({ request, actor: context.user, roles: context.roles, permission: "tools.manage", action: "admin.tool.lifecycle", targetType: "tool", targetId: tool.id, reason: String(data.reason), before: { state: version.lifecycle_state }, after: { state } });
    return json({ ok: true, state, version: version.version });
  }
  return null;
}

function commerce() {
  return {
    billingEnabled: process.env.BILLING_ENABLED === "true",
    providers: [
      { id: "stripe", configured: Boolean(process.env.STRIPE_SECRET_KEY), enabled: process.env.BILLING_ENABLED === "true" },
      { id: "alipay", configured: Boolean(process.env.ALIPAY_APP_ID), enabled: process.env.ALIPAY_ENABLED === "true" },
      { id: "wechat_pay", configured: Boolean(process.env.WECHAT_PAY_MCH_ID), enabled: process.env.WECHAT_PAY_ENABLED === "true" },
    ],
    plans: db.prepare("SELECT * FROM plans ORDER BY amount_minor").all(),
    subscriptions: db.prepare(`
      SELECT s.id, s.status, s.provider, s.current_period_end AS currentPeriodEnd,
        u.email, p.name_zh AS planNameZh, p.name_en AS planNameEn
      FROM subscriptions s JOIN users u ON u.id = s.user_id JOIN plans p ON p.id = s.plan_id
      ORDER BY s.created_at DESC LIMIT 100
    `).all(),
    invoices: db.prepare(`
      SELECT i.id, i.status, i.provider, i.amount_paid AS amountPaid, i.currency,
        i.created_at AS createdAt, u.email FROM invoices i JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC LIMIT 100
    `).all(),
    orders: db.prepare(`
      SELECT o.*, u.email FROM commercial_orders o JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC LIMIT 100
    `).all(),
    refunds: db.prepare("SELECT * FROM commercial_refunds ORDER BY created_at DESC LIMIT 100").all(),
    disputes: db.prepare("SELECT * FROM commercial_disputes ORDER BY created_at DESC LIMIT 100").all(),
    exceptions: db.prepare("SELECT * FROM reconciliation_exceptions ORDER BY created_at DESC LIMIT 100").all(),
    approvals: db.prepare(`
      SELECT a.*, requester.email AS requesterEmail, approver.email AS approverEmail
      FROM admin_approvals a JOIN users requester ON requester.id = a.requested_by
      LEFT JOIN users approver ON approver.id = a.approved_by
      ORDER BY a.created_at DESC LIMIT 100
    `).all().map((row) => ({ ...row, payload: parseJson(row.payload_json, {}), payload_json: undefined })),
  };
}

function operations() {
  return {
    modelRuntime: {
      alias: "OneShowModel",
      queuedJobs: db.prepare(`
        SELECT COUNT(*) AS count FROM execution_jobs WHERE status IN ('queued','retrying','running')
      `).get().count,
      failedJobs: db.prepare(`
        SELECT COUNT(*) AS count FROM execution_jobs WHERE status IN ('failed','quarantined')
      `).get().count,
      invocations24h: db.prepare(`
        SELECT COUNT(*) AS count FROM model_invocations WHERE started_at >= ?
      `).get(Date.now() - 86400000).count,
      failures24h: db.prepare(`
        SELECT COUNT(*) AS count FROM model_invocations WHERE started_at >= ? AND status = 'failed'
      `).get(Date.now() - 86400000).count,
      averageLatencyMs: Math.round(Number(db.prepare(`
        SELECT COALESCE(AVG(latency_ms), 0) AS value FROM model_invocations
        WHERE started_at >= ? AND status = 'completed'
      `).get(Date.now() - 86400000).value)),
    },
    jobs: db.prepare(`
      SELECT id, kind, target_type AS targetType, target_id AS targetId, status, attempts,
        max_attempts AS maxAttempts, next_attempt_at AS nextAttemptAt, correlation_id AS correlationId,
        error_code AS errorCode, created_at AS createdAt, updated_at AS updatedAt
      FROM operational_jobs ORDER BY created_at DESC LIMIT 100
    `).all(),
    alerts: db.prepare(`
      SELECT id, severity, kind, title, target_type AS targetType, target_id AS targetId,
        status, correlation_id AS correlationId, created_at AS createdAt, resolved_at AS resolvedAt
      FROM operational_alerts ORDER BY created_at DESC LIMIT 100
    `).all(),
    reconciliation: db.prepare(`
      SELECT id, kind, provider, target_type AS targetType, target_id AS targetId, severity,
        status, created_at AS createdAt, resolved_at AS resolvedAt
      FROM reconciliation_exceptions ORDER BY created_at DESC LIMIT 100
    `).all(),
  };
}

function commandCenter(request) {
  const base = overview(request);
  const heartbeat = db.prepare("SELECT * FROM observability_heartbeats WHERE collector = 'local'").get();
  const newest = Number(db.prepare("SELECT MAX(collected_at) AS value FROM metric_samples").get()?.value || 0);
  const freshnessMs = newest ? now() - newest : null;
  const toolUsage = db.prepare(`
    SELECT COUNT(*) AS executions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('failed','waiting_for_runtime') THEN 1 ELSE 0 END) AS failed
    FROM tasks WHERE created_at >= ?
  `).get(now() - base.windowDays * 86400000);
  return {
    ...base,
    meta: {
      window: `${base.windowDays}d`,
      comparisonWindow: `previous_${base.windowDays}d`,
      timezone: process.env.ADMIN_TIMEZONE || "Asia/Shanghai",
      currency: process.env.ADMIN_REPORTING_CURRENCY || "USD",
      generatedAt: now(),
      newestMetricAt: newest || null,
      freshnessMs,
      monitoringStatus: !heartbeat ? "not_reporting" : freshnessMs > 180000 ? "stale" : heartbeat.status,
      metricDefinition: "Persisted domain records and registered local infrastructure samples",
    },
    toolUsage: {
      executions: Number(toolUsage.executions || 0),
      completed: Number(toolUsage.completed || 0),
      failed: Number(toolUsage.failed || 0),
    },
    criticalAlerts: db.prepare(`
      SELECT id, severity, kind, title, target_type AS targetType, target_id AS targetId,
        status, created_at AS createdAt
      FROM operational_alerts WHERE status IN ('open','acknowledged')
      ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END, created_at DESC LIMIT 8
    `).all(),
  };
}

function creditLedger(request) {
  const { url, page, pageSize, offset } = parsePage(request, 100);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 100);
  const type = String(url.searchParams.get("type") || "").trim().slice(0, 40);
  const conditions = ["(u.email LIKE ? OR l.user_id LIKE ? OR l.reference_id LIKE ?)"];
  const params = [`%${query}%`, `%${query}%`, `%${query}%`];
  if (type) { conditions.push("l.type = ?"); params.push(type); }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const total = Number(db.prepare(`
    SELECT COUNT(*) AS count FROM credit_ledger l JOIN users u ON u.id = l.user_id ${where}
  `).get(...params).count);
  const entries = db.prepare(`
    SELECT l.id, l.user_id AS userId, u.email, l.type, l.amount,
      l.description_zh AS descriptionZh, l.description_en AS descriptionEn,
      l.reference_type AS referenceType, l.reference_id AS referenceId,
      l.created_at AS createdAt, m.reason_code AS reasonCode, m.operator_note AS operatorNote,
      m.balance_before AS balanceBefore, m.balance_after AS balanceAfter,
      m.correlation_id AS correlationId, m.original_ledger_id AS originalLedgerId,
      actor.email AS actorEmail
    FROM credit_ledger l JOIN users u ON u.id = l.user_id
    LEFT JOIN credit_ledger_metadata m ON m.ledger_id = l.id
    LEFT JOIN users actor ON actor.id = m.actor_user_id
    ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);
  const invariants = {
    duplicateReferences: Number(db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT type, reference_type, reference_id FROM credit_ledger
        GROUP BY type, reference_type, reference_id HAVING COUNT(*) > 1
      )
    `).get().count),
    negativeBalances: Number(db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT user_id, SUM(amount) AS balance FROM credit_ledger
        GROUP BY user_id HAVING balance < 0
      )
    `).get().count),
  };
  return {
    entries, page, pageSize, total, pages: Math.ceil(total / pageSize),
    totals: {
      balance: Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS value FROM credit_ledger").get().value),
      grants: Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS value FROM credit_ledger WHERE amount > 0").get().value),
      consumed: Math.abs(Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS value FROM credit_ledger WHERE amount < 0").get().value)),
    },
    invariants,
    generatedAt: now(),
  };
}

function seedFinanceAccounts() {
  const accounts = [
    ["fin_cash", "1000", "现金及渠道应收", "Cash & provider receivable", "asset"],
    ["fin_deferred", "2200", "递延收入", "Deferred revenue", "liability"],
    ["fin_revenue", "4000", "平台收入", "Platform revenue", "revenue"],
    ["fin_refunds", "4100", "退款及折让", "Refunds", "contra_revenue"],
    ["fin_fees", "5100", "支付渠道费用", "Provider fees", "expense"],
    ["fin_model_cost", "5200", "模型与工具成本", "Model & tool cost", "expense"],
    ["fin_control", "9999", "控制账户", "Control account", "control"],
  ];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO finance_accounts
    (id, code, name_zh, name_en, account_type, currency, version, active, created_at)
    VALUES (?, ?, ?, ?, ?, 'USD', 1, 1, ?)
  `);
  for (const account of accounts) insert.run(...account, now());
}

function financeOverview() {
  seedFinanceAccounts();
  const journals = db.prepare(`
    SELECT j.id, j.entry_number AS entryNumber, j.status, j.currency, j.description,
      j.source_type AS sourceType, j.source_id AS sourceId, j.created_at AS createdAt,
      j.posted_at AS postedAt,
      COALESCE(SUM(p.debit_minor),0) AS debitMinor,
      COALESCE(SUM(p.credit_minor),0) AS creditMinor
    FROM finance_journal_entries j LEFT JOIN finance_postings p ON p.journal_id = j.id
    GROUP BY j.id ORDER BY j.created_at DESC LIMIT 100
  `).all();
  return {
    moduleNotice: "internal_operational_subledger",
    currency: process.env.ADMIN_REPORTING_CURRENCY || "USD",
    accounts: db.prepare(`
      SELECT id, code, name_zh AS nameZh, name_en AS nameEn, account_type AS accountType,
        currency, version, active FROM finance_accounts ORDER BY code
    `).all().map((row) => ({ ...row, active: Boolean(row.active) })),
    journals,
    periods: db.prepare(`
      SELECT id, code, starts_at AS startsAt, ends_at AS endsAt, status,
        closed_at AS closedAt FROM finance_periods ORDER BY starts_at DESC LIMIT 24
    `).all(),
    reconciliation: db.prepare(`
      SELECT id, kind, status, checked_count AS checkedCount, exception_count AS exceptionCount,
        calculation_version AS calculationVersion, started_at AS startedAt,
        completed_at AS completedAt FROM finance_reconciliation_runs
      ORDER BY started_at DESC LIMIT 30
    `).all(),
    exceptions: db.prepare(`
      SELECT id, kind, target_type AS targetType, target_id AS targetId, severity, status,
        created_at AS createdAt FROM reconciliation_exceptions
      ORDER BY created_at DESC LIMIT 100
    `).all(),
  };
}

function toolAnalytics(request) {
  const { url } = parsePage(request);
  const days = [1, 7, 30, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days")) : 30;
  const since = now() - days * 86400000;
  const tools = db.prepare(`
    SELECT tools.id, tools.slug, tools.name_zh AS nameZh, tools.name_en AS nameEn,
      tools.runtime_kind AS runtimeKind, tools.runtime_status AS runtimeStatus,
      COUNT(t.id) AS executions,
      COUNT(DISTINCT t.user_id) AS uniqueUsers,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN t.status IN ('failed','waiting_for_runtime') THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.credit_cost ELSE 0 END),0) AS creditsConsumed,
      MAX(t.created_at) AS lastEventAt
    FROM tools LEFT JOIN tasks t ON t.tool_id = tools.id AND t.created_at >= ?
    GROUP BY tools.id ORDER BY executions DESC, tools.name_en
  `).all(since).map((row) => {
    const executions = Number(row.executions || 0);
    return {
      ...row,
      executions,
      uniqueUsers: Number(row.uniqueUsers || 0),
      completed: Number(row.completed || 0),
      failed: Number(row.failed || 0),
      cancelled: Number(row.cancelled || 0),
      creditsConsumed: Number(row.creditsConsumed || 0),
      successRate: executions ? Number(row.completed || 0) / executions : null,
      reportingStatus: row.lastEventAt ? (now() - row.lastEventAt > 7 * 86400000 ? "stale" : "reporting") : "not_reporting",
      costStatus: "unavailable",
    };
  });
  return {
    tools,
    meta: {
      windowDays: days,
      timezone: process.env.ADMIN_TIMEZONE || "Asia/Shanghai",
      generatedAt: now(),
      definition: "Persisted task lifecycle records; customer content excluded",
    },
  };
}

function infrastructureOverview() {
  collectSystemMetrics();
  const definitions = db.prepare(`
    SELECT name, label_zh AS labelZh, label_en AS labelEn, unit, warning_threshold AS warningThreshold,
      critical_threshold AS criticalThreshold, freshness_ms AS freshnessMs FROM metric_definitions
    ORDER BY name
  `).all();
  const metrics = definitions.map((definition) => {
    const sample = db.prepare(`
      SELECT value, collected_at AS collectedAt FROM metric_samples
      WHERE metric_name = ? ORDER BY collected_at DESC LIMIT 1
    `).get(definition.name);
    const age = sample ? now() - sample.collectedAt : null;
    let status = "not_reporting";
    if (sample) {
      if (age > definition.freshnessMs) status = "stale";
      else if (definition.criticalThreshold != null && sample.value >= definition.criticalThreshold) status = "critical";
      else if (definition.warningThreshold != null && sample.value >= definition.warningThreshold) status = "warning";
      else status = "healthy";
    }
    return { ...definition, value: sample?.value ?? null, collectedAt: sample?.collectedAt || null, status };
  });
  return {
    metrics,
    heartbeat: db.prepare(`
      SELECT collector, status, error_code AS errorCode, collected_at AS collectedAt
      FROM observability_heartbeats WHERE collector = 'local'
    `).get() || null,
    alerts: db.prepare(`
      SELECT id, severity, kind, title, target_type AS targetType, target_id AS targetId,
        status, details_json AS detailsJson, created_at AS createdAt, resolved_at AS resolvedAt
      FROM operational_alerts WHERE kind LIKE 'metric:%'
      ORDER BY created_at DESC LIMIT 100
    `).all().map((row) => ({ ...row, details: parseJson(row.detailsJson, {}), detailsJson: undefined })),
    retention: { rawSamplesDays: 7, fiveMinuteDays: 30, hourlyMonths: 13 },
    externalExport: process.env.EXTERNAL_METRICS_EXPORT_ENABLED === "true" ? "enabled" : "disabled",
  };
}

function privacy() {
  return {
    deletions: db.prepare(`
      SELECT d.id, d.status, d.execute_after AS executeAfter, d.created_at AS createdAt,
        d.cancelled_at AS cancelledAt, u.id AS userId, u.email,
        (SELECT COUNT(*) FROM legal_holds h WHERE h.user_id = u.id AND h.status = 'active') AS activeHolds
      FROM deletion_requests d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 100
    `).all(),
    exports: db.prepare(`
      SELECT e.id, e.status, e.expires_at AS expiresAt, e.created_at AS createdAt,
        u.id AS userId, u.email FROM export_jobs e JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC LIMIT 100
    `).all(),
    policies: db.prepare(`
      SELECT id, kind, version, locale, title, url, effective_at AS effectiveAt,
        active, created_at AS createdAt FROM policy_versions ORDER BY effective_at DESC
    `).all().map((row) => ({ ...row, active: Boolean(row.active) })),
    holds: db.prepare(`
      SELECT h.id, h.reason, h.status, h.review_at AS reviewAt, h.created_at AS createdAt,
        h.released_at AS releasedAt, u.email FROM legal_holds h JOIN users u ON u.id = h.user_id
      ORDER BY h.created_at DESC LIMIT 100
    `).all(),
  };
}

function administrators() {
  return {
    administrators: db.prepare(`
      SELECT m.user_id AS userId, m.status, m.mfa_required AS mfaRequired, m.version,
        m.created_at AS createdAt, u.name, u.email,
        GROUP_CONCAT(r.code) AS roleCodes,
        EXISTS(SELECT 1 FROM admin_mfa_factors f WHERE f.user_id = m.user_id AND f.active = 1) AS mfaEnrolled
      FROM admin_memberships m JOIN users u ON u.id = m.user_id
      LEFT JOIN admin_membership_roles mr ON mr.user_id = m.user_id
      LEFT JOIN admin_roles r ON r.id = mr.role_id
      GROUP BY m.user_id ORDER BY m.created_at
    `).all().map((row) => ({
      ...row, mfaRequired: Boolean(row.mfaRequired), mfaEnrolled: Boolean(row.mfaEnrolled),
      roles: row.roleCodes ? row.roleCodes.split(",") : [], roleCodes: undefined,
    })),
    roles: db.prepare(`
      SELECT r.id, r.code, r.name_zh AS nameZh, r.name_en AS nameEn,
        GROUP_CONCAT(rp.permission_code) AS permissionCodes
      FROM admin_roles r LEFT JOIN admin_role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id ORDER BY r.code
    `).all().map((row) => ({ ...row, permissions: row.permissionCodes ? row.permissionCodes.split(",") : [], permissionCodes: undefined })),
  };
}

function soleActiveSuperAdministrator(userId) {
  const target = db.prepare(`
    SELECT 1
    FROM admin_memberships m
    JOIN admin_membership_roles mr ON mr.user_id = m.user_id
    JOIN admin_roles r ON r.id = mr.role_id
    WHERE m.user_id = ? AND m.status = 'active' AND r.code = 'super_admin'
  `).get(userId);
  if (!target) return false;
  const count = Number(db.prepare(`
    SELECT COUNT(DISTINCT m.user_id) AS count
    FROM admin_memberships m
    JOIN admin_membership_roles mr ON mr.user_id = m.user_id
    JOIN admin_roles r ON r.id = mr.role_id
    WHERE m.status = 'active' AND r.code = 'super_admin'
  `).get().count);
  return count <= 1;
}

function assignAdministratorRole(targetId, roleId, actorId, timestamp) {
  db.prepare("DELETE FROM admin_membership_roles WHERE user_id = ?").run(targetId);
  db.prepare(`
    INSERT INTO admin_membership_roles (user_id, role_id, assigned_by, assigned_at)
    VALUES (?, ?, ?, ?)
  `).run(targetId, roleId, actorId, timestamp);
  db.prepare("UPDATE admin_memberships SET version = version + 1, updated_at = ? WHERE user_id = ?")
    .run(timestamp, targetId);
  db.prepare("DELETE FROM admin_auth_sessions WHERE user_id = ?").run(targetId);
}

async function adminCommands(request, path, context) {
  let match = path.match(/^\/api\/admin\/v1\/alerts\/([^/]+)\/(acknowledge|resolve)$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "alerts.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const note = String(data.note || "").trim().slice(0, 500);
    if (!note) return fail("REASON_REQUIRED");
    const alert = db.prepare("SELECT * FROM operational_alerts WHERE id = ?").get(match[1]);
    if (!alert) return fail("ALERT_NOT_FOUND", 404);
    const action = match[2];
    if (action === "acknowledge") {
      db.prepare(`
        UPDATE operational_alerts SET status = 'acknowledged', acknowledged_by = ?
        WHERE id = ? AND status = 'open'
      `).run(context.user.id, alert.id);
    } else {
      db.prepare(`
        UPDATE operational_alerts SET status = 'resolved', resolved_at = ?
        WHERE id = ? AND status IN ('open','acknowledged')
      `).run(now(), alert.id);
    }
    richAudit({
      request, actor: context.user, roles: context.roles, permission: "alerts.manage",
      action: `admin.alert.${action}`, targetType: "alert", targetId: alert.id, reason: note,
      before: { status: alert.status }, after: { status: action === "acknowledge" ? "acknowledged" : "resolved" },
    });
    return json({ ok: true });
  }
  if (path === "/api/admin/v1/administrators" && request.method === "POST") {
    const denied = requirePermission(context, "admins.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const email = String(data.email || "").trim().toLowerCase();
    const reason = String(data.reason || "").trim();
    const role = db.prepare("SELECT id, code FROM admin_roles WHERE code = ?").get(String(data.role || ""));
    if (!email || !role || !reason) return fail("INVALID_ADMIN_CREATE");
    const target = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email);
    if (!target) return fail("ADMIN_ACCOUNT_NOT_FOUND", 404);
    if (!target.email_verified) return fail("ADMIN_EMAIL_NOT_VERIFIED", 409);
    if (target.status !== "active") return fail("ADMIN_ACCOUNT_INACTIVE", 409);
    if (db.prepare("SELECT 1 FROM admin_memberships WHERE user_id = ?").get(target.id)) {
      return fail("ADMIN_ALREADY_EXISTS", 409);
    }
    const timestamp = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT INTO admin_memberships
        (user_id, status, mfa_required, version, created_by, created_at, updated_at)
        VALUES (?, 'active', 1, 1, ?, ?, ?)
      `).run(target.id, context.user.id, timestamp, timestamp);
      db.prepare(`
        INSERT INTO admin_membership_roles (user_id, role_id, assigned_by, assigned_at)
        VALUES (?, ?, ?, ?)
      `).run(target.id, role.id, context.user.id, timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    richAudit({ request, actor: context.user, roles: context.roles, permission: "admins.manage", action: "admin.create", targetType: "administrator", targetId: target.id, reason, after: { email: target.email, role: role.code, status: "active" } });
    return json({ ok: true, administrator: { userId: target.id, email: target.email, role: role.code, status: "active" } }, 201);
  }
  match = path.match(/^\/api\/admin\/v1\/administrators\/([^/]+)\/role$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "admins.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const role = db.prepare("SELECT id, code FROM admin_roles WHERE code = ?").get(String(data.role || ""));
    const target = db.prepare("SELECT * FROM users WHERE id = ? AND email_verified = 1").get(match[1]);
    if (!role || !target || !String(data.reason || "").trim()) return fail("INVALID_ADMIN_ROLE_CHANGE");
    if (target.id === context.user.id) return fail("CANNOT_CHANGE_OWN_ADMIN_ROLE", 409);
    if (role.code !== "super_admin" && soleActiveSuperAdministrator(target.id)) {
      return fail("LAST_SUPER_ADMIN_REQUIRED", 409);
    }
    const timestamp = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT OR IGNORE INTO admin_memberships
        (user_id, status, mfa_required, version, created_by, created_at, updated_at)
        VALUES (?, 'active', 1, 1, ?, ?, ?)
      `).run(target.id, context.user.id, timestamp, timestamp);
      assignAdministratorRole(target.id, role.id, context.user.id, timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    richAudit({ request, actor: context.user, roles: context.roles, permission: "admins.manage", action: "admin.role.assign", targetType: "administrator", targetId: target.id, reason: String(data.reason), after: { role: role.code } });
    return json({ ok: true });
  }
  match = path.match(/^\/api\/admin\/v1\/administrators\/([^/]+)\/status$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "admins.manage"); if (denied) return denied;
    const data = await parseBody(request);
    const status = String(data.status || "");
    const reason = String(data.reason || "").trim();
    const membership = db.prepare("SELECT * FROM admin_memberships WHERE user_id = ?").get(match[1]);
    if (!membership) return fail("ADMIN_NOT_FOUND", 404);
    if (!["active", "suspended"].includes(status) || !reason) return fail("INVALID_ADMIN_STATUS");
    if (match[1] === context.user.id) return fail("CANNOT_CHANGE_OWN_ADMIN_STATUS", 409);
    if (status === "suspended" && soleActiveSuperAdministrator(match[1])) {
      return fail("LAST_SUPER_ADMIN_REQUIRED", 409);
    }
    const timestamp = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        UPDATE admin_memberships SET status = ?, version = version + 1, updated_at = ?
        WHERE user_id = ?
      `).run(status, timestamp, match[1]);
      if (status === "suspended") {
        db.prepare("DELETE FROM admin_auth_sessions WHERE user_id = ?").run(match[1]);
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(match[1]);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    richAudit({ request, actor: context.user, roles: context.roles, permission: "admins.manage", action: `admin.status.${status}`, targetType: "administrator", targetId: match[1], reason, before: { status: membership.status }, after: { status } });
    return json({ ok: true, status });
  }
  match = path.match(/^\/api\/admin\/v1\/jobs\/([^/]+)\/retry$/);
  if (match && request.method === "POST") {
    const denied = requirePermission(context, "jobs.manage"); if (denied) return denied;
    const data = await parseBody(request);
    if (!String(data.reason || "").trim()) return fail("REASON_REQUIRED");
    const result = db.prepare(`
      UPDATE operational_jobs SET status = 'queued', next_attempt_at = ?, lease_until = NULL,
        error_code = NULL, updated_at = ? WHERE id = ? AND status IN ('failed','quarantined','retrying')
    `).run(now(), now(), match[1]);
    if (!result.changes) return fail("JOB_NOT_RETRYABLE", 409);
    richAudit({ request, actor: context.user, roles: context.roles, permission: "jobs.manage", action: "admin.job.retry", targetType: "job", targetId: match[1], reason: String(data.reason) });
    return json({ ok: true });
  }
  return null;
}

function listAudit(request) {
  const { url, page, pageSize, offset } = parsePage(request);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 100);
  const params = [`%${query}%`, `%${query}%`, `%${query}%`];
  const where = "WHERE (a.action LIKE ? OR a.actor_email LIKE ? OR a.target_id LIKE ?)";
  const total = Number(db.prepare(`SELECT COUNT(*) AS count FROM admin_audit_events a ${where}`).get(...params).count);
  const events = db.prepare(`
    SELECT id, actor_email AS actorEmail, role_codes AS roleCodes, permission, action,
      target_type AS targetType, target_id AS targetId, reason, correlation_id AS correlationId,
      before_json AS beforeJson, after_json AS afterJson, approval_id AS approvalId, result,
      created_at AS createdAt FROM admin_audit_events a ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset).map((row) => ({
    ...row, roles: parseJson(row.roleCodes, []), before: parseJson(row.beforeJson), after: parseJson(row.afterJson),
    roleCodes: undefined, beforeJson: undefined, afterJson: undefined,
  }));
  return { events, page, pageSize, total, pages: Math.ceil(total / pageSize) };
}

export function createAdminHandler(dependencies) {
  return async function handleAdminV1(request, path) {
    const context = getAdminContext(request, dependencies);
    if (context.response) return context.response;

    if (path === "/api/admin/v1/session" && request.method === "GET") return json(adminSessionPayload(context));
    const mfaResponse = await handleMfa(request, path, context);
    if (mfaResponse) return mfaResponse;
    const blocked = requireAdminMfa(context);
    if (blocked) return blocked;

    if (path === "/api/admin/v1/overview" && request.method === "GET") {
      const denied = requirePermission(context, "dashboard.read"); if (denied) return denied;
      return json(overview(request));
    }
    if (path === "/api/admin/v1/command-center" && request.method === "GET") {
      const denied = requirePermission(context, "dashboard.read"); if (denied) return denied;
      return json(commandCenter(request));
    }
    if (path === "/api/admin/v1/credits/ledger" && request.method === "GET") {
      const denied = requirePermission(context, "credits.read"); if (denied) return denied;
      return json(creditLedger(request));
    }
    if (path === "/api/admin/v1/finance" && request.method === "GET") {
      const denied = requirePermission(context, "finance.read"); if (denied) return denied;
      return json(financeOverview());
    }
    if (path === "/api/admin/v1/analytics/tools" && request.method === "GET") {
      const denied = requirePermission(context, "analytics.read"); if (denied) return denied;
      return json(toolAnalytics(request));
    }
    if (path === "/api/admin/v1/market-intelligence" && request.method === "GET") {
      const denied = requirePermission(context, "intelligence.read"); if (denied) return denied;
      const reportDate = String(new URL(request.url).searchParams.get("date") || "").trim();
      const report = getMarketIntelligenceReport(reportDate || null);
      return json({
        agent: marketIntelligenceStatus(),
        report,
        conversation: getMarketIntelligenceConversation(report?.id, context.user.id),
        history: listMarketIntelligenceReports(30),
      });
    }
    if (path === "/api/admin/v1/market-intelligence/run" && request.method === "POST") {
      const denied = requirePermission(context, "intelligence.manage"); if (denied) return denied;
      try {
        const report = await generateMarketIntelligenceReport({ triggerKind: "manual", actorUserId: context.user.id });
        richAudit({ request, actor: context.user, roles: context.roles, permission: "intelligence.manage", action: "admin.market_intelligence.run", targetType: "market_report", targetId: report.id });
        return json({ report }, 201);
      } catch (error) {
        return fail(error?.code || "MARKET_REPORT_FAILED", error?.status || 502);
      }
    }
    if (path === "/api/admin/v1/market-intelligence/chat" && request.method === "POST") {
      const denied = requirePermission(context, "intelligence.manage"); if (denied) return denied;
      const data = await parseBody(request);
      try {
        const conversation = await askMarketIntelligence({ reportId: String(data.reportId || ""), actorUserId: context.user.id, question: data.question });
        richAudit({ request, actor: context.user, roles: context.roles, permission: "intelligence.manage", action: "admin.market_intelligence.chat", targetType: "market_report", targetId: data.reportId });
        return json({ conversation }, 201);
      } catch (error) { return fail(error?.code || "MARKET_CHAT_FAILED", error?.status || 502); }
    }
    if (path === "/api/admin/v1/platform-models" && request.method === "GET") {
      const denied = requirePermission(context, "models.read"); if (denied) return denied;
      return json({ models: listPlatformModelConfigurations(), storage: objectStorageStatus() });
    }
    if (path === "/api/admin/v1/seo-provider" && request.method === "GET") {
      const denied = requirePermission(context, "seo_sources.read"); if (denied) return denied;
      return json({
        configuration: seoProviderConfiguration(),
        capabilities: { keywordMetrics: 2, liveSerp: 2, backlinks: 6, competitors: 3, total: 13 },
        environmentFallback: Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
        ipWhitelist: { enabledByProvider: null, serverIp: process.env.OUTBOUND_PUBLIC_IP || null },
      });
    }
    if (path === "/api/admin/v1/music-provider" && request.method === "GET") {
      const denied = requirePermission(context, "models.read"); if (denied) return denied;
      return json({ configuration: musicProviderConfiguration() });
    }
    if (path === "/api/admin/v1/music-provider/test" && request.method === "POST") {
      const denied = requirePermission(context, "models.manage"); if (denied) return denied;
      try {
        const result = await testMusicProviderConfiguration(await parseBody(request));
        richAudit({ request, actor: context.user, roles: context.roles, permission: "models.manage", action: "admin.music_provider.test", targetType: "music_provider", targetId: "minimax", after: result });
        return json(result);
      } catch (error) { return fail(error?.code || "MUSIC_PROVIDER_TEST_FAILED", error?.status || 502); }
    }
    if (path === "/api/admin/v1/music-provider" && request.method === "PUT") {
      const denied = requirePermission(context, "models.manage"); if (denied) return denied;
      const data = await parseBody(request);
      if (!String(data.reason || "").trim()) return fail("REASON_REQUIRED");
      try {
        const before = musicProviderConfiguration();
        const configuration = await saveMusicProviderConfiguration(data, context.user.id);
        richAudit({ request, actor: context.user, roles: context.roles, permission: "models.manage", action: "admin.music_provider.update", targetType: "music_provider", targetId: "minimax", reason: String(data.reason), before, after: configuration });
        return json({ configuration });
      } catch (error) { return fail(error?.code || "MUSIC_PROVIDER_UPDATE_FAILED", error?.status || 502); }
    }
    if (path === "/api/admin/v1/seo-provider/test" && request.method === "POST") {
      const denied = requirePermission(context, "seo_sources.manage"); if (denied) return denied;
      try {
        const result = await testSeoProviderConfiguration(await parseBody(request));
        richAudit({ request, actor: context.user, roles: context.roles, permission: "seo_sources.manage", action: "admin.seo_provider.test", targetType: "seo_provider", targetId: "dataforseo", after: result });
        return json(result);
      } catch (error) { return fail(error?.code || "SEO_PROVIDER_TEST_FAILED", error?.status || 502); }
    }
    if (path === "/api/admin/v1/seo-provider" && request.method === "PUT") {
      const denied = requirePermission(context, "seo_sources.manage"); if (denied) return denied;
      const data = await parseBody(request);
      if (!String(data.reason || "").trim()) return fail("REASON_REQUIRED");
      try {
        const before = seoProviderConfiguration();
        const configuration = await saveSeoProviderConfiguration(data, context.user.id);
        richAudit({ request, actor: context.user, roles: context.roles, permission: "seo_sources.manage", action: "admin.seo_provider.update", targetType: "seo_provider", targetId: "dataforseo", reason: String(data.reason), before, after: configuration });
        return json({ configuration });
      } catch (error) { return fail(error?.code || "SEO_PROVIDER_UPDATE_FAILED", error?.status || 502); }
    }
    let modelMatch = path.match(/^\/api\/admin\/v1\/platform-models\/([^/]+)\/(test)$/);
    if (modelMatch && request.method === "POST") {
      const denied = requirePermission(context, "models.manage"); if (denied) return denied;
      try {
        const result = await testPlatformModelConfiguration(modelMatch[1], await parseBody(request));
        richAudit({ request, actor: context.user, roles: context.roles, permission: "models.manage", action: "admin.platform_model.test", targetType: "platform_model", targetId: modelMatch[1], after: result });
        return json(result);
      } catch (error) { return fail(error?.code || "PLATFORM_MODEL_TEST_FAILED", error?.status || 502); }
    }
    modelMatch = path.match(/^\/api\/admin\/v1\/platform-models\/([^/]+)$/);
    if (modelMatch && request.method === "PUT") {
      const denied = requirePermission(context, "models.manage"); if (denied) return denied;
      const data = await parseBody(request);
      if (!String(data.reason || "").trim()) return fail("REASON_REQUIRED");
      try {
        const before = listPlatformModelConfigurations().find((item) => item.purpose === modelMatch[1]);
        const model = await savePlatformModelConfiguration(modelMatch[1], data, context.user.id);
        richAudit({ request, actor: context.user, roles: context.roles, permission: "models.manage", action: "admin.platform_model.update", targetType: "platform_model", targetId: modelMatch[1], reason: String(data.reason), before, after: model });
        return json({ model });
      } catch (error) { return fail(error?.code || "PLATFORM_MODEL_UPDATE_FAILED", error?.status || 502); }
    }
    if (path === "/api/admin/v1/infrastructure/overview" && request.method === "GET") {
      const denied = requirePermission(context, "infrastructure.read"); if (denied) return denied;
      return json(infrastructureOverview());
    }
    if (path === "/api/admin/v1/users" && request.method === "GET") {
      const denied = requirePermission(context, "users.read"); if (denied) return denied;
      return json(listUsers(request));
    }
    const detailMatch = path.match(/^\/api\/admin\/v1\/users\/([^/]+)$/);
    if (detailMatch && request.method === "GET") {
      const denied = requirePermission(context, "users.read"); if (denied) return denied;
      const detail = customerDetail(detailMatch[1]);
      if (!detail) return fail("USER_NOT_FOUND", 404);
      richAudit({ request, actor: context.user, roles: context.roles, permission: "users.read", action: "admin.user.read", targetType: "user", targetId: detailMatch[1] });
      return json(detail);
    }
    if (path === "/api/admin/v1/tasks" && request.method === "GET") {
      const denied = requirePermission(context, "users.read"); if (denied) return denied;
      return json({ tasks: db.prepare(`
        SELECT t.id, t.status, t.credit_cost AS creditCost, t.created_at AS createdAt,
          u.email, u.name, tools.name_zh AS toolNameZh, tools.name_en AS toolNameEn
        FROM tasks t JOIN users u ON u.id = t.user_id JOIN tools ON tools.id = t.tool_id
        ORDER BY t.created_at DESC LIMIT 200
      `).all() });
    }
    if (path === "/api/admin/v1/tools" && request.method === "GET") {
      const denied = requirePermission(context, "tools.read"); if (denied) return denied;
      return json({ tools: listTools() });
    }
    if (path === "/api/admin/v1/commerce" && request.method === "GET") {
      const denied = requirePermission(context, "billing.read"); if (denied) return denied;
      return json(commerce());
    }
    if (path === "/api/admin/v1/operations" && request.method === "GET") {
      const denied = requirePermission(context, "jobs.read"); if (denied) return denied;
      return json(operations());
    }
    if (path === "/api/admin/v1/privacy" && request.method === "GET") {
      const denied = requirePermission(context, "privacy.read"); if (denied) return denied;
      return json(privacy());
    }
    if (path === "/api/admin/v1/administrators" && request.method === "GET") {
      const denied = requirePermission(context, "admins.manage"); if (denied) return denied;
      return json(administrators());
    }
    if (path === "/api/admin/v1/audit" && request.method === "GET") {
      const denied = requirePermission(context, "audit.read"); if (denied) return denied;
      return json(listAudit(request));
    }

    const responses = [
      await customerCommands(request, path, context, dependencies),
      await approveAction(request, path, context),
      await toolCommands(request, path, context),
      await adminCommands(request, path, context),
    ];
    const response = responses.find(Boolean);
    return response || fail("NOT_FOUND", 404);
  };
}
