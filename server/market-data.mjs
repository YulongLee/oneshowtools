const TENCENT_QUOTE_URL = "https://qt.gtimg.cn/q=";
const TENCENT_SEARCH_URL = "https://smartbox.gtimg.cn/s3/";
const TENCENT_KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";
const TENCENT_MINUTE_URL = "https://web.ifzq.gtimg.cn/appstock/app/minute/query";
const TENCENT_US_MINUTE_URL = "https://web.ifzq.gtimg.cn/appstock/app/UsMinute/query";

function cleanSymbol(value) { return String(value || "").trim().toUpperCase(); }

export function normalizeMarketSymbol(value) {
  const symbol = cleanSymbol(value);
  let match = symbol.match(/^(\d{6})\.(SS|SH|SZ)$/);
  if (match) return `${match[1]}.${match[2] === "SZ" ? "SZ" : "SS"}`;
  match = symbol.match(/^(\d{1,5})\.HK$/);
  if (match) return `${match[1].padStart(5, "0")}.HK`;
  match = symbol.match(/^([A-Z][A-Z0-9.-]{0,14})\.US$/);
  if (match) return `${match[1]}.US`;
  return "";
}

export function marketFromSymbol(value) {
  const symbol = normalizeMarketSymbol(value);
  if (symbol.endsWith(".HK")) return "HK";
  if (symbol.endsWith(".US")) return "US";
  if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) return "A";
  return "";
}

export function toTencentSymbol(value) {
  const symbol = normalizeMarketSymbol(value);
  if (!symbol) return "";
  if (symbol.endsWith(".SS")) return `sh${symbol.slice(0, 6)}`;
  if (symbol.endsWith(".SZ")) return `sz${symbol.slice(0, 6)}`;
  if (symbol.endsWith(".HK")) return `hk${symbol.slice(0, 5)}`;
  return `us${symbol.slice(0, -3)}`;
}

