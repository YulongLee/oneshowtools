import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { basename } from "node:path";
import sharp from "sharp";
import { audit, db } from "./database.mjs";
import { deleteStoredFile, putStoredFile, readStoredFile } from "./object-storage.mjs";
import { assertUserFileCapacity, userFileQuota } from "./file-quota.mjs";
import { getServerConfig, validateServerConfig } from "./config.mjs";
import { sendAccountEmail } from "./email.mjs";
import {
  createSmsCodeRecord,
  generateSmsCode,
  normalizeMainlandPhone,
  phoneIdentityHash,
  sendLoginCode,
  verifySmsCodeHash,
} from "./sms-provider.mjs";
import {
  createSessionToken,
  hashPassword,
  hashToken,
  requestClient,
  requestClientKind,
  requestSessionToken,
  sameOrigin,
  sessionCookie,
  verifyPassword,
} from "./security.mjs";
import { refundTask } from "./runtime.mjs";
import { runToolAction } from "./tool-actions.mjs";
import { writingCatalog } from "./writing-engine.mjs";
import { seoCatalog } from "./seo-engine.mjs";
import { handleSeoAgent } from "./seo-agent.mjs";
import {
  createMusicCover, createMusicGeneration, createMusicReference, deleteMusicTrack, listMusicTracks, musicStudioStatus,
} from "./music-studio.mjs";
import {
  enrollSingingVoice, handleSingingProviderCallback, listSingingVoices, removeSingingVoice, submitSingingCover,
} from "./singing-cover.mjs";
import { createAdminHandler } from "./admin.mjs";
import { recordMarketplaceBehavior, recordMarketplaceSearch } from "./market-intelligence.mjs";
import { cancelExecutionJob, enqueueTask, runNextJob } from "./jobs.mjs";
import { billingPlanPayload } from "./billing-catalog.mjs";
import {
  activePaymentProviders, createDomesticCheckout, domesticOrderStatus,
  handleAlipayNotification, handleWechatNotification,
} from "./domestic-payments.mjs";
import { effectiveMembership } from "./membership.mjs";
import { createAncestorTask } from "./ancestor-jobs.mjs";
import {
  askCustomerSupport, getUserSupportConversation, listUserSupportConversations, submitSupportTicket,
} from "./customer-support.mjs";
import {
  createModelConnection,
  deleteModelConnection,
  gatewayFlags,
  listToolModelPreferences,
  rotateModelCredential,
  runtimeSummary,
  setToolModelPreference,
  testModelConnection,
  toolModelSelection,
  updateModelConnection,
  validateModelConnection,
  invokePlatformModel,
} from "./model-gateway.mjs";

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const fail = (code, status = 400) => json({ error: { code } }, status);
const imageCache = new Map();
function cacheImage(key, buffer) {
  if (imageCache.size >= 64) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(key, buffer);
  return buffer;
}
async function optimizedImage(buffer, { width = 256, quality = 80 } = {}) {
  return sharp(buffer, { failOn: "none" }).rotate().resize(width, width, { fit: "inside", withoutEnlargement: true }).webp({ quality, alphaQuality: 86, effort: 4 }).toBuffer();
}

function internalServiceAuthorized(request) {
  const expected = String(process.env.ONESHOW_INTERNAL_SERVICE_TOKEN || "");
  const supplied = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 32 || supplied.length < 32) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}
const phoneOnlyEmail = (email) => String(email || "").endsWith("@phone.oneshowtools.invalid");
const wechatOnlyEmail = (email) => String(email || "").endsWith("@wechat.oneshowtools.invalid");
const cleanUser = (row) => {
  if (!row) return row;
  const phone = db.prepare("SELECT phone_last4 AS last4, country_code AS countryCode FROM user_phone_identities WHERE user_id = ?").get(row.id);
  const wechat = db.prepare("SELECT 1 AS linked FROM provider_accounts WHERE user_id = ? AND provider = 'wechat_miniprogram'").get(row.id);
  const syntheticEmail = phoneOnlyEmail(row.email) || wechatOnlyEmail(row.email);
  return {
    id: row.id,
    name: row.name,
    email: syntheticEmail ? null : row.email,
    phone: phone ? `${phone.countryCode} **** ${phone.last4}` : null,
    locale: row.locale,
    emailVerified: syntheticEmail ? false : Boolean(row.email_verified),
    phoneVerified: Boolean(phone),
    authMethods: [!syntheticEmail ? "email" : null, phone ? "sms" : null, wechat ? "wechat" : null].filter(Boolean),
    createdAt: row.created_at,
  };
};

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function securityEvent(request, action, result, userId = null, metadata = {}) {
  const client = requestClient(request);
  db.prepare(`
    INSERT INTO security_events
    (id, user_id, action, result, ip_hash, correlation_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    userId,
    action,
    result,
    client.ipHash,
    request.headers.get("x-correlation-id") || randomUUID(),
    JSON.stringify(metadata),
    Date.now(),
  );
}

function rateLimited(request, action, subject, maximum = 5, windowMs = 300000) {
  const { ipHash } = requestClient(request);
  const key = hashToken(`${action}:${String(subject || "").toLowerCase()}:${ipHash}`);
  const timestamp = Date.now();
  const existing = db.prepare("SELECT * FROM rate_limits WHERE key = ?").get(key);
  if (!existing || existing.window_started_at + windowMs <= timestamp) {
    db.prepare(`
      INSERT INTO rate_limits (key, window_started_at, attempts) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = 1
    `).run(key, timestamp);
    return false;
  }
  db.prepare("UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?").run(key);
  return existing.attempts >= maximum;
}

async function issueAccountToken(request, user, purpose, email = user.email) {
  const config = getServerConfig(request.url);
  const rawToken = createSessionToken();
  const timestamp = Date.now();
  db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL")
    .run(timestamp, user.id, purpose);
  db.prepare(`
    INSERT INTO auth_tokens
    (id, user_id, email, purpose, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), user.id, email, purpose, hashToken(rawToken), timestamp + 3600000, timestamp);
  const routes = {
    verify: `${config.appUrl}/api/auth/verify?token=${encodeURIComponent(rawToken)}`,
    reset: `${config.appUrl}/?resetToken=${encodeURIComponent(rawToken)}`,
    emailChange: `${config.appUrl}/api/auth/confirm-email?token=${encodeURIComponent(rawToken)}`,
  };
  await sendAccountEmail({
    to: email,
    locale: user.locale === "en" ? "en" : "zh-CN",
    kind: purpose,
    url: routes[purpose],
    config,
  });
}

function currentUser(request) {
  const token = requestSessionToken(request);
  if (!token) return null;
  return db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
  `).get(hashToken(token), Date.now()) || null;
}

function requireUser(request) {
  const user = currentUser(request);
  return user ? { user } : { response: fail("UNAUTHENTICATED", 401) };
}

function requireAdmin(request) {
  const auth = requireUser(request);
  if (auth.response) return auth;
  const allowed = new Set(String(process.env.ADMIN_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(auth.user.email.toLowerCase())) {
    securityEvent(request, "admin.access", "denied", auth.user.id);
    return { response: fail("ADMIN_FORBIDDEN", 403) };
  }
  return auth;
}

function balance(userId) {
  return Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId)?.balance || 0);
}

function deletionPending(userId) {
  return Boolean(db.prepare(`
    SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending'
  `).get(userId));
}

function accountVerified(user) {
  return Boolean(user?.email_verified || db.prepare("SELECT 1 AS verified FROM user_phone_identities WHERE user_id = ?").get(user?.id));
}

function toolSelect() {
  return `SELECT tools.id, tools.slug, tools.name_zh AS nameZh, tools.name_en AS nameEn,
    tools.description_zh AS descriptionZh, tools.description_en AS descriptionEn,
    tools.category, tools.icon, tools.credit_cost AS creditCost, tools.runtime_kind AS runtimeKind,
    tools.runtime_status AS runtimeStatus, tools.active,
    (SELECT accent_color FROM tool_branding WHERE tool_id = tools.id) AS iconColor,
    (SELECT background_color FROM tool_branding WHERE tool_id = tools.id) AS iconBackground,
    CASE WHEN (SELECT object_key FROM tool_branding WHERE tool_id = tools.id) IS NOT NULL
      THEN '/api/tools/' || tools.slug || '/icon?v=' ||
        (SELECT updated_at FROM tool_branding WHERE tool_id = tools.id)
      ELSE NULL END AS iconUrl
    FROM tools`;
}

function storefrontTools() {
  const specialists = new Map(seoCatalog().specialists.map((item) => [item.slug, item]));
  return db.prepare(`${toolSelect()} WHERE active = 1 ORDER BY name_en`).all().map((tool) => {
    const specialist = specialists.get(tool.slug);
    if (!specialist || specialist.ready) return tool;
    return { ...tool, runtimeStatus: "configuration_required" };
  });
}

function toolIsPublished(slug) {
  return Boolean(db.prepare("SELECT 1 AS published FROM tools WHERE slug = ? AND active = 1").get(slug));
}

function unpublishedToolResponse() {
  return fail("TOOL_NOT_PUBLISHED", 404);
}

async function handleAdmin(request, path) {
  const auth = requireAdmin(request);
  if (auth.response) return auth.response;
  const admin = auth.user;
  if (path === "/api/admin/overview" && request.method === "GET") {
    return json({
      metrics: {
        users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
        verifiedUsers: db.prepare("SELECT COUNT(*) AS count FROM users WHERE email_verified = 1").get().count,
        suspendedUsers: db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'suspended'").get().count,
        tasks: db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count,
        files: db.prepare("SELECT COUNT(*) AS count FROM files").get().count,
        credits: db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM credit_ledger").get().total,
      },
      admin: cleanUser(admin),
    });
  }
  if (path === "/api/admin/users" && request.method === "GET") {
    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") || "").trim().slice(0, 100);
    const status = String(url.searchParams.get("status") || "");
    const params = [`%${query}%`, `%${query}%`];
    let where = "WHERE (u.email LIKE ? OR u.name LIKE ?)";
    if (["active", "suspended"].includes(status)) {
      where += " AND u.status = ?";
      params.push(status);
    }
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.locale, u.email_verified AS emailVerified,
        u.status, u.created_at AS createdAt,
        COALESCE((SELECT SUM(amount) FROM credit_ledger WHERE user_id = u.id), 0) AS credits,
        (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS tasks,
        (SELECT COUNT(*) FROM files WHERE user_id = u.id) AS files
      FROM users u ${where} ORDER BY u.created_at DESC LIMIT 100
    `).all(...params).map((user) => ({ ...user, emailVerified: Boolean(user.emailVerified) }));
    return json({ users });
  }
  if (path === "/api/admin/tasks" && request.method === "GET") {
    return json({ tasks: db.prepare(`
      SELECT t.id, t.status, t.credit_cost AS creditCost, t.created_at AS createdAt,
        u.email, u.name, tools.name_zh AS toolNameZh, tools.name_en AS toolNameEn
      FROM tasks t JOIN users u ON u.id = t.user_id JOIN tools ON tools.id = t.tool_id
      ORDER BY t.created_at DESC LIMIT 100
    `).all() });
  }
  if (path === "/api/admin/audit" && request.method === "GET") {
    return json({ events: db.prepare(`
      SELECT a.id, a.action, a.target_type AS targetType, a.target_id AS targetId,
        a.metadata_json AS metadataJson, a.created_at AS createdAt, u.email AS actorEmail
      FROM audit_events a LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC LIMIT 100
    `).all() });
  }
  const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (statusMatch && request.method === "PATCH") {
    const targetId = statusMatch[1];
    const data = await body(request);
    const status = String(data.status || "");
    if (!["active", "suspended"].includes(status)) return fail("INVALID_STATUS");
    if (targetId === admin.id && status === "suspended") return fail("CANNOT_SUSPEND_SELF", 409);
    const result = db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, Date.now(), targetId);
    if (!result.changes) return fail("USER_NOT_FOUND", 404);
    if (status === "suspended") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(targetId);
    audit(admin.id, "admin.user.status", "user", targetId, { status });
    return json({ ok: true });
  }
  const creditMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/credits$/);
  if (creditMatch && request.method === "POST") {
    const targetId = creditMatch[1];
    const data = await body(request);
    const amount = Number(data.amount);
    const note = String(data.note || "").trim().slice(0, 160);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000 || !note) {
      return fail("INVALID_CREDIT_ADJUSTMENT");
    }
    if (!db.prepare("SELECT id FROM users WHERE id = ?").get(targetId)) return fail("USER_NOT_FOUND", 404);
    const id = randomUUID();
    db.prepare(`
      INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'admin_adjustment', ?, ?, ?, 'admin', ?, ?)
    `).run(id, targetId, amount, note, note, id, Date.now());
    audit(admin.id, "admin.credits.adjust", "user", targetId, { amount, note });
    return json({ ok: true, balance: balance(targetId) }, 201);
  }
  return fail("NOT_FOUND", 404);
}

