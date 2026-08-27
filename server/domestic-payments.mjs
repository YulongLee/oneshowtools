import {
  createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey, randomBytes,
  randomUUID, sign as cryptoSign, verify as cryptoVerify,
} from "node:crypto";
import QRCode from "qrcode";
import { db } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";
import { billingPlanPayload } from "./billing-catalog.mjs";

const providers = new Set(["alipay", "wechat_pay"]);
const text = (value) => String(value || "").trim();
const paymentError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const credentialRow = (row) => row && ({
  key_ciphertext: row.credential_ciphertext, key_iv: row.credential_iv,
  key_tag: row.credential_tag, credential_version: row.credential_version,
  user_id: `platform:payment:${row.provider}`, id: row.provider,
});
function normalizePem(value, kind) {
  const normalized = text(value).replace(/\\n/g, "\n");
  if (!normalized || normalized.includes("-----BEGIN")) return normalized;
  const compact = normalized.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return normalized;
  const label = kind === "private" ? "PRIVATE KEY" : "PUBLIC KEY";
  return `-----BEGIN ${label}-----\n${compact.match(/.{1,64}/g)?.join("\n") || compact}\n-----END ${label}-----`;
}
const hint = (value) => value ? `••••${text(value).replace(/\s+/g, "").slice(-4)}` : "";

function assertProvider(provider) {
  if (!providers.has(provider)) throw paymentError("PAYMENT_PROVIDER_UNSUPPORTED");
  return provider;
}

function rawConfiguration(provider) {
  return db.prepare("SELECT * FROM payment_provider_configs WHERE provider = ?").get(assertProvider(provider)) || null;
}

function publicConfiguration(row) {
  return row ? {
    provider: row.provider, configured: true, enabled: row.status === "active", status: row.status,
    mode: row.mode, appId: row.app_id, merchantId: row.merchant_id || "", gatewayUrl: row.gateway_url,
    credentialHint: row.credential_hint, lastTestStatus: row.last_test_status,
    lastTestedAt: row.last_tested_at, updatedAt: row.updated_at,
  } : { provider: null, configured: false, enabled: false, status: "disabled" };
}

export function paymentProviderConfiguration(provider) {
  return { ...publicConfiguration(rawConfiguration(provider)), provider: assertProvider(provider) };
}

export function paymentProviderConfigurations() {
  return ["alipay", "wechat_pay"].map(paymentProviderConfiguration);
}

function credentialsFor(row) {
  if (!row) return {};
  try { return JSON.parse(decryptCredential(credentialRow(row))); }
  catch { throw paymentError("PAYMENT_CREDENTIAL_DECRYPTION_FAILED", 500); }
}

