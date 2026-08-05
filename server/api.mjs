import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { audit, db } from "./database.mjs";
import { deleteStoredFile, putStoredFile, readStoredFile } from "./object-storage.mjs";
import { getServerConfig, validateServerConfig } from "./config.mjs";
import { sendAccountEmail } from "./email.mjs";
import {
  createSessionToken,
  hashPassword,
  hashToken,
  parseCookies,
  requestClient,
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
  createMusicCover, createMusicGeneration, deleteMusicTrack, listMusicTracks, musicStudioStatus,
} from "./music-studio.mjs";
import { createAdminHandler } from "./admin.mjs";
import { recordMarketplaceBehavior, recordMarketplaceSearch } from "./market-intelligence.mjs";
import { cancelExecutionJob, enqueueTask, runNextJob } from "./jobs.mjs";
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
} from "./model-gateway.mjs";

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const fail = (code, status = 400) => json({ error: { code } }, status);
const cleanUser = (row) => row && ({
  id: row.id,
  name: row.name,
  email: row.email,
  locale: row.locale,
  emailVerified: Boolean(row.email_verified),
  createdAt: row.created_at,
});

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
  const token = parseCookies(request.headers.get("cookie") || "").ost_session;
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

function toolSelect() {
  return `SELECT id, slug, name_zh AS nameZh, name_en AS nameEn,
    description_zh AS descriptionZh, description_en AS descriptionEn,
    category, icon, credit_cost AS creditCost, runtime_kind AS runtimeKind,
    runtime_status AS runtimeStatus, active FROM tools`;
}

