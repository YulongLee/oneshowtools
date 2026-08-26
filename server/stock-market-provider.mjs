import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";
import { HttpMarketDataProvider, installStockMarketProviderResolver } from "./market-data.mjs";

const provider = "licensed_http";
const owner = "platform:stock-market";
const clean = (value, max = 2048) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const configError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const keyHint = (key) => key.length > 4 ? `••••${key.slice(-4)}` : "••••";

function safeUrl(value, required = true) {
  const input = clean(value, 500);
  if (!input && !required) return "";
  let url;
  try { url = new URL(input); } catch { throw configError("STOCK_PROVIDER_URL_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw configError("STOCK_PROVIDER_URL_INVALID");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw configError("STOCK_PROVIDER_URL_INVALID");
  }
  return url.toString();
}

function row() {
  return db.prepare("SELECT * FROM stock_market_provider_configs WHERE provider = ?").get(provider);
}

function credentialRow(config) {
  return { user_id: owner, id: provider, credential_version: config.credential_version, key_ciphertext: config.key_ciphertext, key_iv: config.key_iv, key_tag: config.key_tag };
}

function publicConfig(config = row()) {
  if (!config) return {
    provider: "tencent_finance", configured: false, builtIn: true, enabled: true,
    activeProvider: "腾讯财经", quoteUrl: "", searchUrl: "", keyHint: null,
    cacheTtlMs: 12000, lastTestStatus: null, lastTestLatencyMs: null, lastTestedAt: null, updatedAt: null,
  };
  return {
    provider, configured: true, enabled: config.status === "active", quoteUrl: config.quote_url,
    searchUrl: config.search_url, keyHint: config.key_hint, cacheTtlMs: config.cache_ttl_ms,
    lastTestStatus: config.last_test_status, lastTestLatencyMs: config.last_test_latency_ms,
    lastTestedAt: config.last_tested_at, updatedAt: config.updated_at,
  };
}

export function stockMarketProviderConfiguration() {
  return publicConfig();
}

export function stockMarketProviderCredentials() {
  const config = row();
  if (!config || config.status !== "active") return null;
  return { ...publicConfig(config), apiKey: decryptCredential(credentialRow(config)) };
}

function normalize(data, existing) {
  const quoteUrl = safeUrl(data.quoteUrl || existing?.quote_url);
  const searchUrl = safeUrl(data.searchUrl || existing?.search_url, false);
  const apiKey = clean(data.apiKey);
  if (!apiKey && !existing) throw configError("STOCK_PROVIDER_API_KEY_REQUIRED");
  return {
    quoteUrl, searchUrl, apiKey,
    cacheTtlMs: Math.max(5000, Math.min(300000, Number(data.cacheTtlMs || existing?.cache_ttl_ms || 12000))),
    status: data.status === "disabled" ? "disabled" : "active",
  };
}

async function verify(input, apiKey, fetchImpl = fetch) {
  const startedAt = Date.now();
  const client = new HttpMarketDataProvider({ endpoint: input.quoteUrl, searchEndpoint: input.searchUrl, apiKey, fetchImpl });
  let quotes;
  try { quotes = await client.getQuotes(["600519.SH"]); }
  catch (error) {
    if (error?.providerStatus === 401 || error?.providerStatus === 403) throw configError("STOCK_PROVIDER_AUTH_FAILED");
    throw configError(error?.code || "STOCK_PROVIDER_UNREACHABLE", 502);
  }
  const quote = quotes?.[0];
  if (!quote || !quote.symbol || !Number.isFinite(Number(quote.price))) throw configError("STOCK_PROVIDER_RESPONSE_INVALID", 502);
  if (input.searchUrl) {
    const items = await client.searchSymbols("茅台").catch((error) => { throw configError(error?.code || "STOCK_SEARCH_PROVIDER_FAILED", 502); });
    if (!Array.isArray(items)) throw configError("STOCK_SEARCH_RESPONSE_INVALID", 502);
  }
  return { status: "healthy", latencyMs: Date.now() - startedAt, sample: { symbol: quote.symbol, price: Number(quote.price) } };
}

export async function testStockMarketProviderConfiguration(data, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  return verify(input, apiKey, fetchImpl);
}

export async function saveStockMarketProviderConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  const tested = await verify(input, apiKey, fetchImpl);
  const version = existing ? existing.credential_version + (input.apiKey ? 1 : 0) : 1;
  const encrypted = input.apiKey ? encryptCredential(apiKey, owner, provider, version) : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO stock_market_provider_configs (
      provider, quote_url, search_url, key_ciphertext, key_iv, key_tag, key_hint,
      credential_version, cache_ttl_ms, status, last_test_status, last_test_latency_ms,
      last_tested_at, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET quote_url=excluded.quote_url, search_url=excluded.search_url,
      key_ciphertext=excluded.key_ciphertext, key_iv=excluded.key_iv, key_tag=excluded.key_tag,
      key_hint=excluded.key_hint, credential_version=excluded.credential_version,
      cache_ttl_ms=excluded.cache_ttl_ms, status=excluded.status,
      last_test_status=excluded.last_test_status, last_test_latency_ms=excluded.last_test_latency_ms,
      last_tested_at=excluded.last_tested_at, updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(provider, input.quoteUrl, input.searchUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag,
    input.apiKey ? keyHint(apiKey) : existing.key_hint, version, input.cacheTtlMs, input.status,
    tested.status, tested.latencyMs, timestamp, actorUserId, existing?.created_at || timestamp, timestamp);
  return publicConfig();
}

installStockMarketProviderResolver(stockMarketProviderCredentials);
