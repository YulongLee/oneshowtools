import assert from "node:assert/strict";
import {
  createCipheriv, generateKeyPairSync, randomBytes, sign as cryptoSign,
} from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-domestic-payments-"));
process.env.DATA_DIR = dataDirectory;
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { db } = await import("../server/database.mjs");
const {
  createDomesticCheckout, domesticOrderStatus, handleAlipayNotification, handleWechatNotification,
  activePaymentProviders, paymentProviderConfiguration, savePaymentProviderConfiguration,
  setPaymentProviderEnabled,
} = await import(`../server/domestic-payments.mjs?payments=${Date.now()}`);

const pair = () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privateKey: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
};
const timestamp = Date.now();
const user = { id: "payment-test-user" };
db.prepare(`INSERT INTO users
  (id,name,email,password_hash,locale,email_verified,status,created_at,updated_at)
  VALUES (?,?,?,'unused','zh-CN',1,'active',?,?)`).run(user.id, "Payment Test", "payments@example.com", timestamp, timestamp);
const plan = db.prepare("SELECT * FROM plans WHERE id='pack_starter'").get();

function signAlipayForm(values, privateKey) {
  const form = new URLSearchParams(values);
  const content = [...form.entries()].filter(([key, value]) => !["sign", "sign_type"].includes(key) && value !== "")
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
  form.set("sign_type", "RSA2");
  form.set("sign", cryptoSign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64"));
  return form;
}

function encryptWechatResource(payment, apiV3Key) {
  const nonce = "0123456789ab";
  const associatedData = "transaction";
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(nonce));
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payment)), cipher.final(), cipher.getAuthTag()]).toString("base64");
  return { algorithm: "AEAD_AES_256_GCM", ciphertext, nonce, associated_data: associatedData };
}

test("payment channels are independently disabled until configured and explicitly enabled", () => {
  assert.equal(paymentProviderConfiguration("alipay").enabled, false);
  assert.throws(() => setPaymentProviderEnabled("alipay", true, user.id), (error) => error.code === "PAYMENT_PROVIDER_NOT_CONFIGURED");
  const application = pair();
  const alipay = pair();
  savePaymentProviderConfiguration("alipay", {
    mode: "production", appId: "2026000000000000", appPrivateKey: application.privateKey,
    alipayPublicKey: alipay.publicKey, status: "disabled",
  }, user.id);
  assert.equal(activePaymentProviders().some((item) => item.id === "alipay"), false);
  assert.equal(setPaymentProviderEnabled("alipay", true, user.id).enabled, true);
  assert.equal(activePaymentProviders().some((item) => item.id === "alipay"), true);
  savePaymentProviderConfiguration("alipay", { mode: "production", appId: "2026000000000000" }, user.id);
  assert.equal(paymentProviderConfiguration("alipay").enabled, true);
  assert.equal(setPaymentProviderEnabled("alipay", false, user.id).enabled, false);
});

test("Alipay checkout uses RSA2 and a verified callback grants credits once", async () => {
  const application = pair();
  const alipay = pair();
  savePaymentProviderConfiguration("alipay", {
    mode: "production", appId: "2026000000000001", appPrivateKey: application.privateKey,
    alipayPublicKey: alipay.publicKey, status: "active",
  }, user.id);

  const publicConfig = paymentProviderConfiguration("alipay");
  assert.equal(publicConfig.enabled, true);
  assert.equal(JSON.stringify(publicConfig).includes("PRIVATE KEY"), false);

  const checkout = await createDomesticCheckout({ provider: "alipay", user, plan, appUrl: "https://example.com" });
  assert.equal(checkout.presentation, "redirect");
  const url = new URL(checkout.url);
  assert.equal(url.searchParams.get("method"), "alipay.trade.page.pay");
  assert.equal(url.searchParams.get("sign_type"), "RSA2");
  assert.equal(url.searchParams.get("notify_url"), "https://example.com/api/billing/webhooks/alipay");

  const form = signAlipayForm({
    notify_id: "alipay-notify-1", app_id: "2026000000000001", trade_status: "TRADE_SUCCESS",
    out_trade_no: checkout.orderId, trade_no: "alipay-transaction-1", total_amount: "19.90",
    gmt_payment: "2026-08-20 12:00:00",
  }, alipay.privateKey);
  const callback = () => new Request("https://example.com/api/billing/webhooks/alipay", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString(),
  });
  setPaymentProviderEnabled("alipay", false, user.id);
  await handleAlipayNotification(callback());
  await handleAlipayNotification(callback());
  assert.equal(db.prepare("SELECT status FROM commercial_orders WHERE id=?").get(checkout.orderId).status, "paid");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM credit_ledger WHERE reference_id=?").get(checkout.orderId).count, 1);
  assert.equal(db.prepare("SELECT amount FROM credit_ledger WHERE reference_id=?").get(checkout.orderId).amount, 2000);
});

