import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";

const provider = "dataforseo";
const owner = "platform:seo";
const clean = (value, max = 500) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const configError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const hint = (secret) => {
  const value = clean(secret, 2000);
  return value.length > 4 ? `••••${value.slice(-4)}` : "••••";
};

function row() {
  return db.prepare("SELECT * FROM seo_provider_configs WHERE provider = ?").get(provider);
}

function credentialRow(config) {
  return {
    user_id: owner,
    id: provider,
    credential_version: config.credential_version,
    key_ciphertext: config.password_ciphertext,
    key_iv: config.password_iv,
    key_tag: config.password_tag,
  };
}

function publicConfig(config = row()) {
  if (!config) return {
    provider, configured: false, enabled: false, loginHint: null, passwordHint: null,
    lastTestStatus: null, lastTestLatencyMs: null, balance: null, currency: null,
    lastTestedAt: null, updatedAt: null,
  };
  const [name = "", domain = ""] = config.login.split("@");
  return {
    provider, configured: true, enabled: config.status === "active",
    loginHint: domain ? `${name.slice(0, 2)}•••@${domain}` : `${config.login.slice(0, 2)}•••`,
    passwordHint: config.password_hint, lastTestStatus: config.last_test_status,
    lastTestLatencyMs: config.last_test_latency_ms, balance: config.last_balance,
    currency: config.last_currency || "USD", lastTestedAt: config.last_tested_at,
    updatedAt: config.updated_at,
  };
}

export function seoProviderConfiguration() {
  return publicConfig();
}

export function dataForSeoCredentials(env = process.env) {
  if (env === process.env) {
    const config = row();
    if (config) {
      if (config.status !== "active") return null;
      return { login: config.login, password: decryptCredential(credentialRow(config)), source: "admin" };
    }
  }
  if (env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD) {
    return { login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD, source: "environment" };
  }
  return null;
}

function normalize(data, existing) {
  const login = clean(data.login || existing?.login, 320).toLowerCase();
  const password = clean(data.password, 2000);
  const status = data.status === "disabled" ? "disabled" : "active";
  if (!login || !login.includes("@")) throw configError("SEO_PROVIDER_LOGIN_INVALID", 422);
  if (!password && !existing) throw configError("SEO_PROVIDER_PASSWORD_REQUIRED", 422);
  return { login, password, status };
}

function responseDetails(payload) {
  const candidate = payload?.tasks?.[0]?.result?.[0] || payload?.result?.[0] || payload;
  const balance = Number(candidate?.money?.balance ?? candidate?.balance ?? candidate?.account_balance);
  return {
    balance: Number.isFinite(balance) ? balance : null,
    currency: clean(candidate?.money?.currency || candidate?.currency || "USD", 10) || "USD",
  };
}

async function verify(login, password, fetchImpl = fetch) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchImpl("https://api.dataforseo.com/v3/appendix/user_data", {
      method: "GET",
      headers: { authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`, accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw configError("SEO_PROVIDER_UNREACHABLE", 502);
  }
  if (response.status === 401 || response.status === 403) throw configError("SEO_PROVIDER_AUTH_FAILED", 422);
  if (!response.ok) throw configError("SEO_PROVIDER_UNAVAILABLE", 502);
  const payload = await response.json().catch(() => null);
  if (Number(payload?.status_code) >= 40000) {
    if ([40100, 40101, 40102].includes(Number(payload.status_code))) throw configError("SEO_PROVIDER_AUTH_FAILED", 422);
    throw configError("SEO_PROVIDER_TEST_FAILED", 422);
  }
  const taskStatus = payload?.tasks?.[0]?.status_code;
  if (taskStatus && Number(taskStatus) >= 40000) {
    if ([40100, 40101, 40102].includes(Number(taskStatus))) throw configError("SEO_PROVIDER_AUTH_FAILED", 422);
    throw configError("SEO_PROVIDER_TEST_FAILED", 422);
  }
  return { status: "healthy", latencyMs: Date.now() - startedAt, ...responseDetails(payload) };
}

export async function testSeoProviderConfiguration(data, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const password = input.password || decryptCredential(credentialRow(existing));
  return verify(input.login, password, fetchImpl);
}

export async function saveSeoProviderConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const password = input.password || decryptCredential(credentialRow(existing));
  const tested = await verify(input.login, password, fetchImpl);
  const version = existing ? existing.credential_version + (input.password ? 1 : 0) : 1;
  const encrypted = input.password
    ? encryptCredential(password, owner, provider, version)
    : { ciphertext: existing.password_ciphertext, iv: existing.password_iv, tag: existing.password_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO seo_provider_configs (
      provider, login, password_ciphertext, password_iv, password_tag, password_hint,
      credential_version, status, last_test_status, last_test_latency_ms, last_balance,
      last_currency, last_tested_at, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      login=excluded.login, password_ciphertext=excluded.password_ciphertext,
      password_iv=excluded.password_iv, password_tag=excluded.password_tag,
      password_hint=excluded.password_hint, credential_version=excluded.credential_version,
      status=excluded.status, last_test_status=excluded.last_test_status,
      last_test_latency_ms=excluded.last_test_latency_ms, last_balance=excluded.last_balance,
      last_currency=excluded.last_currency, last_tested_at=excluded.last_tested_at,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(
    provider, input.login, encrypted.ciphertext, encrypted.iv, encrypted.tag,
    input.password ? hint(password) : existing.password_hint, version, input.status,
    tested.status, tested.latencyMs, tested.balance, tested.currency, timestamp,
    actorUserId, existing?.created_at || timestamp, timestamp,
  );
  return publicConfig();
}
