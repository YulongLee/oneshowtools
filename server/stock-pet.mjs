import { randomUUID } from "node:crypto";
import { db } from "./database.mjs";
import {
  activeMarketProviderInfo,
  marketDataService,
  marketFromSymbol,
  normalizeMarketSymbol,
} from "./market-data.mjs";
import { objectStorageStatus, signStockPetRelease } from "./object-storage.mjs";

export const STOCK_PET_PRODUCT_CODE = "stock_pet";
export const STOCK_PET_PRICE = 1000;
export const STOCK_PET_DEVICE_LIMIT = 3;
export const STOCK_PET_DOWNLOAD_TTL_SECONDS = 60;

function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function configuredClosedDates() {
  return new Set(
    String(process.env.STOCK_MARKET_CLOSED_DATES || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

const marketCatalog = [
  { symbol: "600519.SS", code: "600519", name: "贵州茅台", market: "A" },
  { symbol: "000001.SZ", code: "000001", name: "平安银行", market: "A" },
  { symbol: "300750.SZ", code: "300750", name: "宁德时代", market: "A" },
  { symbol: "601318.SS", code: "601318", name: "中国平安", market: "A" },
  { symbol: "000858.SZ", code: "000858", name: "五粮液", market: "A" },
  { symbol: "600036.SS", code: "600036", name: "招商银行", market: "A" },
  { symbol: "00700.HK", code: "00700", name: "腾讯控股", market: "HK" },
  { symbol: "09988.HK", code: "09988", name: "阿里巴巴-W", market: "HK" },
  { symbol: "AAPL.US", code: "AAPL", name: "苹果", market: "US" },
  { symbol: "NVDA.US", code: "NVDA", name: "英伟达", market: "US" },
];

export function isAShareTradingSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  if (
    ["Sat", "Sun"].includes(parts.weekday) ||
    configuredClosedDates().has(shanghaiDate(now))
  )
    return false;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  return (minute >= 570 && minute <= 690) || (minute >= 780 && minute <= 900);
}

function marketMinute(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  if (["Sat", "Sun"].includes(parts.weekday)) return -1;
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function isMarketTradingSession(market = "A", now = new Date()) {
  if (market === "A") return isAShareTradingSession(now);
  if (market === "HK") {
    const minute = marketMinute(now, "Asia/Hong_Kong");
    return (minute >= 570 && minute <= 720) || (minute >= 780 && minute <= 960);
  }
  if (market === "US") {
    const minute = marketMinute(now, "America/New_York");
    return minute >= 570 && minute <= 960;
  }
  return false;
}

export function stockMarketState(
  changePercent,
  {
    alert = false,
    loading = false,
    offline = false,
    closed = false,
    limitStatus = "",
  } = {},
) {
  if (offline) return "OFFLINE";
  if (loading) return "LOADING";
  if (alert) return "ALERT";
  if (closed) return "CLOSED";
  if (limitStatus === "up") return "LIMIT_UP";
  if (limitStatus === "down") return "LIMIT_DOWN";
  const value = Number(changePercent || 0);
  if (value >= 3) return "STRONG_UP";
  if (value >= 0.3) return "UP";
  if (value <= -3) return "STRONG_DOWN";
  if (value <= -0.3) return "DOWN";
  return "FLAT";
}

export function stockPetPublicProduct() {
  const marketProvider = activeMarketProviderInfo();
  const releaseStorageReady = objectStorageStatus().configured;
  return {
    code: STOCK_PET_PRODUCT_CODE,
    name: "牛来了桌面宠物",
    priceCredits: STOCK_PET_PRICE,
    entitlement: "lifetime",
    deviceLimit: STOCK_PET_DEVICE_LIMIT,
    supportedMarkets: ["A股", "港股", "美股"],
    platforms: ["Windows", "macOS"],
    quoteProviderConfigured: true,
    marketProvider,
    downloads: {
      windows: releaseStorageReady || Boolean(process.env.STOCK_PET_WINDOWS_DOWNLOAD_URL),
      macos: releaseStorageReady || Boolean(process.env.STOCK_PET_MACOS_DOWNLOAD_URL),
    },
    version: process.env.STOCK_PET_VERSION || "0.1.8",
  };
}

function entitlement(userId) {
  return db
    .prepare(
      `SELECT id, product_code AS productCode, entitlement_type AS type,
    status, credit_cost AS creditCost, granted_at AS grantedAt
    FROM product_entitlements WHERE user_id = ? AND product_code = ?`,
    )
    .get(userId, STOCK_PET_PRODUCT_CODE);
}

export function stockPetLicense(userId) {
  const item = entitlement(userId);
  if (!item)
    return {
      entitled: false,
      deviceLimit: STOCK_PET_DEVICE_LIMIT,
      devices: [],
    };
  const devices = db
    .prepare(
      `SELECT id, device_name AS name, platform, app_version AS appVersion,
    last_seen_at AS lastSeenAt, created_at AS createdAt FROM licensed_devices
    WHERE entitlement_id = ? ORDER BY last_seen_at DESC`,
    )
    .all(item.id);
  return {
    entitled: item.status === "active",
    entitlement: item,
    deviceLimit: STOCK_PET_DEVICE_LIMIT,
    devices,
  };
}

export function unlockStockPet(userId) {
  const existing = entitlement(userId);
  if (existing) return { alreadyOwned: true, ...stockPetLicense(userId) };
  const current = Number(
    db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM credit_ledger WHERE user_id = ?",
      )
      .get(userId)?.total || 0,
  );
  if (current < STOCK_PET_PRICE)
    throw Object.assign(new Error("INSUFFICIENT_CREDITS"), {
      code: "INSUFFICIENT_CREDITS",
      status: 402,
    });
  const id = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO product_entitlements
      (id, user_id, product_code, entitlement_type, status, credit_cost, granted_at)
      VALUES (?, ?, ?, 'lifetime', 'active', ?, ?)`,
    ).run(id, userId, STOCK_PET_PRODUCT_CODE, STOCK_PET_PRICE, timestamp);
    db.prepare(
      `INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'spend', ?, ?, ?, 'product_entitlement', ?, ?)`,
    ).run(
      randomUUID(),
      userId,
      -STOCK_PET_PRICE,
      "解锁牛来了桌面宠物",
      "Unlocked Niu Lai Le Stock Pet",
      id,
      timestamp,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { alreadyOwned: false, ...stockPetLicense(userId) };
}

export function registerStockPetDevice(userId, input = {}) {
  const item = entitlement(userId);
  if (!item || item.status !== "active")
    throw Object.assign(new Error("PRODUCT_NOT_OWNED"), {
      code: "PRODUCT_NOT_OWNED",
      status: 403,
    });
  const fingerprint = String(input.fingerprint || "").trim();
  if (fingerprint.length < 16 || fingerprint.length > 256)
    throw Object.assign(new Error("INVALID_DEVICE_FINGERPRINT"), {
      code: "INVALID_DEVICE_FINGERPRINT",
      status: 400,
    });
  const existing = db
    .prepare(
      "SELECT id FROM licensed_devices WHERE entitlement_id = ? AND device_fingerprint = ?",
    )
    .get(item.id, fingerprint);
  const timestamp = Date.now();
  if (existing) {
    db.prepare(
      "UPDATE licensed_devices SET device_name = ?, platform = ?, app_version = ?, last_seen_at = ? WHERE id = ?",
    ).run(
      String(input.name || "Desktop").slice(0, 80),
      String(input.platform || "unknown").slice(0, 30),
      String(input.appVersion || "").slice(0, 30),
      timestamp,
      existing.id,
    );
    return stockPetLicense(userId);
  }
  const count = Number(
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM licensed_devices WHERE entitlement_id = ?",
      )
      .get(item.id).count,
  );
  if (count >= STOCK_PET_DEVICE_LIMIT)
    throw Object.assign(new Error("DEVICE_LIMIT_REACHED"), {
      code: "DEVICE_LIMIT_REACHED",
      status: 409,
    });
  db.prepare(
    `INSERT INTO licensed_devices
    (id, entitlement_id, device_fingerprint, device_name, platform, app_version, last_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    item.id,
    fingerprint,
    String(input.name || "Desktop").slice(0, 80),
    String(input.platform || "unknown").slice(0, 30),
    String(input.appVersion || "").slice(0, 30),
    timestamp,
    timestamp,
  );
  return stockPetLicense(userId);
}

export function verifyStockPetDevice(userId, fingerprint) {
  const item = entitlement(userId);
  if (!item || item.status !== "active")
    throw Object.assign(new Error("PRODUCT_NOT_OWNED"), {
      code: "PRODUCT_NOT_OWNED",
      status: 403,
    });
  const device = db
    .prepare(
      `SELECT id FROM licensed_devices
       WHERE entitlement_id = ? AND device_fingerprint = ?`,
    )
    .get(item.id, String(fingerprint || "").trim());
  if (!device)
    throw Object.assign(new Error("DEVICE_NOT_REGISTERED"), {
      code: "DEVICE_NOT_REGISTERED",
      status: 403,
    });
  db.prepare("UPDATE licensed_devices SET last_seen_at = ? WHERE id = ?").run(
    Date.now(),
    device.id,
  );
  return device;
}

export function removeStockPetDevice(userId, deviceId) {
  const item = entitlement(userId);
  if (!item) return stockPetLicense(userId);
  db.prepare(
    "DELETE FROM licensed_devices WHERE id = ? AND entitlement_id = ?",
  ).run(deviceId, item.id);
  return stockPetLicense(userId);
}

function validMarketSymbol(symbol) {
  return Boolean(normalizeMarketSymbol(symbol));
}

function normalizedStock(item) {
  const symbol = normalizeMarketSymbol(item?.symbol);
  if (!symbol) return null;
  return {
    symbol,
    code: String(item?.code || symbol.slice(0, symbol.lastIndexOf("."))),
    name: String(item?.name || symbol).slice(0, 40),
    market: marketFromSymbol(symbol),
  };
}

export async function stockSearch(query) {
  const term = String(query || "")
    .trim()
    .toLowerCase();
  const local = marketCatalog
    .filter(
      (item) =>
        !term || item.code.includes(term) || item.name.toLowerCase().includes(term),
    )
    .slice(0, 10);
  if (!term) return local.slice(0, 5);
  try {
    const remote = (await marketDataService().searchSymbols(term))
      .map(normalizedStock)
      .filter(Boolean);
    return [...local, ...remote]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.symbol === item.symbol) === index)
      .slice(0, 10);
  } catch {
    return local;
  }
}

