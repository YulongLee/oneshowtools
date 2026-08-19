import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import DysmsapiPackage, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import { envValue, getServerConfig } from "./config.mjs";

const AliyunSmsClient = DysmsapiPackage.default;

const providerError = (code, status = 502, details = null) => Object.assign(new Error(code), { code, status, details });

export function normalizeMainlandPhone(value) {
  const compact = String(value || "").trim().replace(/[\s()-]/g, "");
  const local = compact.startsWith("+86") ? compact.slice(3) : compact.startsWith("0086") ? compact.slice(4) : compact;
  if (!/^1[3-9]\d{9}$/.test(local)) throw providerError("INVALID_PHONE", 400);
  return { e164: `+86${local}`, local, last4: local.slice(-4), countryCode: "+86" };
}

export function phoneIdentityHash(phone) {
  const key = envValue("SMS_PHONE_HASH_KEY", "OFFERSTEADY_AUTH_SMS_CODE_PEPPER", "MODEL_CREDENTIAL_ENCRYPTION_KEY") || "oneshowtools-local-sms-identity";
  return createHmac("sha256", key).update(phone.e164).digest("hex");
}

export function generateSmsCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashSmsCode(phoneHash, code, salt) {
  return createHmac("sha256", salt).update(`${phoneHash}:${code}`).digest("hex");
}

export function createSmsCodeRecord(phoneHash, code) {
  const salt = randomBytes(24).toString("base64url");
  return { salt, hash: hashSmsCode(phoneHash, code, salt) };
}

export function verifySmsCodeHash(phoneHash, code, salt, expected) {
  const actual = Buffer.from(hashSmsCode(phoneHash, code, salt), "hex");
  const stored = Buffer.from(String(expected || ""), "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export async function sendLoginCode(phone, code) {
  const config = getServerConfig();
  if (!config.smsConfigured) throw providerError("SMS_NOT_CONFIGURED", 503);
  const endpointValue = envValue("ALIYUN_SMS_ENDPOINT", "OFFERSTEADY_AUTH_SMS_ALIYUN_ENDPOINT") || "https://dysmsapi.aliyuncs.com/";
  const endpoint = new URL(endpointValue).host;
  const client = new AliyunSmsClient({
    accessKeyId: envValue("ALIYUN_SMS_ACCESS_KEY_ID", "OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: envValue("ALIYUN_SMS_ACCESS_KEY_SECRET", "OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_SECRET"),
    endpoint,
    regionId: envValue("ALIYUN_SMS_REGION_ID", "OFFERSTEADY_AUTH_SMS_ALIYUN_REGION_ID") || "cn-qingdao",
    connectTimeout: Number(process.env.ALIYUN_SMS_TIMEOUT_MS || 10000),
    readTimeout: Number(process.env.ALIYUN_SMS_TIMEOUT_MS || 10000),
  });
  let result;
  try {
    const response = await client.sendSms(new SendSmsRequest({
      phoneNumbers: phone.local,
      signName: envValue("ALIYUN_SMS_SIGN_NAME", "OFFERSTEADY_AUTH_SMS_ALIYUN_SIGN_NAME"),
      templateCode: envValue("ALIYUN_SMS_TEMPLATE_CODE", "OFFERSTEADY_AUTH_SMS_ALIYUN_TEMPLATE_CODE"),
      templateParam: JSON.stringify({ code }),
    }));
    result = response?.body || {};
  } catch (error) {
    const providerCode = error?.code || error?.data?.Code || error?.data?.code;
    if (["InvalidAccessKeyId.NotFound", "InvalidAccessKeyId", "SignatureDoesNotMatch"].includes(providerCode)) {
      throw providerError("SMS_PROVIDER_AUTH_FAILED", 503, { providerCode });
    }
    throw providerError(error?.name === "TimeoutError" || error?.code === "ETIMEDOUT" ? "SMS_PROVIDER_TIMEOUT" : "SMS_PROVIDER_UNAVAILABLE", 502, { providerCode: providerCode || null });
  }
  if (result.code !== "OK" && result.Code !== "OK") {
    const providerCode = result.code || result.Code;
    const codeMap = {
      "isv.BUSINESS_LIMIT_CONTROL": ["SMS_RATE_LIMITED", 429],
      "isv.MOBILE_NUMBER_ILLEGAL": ["INVALID_PHONE", 400],
      "isv.AMOUNT_NOT_ENOUGH": ["SMS_PROVIDER_BALANCE_INSUFFICIENT", 503],
      "isv.SIGN_NAME_ILLEGAL": ["SMS_SIGN_INVALID", 503],
      "isv.TEMPLATE_MISSING_PARAMETERS": ["SMS_TEMPLATE_INVALID", 503],
      "isv.TEMPLATE_PARAMS_ILLEGAL": ["SMS_TEMPLATE_INVALID", 503],
      InvalidAccessKeyId: ["SMS_PROVIDER_AUTH_FAILED", 503],
      SignatureDoesNotMatch: ["SMS_PROVIDER_AUTH_FAILED", 503],
    };
    const [mapped, status] = codeMap[providerCode] || ["SMS_SEND_FAILED", 502];
    throw providerError(mapped, status, { providerCode: providerCode || null, requestId: result.requestId || result.RequestId || null });
  }
  return { requestId: result.requestId || result.RequestId || null, bizId: result.bizId || result.BizId || null };
}
