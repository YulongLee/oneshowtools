import { randomUUID } from "node:crypto";
import { db } from "./database.mjs";
import { objectStorageStatus, signFortuneCatRelease } from "./object-storage.mjs";

export const FORTUNE_CAT_PRODUCT_CODE = "fortune_cat";
export const FORTUNE_CAT_PRICE = 1000;
export const FORTUNE_CAT_DEVICE_LIMIT = 3;
export const FORTUNE_CAT_DOWNLOAD_TTL_SECONDS = 60;

export function fortuneCatPrice() {
  const configured = Number(db.prepare("SELECT credit_cost AS creditCost FROM tools WHERE slug = 'fortune-cat'").get()?.creditCost);
  return Number.isInteger(configured) && configured > 0 ? configured : FORTUNE_CAT_PRICE;
}

function entitlement(userId) {
  return db.prepare(`SELECT id, product_code AS productCode, entitlement_type AS type,
    status, credit_cost AS creditCost, granted_at AS grantedAt
    FROM product_entitlements WHERE user_id = ? AND product_code = ?`).get(userId, FORTUNE_CAT_PRODUCT_CODE);
}

export function fortuneCatPublicProduct() {
  const releaseStorageReady = objectStorageStatus().configured;
  return {
    code: FORTUNE_CAT_PRODUCT_CODE,
    name: "招财滚滚",
    priceCredits: fortuneCatPrice(),
    entitlement: "lifetime",
    deviceLimit: FORTUNE_CAT_DEVICE_LIMIT,
    platforms: ["Windows", "macOS"],
    lifecycle: "testing",
    privacy: "salary-local-only",
    downloads: {
      windows: releaseStorageReady || Boolean(process.env.FORTUNE_CAT_WINDOWS_DOWNLOAD_URL),
      macos: releaseStorageReady || Boolean(process.env.FORTUNE_CAT_MACOS_DOWNLOAD_URL),
    },
    version: process.env.FORTUNE_CAT_VERSION || "0.1.2-test",
  };
}

export function fortuneCatLicense(userId) {
  const item = entitlement(userId);
  if (!item) return { entitled: false, deviceLimit: FORTUNE_CAT_DEVICE_LIMIT, devices: [] };
  const devices = db.prepare(`SELECT id, device_name AS name, platform, app_version AS appVersion,
    last_seen_at AS lastSeenAt, created_at AS createdAt FROM licensed_devices
    WHERE entitlement_id = ? ORDER BY last_seen_at DESC`).all(item.id);
  return { entitled: item.status === "active", entitlement: item, deviceLimit: FORTUNE_CAT_DEVICE_LIMIT, devices };
}