function normalizeConfiguration(provider, data, existing = null) {
  const mode = data.mode === "sandbox" ? "sandbox" : "production";
  const appId = text(data.appId || existing?.app_id);
  const merchantId = text(data.merchantId || existing?.merchant_id);
  const status = data.status === undefined
    ? (existing?.status === "active" ? "active" : "disabled")
    : (data.status === "active" ? "active" : "disabled");
  if (!appId) throw paymentError("PAYMENT_APP_ID_REQUIRED");
  if (provider === "wechat_pay" && !merchantId) throw paymentError("WECHAT_MERCHANT_ID_REQUIRED");
  const gatewayUrl = provider === "alipay"
    ? (mode === "sandbox" ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do" : "https://openapi.alipay.com/gateway.do")
    : "https://api.mch.weixin.qq.com";
  return { provider, mode, appId, merchantId, status, gatewayUrl };
}

function mergeCredentials(provider, data, existing) {
  const prior = credentialsFor(existing);
  if (provider === "alipay") return {
    appPrivateKey: normalizePem(data.appPrivateKey, "private") || prior.appPrivateKey || "",
    alipayPublicKey: normalizePem(data.alipayPublicKey, "public") || prior.alipayPublicKey || "",
  };
  return {
    merchantPrivateKey: normalizePem(data.merchantPrivateKey, "private") || prior.merchantPrivateKey || "",
    merchantSerialNo: text(data.merchantSerialNo) || prior.merchantSerialNo || "",
    apiV3Key: text(data.apiV3Key) || prior.apiV3Key || "",
    wechatpayPublicKey: normalizePem(data.wechatpayPublicKey, "public") || prior.wechatpayPublicKey || "",
    wechatpayPublicKeyId: text(data.wechatpayPublicKeyId) || prior.wechatpayPublicKeyId || "",
  };
}

function validateCredentials(provider, credentials) {
  try {
    if (provider === "alipay") {
      if (!credentials.appPrivateKey || !credentials.alipayPublicKey) throw paymentError("ALIPAY_KEYS_REQUIRED");
      createPrivateKey(credentials.appPrivateKey);
      createPublicKey(credentials.alipayPublicKey);
    } else {
      if (!credentials.merchantPrivateKey || !credentials.merchantSerialNo || !credentials.apiV3Key || !credentials.wechatpayPublicKey) {
        throw paymentError("WECHAT_PAY_KEYS_REQUIRED");
      }
      if (Buffer.byteLength(credentials.apiV3Key) !== 32) throw paymentError("WECHAT_API_V3_KEY_INVALID");
      createPrivateKey(credentials.merchantPrivateKey);
      createPublicKey(credentials.wechatpayPublicKey);
    }
  } catch (error) {
    if (error.code?.startsWith?.("PAYMENT_") || error.code?.startsWith?.("ALIPAY_") || error.code?.startsWith?.("WECHAT_")) throw error;
    throw paymentError("PAYMENT_KEY_FORMAT_INVALID");
  }
}

export function testPaymentProviderConfiguration(provider, data) {
  provider = assertProvider(provider);
  const existing = rawConfiguration(provider);
  const normalized = normalizeConfiguration(provider, data, existing);
  const credentials = mergeCredentials(provider, data, existing);
  validateCredentials(provider, credentials);
  return { ok: true, provider, mode: normalized.mode, checkedAt: Date.now() };
}

export function savePaymentProviderConfiguration(provider, data, actorUserId) {
  provider = assertProvider(provider);
  const existing = rawConfiguration(provider);
  const normalized = normalizeConfiguration(provider, data, existing);
  const credentials = mergeCredentials(provider, data, existing);
  validateCredentials(provider, credentials);
  const version = Number(existing?.credential_version || 0) + 1;
  const encrypted = encryptCredential(JSON.stringify(credentials), `platform:payment:${provider}`, provider, version);
  const timestamp = Date.now();
  const credentialHint = provider === "alipay" ? hint(credentials.appPrivateKey) : hint(credentials.apiV3Key);
  db.prepare(`
    INSERT INTO payment_provider_configs
    (provider, mode, app_id, merchant_id, gateway_url, credential_ciphertext, credential_iv,
      credential_tag, credential_hint, credential_version, status, last_test_status,
      last_tested_at, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'passed', ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET mode=excluded.mode, app_id=excluded.app_id,
      merchant_id=excluded.merchant_id, gateway_url=excluded.gateway_url,
      credential_ciphertext=excluded.credential_ciphertext, credential_iv=excluded.credential_iv,
      credential_tag=excluded.credential_tag, credential_hint=excluded.credential_hint,
      credential_version=excluded.credential_version, status=excluded.status,
      last_test_status='passed', last_tested_at=excluded.last_tested_at,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(provider, normalized.mode, normalized.appId, normalized.merchantId || null,
    normalized.gatewayUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag, credentialHint,
    version, normalized.status, timestamp, actorUserId || null, existing?.created_at || timestamp, timestamp);
  return paymentProviderConfiguration(provider);
}

export function setPaymentProviderEnabled(provider, enabled, actorUserId) {
  provider = assertProvider(provider);
  const existing = rawConfiguration(provider);
  if (!existing) throw paymentError("PAYMENT_PROVIDER_NOT_CONFIGURED", 409);
  if (Boolean(enabled)) validateCredentials(provider, credentialsFor(existing));
  db.prepare(`UPDATE payment_provider_configs
    SET status=?, updated_by=?, updated_at=? WHERE provider=?`)
    .run(enabled ? "active" : "disabled", actorUserId || null, Date.now(), provider);
  return paymentProviderConfiguration(provider);
}

export function activePaymentProviders() {
  return paymentProviderConfigurations().filter((item) => item.enabled).map((item) => ({
    id: item.provider, mode: item.mode,
  }));
}

function shanghaiTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

function alipaySign(params, privateKey) {
  const content = [...params.entries()].filter(([key, value]) => key !== "sign" && value !== "")
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
  return cryptoSign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64");
}

function verifyAlipayForm(form, publicKey) {
  const signature = form.get("sign");
  if (!signature) return false;
  const content = [...form.entries()].filter(([key, value]) => !["sign", "sign_type"].includes(key) && value !== "")
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
  return cryptoVerify("RSA-SHA256", Buffer.from(content), publicKey, Buffer.from(signature, "base64"));
}

function wechatAuthorization({ method, pathname, body, mchId, serialNo, privateKey }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const message = `${method}\n${pathname}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = cryptoSign("RSA-SHA256", Buffer.from(message), privateKey).toString("base64");
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

function verifyWechatResponse(response, rawBody, credentials) {
  const timestamp = response.headers.get("wechatpay-timestamp") || "";
  const nonce = response.headers.get("wechatpay-nonce") || "";
  const signature = response.headers.get("wechatpay-signature") || "";
  const serial = response.headers.get("wechatpay-serial") || "";
  if (!timestamp || !nonce || !signature) return false;
  if (credentials.wechatpayPublicKeyId && serial !== credentials.wechatpayPublicKeyId) return false;
  return cryptoVerify("RSA-SHA256", Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`), credentials.wechatpayPublicKey, Buffer.from(signature, "base64"));
}

function newOrderId() {
  return `OST${Date.now().toString(36).toUpperCase()}${randomBytes(7).toString("hex").toUpperCase()}`.slice(0, 32);
}

function createOrder(userId, plan, provider) {
  const offer = billingPlanPayload(plan);
  const id = newOrderId();
  const timestamp = Date.now();
  db.prepare(`INSERT INTO commercial_orders
    (id,user_id,kind,status,amount_minor,currency,provider,idempotency_key,metadata_json,created_at,updated_at)
    VALUES (?,?,?,'pending',?,?,?,?,?,?,?)`).run(
    id, userId, plan.interval === "month" ? "membership" : "topup", plan.amount_minor,
    plan.currency, provider, randomUUID(), JSON.stringify({ planId: plan.id, credits: offer.totalCredits }), timestamp, timestamp,
  );
  return { id, offer };
}

export async function createDomesticCheckout({ provider, user, plan, appUrl, fetchImpl = fetch }) {
  provider = assertProvider(provider);
  const config = rawConfiguration(provider);
  if (!config || config.status !== "active") throw paymentError("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
  if (plan.currency !== "CNY") throw paymentError("PAYMENT_CURRENCY_UNSUPPORTED");
  const credentials = credentialsFor(config);
  validateCredentials(provider, credentials);
  const order = createOrder(user.id, plan, provider);
  const subject = `${plan.name_zh} - OneShowTools`;
  if (provider === "alipay") {
    const params = new URLSearchParams({
      app_id: config.app_id, method: "alipay.trade.page.pay", format: "JSON", charset: "utf-8",
      sign_type: "RSA2", timestamp: shanghaiTimestamp(), version: "1.0",
      notify_url: `${appUrl}/api/billing/webhooks/alipay`, return_url: `${appUrl}/?billing=success&order=${order.id}`,
      biz_content: JSON.stringify({ out_trade_no: order.id, total_amount: (plan.amount_minor / 100).toFixed(2), subject, product_code: "FAST_INSTANT_TRADE_PAY", timeout_express: "15m" }),
    });
    params.set("sign", alipaySign(params, credentials.appPrivateKey));
    const url = `${config.gateway_url}?${params.toString()}`;
    db.prepare("UPDATE commercial_orders SET provider_object_id=?, updated_at=? WHERE id=?").run(order.id, Date.now(), order.id);
    return { orderId: order.id, provider, presentation: "redirect", url };
  }
  const pathname = "/v3/pay/transactions/native";
  const requestBody = JSON.stringify({
    appid: config.app_id, mchid: config.merchant_id, description: subject, out_trade_no: order.id,
    notify_url: `${appUrl}/api/billing/webhooks/wechat`, amount: { total: plan.amount_minor, currency: "CNY" },
  });
  let response;
  try {
    response = await fetchImpl(`${config.gateway_url}${pathname}`, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json",
        "Accept-Language": "zh-CN",
        Authorization: wechatAuthorization({ method: "POST", pathname, body: requestBody, mchId: config.merchant_id, serialNo: credentials.merchantSerialNo, privateKey: credentials.merchantPrivateKey }) },
      body: requestBody,
    });
  } catch {
    db.prepare("UPDATE commercial_orders SET status='failed', updated_at=? WHERE id=?").run(Date.now(), order.id);
    throw paymentError("WECHAT_PAY_NETWORK_FAILED", 502);
  }
  const rawResponse = await response.text();
  if (!verifyWechatResponse(response, rawResponse, credentials)) {
    db.prepare("UPDATE commercial_orders SET status='failed', updated_at=? WHERE id=?").run(Date.now(), order.id);
    throw paymentError("WECHAT_PAY_RESPONSE_SIGNATURE_INVALID", 502);
  }
  let result = {};
  try { result = JSON.parse(rawResponse); } catch { /* handled as a provider failure below */ }
  if (!response.ok || !result.code_url) {
    db.prepare("UPDATE commercial_orders SET status='failed', updated_at=? WHERE id=?").run(Date.now(), order.id);
    throw paymentError("WECHAT_PAY_ORDER_FAILED", 502);
  }
  db.prepare("UPDATE commercial_orders SET provider_object_id=?, updated_at=? WHERE id=?").run(result.code_url, Date.now(), order.id);
  return { orderId: order.id, provider, presentation: "qr", qrCode: await QRCode.toDataURL(result.code_url, { width: 320, margin: 1 }), expiresAt: Date.now() + 900000, expiresInSeconds: 900 };
}

function settlePaidOrder({ provider, orderId, providerTransactionId, amountMinor, currency, eventId, occurredAt = Date.now() }) {
  const order = db.prepare("SELECT * FROM commercial_orders WHERE id=? AND provider=?").get(orderId, provider);
  if (!order) throw paymentError("PAYMENT_ORDER_NOT_FOUND", 404);
  if (Number(order.amount_minor) !== Number(amountMinor) || String(order.currency).toUpperCase() !== String(currency).toUpperCase()) throw paymentError("PAYMENT_AMOUNT_MISMATCH", 400);
  if (order.status === "paid") return { duplicate: true, orderId };
  const metadata = JSON.parse(order.metadata_json || "{}");
  const plan = db.prepare("SELECT * FROM plans WHERE id=?").get(metadata.planId);
  if (!plan) throw paymentError("PAYMENT_PLAN_NOT_FOUND", 400);
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const payloadHash = createHash("sha256").update(`${provider}:${eventId}:${order.id}:${amountMinor}:${currency}`).digest("hex");
    const eventInsert = db.prepare(`INSERT OR IGNORE INTO commercial_payment_events
      (id,order_id,provider,provider_event_id,event_type,status,payload_hash,occurred_at,created_at)
      VALUES (?,?,?,?,?,'processed',?,?,?)`).run(randomUUID(), order.id, provider, eventId, "payment.succeeded", payloadHash, occurredAt, timestamp);
    if (!eventInsert.changes) { db.exec("ROLLBACK"); return { duplicate: true, orderId }; }
    db.prepare("UPDATE commercial_orders SET status='paid',provider_object_id=?,updated_at=? WHERE id=?").run(providerTransactionId, timestamp, order.id);
    const credits = Number(metadata.credits || 0);
    if (credits > 0) db.prepare(`INSERT OR IGNORE INTO credit_ledger
      (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at)
      VALUES (?,?,?,?,'支付到账','Payment received',?,?,?)`).run(randomUUID(), order.user_id, plan.interval === "month" ? "subscription_grant" : "purchase", credits, `${provider}_order`, order.id, timestamp);
    if (plan.interval === "month") db.prepare(`INSERT INTO subscriptions
      (id,user_id,plan_id,provider,provider_subscription_id,status,current_period_end,cancel_at_period_end,created_at,updated_at)
      VALUES (?,?,?,?,?,'active',?,1,?,?)
      ON CONFLICT(provider,provider_subscription_id) DO UPDATE SET status='active',current_period_end=excluded.current_period_end,updated_at=excluded.updated_at`)
      .run(`${provider}:${order.id}`, order.user_id, plan.id, provider, order.id, timestamp + 30 * 86400000, timestamp, timestamp);
    db.prepare(`INSERT OR IGNORE INTO invoices
      (id,user_id,provider,provider_invoice_id,status,amount_paid,currency,hosted_url,created_at)
      VALUES (?,?,?,?, 'paid',?,?,NULL,?)`).run(`${provider}:${order.id}`, order.user_id, provider, providerTransactionId, order.amount_minor, order.currency, timestamp);
    db.exec("COMMIT");
    return { duplicate: false, orderId };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export async function handleAlipayNotification(request) {
  const config = rawConfiguration("alipay");
  // Disabling a channel stops new orders, but a valid callback for an order that
  // was already created must still be settled after signature verification.
  if (!config) throw paymentError("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
  const form = new URLSearchParams(await request.text());
  const credentials = credentialsFor(config);
  if (!verifyAlipayForm(form, credentials.alipayPublicKey)) throw paymentError("PAYMENT_WEBHOOK_SIGNATURE_INVALID", 400);
  if (form.get("app_id") !== config.app_id) throw paymentError("PAYMENT_APP_ID_MISMATCH", 400);
  if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(form.get("trade_status"))) return { accepted: true, ignored: true };
  const orderId = form.get("out_trade_no");
  settlePaidOrder({ provider: "alipay", orderId, providerTransactionId: form.get("trade_no"), amountMinor: Math.round(Number(form.get("total_amount")) * 100), currency: "CNY", eventId: form.get("notify_id") || form.get("trade_no"), occurredAt: Date.parse(form.get("gmt_payment")) || Date.now() });
  return { accepted: true };
}

function verifyWechatNotification(request, rawBody, credentials) {
  const timestamp = request.headers.get("wechatpay-timestamp") || "";
  const nonce = request.headers.get("wechatpay-nonce") || "";
  const signature = request.headers.get("wechatpay-signature") || "";
  const serial = request.headers.get("wechatpay-serial") || "";
  if (!timestamp || !nonce || !signature) return false;
  if (credentials.wechatpayPublicKeyId && serial !== credentials.wechatpayPublicKeyId) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  return cryptoVerify("RSA-SHA256", Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`), credentials.wechatpayPublicKey, Buffer.from(signature, "base64"));
}

function decryptWechatResource(resource, apiV3Key) {
  if (resource.algorithm !== "AEAD_AES_256_GCM") throw paymentError("WECHAT_PAY_ALGORITHM_UNSUPPORTED");
  const encrypted = Buffer.from(resource.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(resource.nonce));
  decipher.setAuthTag(encrypted.subarray(-16));
  decipher.setAAD(Buffer.from(resource.associated_data || ""));
  return JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString("utf8"));
}

export async function handleWechatNotification(request) {
  const config = rawConfiguration("wechat_pay");
  if (!config) throw paymentError("PAYMENT_PROVIDER_NOT_CONFIGURED", 503);
  const rawBody = await request.text();
  const credentials = credentialsFor(config);
  if (!verifyWechatNotification(request, rawBody, credentials)) throw paymentError("PAYMENT_WEBHOOK_SIGNATURE_INVALID", 400);
  const notification = JSON.parse(rawBody);
  const payment = decryptWechatResource(notification.resource, credentials.apiV3Key);
  if (payment.appid !== config.app_id || payment.mchid !== config.merchant_id) throw paymentError("PAYMENT_MERCHANT_MISMATCH", 400);
  if (payment.trade_state !== "SUCCESS") return { accepted: true, ignored: true };
  settlePaidOrder({ provider: "wechat_pay", orderId: payment.out_trade_no, providerTransactionId: payment.transaction_id, amountMinor: payment.amount?.total, currency: payment.amount?.currency || "CNY", eventId: notification.id || payment.transaction_id, occurredAt: Date.parse(payment.success_time) || Date.now() });
  return { accepted: true };
}

export function domesticOrderStatus(orderId, userId) {
  let order = db.prepare("SELECT id,status,provider,amount_minor AS amountMinor,currency,created_at AS createdAt,updated_at AS updatedAt FROM commercial_orders WHERE id=? AND user_id=?").get(text(orderId), userId);
  if (!order) throw paymentError("PAYMENT_ORDER_NOT_FOUND", 404);
  if (order.status === "pending" && Date.now() - order.createdAt > 900000) {
    db.prepare("UPDATE commercial_orders SET status='expired',updated_at=? WHERE id=? AND status='pending'").run(Date.now(), order.id);
    order = { ...order, status: "expired", updatedAt: Date.now() };
  }
  return order;
}