function fromTencentSymbol(prefix, code = "") {
  const key = String(prefix || "").toLowerCase();
  if (key === "sh") return `${String(code).padStart(6, "0")}.SS`;
  if (key === "sz") return `${String(code).padStart(6, "0")}.SZ`;
  if (key === "hk") return `${String(code).padStart(5, "0")}.HK`;
  if (key === "us") return `${String(code).split(".")[0].toUpperCase()}.US`;
  return "";
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function decodeTencentText(buffer) {
  try { return new TextDecoder("gb18030").decode(buffer); }
  catch { return new TextDecoder().decode(buffer); }
}

function decodeEscapedText(value) {
  try { return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`); }
  catch { return String(value); }
}

function tencentTimestamp(value, market) {
  const input = String(value || "").trim();
  let match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+08:00`;
  match = input.match(/^(\d{4})[/-](\d{2})[/-](\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const offset = market === "US" ? "-04:00" : "+08:00";
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${offset}`;
  }
  return Date.now();
}

export function parseTencentQuotes(text, requestedSymbols = []) {
  const requested = new Map(requestedSymbols.map((symbol) => [toTencentSymbol(symbol).toLowerCase(), normalizeMarketSymbol(symbol)]));
  const quotes = [];
  const expression = /v_([a-zA-Z0-9.]+)="([\s\S]*?)";/g;
  let match;
  while ((match = expression.exec(String(text || "")))) {
    const providerSymbol = match[1].toLowerCase();
    const fields = match[2].split("~");
    if (fields.length < 6) continue;
    const prefix = providerSymbol.slice(0, 2);
    const symbol = requested.get(providerSymbol) || fromTencentSymbol(prefix, fields[2]);
    const price = finiteNumber(fields[3]);
    const previousClose = finiteNumber(fields[4]);
    if (!symbol || price === undefined) continue;
    const change = finiteNumber(fields[31]) ?? (previousClose === undefined ? 0 : price - previousClose);
    const changePercent = finiteNumber(fields[32]) ?? (previousClose ? (change / previousClose) * 100 : 0);
    const market = marketFromSymbol(symbol);
    const currency = fields.find((field) => ["CNY", "HKD", "USD"].includes(field)) || (market === "HK" ? "HKD" : market === "US" ? "USD" : "CNY");
    quotes.push({
      symbol, code: symbol.slice(0, symbol.lastIndexOf(".")), name: fields[1] || symbol, market,
      price, previousClose, open: finiteNumber(fields[5]), high: finiteNumber(fields[33]), low: finiteNumber(fields[34]),
      volume: finiteNumber(fields[6]), change, changePercent, updatedAt: tencentTimestamp(fields[30], market), currency,
      online: true, source: "tencent_finance", sourceLabel: "腾讯财经",
    });
  }
  return quotes;
}

export function parseTencentSearch(text) {
  const value = String(text || "").match(/v_hint="([\s\S]*?)"/)?.[1] || "";
  return decodeEscapedText(value).split("^").map((entry) => {
    const [prefix, code, name] = entry.split("~");
    const symbol = fromTencentSymbol(prefix, code);
    if (!symbol || !name) return null;
    return { symbol, code: symbol.slice(0, symbol.lastIndexOf(".")), name, market: marketFromSymbol(symbol) };
  }).filter(Boolean).slice(0, 10);
}

function providerSymbolFromTencentSearch(text, logicalSymbol) {
  const target = normalizeMarketSymbol(logicalSymbol);
  const value = String(text || "").match(/v_hint="([\s\S]*?)"/)?.[1] || "";
  for (const entry of decodeEscapedText(value).split("^")) {
    const [prefix, code] = entry.split("~");
    if (fromTencentSymbol(prefix, code) === target)
      return `${String(prefix).toLowerCase()}${String(prefix).toLowerCase() === "us" ? String(code).toUpperCase() : code}`;
  }
  return "";
}

export function parseTencentHistory(payload, providerSymbol, period = "day") {
  const root = payload?.data?.[providerSymbol] || {};
  if (period === "minute") {
    const rows = root?.data?.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
      const [time, price, volume, amount] = String(row || "").trim().split(/\s+/);
      const value = finiteNumber(price);
      if (!/^\d{4}$/.test(time) || value === undefined) return null;
      return { time, open: value, close: value, high: value, low: value, volume: finiteNumber(volume) || 0, amount: finiteNumber(amount) || 0 };
    }).filter(Boolean);
  }
  const rows = root[`qfq${period}`] || root[period] || [];
  return Array.isArray(rows) ? rows.map((row) => {
    if (!Array.isArray(row) || row.length < 5) return null;
    const [time, open, close, high, low, volume] = row;
    if (!time || [open, close, high, low].some((value) => finiteNumber(value) === undefined)) return null;
    return { time: String(time), open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: finiteNumber(volume) || 0 };
  }).filter(Boolean) : [];
}

export class TencentFinanceMarketDataProvider {
  constructor({ fetchImpl = fetch, quoteUrl = TENCENT_QUOTE_URL, searchUrl = TENCENT_SEARCH_URL, klineUrl = TENCENT_KLINE_URL, minuteUrl = TENCENT_MINUTE_URL, usMinuteUrl = TENCENT_US_MINUTE_URL } = {}) {
    this.fetchImpl = fetchImpl; this.quoteUrl = quoteUrl; this.searchUrl = searchUrl; this.klineUrl = klineUrl; this.minuteUrl = minuteUrl; this.usMinuteUrl = usMinuteUrl;
  }

  async getText(url) {
    const response = await this.fetchImpl(url, {
      method: "GET", headers: { accept: "text/plain,*/*", "user-agent": "OneShowTools-StockPet/1.0" }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Object.assign(new Error("STOCK_PROVIDER_FAILED"), { code: "STOCK_PROVIDER_FAILED", status: 502, providerStatus: response.status });
    return decodeTencentText(await response.arrayBuffer());
  }

  async getQuotes(symbols) {
    const normalized = [...new Set(symbols.map(normalizeMarketSymbol).filter(Boolean))].slice(0, 50);
    if (!normalized.length) return [];
    const query = normalized.map(toTencentSymbol).join(",");
    return parseTencentQuotes(await this.getText(`${this.quoteUrl}${query}`), normalized);
  }

  async searchSymbols(query) {
    const term = String(query || "").trim().slice(0, 40);
    if (!term) return [];
    const url = new URL(this.searchUrl);
    url.searchParams.set("q", term); url.searchParams.set("t", "all");
    return parseTencentSearch(await this.getText(url.toString()));
  }

  async resolveProviderSymbol(symbol) {
    const normalized = normalizeMarketSymbol(symbol);
    if (!normalized.endsWith(".US")) return toTencentSymbol(normalized);
    const url = new URL(this.searchUrl);
    url.searchParams.set("q", normalized.slice(0, -3)); url.searchParams.set("t", "all");
    return providerSymbolFromTencentSearch(await this.getText(url.toString()), normalized) || toTencentSymbol(normalized);
  }

  async getHistory(symbol, { range = "1m" } = {}) {
    const normalized = normalizeMarketSymbol(symbol);
    if (!normalized) return [];
    const providerSymbol = await this.resolveProviderSymbol(normalized);
    if (range === "1d") {
      // Tencent's US minute endpoint accepts the base code (usAAPL), while
      // its daily K-line endpoint may return an exchange-qualified code
      // (usAAPL.OQ). Keep both conventions behind the server adapter.
      const minuteSymbol = normalized.endsWith(".US") ? providerSymbol.split(".")[0] : providerSymbol;
      const url = new URL(normalized.endsWith(".US") ? this.usMinuteUrl : this.minuteUrl);
      url.searchParams.set("code", minuteSymbol);
      const payload = JSON.parse(await this.getText(url.toString()));
      return parseTencentHistory(payload, minuteSymbol, "minute");
    }
    const counts = { "1m": 24, "3m": 72, "1y": 260 };
    const url = new URL(this.klineUrl);
    url.searchParams.set("param", `${providerSymbol},day,,,${counts[range] || counts["1m"]},qfq`);
    const payload = JSON.parse(await this.getText(url.toString()));
    return parseTencentHistory(payload, providerSymbol, "day");
  }
}

export class HttpMarketDataProvider {
  constructor({ endpoint, searchEndpoint = "", historyEndpoint = "", apiKey = "", fetchImpl = fetch }) {
    this.endpoint = endpoint; this.searchEndpoint = searchEndpoint; this.historyEndpoint = historyEndpoint; this.apiKey = apiKey; this.fetchImpl = fetchImpl;
  }
  async request(endpoint, body) {
    const response = await this.fetchImpl(endpoint, {
      method: "POST", headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Object.assign(new Error("STOCK_PROVIDER_FAILED"), { code: "STOCK_PROVIDER_FAILED", status: 502, providerStatus: response.status });
    return response.json();
  }
  async getQuotes(symbols) {
    const payload = await this.request(this.endpoint, { symbols });
    return Array.isArray(payload.quotes) ? payload.quotes : [];
  }
  async searchSymbols(query) {
    if (!this.searchEndpoint) return [];
    const payload = await this.request(this.searchEndpoint, { query, market: "ALL", limit: 10 });
    return Array.isArray(payload.items) ? payload.items : [];
  }
  async getHistory(symbol, options = {}) {
    if (!this.historyEndpoint) throw Object.assign(new Error("STOCK_HISTORY_NOT_SUPPORTED"), { code: "STOCK_HISTORY_NOT_SUPPORTED", status: 503 });
    const payload = await this.request(this.historyEndpoint, { symbol, ...options });
    return Array.isArray(payload.items) ? payload.items : Array.isArray(payload.history) ? payload.history : [];
  }
}

export class MarketDataService {
  constructor(provider, ttlMs = 12000) { this.provider = provider; this.ttlMs = ttlMs; this.cache = new Map(); this.historyCache = new Map(); }
  async getQuotes(symbols) {
    const now = Date.now(), result = new Map(), missing = [];
    for (const original of symbols) {
      const symbol = normalizeMarketSymbol(original) || original;
      const cached = this.cache.get(symbol);
      if (cached && now - cached.cachedAt < this.ttlMs) result.set(symbol, cached.quote); else missing.push(symbol);
    }
    if (missing.length) {
      const quotes = await this.provider.getQuotes(missing);
      for (const quote of quotes) {
        const symbol = normalizeMarketSymbol(quote?.symbol);
        if (!symbol) continue;
        const normalized = { ...quote, symbol };
        this.cache.set(symbol, { quote: normalized, cachedAt: now }); result.set(symbol, normalized);
      }
    }
    return symbols.map((original) => result.get(normalizeMarketSymbol(original) || original)).filter(Boolean);
  }
  async searchSymbols(query) { return this.provider.searchSymbols?.(query) || []; }
  async getHistory(symbol, options = {}) {
    const normalized = normalizeMarketSymbol(symbol) || symbol;
    const range = String(options.range || "1m");
    const key = `${normalized}:${range}`;
    const now = Date.now();
    const cached = this.historyCache.get(key);
    const ttl = range === "1d" ? Math.max(30000, this.ttlMs) : 300000;
    if (cached && now - cached.cachedAt < ttl) return cached.items;
    const items = await this.provider.getHistory?.(normalized, options) || [];
    this.historyCache.set(key, { items, cachedAt: now });
    return items;
  }
}

let activeService;
let activeSignature = "";

export function marketDataService() {
  const stored = dbConfiguredProvider();
  const endpoint = String(stored?.quoteUrl || process.env.STOCK_QUOTE_API_URL || "").trim();
  const providerMode = String(process.env.STOCK_MARKET_PROVIDER || "").trim().toLowerCase();
  const useLicensedHttp = Boolean(stored || endpoint) && providerMode !== "tencent_finance";
  const apiKey = String(stored?.apiKey || process.env.STOCK_QUOTE_API_KEY || "");
  const searchEndpoint = String(stored?.searchUrl || process.env.STOCK_SEARCH_API_URL || "").trim();
  const historyEndpoint = String(stored?.historyUrl || process.env.STOCK_HISTORY_API_URL || "").trim();
  const signature = useLicensedHttp ? `http:${endpoint}:${searchEndpoint}:${historyEndpoint}:${apiKey}` : "tencent_finance:v2";
  if (!activeService || activeSignature !== signature) {
    const provider = useLicensedHttp ? new HttpMarketDataProvider({ endpoint, searchEndpoint, historyEndpoint, apiKey }) : new TencentFinanceMarketDataProvider();
    activeService = new MarketDataService(provider, Math.max(5000, Number(stored?.cacheTtlMs || process.env.STOCK_QUOTE_CACHE_TTL_MS) || 12000));
    activeSignature = signature;
  }
  return activeService;
}

function dbConfiguredProvider() {
  try { return globalThis.__stockMarketProviderModule?.stockMarketProviderCredentials?.() || null; }
  catch { return null; }
}

export function installStockMarketProviderResolver(resolver) {
  globalThis.__stockMarketProviderModule = { stockMarketProviderCredentials: resolver };
  activeService = undefined; activeSignature = "";
}

export function activeMarketProviderInfo() {
  const stored = dbConfiguredProvider();
  const endpoint = String(stored?.quoteUrl || process.env.STOCK_QUOTE_API_URL || "").trim();
  const forcedTencent = String(process.env.STOCK_MARKET_PROVIDER || "").trim().toLowerCase() === "tencent_finance";
  if ((stored || endpoint) && !forcedTencent) return { id: "licensed_http", name: "自定义正式行情源", commercial: true };
  return { id: "tencent_finance", name: "腾讯财经", commercial: false, note: "测试行情源，可随时在后台切换正式数据源" };
}