export function stockWatchlist(userId) {
  return db
    .prepare(
      `SELECT id, symbol, market, display_name AS name, sort_order AS sortOrder,
    is_primary AS isPrimary, created_at AS createdAt FROM stock_watchlists
    WHERE user_id = ? ORDER BY is_primary DESC, sort_order, created_at`,
    )
    .all(userId)
    .map((item) => ({ ...item, isPrimary: Boolean(item.isPrimary) }));
}

export function addStockWatch(userId, input = {}) {
  const match = normalizedStock(input) || marketCatalog.find((item) => item.symbol === input.symbol);
  if (!match)
    throw Object.assign(new Error("UNSUPPORTED_SYMBOL"), {
      code: "UNSUPPORTED_SYMBOL",
      status: 400,
    });
  if (stockWatchlist(userId).length >= 10)
    throw Object.assign(new Error("WATCHLIST_LIMIT_REACHED"), {
      code: "WATCHLIST_LIMIT_REACHED",
      status: 409,
    });
  db.prepare(
    `INSERT INTO stock_watchlists (id, user_id, symbol, market, display_name, sort_order, is_primary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, symbol) DO NOTHING`,
  ).run(
    randomUUID(),
    userId,
    match.symbol,
    match.market,
    match.name,
    stockWatchlist(userId).length,
    stockWatchlist(userId).length === 0 ? 1 : 0,
    Date.now(),
  );
  return stockWatchlist(userId);
}