async function register(request) {
  const config = getServerConfig(request.url);
  if (!config.registrationEnabled) return fail("REGISTRATION_UNAVAILABLE", 503);
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  const name = String(data.name || "").trim();
  const password = String(data.password || "");
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return fail("INVALID_EMAIL");
  if (password.length < 10 || password.length > 128) return fail("INVALID_PASSWORD");
  if (!name || name.length > 80) return fail("INVALID_NAME");
  if (rateLimited(request, "register", email)) {
    securityEvent(request, "auth.register", "rate_limited");
    return json({ ok: true, verificationRequired: true }, 202);
  }
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    const id = randomUUID();
    const timestamp = Date.now();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, locale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      email,
      await hashPassword(password),
      data.locale === "en" ? "en" : "zh-CN",
      timestamp,
      timestamp,
    );
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    audit(id, "user.register", "user", id);
  }
  if (!user.email_verified && user.status === "active") await issueAccountToken(request, user, "verify");
  securityEvent(request, "auth.register", "accepted", user.id);
  return json({ ok: true, verificationRequired: true }, 202);
}

function createLoginResponse(userId, request, status = 200) {
  const token = createSessionToken();
  const timestamp = Date.now();
  const client = requestClient(request);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(timestamp);
  db.prepare(`
    INSERT INTO sessions
    (id, user_id, token_hash, expires_at, created_at, last_seen_at, user_agent, ip_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    userId,
    hashToken(token),
    timestamp + 14 * 86400000,
    timestamp,
    timestamp,
    client.userAgent,
    client.ipHash,
  );
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const clientKind = requestClientKind(request);
  return json({
    user: cleanUser(user),
    ...(clientKind ? { accessToken: token, expiresAt: timestamp + 14 * 86400000 } : {}),
  }, status, { "set-cookie": sessionCookie(token) });
}

async function login(request) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  if (rateLimited(request, "login", email, 8, 60000)) {
    securityEvent(request, "auth.login", "rate_limited");
    return fail("INVALID_CREDENTIALS", 401);
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").get(email);
  if (!user || !(await verifyPassword(String(data.password || ""), user.password_hash))) {
    securityEvent(request, "auth.login", "denied", user?.id || null);
    return fail("INVALID_CREDENTIALS", 401);
  }
  if (!user.email_verified) {
    securityEvent(request, "auth.login", "email_unverified", user.id);
    return fail("EMAIL_UNVERIFIED", 403);
  }
  audit(user.id, "user.login", "user", user.id);
  securityEvent(request, "auth.login", "success", user.id);
  return createLoginResponse(user.id, request);
}

function smsLimits(phoneHash) {
  const timestamp = Date.now();
  const latest = db.prepare(`
    SELECT created_at AS createdAt FROM sms_verification_codes
    WHERE phone_hash = ? AND purpose = 'login' ORDER BY created_at DESC LIMIT 1
  `).get(phoneHash);
  const hour = db.prepare(`
    SELECT COUNT(*) AS count FROM sms_verification_codes
    WHERE phone_hash = ? AND purpose = 'login' AND created_at > ?
  `).get(phoneHash, timestamp - 3600000).count;
  const day = db.prepare(`
    SELECT COUNT(*) AS count FROM sms_verification_codes
    WHERE phone_hash = ? AND purpose = 'login' AND created_at > ?
  `).get(phoneHash, timestamp - 86400000).count;
  if (latest && timestamp - latest.createdAt < 60000) return { limited: true, retryAfter: Math.ceil((60000 - (timestamp - latest.createdAt)) / 1000) };
  if (hour >= 5 || day >= 10) return { limited: true, retryAfter: hour >= 5 ? 3600 : 86400 };
  return { limited: false, retryAfter: 0 };
}

async function sendSmsVerification(request) {
  const config = getServerConfig(request.url);
  if (!config.smsAuthEnabled) return fail("SMS_AUTH_UNAVAILABLE", 503);
  const data = await body(request);
  let phone;
  try { phone = normalizeMainlandPhone(data.phone); }
  catch (error) { return fail(error.code || "INVALID_PHONE", error.status || 400); }
  const phoneHash = phoneIdentityHash(phone);
  const limit = smsLimits(phoneHash);
  if (limit.limited || rateLimited(request, "sms-send", phoneHash, 10, 3600000)) {
    securityEvent(request, "auth.sms.send", "rate_limited", null, { retryAfter: limit.retryAfter });
    return json({ error: { code: "SMS_RATE_LIMITED", retryAfter: limit.retryAfter || 3600 } }, 429);
  }
  const code = generateSmsCode();
  const record = createSmsCodeRecord(phoneHash, code);
  let delivery;
  try { delivery = await sendLoginCode(phone, code); }
  catch (error) {
    securityEvent(request, "auth.sms.send", "provider_failed", null, { code: error.code || "SMS_SEND_FAILED" });
    return fail(error.code || "SMS_SEND_FAILED", error.status || 502);
  }
  const timestamp = Date.now();
  db.prepare("UPDATE sms_verification_codes SET consumed_at = ? WHERE phone_hash = ? AND purpose = 'login' AND consumed_at IS NULL")
    .run(timestamp, phoneHash);
  db.prepare(`
    INSERT INTO sms_verification_codes
    (id, phone_hash, purpose, code_hash, code_salt, attempts, max_attempts, expires_at, provider_request_id, ip_hash, created_at)
    VALUES (?, ?, 'login', ?, ?, 0, 5, ?, ?, ?, ?)
  `).run(
    randomUUID(), phoneHash, record.hash, record.salt,
    timestamp + Number(process.env.SMS_CODE_TTL_SECONDS || 300) * 1000,
    delivery.requestId, requestClient(request).ipHash, timestamp,
  );
  securityEvent(request, "auth.sms.send", "accepted");
  return json({ ok: true, expiresIn: Number(process.env.SMS_CODE_TTL_SECONDS || 300), retryAfter: 60 }, 202);
}

async function verifySmsLogin(request) {
  const config = getServerConfig(request.url);
  if (!config.smsAuthEnabled) return fail("SMS_AUTH_UNAVAILABLE", 503);
  const data = await body(request);
  let phone;
  try { phone = normalizeMainlandPhone(data.phone); }
  catch (error) { return fail(error.code || "INVALID_PHONE", error.status || 400); }
  const code = String(data.code || "").trim();
  if (!/^\d{6}$/.test(code)) return fail("INVALID_SMS_CODE", 400);
  const phoneHash = phoneIdentityHash(phone);
  if (rateLimited(request, "sms-verify", phoneHash, 10, 600000)) return fail("SMS_CODE_INVALID", 400);
  const verification = db.prepare(`
    SELECT * FROM sms_verification_codes
    WHERE phone_hash = ? AND purpose = 'login' AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(phoneHash);
  if (!verification || verification.expires_at <= Date.now() || verification.attempts >= verification.max_attempts) {
    securityEvent(request, "auth.sms.verify", verification?.expires_at <= Date.now() ? "expired" : "denied");
    return fail(verification?.expires_at <= Date.now() ? "SMS_CODE_EXPIRED" : "SMS_CODE_INVALID", 400);
  }
  db.prepare("UPDATE sms_verification_codes SET attempts = attempts + 1 WHERE id = ?").run(verification.id);
  if (!verifySmsCodeHash(phoneHash, code, verification.code_salt, verification.code_hash)) {
    securityEvent(request, "auth.sms.verify", "denied");
    return fail("SMS_CODE_INVALID", 400);
  }
  let identity = db.prepare(`
    SELECT p.*, u.status FROM user_phone_identities p JOIN users u ON u.id = p.user_id
    WHERE p.phone_hash = ?
  `).get(phoneHash);
  if (identity?.status !== undefined && identity.status !== "active") return fail("ACCOUNT_SUSPENDED", 403);
  let userId = identity?.user_id;
  const timestamp = Date.now();
  if (!userId) {
    const name = data.locale === "en" ? `User_${phone.last4}` : `用户_${phone.last4}`;
    userId = randomUUID();
    const internalEmail = `phone-${phoneHash.slice(0, 32)}@phone.oneshowtools.invalid`;
    const randomPassword = await hashPassword(randomBytes(32).toString("base64url"));
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, locale, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(userId, name, internalEmail, randomPassword, data.locale === "en" ? "en" : "zh-CN", timestamp, timestamp);
      db.prepare(`
        INSERT INTO user_phone_identities
        (user_id, phone_hash, phone_last4, country_code, verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, phoneHash, phone.last4, phone.countryCode, timestamp, timestamp, timestamp);
      db.prepare(`
        INSERT OR IGNORE INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'welcome', 200, '新用户欢迎积分', 'New account welcome credits', 'user', ?, ?)
      `).run(randomUUID(), userId, userId, timestamp);
      db.prepare("UPDATE sms_verification_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").run(timestamp, verification.id);
      db.exec("COMMIT");
      audit(userId, "user.register.sms", "user", userId);
    } catch (error) {
      db.exec("ROLLBACK");
      const raced = db.prepare("SELECT user_id FROM user_phone_identities WHERE phone_hash = ?").get(phoneHash);
      if (!raced) throw error;
      userId = raced.user_id;
      db.prepare("UPDATE sms_verification_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").run(timestamp, verification.id);
    }
  } else {
    db.prepare("UPDATE sms_verification_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").run(timestamp, verification.id);
  }
  audit(userId, "user.login.sms", "user", userId);
  securityEvent(request, "auth.sms.verify", "success", userId);
  return createLoginResponse(userId, request, identity ? 200 : 201);
}

async function verifyWechatMiniProgramLogin(request) {
  const config = getServerConfig(request.url);
  if (!config.wechatMiniProgramEnabled) return fail("WECHAT_MINIPROGRAM_UNAVAILABLE", 503);
  const data = await body(request);
  const code = String(data.code || "").trim();
  if (!/^[A-Za-z0-9_-]{4,160}$/.test(code)) return fail("INVALID_WECHAT_CODE", 400);
  if (rateLimited(request, "wechat-miniprogram-login", code, 8, 60000)) return fail("WECHAT_LOGIN_FAILED", 401);
  const endpoint = new URL("https://api.weixin.qq.com/sns/jscode2session");
  endpoint.searchParams.set("appid", process.env.WECHAT_MINIPROGRAM_APP_ID);
  endpoint.searchParams.set("secret", process.env.WECHAT_MINIPROGRAM_APP_SECRET);
  endpoint.searchParams.set("js_code", code);
  endpoint.searchParams.set("grant_type", "authorization_code");
  let payload;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
    payload = await response.json();
    if (!response.ok || payload.errcode || !payload.openid) throw new Error("WECHAT_CODE_EXCHANGE_FAILED");
  } catch {
    securityEvent(request, "auth.wechat_miniprogram", "provider_failed");
    return fail("WECHAT_LOGIN_FAILED", 502);
  }
  const providerId = String(payload.openid);
  let mapping = db.prepare(`
    SELECT p.user_id AS userId, u.status FROM provider_accounts p
    JOIN users u ON u.id = p.user_id
    WHERE p.provider = 'wechat_miniprogram' AND p.provider_account_id = ?
  `).get(providerId);
  if (mapping?.status && mapping.status !== "active") return fail("ACCOUNT_SUSPENDED", 403);
  let userId = mapping?.userId;
  const timestamp = Date.now();
  if (!userId) {
    userId = randomUUID();
    const identityHash = hashToken(providerId);
    const internalEmail = `wechat-${identityHash.slice(0, 32)}@wechat.oneshowtools.invalid`;
    const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, locale, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(userId, String(data.name || "微信用户").trim().slice(0, 80) || "微信用户", internalEmail,
        passwordHash, data.locale === "en" ? "en" : "zh-CN", timestamp, timestamp);
      db.prepare(`
        INSERT INTO provider_accounts
        (id, user_id, provider, provider_account_id, provider_email, created_at)
        VALUES (?, ?, 'wechat_miniprogram', ?, '', ?)
      `).run(randomUUID(), userId, providerId, timestamp);
      db.prepare(`
        INSERT INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'welcome', 200, '新用户欢迎积分', 'New account welcome credits', 'user', ?, ?)
      `).run(randomUUID(), userId, userId, timestamp);
      db.exec("COMMIT");
      audit(userId, "user.register.wechat_miniprogram", "user", userId);
    } catch (error) {
      db.exec("ROLLBACK");
      const raced = db.prepare(`SELECT user_id AS userId FROM provider_accounts
        WHERE provider = 'wechat_miniprogram' AND provider_account_id = ?`).get(providerId);
      if (!raced) throw error;
      userId = raced.userId;
    }
  }
  securityEvent(request, "auth.wechat_miniprogram", "success", userId);
  return createLoginResponse(userId, request, mapping ? 200 : 201);
}

function validToken(rawToken, purpose) {
  if (!rawToken) return null;
  return db.prepare(`
    SELECT t.*, u.locale, u.status FROM auth_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ? AND t.purpose = ? AND t.consumed_at IS NULL
      AND t.expires_at > ? AND u.status = 'active'
  `).get(hashToken(rawToken), purpose, Date.now()) || null;
}

async function verifyEmail(request) {
  const token = validToken(new URL(request.url).searchParams.get("token"), "verify");
  const config = getServerConfig(request.url);
  if (!token) return new Response(null, { status: 302, headers: { location: `${config.appUrl}/?auth=verification-invalid` } });
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const consumed = db.prepare(`
      UPDATE auth_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL
    `).run(timestamp, token.id);
    if (!consumed.changes) throw new Error("TOKEN_ALREADY_USED");
    db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(timestamp, token.user_id);
    db.prepare(`
      INSERT OR IGNORE INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'welcome', 200, '新用户欢迎积分', 'New account welcome credits', 'user', ?, ?)
    `).run(randomUUID(), token.user_id, token.user_id, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  securityEvent(request, "auth.verify", "success", token.user_id);
  return new Response(null, { status: 302, headers: { location: `${config.appUrl}/?auth=verified` } });
}

async function resendVerification(request) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  if (rateLimited(request, "verify-resend", email)) return json({ ok: true }, 202);
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").get(email);
  if (user && !user.email_verified && getServerConfig(request.url).registrationEnabled) {
    await issueAccountToken(request, user, "verify");
  }
  securityEvent(request, "auth.verify.resend", "accepted", user?.id || null);
  return json({ ok: true }, 202);
}

async function requestPasswordReset(request) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  if (rateLimited(request, "password-reset-request", email)) return json({ ok: true }, 202);
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active' AND email_verified = 1").get(email);
  const config = getServerConfig(request.url);
  if (user && (config.emailConfigured || config.developmentEmail)) {
    await issueAccountToken(request, user, "reset");
  }
  securityEvent(request, "auth.password.reset.request", "accepted", user?.id || null);
  return json({ ok: true }, 202);
}

async function resetPassword(request) {
  const data = await body(request);
  const password = String(data.password || "");
  if (password.length < 10 || password.length > 128) return fail("INVALID_PASSWORD");
  const token = validToken(String(data.token || ""), "reset");
  if (!token) return fail("RESET_TOKEN_INVALID", 400);
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const consumed = db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL")
      .run(timestamp, token.id);
    if (!consumed.changes) throw new Error("TOKEN_ALREADY_USED");
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(await hashPassword(password), timestamp, token.user_id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(token.user_id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  securityEvent(request, "auth.password.reset", "success", token.user_id);
  return json({ ok: true });
}

function dashboard(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const taskCounts = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('queued','running') THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN status = 'waiting_for_runtime' THEN 1 ELSE 0 END) AS waiting
    FROM tasks WHERE user_id = ?
  `).get(userId);
  const fileCount = Number(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(userId).count);
  const subscription = effectiveMembership(userId);
  const recentTasks = db.prepare(`
    SELECT t.id, t.status, t.credit_cost AS creditCost, t.created_at AS createdAt, t.updated_at AS updatedAt,
      x.name_zh AS toolNameZh, x.name_en AS toolNameEn, x.icon
    FROM tasks t JOIN tools x ON x.id = t.tool_id
    WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 5
  `).all(userId);
  return {
    user: cleanUser(user),
    metrics: {
      credits: balance(userId),
      tasks: Number(taskCounts.total || 0),
      completed: Number(taskCounts.completed || 0),
      running: Number(taskCounts.running || 0),
      waiting: Number(taskCounts.waiting || 0),
      files: fileCount,
    },
    subscription,
    recentTasks,
  };
}