export function unlockFortuneCat(userId) {
  const existing = entitlement(userId);
  if (existing) return { alreadyOwned: true, ...fortuneCatLicense(userId) };
  const priceCredits = fortuneCatPrice();
  const current = Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM credit_ledger WHERE user_id = ?").get(userId)?.total || 0);
  if (current < priceCredits) throw Object.assign(new Error("INSUFFICIENT_CREDITS"), { code: "INSUFFICIENT_CREDITS", status: 402 });
  const id = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO product_entitlements
      (id, user_id, product_code, entitlement_type, status, credit_cost, granted_at)
      VALUES (?, ?, ?, 'lifetime', 'active', ?, ?)`).run(id, userId, FORTUNE_CAT_PRODUCT_CODE, priceCredits, timestamp);
    db.prepare(`INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'spend', ?, ?, ?, 'product_entitlement', ?, ?)`).run(
        randomUUID(), userId, -priceCredits, "解锁招财滚滚桌面宠物", "Unlocked Fortune Cat desktop companion", id, timestamp,
      );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { alreadyOwned: false, ...fortuneCatLicense(userId) };
}

export function registerFortuneCatDevice(userId, input = {}) {
  const item = entitlement(userId);
  if (!item || item.status !== "active") throw Object.assign(new Error("PRODUCT_NOT_OWNED"), { code: "PRODUCT_NOT_OWNED", status: 403 });
  const fingerprint = String(input.fingerprint || "").trim();
  if (fingerprint.length < 16 || fingerprint.length > 256) throw Object.assign(new Error("INVALID_DEVICE_FINGERPRINT"), { code: "INVALID_DEVICE_FINGERPRINT", status: 400 });
  const existing = db.prepare("SELECT id FROM licensed_devices WHERE entitlement_id = ? AND device_fingerprint = ?").get(item.id, fingerprint);
  const timestamp = Date.now();
  if (existing) {
    db.prepare("UPDATE licensed_devices SET device_name = ?, platform = ?, app_version = ?, last_seen_at = ? WHERE id = ?").run(
      String(input.name || "Desktop").slice(0, 80), String(input.platform || "unknown").slice(0, 30),
      String(input.appVersion || "").slice(0, 30), timestamp, existing.id,
    );
    return fortuneCatLicense(userId);
  }
  const count = Number(db.prepare("SELECT COUNT(*) AS count FROM licensed_devices WHERE entitlement_id = ?").get(item.id)?.count || 0);
  if (count >= FORTUNE_CAT_DEVICE_LIMIT) throw Object.assign(new Error("DEVICE_LIMIT_REACHED"), { code: "DEVICE_LIMIT_REACHED", status: 409 });
  db.prepare(`INSERT INTO licensed_devices
    (id, entitlement_id, device_fingerprint, device_name, platform, app_version, last_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), item.id, fingerprint, String(input.name || "Desktop").slice(0, 80),
      String(input.platform || "unknown").slice(0, 30), String(input.appVersion || "").slice(0, 30), timestamp, timestamp,
    );
  return fortuneCatLicense(userId);
}

export function removeFortuneCatDevice(userId, deviceId) {
  const item = entitlement(userId);
  if (!item) throw Object.assign(new Error("PRODUCT_NOT_OWNED"), { code: "PRODUCT_NOT_OWNED", status: 403 });
  db.prepare("DELETE FROM licensed_devices WHERE id = ? AND entitlement_id = ?").run(deviceId, item.id);
  return fortuneCatLicense(userId);
}

export function verifyFortuneCatDevice(userId, fingerprint) {
  const item = entitlement(userId);
  if (!item || item.status !== "active") throw Object.assign(new Error("PRODUCT_NOT_OWNED"), { code: "PRODUCT_NOT_OWNED", status: 403 });
  const device = db.prepare("SELECT id FROM licensed_devices WHERE entitlement_id = ? AND device_fingerprint = ?").get(item.id, String(fingerprint || ""));
  if (!device) throw Object.assign(new Error("DEVICE_NOT_REGISTERED"), { code: "DEVICE_NOT_REGISTERED", status: 403 });
  db.prepare("UPDATE licensed_devices SET last_seen_at = ? WHERE id = ?").run(Date.now(), device.id);
  return true;
}

export async function fortuneCatDownload(userId, platform) {
  if (!fortuneCatLicense(userId).entitled) throw Object.assign(new Error("PRODUCT_NOT_OWNED"), { code: "PRODUCT_NOT_OWNED", status: 403 });
  if (!["windows", "macos"].includes(platform)) throw Object.assign(new Error("DOWNLOAD_PLATFORM_INVALID"), { code: "DOWNLOAD_PLATFORM_INVALID", status: 400 });
  const configuredUrl = platform === "windows" ? process.env.FORTUNE_CAT_WINDOWS_DOWNLOAD_URL : process.env.FORTUNE_CAT_MACOS_DOWNLOAD_URL;
  if (configuredUrl) return { url: configuredUrl, platform, expiresAt: null };
  return signFortuneCatRelease(platform, { expires: FORTUNE_CAT_DOWNLOAD_TTL_SECONDS });
}
