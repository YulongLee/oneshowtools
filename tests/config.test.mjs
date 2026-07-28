import assert from "node:assert/strict";
import test from "node:test";
import { getConfig } from "../worker/lib/config.js";

const base = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  EMAIL_API_KEY: "test-email-key",
  EMAIL_FROM: "account@example.test",
  TOOL_CREDENTIAL_PEPPER: "b".repeat(32),
};

test("billing remains off unless explicitly enabled", () => {
  const config = getConfig(base, "https://example.test/");
  assert.equal(config.billingEnabled, false);
  assert.equal(config.appUrl, "https://example.test");
});

test("enabled billing requires Stripe secrets", () => {
  assert.throws(() => getConfig({ ...base, BILLING_ENABLED: "true" }, "https://example.test/"), /STRIPE_SECRET_KEY/);
});

test("registration can be disabled without email credentials", () => {
  const config = getConfig({ REGISTRATION_ENABLED: "false", TOOL_CREDENTIAL_PEPPER: "x" }, "https://example.test/");
  assert.equal(config.registrationEnabled, false);
});

test("Google sign-in is opt-in and requires both OAuth credentials", () => {
  assert.equal(getConfig(base, "https://example.test/").google.enabled, false);
  assert.throws(
    () => getConfig({ ...base, GOOGLE_AUTH_ENABLED: "true" }, "https://example.test/"),
    /GOOGLE_CLIENT_ID/,
  );
  const config = getConfig({
    ...base,
    GOOGLE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  }, "https://example.test/");
  assert.equal(config.google.enabled, true);
});