function storefrontTools() {
  const specialists = new Map(seoCatalog().specialists.map((item) => [item.slug, item]));
  return db.prepare(`${toolSelect()} WHERE active = 1 ORDER BY name_en`).all().map((tool) => {
    const specialist = specialists.get(tool.slug);
    if (!specialist || specialist.ready) return tool;
    return { ...tool, runtimeStatus: "configuration_required" };
  });
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
  return json({ user: cleanUser(user) }, status, { "set-cookie": sessionCookie(token) });
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
  const subscription = db.prepare(`
    SELECT s.status, s.current_period_end AS currentPeriodEnd, p.name_zh AS nameZh, p.name_en AS nameEn
    FROM subscriptions s JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1
  `).get(userId) || null;
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
      x.id AS toolId, x.slug AS toolSlug, x.name_zh AS toolNameZh, x.name_en AS toolNameEn, x.icon
    FROM tasks t JOIN tools x ON x.id = t.tool_id
    WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 100
  `).all(userId).map((task) => ({
    ...task,
    input: JSON.parse(task.inputJson || "{}"),
    output: task.outputJson ? JSON.parse(task.outputJson) : null,
    inputJson: undefined,
    outputJson: undefined,
  }));
}

function currentSession(request) {
  const token = parseCookies(request.headers.get("cookie") || "").ost_session;
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
  if (!config.billingEnabled) return fail("BILLING_NOT_CONFIGURED", 503);
  if (!user.email_verified) return fail("EMAIL_UNVERIFIED", 403);
  if (deletionPending(user.id)) return fail("ACCOUNT_DELETION_PENDING", 403);
  const data = await body(request);
  if (data.planId !== "plan_pro") return fail("PLAN_NOT_FOUND", 404);
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`,
    metadata: { userId: user.id, planId: "plan_pro" },
  });
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
      db.prepare(`
        INSERT INTO subscriptions
        (id, user_id, plan_id, provider, provider_subscription_id, status, created_at, updated_at)
        VALUES (?, ?, 'plan_pro', 'stripe', ?, 'pending', ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
      `).run(`stripe:${object.subscription}`, user.id, String(object.subscription), timestamp, timestamp);
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
    db.prepare(`
      INSERT INTO subscriptions
      (id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, created_at, updated_at)
      VALUES (?, ?, 'plan_pro', 'stripe', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status,
        current_period_end = excluded.current_period_end, updated_at = excluded.updated_at
    `).run(
      `stripe:${object.id}`,
      user.id,
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
      db.prepare(`
        INSERT OR IGNORE INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'subscription_grant', 2000, '专业版月度积分', 'Pro monthly credits', 'stripe_invoice', ?, ?)
      `).run(randomUUID(), user.id, object.id, timestamp);
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
  if (path === "/api/health" && request.method === "GET") return json({
    ok: true,
    database: "sqlite",
    registrationEnabled: config.registrationEnabled,
    billingEnabled: config.billingEnabled,
    accountDeletionEnabled: config.accountDeletionEnabled,
    emailEnabled: config.emailConfigured,
    configurationReady: configurationErrors.length === 0,
    configurationErrors,
    oneShowModelEnabled: gatewayFlags().managedConfigured && gatewayFlags().managedExecutionEnabled,
    musicGenerationEnabled: musicStudioStatus().ready,
    externalRuntimeEnabled: Boolean(process.env.TOOL_RUNTIME_BASE_URL),
    adminConsoleVersion: "v1",
    adminMfaEnforced: config.adminMfaEnforced,
  });
  if (path === "/api/billing/webhook" && request.method === "POST") return stripeWebhook(request);
  if (path === "/api/auth/verify" && request.method === "GET") return verifyEmail(request);
  if (path === "/api/auth/confirm-email" && request.method === "GET") return confirmEmailChange(request);
  if (!sameOrigin(request, config.appUrl)) return fail("ORIGIN_NOT_ALLOWED", 403);
  if (path === "/api/auth/register" && request.method === "POST") return register(request);
  if (path === "/api/auth/login" && request.method === "POST") return login(request);
  if (path === "/api/auth/resend-verification" && request.method === "POST") return resendVerification(request);
  if (path === "/api/auth/forgot-password" && request.method === "POST") return requestPasswordReset(request);
  if (path === "/api/auth/reset-password" && request.method === "POST") return resetPassword(request);
  if (path.startsWith("/api/auth/google/")) return fail("NOT_FOUND", 404);
  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = parseCookies(request.headers.get("cookie") || "").ost_session;
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }
  if (path === "/api/auth/session" && request.method === "GET") {
    return json({ user: cleanUser(currentUser(request)) });
  }
  if (path === "/api/tools" && request.method === "GET") {
    return json({ tools: storefrontTools() });
  }
  if (path === "/api/writing/catalog" && request.method === "GET") return json(writingCatalog());
  if (path === "/api/seo/catalog" && request.method === "GET") return json(seoCatalog());
  if (path === "/api/music/status" && request.method === "GET") return json(musicStudioStatus());
  if (path === "/api/plans" && request.method === "GET") {
    const plans = db.prepare(`
      SELECT id, code, name_zh AS nameZh, name_en AS nameEn, amount_minor AS amountMinor,
        currency, interval, recurring_credits AS recurringCredits FROM plans WHERE active = 1 ORDER BY amount_minor
    `).all();
    return json({ plans });
  }
  if (path.startsWith("/api/admin/v1/")) return handleAdminV1(request, path);
  if (path.startsWith("/api/admin/")) return handleAdmin(request, path);

  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const user = auth.user;

  if (path === "/api/seo-agent" || path.startsWith("/api/seo-agent/")) return handleSeoAgent(request, user, path);
  if (path === "/api/music/tracks" && request.method === "GET") return json({ tracks: listMusicTracks(user.id) });
  if (path === "/api/music/generations" && request.method === "POST") {
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
    try { return json(await createMusicCover(user, musicCoverMatch[1]), 201); }
    catch (error) { return fail(error.code || "MUSIC_COVER_GENERATION_FAILED", error.status || 500); }
  }

  if (path === "/api/dashboard" && request.method === "GET") return json(dashboard(user.id));
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
  if (path === "/api/tasks" && request.method === "POST") return createTask(request, user);
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
      return json(await runToolAction(request, user, tool), 201);
    } catch (error) {
      return fail(error.code || error.message || "TOOL_ACTION_FAILED", error.status || 500);
    }
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
    return json({ files: db.prepare(`
      SELECT f.id, f.name, f.mime_type AS mimeType, f.size_bytes AS sizeBytes, f.created_at AS createdAt,
        COALESCE(s.provider, 'local') AS storageProvider
      FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id
      WHERE f.user_id = ? ORDER BY f.created_at DESC
    `).all(user.id) });
  }
  if (path === "/api/files" && request.method === "POST") return uploadFile(request, user);
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
    const subscription = db.prepare(`
      SELECT s.status, s.current_period_end AS currentPeriodEnd, p.id AS planId,
        p.name_zh AS nameZh, p.name_en AS nameEn
      FROM subscriptions s JOIN plans p ON p.id = s.plan_id
      WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1
    `).get(user.id) || null;
    const invoices = db.prepare(`
      SELECT id, status, amount_paid AS amountPaid, currency, hosted_url AS hostedUrl, created_at AS createdAt
      FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(user.id);
    return json({ configured: config.billingEnabled, subscription, invoices });
  }
  if (path === "/api/billing/checkout" && request.method === "POST") return billingCheckout(request, user);
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
