import assert from "node:assert/strict";
import test from "node:test";
import { getServerConfig, validateServerConfig } from "../server/config.mjs";

const managedKeys = [
  "APP_URL",
  "REGISTRATION_ENABLED",
  "ALLOW_DEV_EMAIL_DELIVERY",
  "EMAIL_PROVIDER",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_PORT",
  "EMAIL_SMTP_SECURE",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASSWORD",
  "EMAIL_FROM",
  "EMAIL_API_KEY",
];
const original = Object.fromEntries(managedKeys.map((key) => [key, process.env[key]]));

function restoreEnvironment() {
  for (const [key, value] of Object.entries(original)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

test("Alibaba Cloud SMTP keeps registration closed until every credential exists", () => {
  Object.assign(process.env, {
    APP_URL: "https://oneshowtools.com",
    REGISTRATION_ENABLED: "true",
    ALLOW_DEV_EMAIL_DELIVERY: "false",
    EMAIL_PROVIDER: "smtp",
    EMAIL_SMTP_HOST: "smtpdm.aliyun.com",
    EMAIL_SMTP_PORT: "465",
    EMAIL_SMTP_SECURE: "true",
    EMAIL_SMTP_USER: "noreply@mail.oneshowtools.com",
    EMAIL_FROM: "OneShowTools <noreply@mail.oneshowtools.com>",
  });
  delete process.env.EMAIL_SMTP_PASSWORD;

  const incomplete = getServerConfig();
  assert.equal(incomplete.emailConfigured, false);
  assert.equal(incomplete.registrationEnabled, false);
  assert.deepEqual(validateServerConfig(incomplete), ["EMAIL_PROVIDER_REQUIRED"]);

  process.env.EMAIL_SMTP_PASSWORD = "dedicated-test-smtp-password";
  const complete = getServerConfig();
  assert.equal(complete.emailProvider, "smtp");
  assert.equal(complete.emailConfigured, true);
  assert.equal(complete.registrationEnabled, true);
  assert.deepEqual(validateServerConfig(complete), []);
});

test("unknown email providers fail closed", () => {
  process.env.APP_URL = "https://oneshowtools.com";
  process.env.REGISTRATION_ENABLED = "false";
  process.env.EMAIL_PROVIDER = "unknown";
  const config = getServerConfig();
  assert.equal(config.emailConfigured, false);
  assert.deepEqual(validateServerConfig(config), ["EMAIL_PROVIDER_UNSUPPORTED"]);
});

test.after(restoreEnvironment);