async function uploadFile(request, user) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("FILE_REQUIRED");
  try { assertUserFileCapacity(user.id); }
  catch (error) { return fail(error.code || "USER_FILE_LIMIT_REACHED", error.status || 409); }
  const maxSize = Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
  if (file.size > maxSize) return fail("FILE_TOO_LARGE", 413);
  const id = randomUUID();
  const name = basename(file.name).slice(0, 180);
  const mimeType = file.type || "application/octet-stream";
  const stored = await putStoredFile({ userId: user.id, fileId: id, fileName: name, mimeType, buffer: Buffer.from(await file.arrayBuffer()) });
  const timestamp = Date.now();
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare(`
      INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.id, name, stored.storageName, mimeType, file.size, timestamp);
    db.prepare(`
      INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'available', ?, ?)
    `).run(id, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    await deleteStoredFile(stored).catch(() => {});
    throw error;
  }
  audit(user.id, "file.upload", "file", id, { size: file.size });
  return json({ file: db.prepare(`
    SELECT id, name, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt FROM files WHERE id = ?
  `).get(id) }, 201);
}

async function createTask(request, user) {
  if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
  const data = await body(request);
  const tool = db.prepare(`${toolSelect()} WHERE id = ? AND active = 1`).get(String(data.toolId || ""));
  if (!tool) return fail("TOOL_NOT_FOUND", 404);
  const fileIds = Array.isArray(data.fileIds) ? data.fileIds.slice(0, 10) : [];
  for (const fileId of fileIds) {
    if (!db.prepare("SELECT id FROM files WHERE id = ? AND user_id = ?").get(fileId, user.id)) return fail("FILE_NOT_FOUND", 404);
  }
  const available = balance(user.id);
  if (available < tool.creditCost) return fail("INSUFFICIENT_CREDITS", 402);
  const id = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO tasks (id, user_id, tool_id, status, input_json, credit_cost, created_at, updated_at)
      VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)
    `).run(id, user.id, tool.id, JSON.stringify({
      text: String(data.text || "").slice(0, 50000),
      locale: data.locale === "en" ? "en" : "zh-CN",
      modelConnectionId: tool.runtimeKind === "openai"
        ? toolModelSelection(user.id, tool.id, data.modelConnectionId)
        : null,
    }), tool.creditCost, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare(`
        INSERT INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'consumption', ?, ?, ?, 'task', ?, ?)
      `).run(randomUUID(), user.id, -tool.creditCost, `使用${tool.nameZh}`, `Used ${tool.nameEn}`, id, timestamp);
      db.prepare(`
        INSERT OR IGNORE INTO task_settlements (id, task_id, kind, amount, created_at)
        VALUES (?, ?, 'reserve', ?, ?)
      `).run(randomUUID(), id, tool.creditCost, timestamp);
    }
    const link = db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)");
    for (const fileId of fileIds) link.run(id, fileId);
    enqueueTask(id, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(user.id, "task.create", "task", id, { toolId: tool.id });
  runNextJob().catch(() => {});
  return json({ task: db.prepare("SELECT id, status, credit_cost AS creditCost, created_at AS createdAt FROM tasks WHERE id = ?").get(id) }, 201);
}

