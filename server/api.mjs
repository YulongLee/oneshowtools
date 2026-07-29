import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { audit, db, uploadDirectory } from "./database.mjs";
import { createSessionToken, hashPassword, hashToken, parseCookies, sessionCookie, verifyPassword } from "./security.mjs";
import { executeTask } from "./runtime.mjs";
import { runToolAction } from "./tool-actions.mjs";

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

function balance(userId) {
  return Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId)?.balance || 0);
}

function toolSelect() {
  return `SELECT id, slug, name_zh AS nameZh, name_en AS nameEn,
    description_zh AS descriptionZh, description_en AS descriptionEn,
    category, icon, credit_cost AS creditCost, runtime_kind AS runtimeKind,
    runtime_status AS runtimeStatus, active FROM tools`;
}

async function register(request) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  const name = String(data.name || "").trim();
  const password = String(data.password || "");
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return fail("INVALID_EMAIL");
  if (password.length < 10 || password.length > 128) return fail("INVALID_PASSWORD");
  if (!name || name.length > 80) return fail("INVALID_NAME");
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return fail("EMAIL_ALREADY_REGISTERED", 409);
  const id = randomUUID();
  const timestamp = Date.now();
  const passwordHash = await hashPassword(password);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, locale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, passwordHash, data.locale === "en" ? "en" : "zh-CN", timestamp, timestamp);
    db.prepare(`
      INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'welcome', 200, '新用户欢迎积分', 'New account welcome credits', 'user', ?, ?)
    `).run(randomUUID(), id, id, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(id, "user.register", "user", id);
  return createLoginResponse(id, 201);
}

function createLoginResponse(userId, status = 200) {
  const token = createSessionToken();
  const timestamp = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(timestamp);
  db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), userId, hashToken(token), timestamp + 14 * 86400000, timestamp);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return json({ user: cleanUser(user) }, status, { "set-cookie": sessionCookie(token) });
}

const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function googleRedirectUri(request) {
  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  return `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

function startGoogleAuth(request) {
  if (!googleConfigured()) return fail("GOOGLE_AUTH_NOT_CONFIGURED", 503);
  const state = createSessionToken();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  authorization.searchParams.set("redirect_uri", googleRedirectUri(request));
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("prompt", "select_account");
  const secure = process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      location: authorization.toString(),
      "set-cookie": `ost_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
    },
  });
}

async function finishGoogleAuth(request) {
  if (!googleConfigured()) return fail("GOOGLE_AUTH_NOT_CONFIGURED", 503);
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get("cookie") || "");
  if (!url.searchParams.get("code") || !url.searchParams.get("state") || cookies.ost_oauth_state !== url.searchParams.get("state")) {
    return fail("INVALID_OAUTH_STATE", 400);
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code"),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return fail("GOOGLE_TOKEN_EXCHANGE_FAILED", 502);
  const token = await tokenResponse.json();
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return fail("GOOGLE_PROFILE_FAILED", 502);
  const profile = await profileResponse.json();
  const email = String(profile.email || "").trim().toLowerCase();
  if (!email || !profile.email_verified) return fail("GOOGLE_EMAIL_UNVERIFIED", 403);

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    const id = randomUUID();
    const timestamp = Date.now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, locale, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'zh-CN', 1, ?, ?)
      `).run(id, String(profile.name || email.split("@")[0]).slice(0, 80), email, `oauth:google:${randomUUID()}`, timestamp, timestamp);
      db.prepare(`
        INSERT INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'welcome', 200, '新用户欢迎积分', 'New account welcome credits', 'user', ?, ?)
      `).run(randomUUID(), id, id, timestamp);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    audit(id, "user.register.google", "user", id);
  } else {
    db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(Date.now(), user.id);
  }
  const loginResponse = createLoginResponse(user.id);
  audit(user.id, "user.login.google", "user", user.id);
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": loginResponse.headers.get("set-cookie"),
    },
  });
}

async function login(request) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").get(email);
  if (!user || !(await verifyPassword(String(data.password || ""), user.password_hash))) {
    return fail("INVALID_CREDENTIALS", 401);
  }
  audit(user.id, "user.login", "user", user.id);
  return createLoginResponse(user.id);
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
  const safeExtension = extname(basename(file.name)).slice(0, 12).replace(/[^.\w-]/g, "");
  const storageName = `${id}${safeExtension}`;
  await writeFile(resolve(uploadDirectory, storageName), Buffer.from(await file.arrayBuffer()));
  db.prepare(`
    INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, basename(file.name).slice(0, 180), storageName, file.type || "application/octet-stream", file.size, Date.now());
  audit(user.id, "file.upload", "file", id, { size: file.size });
  return json({ file: db.prepare(`
    SELECT id, name, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt FROM files WHERE id = ?
  `).get(id) }, 201);
}

async function createTask(request, user) {
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
    }), tool.creditCost, timestamp, timestamp);
    if (tool.creditCost > 0) {
      db.prepare(`
        INSERT INTO credit_ledger
        (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
        VALUES (?, ?, 'consumption', ?, ?, ?, 'task', ?, ?)
      `).run(randomUUID(), user.id, -tool.creditCost, `使用${tool.nameZh}`, `Used ${tool.nameEn}`, id, timestamp);
    }
    const link = db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)");
    for (const fileId of fileIds) link.run(id, fileId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(user.id, "task.create", "task", id, { toolId: tool.id });
  setTimeout(() => executeTask(id), 20);
  return json({ task: db.prepare("SELECT id, status, credit_cost AS creditCost, created_at AS createdAt FROM tasks WHERE id = ?").get(id) }, 201);
}