test("WeChat Native checkout returns a QR code and verified API v3 callback settles once", async () => {
  const merchant = pair();
  const platform = pair();
  const apiV3Key = "0123456789abcdef0123456789abcdef";
  savePaymentProviderConfiguration("wechat_pay", {
    mode: "production", appId: "wx-payment-test", merchantId: "1900000001",
    merchantPrivateKey: merchant.privateKey, merchantSerialNo: "MERCHANT-SERIAL-1",
    apiV3Key, wechatpayPublicKey: platform.publicKey, wechatpayPublicKeyId: "PUB_KEY_ID_1",
    status: "active",
  }, user.id);

  let authorization = "";
  const checkout = await createDomesticCheckout({
    provider: "wechat_pay", user, plan, appUrl: "https://example.com",
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization;
      const body = JSON.stringify({ code_url: "weixin://wxpay/bizpayurl?pr=test" });
      const responseTimestamp = Math.floor(Date.now() / 1000).toString();
      const responseNonce = "response-nonce";
      const responseSignature = cryptoSign("RSA-SHA256", Buffer.from(`${responseTimestamp}\n${responseNonce}\n${body}\n`), platform.privateKey).toString("base64");
      return new Response(body, { status: 200, headers: {
        "content-type": "application/json", "wechatpay-timestamp": responseTimestamp,
        "wechatpay-nonce": responseNonce, "wechatpay-signature": responseSignature,
        "wechatpay-serial": "PUB_KEY_ID_1",
      } });
    },
  });
  assert.match(authorization, /^WECHATPAY2-SHA256-RSA2048 /);
  assert.equal(checkout.presentation, "qr");
  assert.match(checkout.qrCode, /^data:image\/png;base64,/);

  const notification = {
    id: "wechat-notify-1", event_type: "TRANSACTION.SUCCESS",
    resource: encryptWechatResource({
      appid: "wx-payment-test", mchid: "1900000001", trade_state: "SUCCESS",
      out_trade_no: checkout.orderId, transaction_id: "wechat-transaction-1",
      amount: { total: 1990, currency: "CNY" }, success_time: "2026-08-20T12:00:00+08:00",
    }, apiV3Key),
  };
  const rawBody = JSON.stringify(notification);
  const callbackTimestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = "notify-nonce";
  const signature = cryptoSign("RSA-SHA256", Buffer.from(`${callbackTimestamp}\n${nonce}\n${rawBody}\n`), platform.privateKey).toString("base64");
  const callback = () => new Request("https://example.com/api/billing/webhooks/wechat", {
    method: "POST",
    headers: { "wechatpay-timestamp": callbackTimestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature, "wechatpay-serial": "PUB_KEY_ID_1" },
    body: rawBody,
  });
  await handleWechatNotification(callback());
  await handleWechatNotification(callback());
  assert.equal(db.prepare("SELECT status FROM commercial_orders WHERE id=?").get(checkout.orderId).status, "paid");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM credit_ledger WHERE reference_id=?").get(checkout.orderId).count, 1);
});

test("invalid Alipay callback signatures are rejected", async () => {
  const response = new Request("https://example.com/api/billing/webhooks/alipay", {
    method: "POST", body: "app_id=2026000000000001&trade_status=TRADE_SUCCESS&sign=invalid",
  });
  await assert.rejects(() => handleAlipayNotification(response), (error) => error.code === "PAYMENT_WEBHOOK_SIGNATURE_INVALID");
});

test("stale pending QR orders are exposed as expired instead of polling forever", async () => {
  const staleId = "OSTSTALEPAYMENTORDER";
  db.prepare(`INSERT INTO commercial_orders
    (id,user_id,kind,status,amount_minor,currency,provider,idempotency_key,metadata_json,created_at,updated_at)
    VALUES (?,?,'topup','pending',1990,'CNY','wechat_pay',?,'{}',?,?)`)
    .run(staleId, user.id, "stale-payment-idempotency", Date.now() - 901000, Date.now() - 901000);
  assert.equal(domesticOrderStatus(staleId, user.id).status, "expired");
});

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));