function listTasks(userId) {
  return db.prepare(`
    SELECT t.id, t.status, t.credit_cost AS creditCost, t.error_code AS errorCode,
      t.input_json AS inputJson, t.output_json AS outputJson, t.created_at AS createdAt,
      t.updated_at AS updatedAt, t.completed_at AS completedAt,
      x.id AS toolId, x.slug AS toolSlug, x.name_zh AS toolNameZh, x.name_en AS toolNameEn, x.icon,
      (SELECT f.id FROM task_files tf JOIN files f ON f.id = tf.file_id
        WHERE tf.task_id = t.id ORDER BY f.created_at DESC LIMIT 1) AS resultFileId,
      (SELECT f.name FROM task_files tf JOIN files f ON f.id = tf.file_id
        WHERE tf.task_id = t.id ORDER BY f.created_at DESC LIMIT 1) AS resultFileName,
      (SELECT f.mime_type FROM task_files tf JOIN files f ON f.id = tf.file_id
        WHERE tf.task_id = t.id ORDER BY f.created_at DESC LIMIT 1) AS resultMimeType,
      (SELECT f.size_bytes FROM task_files tf JOIN files f ON f.id = tf.file_id
        WHERE tf.task_id = t.id ORDER BY f.created_at DESC LIMIT 1) AS resultSizeBytes
    FROM tasks t JOIN tools x ON x.id = t.tool_id
    WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 100
  `).all(userId).map((task) => ({
    ...task,
    input: JSON.parse(task.inputJson || "{}"),
    output: task.outputJson ? JSON.parse(task.outputJson) : null,
    file: task.resultFileId ? {
      id: task.resultFileId,
      name: task.resultFileName,
      mimeType: task.resultMimeType,
      sizeBytes: task.resultSizeBytes,
      downloadUrl: `/api/files/${task.resultFileId}/download`,
    } : null,
    inputJson: undefined,
    outputJson: undefined,
    resultFileId: undefined,
    resultFileName: undefined,
    resultMimeType: undefined,
    resultSizeBytes: undefined,
  }));
}