function listTasks(userId) {
  return db.prepare(`
    SELECT t.id, t.status, t.credit_cost AS creditCost, t.error_code AS errorCode,
      t.input_json AS inputJson, t.output_json AS outputJson, t.created_at AS createdAt,
      t.updated_at AS updatedAt, t.completed_at AS completedAt,
      x.id AS toolId, x.name_zh AS toolNameZh, x.name_en AS toolNameEn, x.icon
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

async function billingCheckout(request, user) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRO_PRICE_ID) return fail("BILLING_NOT_CONFIGURED", 503);
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

export async function handleApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/health" && request.method === "GET") return json({
    ok: true,
    database: "sqlite",
    registrationEnabled: true,
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    billingEnabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID),
    openAiEnabled: Boolean(process.env.OPENAI_API_KEY),
    externalRuntimeEnabled: Boolean(process.env.TOOL_RUNTIME_BASE_URL),
  });
  if (path === "/api/auth/register" && request.method === "POST") return register(request);
  if (path === "/api/auth/login" && request.method === "POST") return login(request);
  if (path === "/api/auth/google/start" && request.method === "GET") return startGoogleAuth(request);
  if (path === "/api/auth/google/callback" && request.method === "GET") return finishGoogleAuth(request);
  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = parseCookies(request.headers.get("cookie") || "").ost_session;
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }
  if (path === "/api/auth/session" && request.method === "GET") {
    return json({ user: cleanUser(currentUser(request)) });
  }
  if (path === "/api/tools" && request.method === "GET") {
    const tools = db.prepare(`${toolSelect()} WHERE active = 1 ORDER BY name_en`).all();
    return json({ tools });
  }
  if (path === "/api/plans" && request.method === "GET") {
    const plans = db.prepare(`
      SELECT id, code, name_zh AS nameZh, name_en AS nameEn, amount_minor AS amountMinor,
        currency, interval, recurring_credits AS recurringCredits FROM plans WHERE active = 1 ORDER BY amount_minor
    `).all();
    return json({ plans });
  }

  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const user = auth.user;

  if (path === "/api/dashboard" && request.method === "GET") return json(dashboard(user.id));
  if (path === "/api/tasks" && request.method === "GET") return json({ tasks: listTasks(user.id) });
  if (path === "/api/tasks" && request.method === "POST") return createTask(request, user);
  if (path.match(/^\/api\/tool-actions\/[^/]+$/) && request.method === "POST") {
    const slug = path.split("/")[3];
    const tool = db.prepare(`${toolSelect()} WHERE slug = ? AND active = 1`).get(slug);
    if (!tool) return fail("TOOL_NOT_FOUND", 404);
    try {
      return json(await runToolAction(request, user, tool), 201);
    } catch (error) {
      return fail(error.code || error.message || "TOOL_ACTION_FAILED", error.status || 500);
    }
  }
  if (path.match(/^\/api\/tasks\/[^/]+\/cancel$/) && request.method === "POST") {
    const id = path.split("/")[3];
    const result = db.prepare(`
      UPDATE tasks SET status = 'cancelled', updated_at = ?, completed_at = ?
      WHERE id = ? AND user_id = ? AND status IN ('queued','waiting_for_runtime')
    `).run(Date.now(), Date.now(), id, user.id);
    return result.changes ? json({ ok: true }) : fail("TASK_NOT_CANCELLABLE", 409);
  }
  if (path === "/api/files" && request.method === "GET") {
    return json({ files: db.prepare(`
      SELECT id, name, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
      FROM files WHERE user_id = ? ORDER BY created_at DESC
    `).all(user.id) });
  }
  if (path === "/api/files" && request.method === "POST") return uploadFile(request, user);
  if (path.match(/^\/api\/files\/[^/]+\/download$/) && request.method === "GET") {
    const id = path.split("/")[3];
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(id, user.id);
    if (!file) return fail("FILE_NOT_FOUND", 404);
    return new Response(await readFile(resolve(uploadDirectory, file.storage_name)), {
      headers: {
        "content-type": file.mime_type,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
  }
  if (path.match(/^\/api\/files\/[^/]+$/) && request.method === "DELETE") {
    const id = path.split("/")[3];
    const file = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?").get(id, user.id);
    if (!file) return fail("FILE_NOT_FOUND", 404);
    db.prepare("DELETE FROM files WHERE id = ?").run(id);
    await rm(resolve(uploadDirectory, file.storage_name), { force: true });
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
    return json({ configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID), subscription });
  }
  if (path === "/api/billing/checkout" && request.method === "POST") return billingCheckout(request, user);
  if (path === "/api/runtime/status" && request.method === "GET") {
    return json({
      providers: [
        { id: "openai", name: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-4.1-mini" },
        { id: "external", name: "Tool Runtime", configured: Boolean(process.env.TOOL_RUNTIME_BASE_URL), endpoint: process.env.TOOL_RUNTIME_BASE_URL || null },
      ],
      tools: db.prepare(`${toolSelect()} WHERE active = 1 ORDER BY category, name_en`).all(),
    });
  }
  return fail("NOT_FOUND", 404);
}
