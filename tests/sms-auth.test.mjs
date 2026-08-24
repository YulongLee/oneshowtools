import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-sms-auth-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.SMS_AUTH_ENABLED = "true";
process.env.ALIYUN_SMS_ACCESS_KEY_ID = "test-access-id";
process.env.ALIYUN_SMS_ACCESS_KEY_SECRET = "test-access-secret";
process.env.ALIYUN_SMS_SIGN_NAME = "OneShowTools测试";
process.env.ALIYUN_SMS_TEMPLATE_CODE = "SMS_TEST_LOGIN";
process.env.SMS_PHONE_HASH_KEY = "a-stable-test-phone-hash-key-with-32-characters";

let deliveredCode = "";
let providerCalls = 0;
const smsPackage = await import("@alicloud/dysmsapi20170525");
const SmsClient = smsPackage.default.default;
const originalSendSms = SmsClient.prototype.sendSms;
SmsClient.prototype.sendSms = async (parameters) => {
  providerCalls += 1;
  deliveredCode = JSON.parse(parameters.templateParam).code;
  assert.equal(parameters.phoneNumbers, "13800138000");
  assert.equal(parameters.signName, "OneShowTools测试");
  assert.equal(parameters.templateCode, "SMS_TEST_LOGIN");
  return { body: { code: "OK", requestId: "request-1", bizId: "biz-1" } };
};

const { handleApi } = await import(`../server/api.mjs?sms=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const request = (path, data) => new Request(`http://localhost${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

test("SMS login sends through Aliyun, creates one account, and consumes the code once", async () => {
  const sent = await handleApi(request("/api/auth/sms/send", { phone: "138 0013 8000", locale: "zh-CN" }));
  assert.equal(sent.status, 202);
  assert.equal(providerCalls, 1);
  assert.match(deliveredCode, /^\d{6}$/);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sms_verification_codes").get().count, 1);
  assert.notEqual(db.prepare("SELECT code_hash FROM sms_verification_codes LIMIT 1").get().code_hash, deliveredCode);

  const incorrect = await handleApi(request("/api/auth/sms/verify", { phone: "13800138000", code: "999999" }));
  assert.equal(incorrect.status, 400);
  assert.equal((await incorrect.json()).error.code, "SMS_CODE_INVALID");

  const verified = await handleApi(request("/api/auth/sms/verify", {
    phone: "+8613800138000", code: deliveredCode, locale: "zh-CN",
    legalAccepted: true, termsVersion: "2026-08-24", privacyVersion: "2026-08-24",
  }));
  assert.equal(verified.status, 201);
  const payload = await verified.json();
  assert.equal(payload.user.email, null);
  assert.equal(payload.user.phone, "+86 **** 8000");
  assert.equal(payload.user.phoneVerified, true);
  assert.deepEqual(payload.user.authMethods, ["sms"]);
  assert.equal(payload.user.name, "用户_8000");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 1);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id = ?").get(payload.user.id).balance, 200);

  const replay = await handleApi(request("/api/auth/sms/verify", { phone: "13800138000", code: deliveredCode }));
  assert.equal(replay.status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 1);
});

test("SMS sending enforces a one-minute phone cooldown", async () => {
  const response = await handleApi(request("/api/auth/sms/send", { phone: "13800138000" }));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, "SMS_RATE_LIMITED");
  assert.equal(providerCalls, 1);
});

test("OfferSteady Aliyun SMS aliases are accepted", async () => {
  const original = {
    id: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
    secret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    sign: process.env.ALIYUN_SMS_SIGN_NAME,
    template: process.env.ALIYUN_SMS_TEMPLATE_CODE,
  };
  delete process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  delete process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  delete process.env.ALIYUN_SMS_SIGN_NAME;
  delete process.env.ALIYUN_SMS_TEMPLATE_CODE;
  process.env.OFFERSTEADY_AUTH_SMS_PROVIDER_MODE = "aliyun-dysmsapi";
  process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_ID = "alias-access-id";
  process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_SECRET = "alias-access-secret";
  process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_SIGN_NAME = "OneShowTools测试";
  process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_TEMPLATE_CODE = "SMS_TEST_LOGIN";
  const { getServerConfig } = await import("../server/config.mjs");
  assert.equal(getServerConfig("http://localhost").smsConfigured, true);
  Object.assign(process.env, {
    ALIYUN_SMS_ACCESS_KEY_ID: original.id,
    ALIYUN_SMS_ACCESS_KEY_SECRET: original.secret,
    ALIYUN_SMS_SIGN_NAME: original.sign,
    ALIYUN_SMS_TEMPLATE_CODE: original.template,
  });
  delete process.env.OFFERSTEADY_AUTH_SMS_PROVIDER_MODE;
  delete process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_ID;
  delete process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_SECRET;
  delete process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_SIGN_NAME;
  delete process.env.OFFERSTEADY_AUTH_SMS_ALIYUN_TEMPLATE_CODE;
});

test.after(async () => {
  SmsClient.prototype.sendSms = originalSendSms;
  db.close();
  await rm(dataDirectory, { recursive: true, force: true });
});