function listFavorites(userId) {
  // Polymorphic favorites cannot use a database foreign key. Prune records whose
  // owner-scoped target was removed so counts and folders never show ghost items.
  db.prepare(`DELETE FROM user_favorites
    WHERE user_id = ? AND item_type = 'tool'
      AND NOT EXISTS (SELECT 1 FROM tools WHERE tools.id = user_favorites.item_id AND tools.active = 1)`)
    .run(userId);
  db.prepare(`DELETE FROM user_favorites
    WHERE user_id = ? AND item_type = 'prompt'
      AND NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.id = user_favorites.item_id AND tasks.user_id = ?)`)
    .run(userId, userId);
  db.prepare(`DELETE FROM user_favorites
    WHERE user_id = ? AND item_type IN ('file', 'material')
      AND NOT EXISTS (SELECT 1 FROM files WHERE files.id = user_favorites.item_id AND files.user_id = ?)`)
    .run(userId, userId);
  const favorites = db.prepare(`
    SELECT id, item_type AS itemType, item_id AS itemId, collection_id AS collectionId,
      created_at AS createdAt, updated_at AS updatedAt
    FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId);
  const collections = db.prepare(`
    SELECT c.id, c.name, c.created_at AS createdAt, c.updated_at AS updatedAt,
      COUNT(f.id) AS itemCount
    FROM favorite_collections c
    LEFT JOIN user_favorites f ON f.collection_id = c.id
    WHERE c.user_id = ? GROUP BY c.id ORDER BY c.updated_at DESC
  `).all(userId).map((item) => ({ ...item, itemCount: Number(item.itemCount || 0) }));
  const counts = { tool: 0, file: 0, prompt: 0, material: 0 };
  favorites.forEach((item) => { counts[item.itemType] = (counts[item.itemType] || 0) + 1; });
  return { favorites, collections, counts };
}

function favoriteTargetExists(userId, itemType, itemId) {
  if (itemType === "tool") return Boolean(db.prepare("SELECT id FROM tools WHERE id = ? AND active = 1").get(itemId));
  if (itemType === "prompt") return Boolean(db.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?").get(itemId, userId));
  if (itemType === "file" || itemType === "material") return Boolean(db.prepare("SELECT id FROM files WHERE id = ? AND user_id = ?").get(itemId, userId));
  return false;
}

function favoriteCollectionExists(userId, collectionId) {
  return !collectionId || Boolean(db.prepare("SELECT id FROM favorite_collections WHERE id = ? AND user_id = ?").get(collectionId, userId));
}

function currentSession(request) {
  const token = requestSessionToken(request);
  if (!token) return null;
  return db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?").get(hashToken(token), Date.now()) || null;
}

async function updateProfile(request, user) {
  const data = await body(request);
  const name = String(data.name || "").trim();
  const locale = data.locale === "en" ? "en" : data.locale === "zh-CN" ? "zh-CN" : null;
  if (!name || name.length > 80 || !locale) return fail("INVALID_PROFILE");
  db.prepare("UPDATE users SET name = ?, locale = ?, updated_at = ? WHERE id = ?")
    .run(name, locale, Date.now(), user.id);
  audit(user.id, "account.profile.update", "user", user.id);
  return json({ user: cleanUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
}

async function changePassword(request, user) {
  const data = await body(request);
  const currentPassword = String(data.currentPassword || "");
  const newPassword = String(data.newPassword || "");
  if (!(await verifyPassword(currentPassword, user.password_hash))) return fail("INVALID_CREDENTIALS", 401);
  if (newPassword.length < 10 || newPassword.length > 128) return fail("INVALID_PASSWORD");
  const session = currentSession(request);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(await hashPassword(newPassword), Date.now(), user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(user.id, session?.id || "");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  securityEvent(request, "account.password.change", "success", user.id);
  return json({ ok: true });
}

async function requestEmailChange(request, user) {
  const data = await body(request);
  const password = String(data.password || "");
  const email = String(data.email || "").trim().toLowerCase();
  if (!(await verifyPassword(password, user.password_hash))) return fail("INVALID_CREDENTIALS", 401);
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return fail("INVALID_EMAIL");
  if (db.prepare("SELECT id FROM users WHERE email = ? AND id <> ?").get(email, user.id)) return fail("EMAIL_UNAVAILABLE", 409);
  await issueAccountToken(request, user, "emailChange", email);
  securityEvent(request, "account.email.change.request", "accepted", user.id);
  return json({ ok: true }, 202);
}

async function confirmEmailChange(request) {
  const token = validToken(new URL(request.url).searchParams.get("token"), "emailChange");
  const config = getServerConfig(request.url);
  if (!token) return new Response(null, { status: 302, headers: { location: `${config.appUrl}/?auth=email-change-invalid` } });
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const conflict = db.prepare("SELECT id FROM users WHERE email = ? AND id <> ?").get(token.email, token.user_id);
    if (conflict) throw Object.assign(new Error("EMAIL_UNAVAILABLE"), { status: 409 });
    const consumed = db.prepare("UPDATE auth_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL")
      .run(timestamp, token.id);
    if (!consumed.changes) throw new Error("TOKEN_ALREADY_USED");
    db.prepare("UPDATE users SET email = ?, email_verified = 1, updated_at = ? WHERE id = ?")
      .run(token.email, timestamp, token.user_id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(token.user_id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    if (error.status === 409) return new Response(null, { status: 302, headers: { location: `${config.appUrl}/?auth=email-change-invalid` } });
    throw error;
  }
  securityEvent(request, "account.email.change", "success", token.user_id);
  return new Response(null, { status: 302, headers: { location: `${config.appUrl}/?auth=email-changed` } });
}

function listSessions(request, user) {
  const current = currentSession(request);
  return json({
    sessions: db.prepare(`
      SELECT id, expires_at AS expiresAt, created_at AS createdAt, last_seen_at AS lastSeenAt,
        user_agent AS userAgent FROM sessions WHERE user_id = ? AND expires_at > ?
      ORDER BY last_seen_at DESC, created_at DESC
    `).all(user.id, Date.now()).map((session) => ({ ...session, current: session.id === current?.id })),
  });
}

function revokeSessions(request, user, target) {
  const current = currentSession(request);
  if (target === "others") {
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(user.id, current?.id || "");
  } else {
    const session = db.prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?").get(target, user.id);
    if (!session) return fail("SESSION_NOT_FOUND", 404);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(target);
  }
  securityEvent(request, "account.sessions.revoke", "success", user.id, { target: target === "others" ? "others" : "selected" });
  return json({ ok: true });
}

function createExport(user) {
  const id = randomUUID();
  const payload = {
    generatedAt: new Date().toISOString(),
    account: cleanUser(user),
    subscriptions: db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at").all(user.id),
    credits: db.prepare(`
      SELECT type, amount, description_zh AS descriptionZh, description_en AS descriptionEn,
        reference_type AS referenceType, reference_id AS referenceId, created_at AS createdAt
      FROM credit_ledger WHERE user_id = ? ORDER BY created_at
    `).all(user.id),
    tasks: db.prepare("SELECT id, tool_id AS toolId, status, credit_cost AS creditCost, created_at AS createdAt FROM tasks WHERE user_id = ? ORDER BY created_at").all(user.id),
    files: db.prepare("SELECT id, name, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt FROM files WHERE user_id = ? ORDER BY created_at").all(user.id),
  };
  db.prepare(`
    INSERT INTO export_jobs (id, user_id, status, payload_json, expires_at, created_at)
    VALUES (?, ?, 'completed', ?, ?, ?)
  `).run(id, user.id, JSON.stringify(payload), Date.now() + 86400000, Date.now());
  audit(user.id, "account.export.create", "export", id);
  return json({ export: { id, status: "completed", expiresAt: Date.now() + 86400000 } }, 201);
}

const preferenceDefaults = {
  timezone: "Asia/Shanghai", dateFormat: "YYYY-MM-DD", pageSize: "20",
  notifications: true, productUpdates: true,
};

function accountPreferences(userId) {
  const row = db.prepare("SELECT preferences_json AS preferencesJson FROM user_preferences WHERE user_id = ?").get(userId);
  try { return { ...preferenceDefaults, ...(row ? JSON.parse(row.preferencesJson) : {}) }; }
  catch { return { ...preferenceDefaults }; }
}

async function updateAccountPreferences(request, user) {
  const input = await body(request);
  const next = {
    timezone: ["Asia/Shanghai", "UTC", "America/Los_Angeles"].includes(input.timezone) ? input.timezone : preferenceDefaults.timezone,
    dateFormat: ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"].includes(input.dateFormat) ? input.dateFormat : preferenceDefaults.dateFormat,
    pageSize: ["10", "20", "50"].includes(String(input.pageSize)) ? String(input.pageSize) : preferenceDefaults.pageSize,
    notifications: input.notifications !== false,
    productUpdates: input.productUpdates !== false,
  };
  db.prepare(`INSERT INTO user_preferences (user_id, preferences_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET preferences_json = excluded.preferences_json, updated_at = excluded.updated_at`)
    .run(user.id, JSON.stringify(next), Date.now());
  audit(user.id, "account.preferences.update", "user", user.id);
  return json({ preferences: next });
}

function projectPayload(row) {
  return {
    id: row.id, name: row.name, description: row.description, status: row.status,
    taskCount: Number(row.taskCount || 0), fileCount: Number(row.fileCount || 0),
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function listWorkspaceProjects(userId) {
  return db.prepare(`SELECT p.id, p.name, p.description, p.status,
    p.created_at AS createdAt, p.updated_at AS updatedAt,
    SUM(CASE WHEN i.item_type = 'task' THEN 1 ELSE 0 END) AS taskCount,
    SUM(CASE WHEN i.item_type = 'file' THEN 1 ELSE 0 END) AS fileCount
    FROM workspace_projects p LEFT JOIN project_items i ON i.project_id = p.id
    WHERE p.user_id = ? GROUP BY p.id ORDER BY p.updated_at DESC`).all(userId).map(projectPayload);
}

async function createWorkspaceProject(request, user) {
  const input = await body(request);
  const name = String(input.name || "").trim().slice(0, 80);
  if (!name) return fail("PROJECT_NAME_REQUIRED", 400);
  const id = randomUUID(); const now = Date.now();
  db.prepare("INSERT INTO workspace_projects (id,user_id,name,description,status,created_at,updated_at) VALUES (?,?,?,?, 'active',?,?)")
    .run(id, user.id, name, String(input.description || "").trim().slice(0, 500), now, now);
  audit(user.id, "project.create", "project", id);
  return json({ project: projectPayload(db.prepare("SELECT id,name,description,status,created_at AS createdAt,updated_at AS updatedAt FROM workspace_projects WHERE id = ?").get(id)) }, 201);
}

async function updateWorkspaceProject(request, user, id) {
  const existing = db.prepare("SELECT * FROM workspace_projects WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return fail("PROJECT_NOT_FOUND", 404);
  const input = await body(request);
  const name = input.name === undefined ? existing.name : String(input.name || "").trim().slice(0, 80);
  const status = input.status === undefined ? existing.status : String(input.status);
  if (!name) return fail("PROJECT_NAME_REQUIRED", 400);
  if (!["active", "completed", "archived"].includes(status)) return fail("PROJECT_STATUS_INVALID", 400);
  db.prepare("UPDATE workspace_projects SET name=?,description=?,status=?,updated_at=? WHERE id=? AND user_id=?")
    .run(name, input.description === undefined ? existing.description : String(input.description || "").trim().slice(0, 500), status, Date.now(), id, user.id);
  audit(user.id, "project.update", "project", id);
  return json({ project: listWorkspaceProjects(user.id).find((item) => item.id === id) });
}

function deleteWorkspaceProject(user, id) {
  const result = db.prepare("DELETE FROM workspace_projects WHERE id = ? AND user_id = ?").run(id, user.id);
  if (!result.changes) return fail("PROJECT_NOT_FOUND", 404);
  audit(user.id, "project.delete", "project", id);
  return json({ ok: true });
}

async function requestDeletion(request, user) {
  const config = getServerConfig(request.url);
  if (!config.accountDeletionEnabled) return fail("ACCOUNT_DELETION_UNAVAILABLE", 503);
  const data = await body(request);
  if (!(await verifyPassword(String(data.password || ""), user.password_hash))) return fail("INVALID_CREDENTIALS", 401);
  const id = randomUUID();
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO deletion_requests (id, user_id, status, execute_after, created_at)
    VALUES (?, ?, 'pending', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET status = 'pending', execute_after = excluded.execute_after,
      created_at = excluded.created_at, cancelled_at = NULL
  `).run(id, user.id, timestamp + 7 * 86400000, timestamp);
  const session = currentSession(request);
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(user.id, session?.id || "");
  securityEvent(request, "account.deletion.request", "accepted", user.id);
  return json({ ok: true, executeAfter: timestamp + 7 * 86400000 }, 202);
}

async function billingCheckout(request, user) {
  const config = getServerConfig(request.url);
  if (!accountVerified(user)) return fail("ACCOUNT_UNVERIFIED", 403);
  if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
  const data = await body(request);
  const plan = db.prepare("SELECT * FROM plans WHERE id = ? AND active = 1").get(String(data.planId || ""));
  if (!plan || plan.amount_minor <= 0) return fail("PLAN_NOT_FOUND", 404);
  const provider = String(data.provider || "stripe");
  if (["alipay", "wechat_pay"].includes(provider)) {
    try {
      return json(await createDomesticCheckout({ provider, user, plan, appUrl: config.appUrl }));
    } catch (error) {
      return fail(error.code || "PAYMENT_ORDER_FAILED", error.status || 502);
    }
  }
  if (provider !== "stripe" || !config.billingEnabled) return fail("BILLING_NOT_CONFIGURED", 503);
  const offer = billingPlanPayload(plan);
  const subscription = plan.interval === "month";
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const metadata = { userId: user.id, planId: plan.id, credits: String(offer.totalCredits) };
  const checkoutPayload = {
    mode: subscription ? "subscription" : "payment",
    ...(!phoneOnlyEmail(user.email) ? { customer_email: user.email } : {}),
    client_reference_id: user.id,
    line_items: [{
      price_data: {
        currency: plan.currency.toLowerCase(),
        unit_amount: plan.amount_minor,
        product_data: { name: plan.name_zh, metadata: { planId: plan.id } },
        ...(subscription ? { recurring: { interval: "month" } } : {}),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`,
    metadata,
  };
  if (subscription) checkoutPayload.subscription_data = { metadata };
  const checkout = await stripe.checkout.sessions.create(checkoutPayload);
  return json({ url: checkout.url });
}

async function billingPortal(request, user) {
  const config = getServerConfig(request.url);
  if (!config.billingEnabled) return fail("BILLING_NOT_CONFIGURED", 503);
  const mapping = db.prepare(`
    SELECT provider_object_id FROM provider_mappings
    WHERE user_id = ? AND provider = 'stripe' AND kind = 'customer'
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id);
  if (!mapping) return fail("BILLING_PROFILE_NOT_FOUND", 404);
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const portal = await stripe.billingPortal.sessions.create({
    customer: mapping.provider_object_id,
    return_url: `${config.appUrl}/?view=billing`,
  });
  return json({ url: portal.url });
}

function userForStripeCustomer(customerId) {
  return db.prepare(`
    SELECT u.* FROM provider_mappings m JOIN users u ON u.id = m.user_id
    WHERE m.provider = 'stripe' AND m.kind = 'customer' AND m.provider_object_id = ?
  `).get(String(customerId || "")) || null;
}

function mapStripeCustomer(userId, customerId) {
  if (!userId || !customerId) return;
  db.prepare(`
    INSERT OR IGNORE INTO provider_mappings
    (id, user_id, provider, kind, provider_object_id, created_at)
    VALUES (?, ?, 'stripe', 'customer', ?, ?)
  `).run(randomUUID(), userId, String(customerId), Date.now());
}

function reconcileStripeEvent(event) {
  const object = event.data.object;
  const timestamp = Date.now();
  if (event.type === "checkout.session.completed") {
    const userId = String(object.client_reference_id || object.metadata?.userId || "");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return;
    mapStripeCustomer(user.id, object.customer);
    if (object.mode === "subscription" && object.subscription) {
      const planId = String(object.metadata?.planId || "");
      if (!db.prepare("SELECT id FROM plans WHERE id = ? AND interval = 'month'").get(planId)) return;
      db.prepare(`
        INSERT INTO subscriptions
        (id, user_id, plan_id, provider, provider_subscription_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'stripe', ?, 'pending', ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
      `).run(`stripe:${object.subscription}`, user.id, planId, String(object.subscription), timestamp, timestamp);
    }
    if (object.mode === "payment" && Number(object.metadata?.credits) > 0) {
      db.prepare(`
        INSERT OR IGNORE INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'purchase', ?, '积分充值', 'Credit top-up', 'stripe_checkout', ?, ?)
      `).run(randomUUID(), user.id, Number(object.metadata.credits), object.id, timestamp);
    }
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const user = userForStripeCustomer(object.customer);
    if (!user) return;
    const status = event.type === "customer.subscription.deleted" ? "cancelled" : String(object.status || "unknown");
    const existing = db.prepare("SELECT plan_id FROM subscriptions WHERE provider = 'stripe' AND provider_subscription_id = ?").get(String(object.id));
    const planId = String(object.metadata?.planId || existing?.plan_id || "");
    if (!db.prepare("SELECT id FROM plans WHERE id = ? AND interval = 'month'").get(planId)) return;
    db.prepare(`
      INSERT INTO subscriptions
      (id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, 'stripe', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status,
        plan_id = excluded.plan_id, current_period_end = excluded.current_period_end, updated_at = excluded.updated_at
    `).run(
      `stripe:${object.id}`,
      user.id,
      planId,
      object.id,
      status,
      object.current_period_end ? object.current_period_end * 1000 : null,
      timestamp,
      timestamp,
    );
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const user = userForStripeCustomer(object.customer);
    if (!user) return;
    const status = event.type === "invoice.paid" ? "paid" : "payment_failed";
    db.prepare(`
      INSERT INTO invoices
      (id, user_id, provider, provider_invoice_id, status, amount_paid, currency, hosted_url, created_at)
      VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_invoice_id) DO UPDATE SET status = excluded.status,
        amount_paid = excluded.amount_paid, hosted_url = excluded.hosted_url
    `).run(
      `stripe:${object.id}`,
      user.id,
      object.id,
      status,
      Number(object.amount_paid || 0),
      String(object.currency || "usd").toUpperCase(),
      object.hosted_invoice_url || null,
      timestamp,
    );
    if (event.type === "invoice.paid") {
      const providerSubscriptionId = String(object.subscription || object.parent?.subscription_details?.subscription || "");
      const subscription = db.prepare(`
        SELECT s.plan_id AS planId, p.name_zh AS nameZh, p.name_en AS nameEn,
          p.recurring_credits AS recurringCredits
        FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.provider = 'stripe' AND s.provider_subscription_id = ?
      `).get(providerSubscriptionId);
      if (!subscription?.recurringCredits) return;
      db.prepare(`
        INSERT OR IGNORE INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'subscription_grant', ?, ?, ?, 'stripe_invoice', ?, ?)
      `).run(
        randomUUID(), user.id, subscription.recurringCredits,
        `${subscription.nameZh}月度积分`, `${subscription.nameEn} monthly credits`, object.id, timestamp,
      );
    }
  }
}

async function stripeWebhook(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) return fail("BILLING_NOT_CONFIGURED", 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return fail("WEBHOOK_SIGNATURE_REQUIRED", 400);
  const rawBody = await request.text();
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    securityEvent(request, "billing.webhook", "signature_invalid");
    return fail("WEBHOOK_SIGNATURE_INVALID", 400);
  }
  const inserted = db.prepare(`
    INSERT OR IGNORE INTO webhook_receipts
    (id, provider, provider_event_id, event_type, status, created_at)
    VALUES (?, 'stripe', ?, ?, 'received', ?)
  `).run(randomUUID(), event.id, event.type, Date.now());
  if (!inserted.changes) return json({ received: true, duplicate: true });
  try {
    db.exec("BEGIN IMMEDIATE");
    reconcileStripeEvent(event);
    db.prepare(`
      UPDATE webhook_receipts SET status = 'processed', processed_at = ?
      WHERE provider = 'stripe' AND provider_event_id = ?
    `).run(Date.now(), event.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.prepare(`
      UPDATE webhook_receipts SET status = 'failed', error_code = ?, processed_at = ?
      WHERE provider = 'stripe' AND provider_event_id = ?
    `).run("RECONCILIATION_FAILED", Date.now(), event.id);
    throw error;
  }
  return json({ received: true });
}

const handleAdminV1 = createAdminHandler({ currentUser, currentSession, issueAccountToken });

export async function handleApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const config = getServerConfig(request.url);
  const configurationErrors = validateServerConfig(config);
  if (path === "/api/internal/v1/platform-model/invoke" && request.method === "POST") {
    if (!internalServiceAuthorized(request)) return fail("SERVICE_UNAUTHENTICATED", 401);
    try {
      const data = await body(request);
      if (data.purpose !== "oneshow_home_chat") return fail("INVALID_PLATFORM_MODEL_PURPOSE", 400);
      const result = await invokePlatformModel({
        purpose: data.purpose,
        service: "oneshow-home-api",
        instruction: data.instruction,
        messages: Array.isArray(data.messages) ? data.messages : [],
      });
      return json({
        text: result.text,
        modelId: result.modelId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        invocationId: result.invocationId,
      });
    } catch (error) {
      return fail(error.code || "PLATFORM_MODEL_INVOCATION_FAILED", error.status || 502);
    }
  }
  if (path === "/api/health" && request.method === "GET") return json({
    ok: true,
    database: "sqlite",
    registrationEnabled: config.registrationEnabled,
    billingEnabled: config.billingEnabled || activePaymentProviders().length > 0,
    accountDeletionEnabled: config.accountDeletionEnabled,
    emailEnabled: config.emailConfigured,
    smsAuthEnabled: config.smsAuthEnabled,
    wechatMiniProgramEnabled: config.wechatMiniProgramEnabled,
    configurationReady: configurationErrors.length === 0,
    configurationErrors,
    oneShowModelEnabled: gatewayFlags().managedConfigured && gatewayFlags().managedExecutionEnabled,
    musicGenerationEnabled: musicStudioStatus().ready,
    externalRuntimeEnabled: Boolean(process.env.TOOL_RUNTIME_BASE_URL),
    adminConsoleVersion: "v1",
    adminMfaEnforced: config.adminMfaEnforced,
  });
  if (path === "/api/billing/webhook" && request.method === "POST") return stripeWebhook(request);
  if (path === "/api/billing/webhooks/alipay" && request.method === "POST") {
    try { await handleAlipayNotification(request); return new Response("success", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }); }
    catch (error) { securityEvent(request, "billing.alipay.webhook", error.code || "failed"); return new Response("failure", { status: error.status || 400 }); }
  }
  if (path === "/api/billing/webhooks/wechat" && request.method === "POST") {
    try { await handleWechatNotification(request); return json({ code: "SUCCESS", message: "成功" }); }
    catch (error) { securityEvent(request, "billing.wechat.webhook", error.code || "failed"); return json({ code: "FAIL", message: error.code || "支付通知处理失败" }, error.status || 400); }
  }
  const singingCallbackMatch = path.match(/^\/api\/music\/singing-provider\/callback\/([^/]+)$/);
  if (singingCallbackMatch && request.method === "POST") {
    try { return json(await handleSingingProviderCallback(request, singingCallbackMatch[1])); }
    catch (error) { return fail(error.code || "SINGING_CALLBACK_FAILED", error.status || 500); }
  }
  if (path === "/api/auth/verify" && request.method === "GET") return verifyEmail(request);
  if (path === "/api/auth/confirm-email" && request.method === "GET") return confirmEmailChange(request);
  if (!sameOrigin(request, config.appUrl)) return fail("ORIGIN_NOT_ALLOWED", 403);
  if (path === "/api/auth/register" && request.method === "POST") return register(request);
  if (path === "/api/auth/login" && request.method === "POST") return login(request);
  if (path === "/api/auth/sms/send" && request.method === "POST") return sendSmsVerification(request);
  if (path === "/api/auth/sms/verify" && request.method === "POST") return verifySmsLogin(request);
  if (path === "/api/auth/wechat-miniprogram" && request.method === "POST") return verifyWechatMiniProgramLogin(request);
  if (path === "/api/auth/resend-verification" && request.method === "POST") return resendVerification(request);
  if (path === "/api/auth/forgot-password" && request.method === "POST") return requestPasswordReset(request);
  if (path === "/api/auth/reset-password" && request.method === "POST") return resetPassword(request);
  if (path.startsWith("/api/auth/google/")) return fail("NOT_FOUND", 404);
  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = requestSessionToken(request);
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }
  if (path === "/api/auth/session" && request.method === "GET") {
    return json({ user: cleanUser(currentUser(request)) });
  }
  const publicToolIconMatch = path.match(/^\/api\/tools\/([^/]+)\/icon$/);
  if (publicToolIconMatch && request.method === "GET") {
    let slug;
    try { slug = decodeURIComponent(publicToolIconMatch[1]); }
    catch { return fail("INVALID_TOOL_SLUG"); }
    const branding = db.prepare(`
      SELECT b.storage_provider AS provider, b.storage_name AS storageName,
        b.object_key AS objectKey, b.mime_type AS mimeType, b.etag
      FROM tool_branding b JOIN tools t ON t.id = b.tool_id
      WHERE t.slug = ? AND t.active = 1 AND b.object_key IS NOT NULL
    `).get(slug);
    if (!branding) return fail("TOOL_ICON_NOT_FOUND", 404);
    try {
      const cacheKey = `tool:${slug}:${branding.etag || branding.objectKey}`;
      let stored = imageCache.get(cacheKey);
      if (!stored) stored = cacheImage(cacheKey, await optimizedImage(await readStoredFile(branding)));
      return new Response(stored, {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return fail("TOOL_ICON_NOT_FOUND", 404);
    }
  }
  if (path === "/api/tools" && request.method === "GET") {
    return json({ tools: storefrontTools() }, 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" });
  }
  if (path === "/api/writing/catalog" && request.method === "GET") {
    return toolIsPublished("ai-writer") ? json(writingCatalog()) : unpublishedToolResponse();
  }
  if (path === "/api/seo/catalog" && request.method === "GET") {
    return toolIsPublished("seo-workbench") ? json(seoCatalog()) : unpublishedToolResponse();
  }
  if (path === "/api/music/status" && request.method === "GET") {
    return toolIsPublished("ai-music-studio") ? json(musicStudioStatus()) : unpublishedToolResponse();
  }
  if (path === "/api/plans" && request.method === "GET") {
    const plans = db.prepare("SELECT * FROM plans WHERE active = 1").all().map(billingPlanPayload)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    return json({ plans }, 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" });
  }
  if (path.startsWith("/api/admin/v1/")) return handleAdminV1(request, path);
  if (path.startsWith("/api/admin/")) return handleAdmin(request, path);

  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const user = auth.user;

  if (path === "/api/seo-agent" || path.startsWith("/api/seo-agent/")) {
    return toolIsPublished("seo-agent") ? handleSeoAgent(request, user, path) : unpublishedToolResponse();
  }
  if (path === "/api/music/tracks" && request.method === "GET") return json({ tracks: listMusicTracks(user.id) });
  if (path === "/api/music/singing-voices" && request.method === "GET") {
    if (!musicStudioStatus().singingCover.available) return fail("FEATURE_NOT_AVAILABLE", 404);
    return json({ voices: listSingingVoices(user.id) });
  }
  if (path === "/api/music/singing-voices" && request.method === "POST") {
    if (!toolIsPublished("ai-music-studio")) return unpublishedToolResponse();
    if (!musicStudioStatus().singingCover.available) return fail("FEATURE_NOT_AVAILABLE", 404);
    if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
    try { return json({ voice: await enrollSingingVoice(user, await request.formData()) }, 201); }
    catch (error) { return fail(error.code || "SINGING_VOICE_ENROLL_FAILED", error.status || 500); }
  }
  const singingVoiceMatch = path.match(/^\/api\/music\/singing-voices\/([^/]+)$/);
  if (singingVoiceMatch && request.method === "DELETE") {
    if (!musicStudioStatus().singingCover.available) return fail("FEATURE_NOT_AVAILABLE", 404);
    try { return json(await removeSingingVoice(user, singingVoiceMatch[1])); }
    catch (error) { return fail(error.code || "SINGING_VOICE_DELETE_FAILED", error.status || 500); }
  }
  if (path === "/api/music/singing-covers" && request.method === "POST") {
    if (!toolIsPublished("ai-music-studio")) return unpublishedToolResponse();
    if (!musicStudioStatus().singingCover.available) return fail("FEATURE_NOT_AVAILABLE", 404);
    if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
    try { return json(await submitSingingCover(user, await request.formData()), 201); }
    catch (error) { return fail(error.code || "SINGING_COVER_SUBMIT_FAILED", error.status || 500); }
  }
  if (path === "/api/music/references" && request.method === "POST") {
    if (!toolIsPublished("ai-music-studio")) return unpublishedToolResponse();
    if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
    try {
      const form = await request.formData();
      return json({ reference: await createMusicReference(user, form.get("file")) }, 201);
    } catch (error) {
      return fail(error.code || "MUSIC_REFERENCE_PREPROCESS_FAILED", error.status || 500);
    }
  }
  if (path === "/api/music/generations" && request.method === "POST") {
    if (!toolIsPublished("ai-music-studio")) return unpublishedToolResponse();
    if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
    try {
      const generation = createMusicGeneration(user, await body(request));
      runNextJob().catch(() => {});
      return json(generation, 201);
    } catch (error) {
      return fail(error.code || "MUSIC_GENERATION_FAILED", error.status || 500);
    }
  }
  const musicTrackMatch = path.match(/^\/api\/music\/tracks\/([^/]+)$/);
  if (musicTrackMatch && request.method === "DELETE") {
    try { return json(await deleteMusicTrack(user.id, musicTrackMatch[1])); }
    catch (error) { return fail(error.code || "MUSIC_TRACK_DELETE_FAILED", error.status || 500); }
  }
  const musicCoverMatch = path.match(/^\/api\/music\/tracks\/([^/]+)\/cover$/);
  if (musicCoverMatch && request.method === "POST") {
    if (!toolIsPublished("ai-music-studio")) return unpublishedToolResponse();
    try { return json(await createMusicCover(user, musicCoverMatch[1]), 201); }
    catch (error) { return fail(error.code || "MUSIC_COVER_GENERATION_FAILED", error.status || 500); }
  }

  if (path === "/api/dashboard" && request.method === "GET") return json(dashboard(user.id));
  if (path === "/api/support/conversations" && request.method === "GET") {
    return json({ conversations: listUserSupportConversations(user.id) });
  }
  const supportConversationMatch = path.match(/^\/api\/support\/conversations\/([^/]+)$/);
  if (supportConversationMatch && request.method === "GET") {
    const conversation = getUserSupportConversation(user.id, supportConversationMatch[1]);
    return conversation ? json({ conversation }) : fail("SUPPORT_CONVERSATION_NOT_FOUND", 404);
  }
  if (path === "/api/support/messages" && request.method === "POST") {
    const data = await body(request);
    try {
      const conversation = await askCustomerSupport({
        user,
        conversationId: String(data.conversationId || ""),
        message: data.message,
        locale: data.locale === "en" ? "en" : user.locale,
      });
      return json({ conversation }, 201);
    } catch (error) {
      return fail(error.code || "SUPPORT_MESSAGE_FAILED", error.status || 502);
    }
  }
  const supportTicketMatch = path.match(/^\/api\/support\/conversations\/([^/]+)\/(?:ticket|handoff)$/);
  if (supportTicketMatch && request.method === "POST") {
    const data = await body(request);
    try { return json({ conversation: submitSupportTicket(user.id, supportTicketMatch[1], data.message) }); }
    catch (error) { return fail(error.code || "SUPPORT_TICKET_FAILED", error.status || 400); }
  }
  if (path === "/api/marketplace/search-events" && request.method === "POST") {
    const data = await body(request);
    recordMarketplaceSearch({
      opaqueUserId: hashToken(`market:${user.id}`), query: data.query,
      category: data.category, resultCount: data.resultCount,
    });
    return json({ ok: true }, 202);
  }
  if (path === "/api/marketplace/behavior-events" && request.method === "POST") {
    const data = await body(request);
    const recorded = recordMarketplaceBehavior({
      opaqueUserId: hashToken(`market:${user.id}`), eventKind: data.eventKind,
      toolSlug: data.toolSlug, category: data.category, query: data.query,
    });
    return recorded ? json({ ok: true }, 202) : fail("INVALID_MARKETPLACE_EVENT");
  }
  if (path === "/api/account/profile" && request.method === "PATCH") return updateProfile(request, user);
  if (path === "/api/account/preferences" && request.method === "GET") return json({ preferences: accountPreferences(user.id) });
  if (path === "/api/account/preferences" && request.method === "PATCH") return updateAccountPreferences(request, user);
  if (path === "/api/account/password" && request.method === "POST") return changePassword(request, user);
  if (path === "/api/account/email" && request.method === "POST") return requestEmailChange(request, user);
  if (path === "/api/account/sessions" && request.method === "GET") return listSessions(request, user);
  if (path === "/api/account/sessions/others" && request.method === "DELETE") return revokeSessions(request, user, "others");
  if (path.match(/^\/api\/account\/sessions\/[^/]+$/) && request.method === "DELETE") {
    return revokeSessions(request, user, path.split("/")[4]);
  }
  if (path === "/api/account/export" && request.method === "POST") return createExport(user);
  if (path.match(/^\/api\/account\/exports\/[^/]+\/download$/) && request.method === "GET") {
    const id = path.split("/")[4];
    const job = db.prepare(`
      SELECT * FROM export_jobs WHERE id = ? AND user_id = ? AND status = 'completed' AND expires_at > ?
    `).get(id, user.id, Date.now());
    if (!job) return fail("EXPORT_NOT_FOUND", 404);
    return new Response(job.payload_json, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="oneshowtools-export-${id}.json"`,
      },
    });
  }
  if (path === "/api/account/deletion" && request.method === "POST") return requestDeletion(request, user);
  if (path === "/api/account/deletion" && request.method === "DELETE") {
    const result = db.prepare(`
      UPDATE deletion_requests SET status = 'cancelled', cancelled_at = ?
      WHERE user_id = ? AND status = 'pending'
    `).run(Date.now(), user.id);
    if (!result.changes) return fail("DELETION_REQUEST_NOT_FOUND", 404);
    securityEvent(request, "account.deletion.cancel", "success", user.id);
    return json({ ok: true });
  }
  if (path === "/api/tasks" && request.method === "GET") return json({ tasks: listTasks(user.id) });
  if (path === "/api/projects" && request.method === "GET") return json({ projects: listWorkspaceProjects(user.id) });
  if (path === "/api/projects" && request.method === "POST") return createWorkspaceProject(request, user);
  const workspaceProjectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
  if (workspaceProjectMatch && request.method === "PATCH") return updateWorkspaceProject(request, user, workspaceProjectMatch[1]);
  if (workspaceProjectMatch && request.method === "DELETE") return deleteWorkspaceProject(user, workspaceProjectMatch[1]);
  if (path === "/api/tasks" && request.method === "POST") return createTask(request, user);
  if (path === "/api/favorites" && request.method === "GET") return json(listFavorites(user.id));
  if (path === "/api/favorites" && request.method === "POST") {
    const data = await body(request);
    const itemType = String(data.itemType || "");
    const itemId = String(data.itemId || "");
    const collectionId = data.collectionId ? String(data.collectionId) : null;
    if (!favoriteTargetExists(user.id, itemType, itemId)) return fail("FAVORITE_TARGET_NOT_FOUND", 404);
    if (!favoriteCollectionExists(user.id, collectionId)) return fail("FAVORITE_COLLECTION_NOT_FOUND", 404);
    const timestamp = Date.now();
    const existing = db.prepare("SELECT id FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?").get(user.id, itemType, itemId);
    if (existing) {
      db.prepare("UPDATE user_favorites SET collection_id = ?, updated_at = ? WHERE id = ? AND user_id = ?")
        .run(collectionId, timestamp, existing.id, user.id);
    } else {
      db.prepare("INSERT INTO user_favorites (id,user_id,item_type,item_id,collection_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
        .run(randomUUID(), user.id, itemType, itemId, collectionId, timestamp, timestamp);
    }
    audit(user.id, "favorite.save", itemType, itemId, { collectionId });
    return json(listFavorites(user.id), existing ? 200 : 201);
  }
  const favoriteMatch = path.match(/^\/api\/favorites\/([^/]+)$/);
  if (favoriteMatch && request.method === "PATCH") {
    const data = await body(request);
    const collectionId = data.collectionId ? String(data.collectionId) : null;
    if (!favoriteCollectionExists(user.id, collectionId)) return fail("FAVORITE_COLLECTION_NOT_FOUND", 404);
    const result = db.prepare("UPDATE user_favorites SET collection_id = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(collectionId, Date.now(), favoriteMatch[1], user.id);
    if (!result.changes) return fail("FAVORITE_NOT_FOUND", 404);
    return json(listFavorites(user.id));
  }
  if (favoriteMatch && request.method === "DELETE") {
    const favorite = db.prepare("SELECT item_type AS itemType, item_id AS itemId FROM user_favorites WHERE id = ? AND user_id = ?")
      .get(favoriteMatch[1], user.id);
    if (!favorite) return fail("FAVORITE_NOT_FOUND", 404);
    db.prepare("DELETE FROM user_favorites WHERE id = ? AND user_id = ?").run(favoriteMatch[1], user.id);
    audit(user.id, "favorite.remove", favorite.itemType, favorite.itemId);
    return json(listFavorites(user.id));
  }
  if (path === "/api/favorite-collections" && request.method === "POST") {
    const data = await body(request);
    const name = String(data.name || "").trim().slice(0, 40);
    if (!name) return fail("FAVORITE_COLLECTION_NAME_REQUIRED", 400);
    const timestamp = Date.now();
    try {
      db.prepare("INSERT INTO favorite_collections (id,user_id,name,created_at,updated_at) VALUES (?,?,?,?,?)")
        .run(randomUUID(), user.id, name, timestamp, timestamp);
    } catch { return fail("FAVORITE_COLLECTION_EXISTS", 409); }
    audit(user.id, "favorite_collection.create", "user", user.id, { name });
    return json(listFavorites(user.id), 201);
  }
  const favoriteCollectionMatch = path.match(/^\/api\/favorite-collections\/([^/]+)$/);
  if (favoriteCollectionMatch && request.method === "DELETE") {
    const result = db.prepare("DELETE FROM favorite_collections WHERE id = ? AND user_id = ?").run(favoriteCollectionMatch[1], user.id);
    if (!result.changes) return fail("FAVORITE_COLLECTION_NOT_FOUND", 404);
    return json(listFavorites(user.id));
  }
  if (path === "/api/model-connections/validate" && request.method === "POST") {
    if (rateLimited(request, "model-connection-validate", user.id, 8, 60000)) {
      return fail("MODEL_TEST_RATE_LIMITED", 429);
    }
    try {
      const result = await validateModelConnection(await body(request));
      audit(user.id, "model.connection.validate", "model_connection", null, { status: result.status });
      return json(result);
    } catch (error) {
      return fail(error.code || "MODEL_TEST_FAILED", error.status || 500);
    }
  }
  if (path === "/api/model-connections" && request.method === "POST") {
    try {
      const connection = createModelConnection(user.id, await body(request));
      audit(user.id, "model.connection.create", "model_connection", connection.id);
      return json({ connection }, 201);
    } catch (error) {
      return fail(error.code || "MODEL_CONNECTION_FAILED", error.status || 500);
    }
  }
  const connectionMatch = path.match(/^\/api\/model-connections\/([^/]+)$/);
  if (connectionMatch && request.method === "PATCH") {
    try {
      const connection = updateModelConnection(user.id, connectionMatch[1], await body(request));
      audit(user.id, "model.connection.update", "model_connection", connection.id);
      return json({ connection });
    } catch (error) {
      return fail(error.code || "MODEL_CONNECTION_FAILED", error.status || 500);
    }
  }
  if (connectionMatch && request.method === "DELETE") {
    try {
      deleteModelConnection(user.id, connectionMatch[1]);
      audit(user.id, "model.connection.delete", "model_connection", connectionMatch[1]);
      return json({ ok: true });
    } catch (error) {
      return fail(error.code || "MODEL_CONNECTION_FAILED", error.status || 500);
    }
  }
  const connectionRotate = path.match(/^\/api\/model-connections\/([^/]+)\/rotate$/);
  if (connectionRotate && request.method === "POST") {
    try {
      const data = await body(request);
      const connection = rotateModelCredential(user.id, connectionRotate[1], data.apiKey);
      audit(user.id, "model.connection.rotate", "model_connection", connection.id);
      return json({ connection });
    } catch (error) {
      return fail(error.code || "MODEL_CONNECTION_FAILED", error.status || 500);
    }
  }
  const connectionTest = path.match(/^\/api\/model-connections\/([^/]+)\/test$/);
  if (connectionTest && request.method === "POST") {
    if (rateLimited(request, "model-connection-test", user.id, 8, 60000)) {
      return fail("MODEL_TEST_RATE_LIMITED", 429);
    }
    try {
      return json(await testModelConnection(user.id, connectionTest[1]));
    } catch (error) {
      return fail(error.code || "MODEL_TEST_FAILED", error.status || 500);
    }
  }
  if (path.match(/^\/api\/tool-actions\/[^/]+$/) && request.method === "POST") {
    if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
    const slug = path.split("/")[3];
    const tool = db.prepare(`${toolSelect()} WHERE slug = ? AND active = 1`).get(slug);
    if (!tool) return fail("TOOL_NOT_FOUND", 404);
    try {
      if (slug === "sliding-ancestor-generator") {
        const result = await createAncestorTask(request, user, tool);
        runNextJob().catch(() => {});
        return json(result, 202);
      }
      return json(await runToolAction(request, user, tool), 201);
    } catch (error) {
      return fail(error.code || error.message || "TOOL_ACTION_FAILED", error.status || 500);
    }
  }
  const taskDetailMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDetailMatch && request.method === "GET") {
    const task = listTasks(user.id).find((item) => item.id === taskDetailMatch[1]);
    return task ? json({ task }) : fail("TASK_NOT_FOUND", 404);
  }
  const toolModelMatch = path.match(/^\/api\/tools\/([^/]+)\/model$/);
  if (toolModelMatch && request.method === "PATCH") {
    try {
      const data = await body(request);
      const preference = setToolModelPreference(user.id, toolModelMatch[1], data.modelConnectionId);
      audit(user.id, "tool.model.update", "tool", toolModelMatch[1], {
        route: preference.modelConnectionId === "managed" ? "managed" : "user_connection",
      });
      return json({ preference });
    } catch (error) {
      return fail(error.code || "TOOL_MODEL_UPDATE_FAILED", error.status || 500);
    }
  }
  if (path.match(/^\/api\/tasks\/[^/]+\/cancel$/) && request.method === "POST") {
    const id = path.split("/")[3];
    const result = db.prepare(`
      UPDATE tasks SET status = 'cancelled', updated_at = ?, completed_at = ?
      WHERE id = ? AND user_id = ? AND status IN ('queued','waiting_for_runtime')
    `).run(Date.now(), Date.now(), id, user.id);
    if (!result.changes) return fail("TASK_NOT_CANCELLABLE", 409);
    cancelExecutionJob(id);
    refundTask(db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id));
    return json({ ok: true });
  }
  if (path === "/api/files" && request.method === "GET") {
    const requestUrl = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number.parseInt(requestUrl.searchParams.get("limit") || "100", 10) || 100));
    const offset = Math.max(0, Number.parseInt(requestUrl.searchParams.get("offset") || "0", 10) || 0);
    const total = Number(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(user.id).count);
    return json({ files: db.prepare(`
      SELECT f.id, f.name, f.mime_type AS mimeType, f.size_bytes AS sizeBytes, f.created_at AS createdAt,
        COALESCE(s.provider, 'local') AS storageProvider,
        COALESCE((SELECT x.name_zh FROM task_files tf JOIN tasks t ON t.id = tf.task_id JOIN tools x ON x.id = t.tool_id
          WHERE tf.file_id = f.id ORDER BY t.created_at DESC LIMIT 1), '') AS sourceNameZh,
        COALESCE((SELECT x.name_en FROM task_files tf JOIN tasks t ON t.id = tf.task_id JOIN tools x ON x.id = t.tool_id
          WHERE tf.file_id = f.id ORDER BY t.created_at DESC LIMIT 1), '') AS sourceNameEn
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id
      WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?
    `).all(user.id, limit, offset), total, limit, offset, quota: userFileQuota(user.id) });
  }
  if (path === "/api/files" && request.method === "POST") return uploadFile(request, user);
  if (path === "/api/files/bulk-delete" && request.method === "POST") {
    const data = await body(request);
    const ids = [...new Set(Array.isArray(data.ids) ? data.ids : [])];
    if (!ids.length || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
      return fail("INVALID_FILE_SELECTION", 400);
    }
    const placeholders = ids.map(() => "?").join(",");
    const files = db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id
      WHERE f.user_id = ? AND f.id IN (${placeholders})`).all(user.id, ...ids);
    const deletedIds = [];
    const failedIds = [];
    for (const file of files) {
      try {
        await deleteStoredFile({ provider: file.storage_provider, objectKey: file.object_key, storageName: file.storage_name });
        const result = db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(file.id, user.id);
        if (result.changes) deletedIds.push(file.id);
      } catch {
        failedIds.push(file.id);
      }
    }
    audit(user.id, "file.bulk_delete", "user", user.id, {
      requestedCount: ids.length,
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
      skippedCount: ids.length - files.length,
    });
    return json({
      ok: failedIds.length === 0,
      deletedIds,
      failedIds,
      skippedCount: ids.length - files.length,
    });
  }
  if (path.match(/^\/api\/files\/[^/]+\/download$/) && request.method === "GET") {
    const id = path.split("/")[3];
    const file = db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ? AND f.user_id = ?`).get(id, user.id);
    if (!file) return fail("FILE_NOT_FOUND", 404);
    return new Response(await readStoredFile({ provider: file.storage_provider, objectKey: file.object_key, storageName: file.storage_name }), {
      headers: {
        "content-type": file.mime_type,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
  }
  if (path.match(/^\/api\/files\/[^/]+\/thumbnail$/) && request.method === "GET") {
    const id = path.split("/")[3];
    const file = db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key, s.etag
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ? AND f.user_id = ?`).get(id, user.id);
    if (!file) return fail("FILE_NOT_FOUND", 404);
    if (!String(file.mime_type || "").startsWith("image/")) return fail("FILE_THUMBNAIL_UNSUPPORTED", 415);
    const cacheKey = `file:${id}:${file.etag || file.created_at}`;
    try {
      let thumbnail = imageCache.get(cacheKey);
      if (!thumbnail) thumbnail = cacheImage(cacheKey, await optimizedImage(await readStoredFile({ provider: file.storage_provider, objectKey: file.object_key, storageName: file.storage_name }), { width: 480, quality: 76 }));
      return new Response(thumbnail, { headers: { "content-type": "image/webp", "cache-control": "private, max-age=86400" } });
    } catch { return fail("FILE_THUMBNAIL_FAILED", 422); }
  }
  if (path.match(/^\/api\/files\/[^/]+$/) && request.method === "DELETE") {
    const id = path.split("/")[3];
    const file = db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ? AND f.user_id = ?`).get(id, user.id);
    if (!file) return fail("FILE_NOT_FOUND", 404);
    await deleteStoredFile({ provider: file.storage_provider, objectKey: file.object_key, storageName: file.storage_name });
    db.prepare("DELETE FROM files WHERE id = ?").run(id);
    audit(user.id, "file.delete", "file", id);
    return json({ ok: true });
  }
  if (path === "/api/credits" && request.method === "GET") {
    const ledger = db.prepare(`
      SELECT id, type, amount, description_zh AS descriptionZh, description_en AS descriptionEn,
        reference_type AS referenceType, reference_id AS referenceId, created_at AS createdAt
      FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(user.id);
    return json({ balance: balance(user.id), ledger });
  }
  if (path === "/api/billing/status" && request.method === "GET") {
    const membership = effectiveMembership(user.id);
    const subscription = membership.code === "free" ? null : membership;
    const invoices = db.prepare(`
      SELECT id, status, amount_paid AS amountPaid, currency, hosted_url AS hostedUrl, created_at AS createdAt
      FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(user.id);
    const providers = [
      ...(config.billingEnabled ? [{ id: "stripe", mode: "production" }] : []),
      ...activePaymentProviders(),
    ];
    return json({ configured: providers.length > 0, providers, subscription, invoices });
  }
  if (path === "/api/billing/checkout" && request.method === "POST") return billingCheckout(request, user);
  const billingOrderMatch = path.match(/^\/api\/billing\/orders\/([^/]+)$/);
  if (billingOrderMatch && request.method === "GET") {
    try { return json({ order: domesticOrderStatus(decodeURIComponent(billingOrderMatch[1]), user.id) }); }
    catch (error) { return fail(error.code || "PAYMENT_ORDER_NOT_FOUND", error.status || 404); }
  }
  if (path === "/api/billing/portal" && request.method === "POST") return billingPortal(request, user);
  if (path === "/api/runtime/status" && request.method === "GET") {
    const preferences = listToolModelPreferences(user.id);
    return json({
      ...runtimeSummary(user.id),
      tools: storefrontTools()
        .sort((left, right) => `${left.category}:${left.nameEn}`.localeCompare(`${right.category}:${right.nameEn}`))
        .map((tool) => ({
          ...tool,
          modelConfigurable: tool.runtimeKind === "openai",
          modelConnectionId: preferences[tool.id] || "managed",
        })),
    });
  }
  return fail("NOT_FOUND", 404);
}