export function removeStockWatch(userId, watchId) {
  const removed = db
    .prepare("SELECT is_primary AS isPrimary FROM stock_watchlists WHERE id = ? AND user_id = ?")
    .get(watchId, userId);
  db.prepare("DELETE FROM stock_watchlists WHERE id = ? AND user_id = ?").run(
    watchId,
    userId,
  );
  if (removed?.isPrimary) {
    const next = db.prepare("SELECT id FROM stock_watchlists WHERE user_id = ? ORDER BY sort_order, created_at LIMIT 1").get(userId);
    if (next) db.prepare("UPDATE stock_watchlists SET is_primary = 1 WHERE id = ?").run(next.id);
  }
  return stockWatchlist(userId);
}

export function updateStockWatchlist(userId, input = {}) {
  const ids = Array.isArray(input.orderedIds)
    ? input.orderedIds.map(String).slice(0, 10)
    : [];
  const owned = new Set(stockWatchlist(userId).map((item) => item.id));
  if (ids.length && (ids.length !== owned.size || ids.some((id) => !owned.has(id))))
    throw Object.assign(new Error("INVALID_WATCHLIST_ORDER"), { code: "INVALID_WATCHLIST_ORDER", status: 400 });
  const primaryId = input.primaryId ? String(input.primaryId) : "";
  if (primaryId && !owned.has(primaryId))
    throw Object.assign(new Error("INVALID_PRIMARY_STOCK"), { code: "INVALID_PRIMARY_STOCK", status: 400 });
  db.exec("BEGIN IMMEDIATE");
  try {
    ids.forEach((id, index) => db.prepare("UPDATE stock_watchlists SET sort_order = ? WHERE id = ? AND user_id = ?").run(index, id, userId));
    if (primaryId) {
      db.prepare("UPDATE stock_watchlists SET is_primary = 0 WHERE user_id = ?").run(userId);
      db.prepare("UPDATE stock_watchlists SET is_primary = 1 WHERE id = ? AND user_id = ?").run(primaryId, userId);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return stockWatchlist(userId);
}

export function stockAlerts(userId) {
  return db
    .prepare(
      `SELECT id, symbol, alert_type AS type, threshold AS targetValue,
    enabled, cooldown_minutes AS cooldownMinutes, last_triggered_at AS lastTriggeredAt,
    created_at AS createdAt FROM stock_alerts WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId)
    .map((item) => ({ ...item, enabled: Boolean(item.enabled) }));
}

export function addStockAlert(userId, input = {}) {
  const match = stockWatchlist(userId).find((item) => item.symbol === input.symbol);
  const type = String(input.type || "");
  const targetValue = Number(input.targetValue);
  if (
    !match ||
    !["price_above", "price_below", "change_above", "change_below"].includes(
      type,
    ) ||
    !Number.isFinite(targetValue)
  ) {
    throw Object.assign(new Error("INVALID_STOCK_ALERT"), {
      code: "INVALID_STOCK_ALERT",
      status: 400,
    });
  }
  db.prepare(
    `INSERT INTO stock_alerts
    (id, user_id, symbol, alert_type, threshold, enabled, cooldown_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    randomUUID(),
    userId,
    match.symbol,
    type,
    targetValue,
    Math.max(5, Math.min(1440, Number(input.cooldownMinutes) || 30)),
    Date.now(),
  );
  return stockAlerts(userId);
}

export function removeStockAlert(userId, alertId) {
  db.prepare("DELETE FROM stock_alerts WHERE id = ? AND user_id = ?").run(
    alertId,
    userId,
  );
  return stockAlerts(userId);
}

export function updateStockAlert(userId, alertId, input = {}) {
  const current = db
    .prepare("SELECT * FROM stock_alerts WHERE id = ? AND user_id = ?")
    .get(alertId, userId);
  if (!current)
    throw Object.assign(new Error("STOCK_ALERT_NOT_FOUND"), {
      code: "STOCK_ALERT_NOT_FOUND",
      status: 404,
    });
  const type = input.type === undefined ? current.alert_type : String(input.type);
  const targetValue = input.targetValue === undefined ? Number(current.threshold) : Number(input.targetValue);
  if (
    !["price_above", "price_below", "change_above", "change_below"].includes(type) ||
    !Number.isFinite(targetValue)
  )
    throw Object.assign(new Error("INVALID_STOCK_ALERT"), {
      code: "INVALID_STOCK_ALERT",
      status: 400,
    });
  const cooldown = input.cooldownMinutes === undefined
    ? Number(current.cooldown_minutes)
    : Math.max(5, Math.min(1440, Number(input.cooldownMinutes) || 30));
  const enabled = input.enabled === undefined ? Number(current.enabled) : input.enabled ? 1 : 0;
  db.prepare(
    `UPDATE stock_alerts SET alert_type = ?, threshold = ?, enabled = ?, cooldown_minutes = ?
     WHERE id = ? AND user_id = ?`,
  ).run(type, targetValue, enabled, cooldown, alertId, userId);
  return stockAlerts(userId);
}

export function markStockAlertTriggered(userId, alertId) {
  const timestamp = Date.now();
  const result = db
    .prepare(
      `UPDATE stock_alerts SET last_triggered_at = ?
    WHERE id = ? AND user_id = ? AND enabled = 1`,
    )
    .run(timestamp, alertId, userId);
  if (!result.changes) {
    throw Object.assign(new Error("STOCK_ALERT_NOT_FOUND"), {
      code: "STOCK_ALERT_NOT_FOUND",
      status: 404,
    });
  }
  return { id: alertId, lastTriggeredAt: timestamp };
}

export async function stockQuotes(symbols = []) {
  const allowed = symbols
    .map(normalizeMarketSymbol)
    .filter(validMarketSymbol)
    .slice(0, 10);
  if (!allowed.length) return [];
  const quotes = await marketDataService().getQuotes(allowed);
  return quotes.map((quote) => ({
    ...quote,
    state: stockMarketState(quote.changePercent, {
      closed:
        typeof quote.marketOpen === "boolean"
          ? !quote.marketOpen
          : !isMarketTradingSession(quote.market || marketFromSymbol(quote.symbol)),
      offline: quote.online === false,
      limitStatus: quote.limitStatus,
    }),
  }));
}

export async function stockHistory(userId, symbol, range = "1m") {
  const normalized = normalizeMarketSymbol(symbol);
  const allowedRanges = new Set(["1d", "1m", "3m", "1y"]);
  if (!normalized || !stockWatchlist(userId).some((item) => item.symbol === normalized))
    throw Object.assign(new Error("STOCK_NOT_IN_WATCHLIST"), { code: "STOCK_NOT_IN_WATCHLIST", status: 403 });
  if (!allowedRanges.has(range))
    throw Object.assign(new Error("INVALID_STOCK_HISTORY_RANGE"), { code: "INVALID_STOCK_HISTORY_RANGE", status: 400 });
  const items = await marketDataService().getHistory(normalized, { range });
  return { symbol: normalized, range, items, provider: activeMarketProviderInfo() };
}

export async function stockPetDownload(userId, platform) {
  if (!stockPetLicense(userId).entitled) {
    throw Object.assign(new Error("PRODUCT_NOT_OWNED"), {
      code: "PRODUCT_NOT_OWNED",
      status: 403,
    });
  }
  const configuredUrl =
    platform === "windows"
      ? process.env.STOCK_PET_WINDOWS_DOWNLOAD_URL
      : platform === "macos"
        ? process.env.STOCK_PET_MACOS_DOWNLOAD_URL
        : "";
  if (!configuredUrl && !["windows", "macos"].includes(platform)) {
    throw Object.assign(new Error("DOWNLOAD_PLATFORM_INVALID"), {
      code: "DOWNLOAD_PLATFORM_INVALID",
      status: 400,
    });
  }
  if (configuredUrl) return { url: configuredUrl, platform, expiresAt: null };
  // Keep the private OSS address useful only long enough for the browser to
  // start the transfer. Product access is enforced again by the desktop
  // license/device handshake, so sharing an installer never shares ownership.
  return signStockPetRelease(platform, {
    expires: STOCK_PET_DOWNLOAD_TTL_SECONDS,
  });
}
