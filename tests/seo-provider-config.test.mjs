import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-seo-provider-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
delete process.env.DATAFORSEO_LOGIN;
delete process.env.DATAFORSEO_PASSWORD;

const {
  dataForSeoCredentials, saveSeoProviderConfiguration, seoProviderConfiguration,
  testSeoProviderConfiguration,
} = await import(`../server/seo-provider-config.mjs?test=${Date.now()}`);
const { seoDataSourceStatus } = await import(`../server/seo-engine.mjs?provider=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const healthyFetch = async (_url, options) => {
  assert.match(options.headers.authorization, /^Basic /);
  return new Response(JSON.stringify({
    tasks: [{ status_code: 20000, result: [{ money: { balance: 1.25, currency: "USD" } }] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
};

test("DataForSEO admin configuration is tested, encrypted, redacted, and activates SEO sources", async () => {
  assert.equal(seoProviderConfiguration().configured, false);
  assert.equal(seoDataSourceStatus().labels.dataForSeo, false);

  const tested = await testSeoProviderConfiguration({
    login: "Contact@OneShowAILab.com", password: "provider-secret-password",
  }, healthyFetch);
  assert.equal(tested.status, "healthy");
  assert.equal(tested.balance, 1.25);
  assert.equal(seoProviderConfiguration().configured, false);

  const saved = await saveSeoProviderConfiguration({
    login: "Contact@OneShowAILab.com", password: "provider-secret-password", status: "active",
  }, "admin-user", healthyFetch);
  assert.equal(saved.configured, true);
  assert.equal(saved.loginHint, "co•••@oneshowailab.com");
  assert.equal(saved.passwordHint, "••••word");
  assert.equal(saved.balance, 1.25);
  assert.doesNotMatch(JSON.stringify(saved), /provider-secret-password|Contact@OneShowAILab/i);

  const stored = db.prepare("SELECT * FROM seo_provider_configs WHERE provider = 'dataforseo'").get();
  assert.equal(stored.login, "contact@oneshowailab.com");
  assert.notEqual(stored.password_ciphertext, "provider-secret-password");
  assert.doesNotMatch(JSON.stringify(stored), /provider-secret-password/);

  assert.deepEqual(dataForSeoCredentials(), {
    login: "contact@oneshowailab.com", password: "provider-secret-password", source: "admin",
  });
  assert.equal(seoDataSourceStatus().labels.dataForSeo, true);

  const disabled = await saveSeoProviderConfiguration({ status: "disabled" }, "admin-user", healthyFetch);
  assert.equal(disabled.enabled, false);
  assert.equal(dataForSeoCredentials(), null);
  assert.equal(seoDataSourceStatus().labels.dataForSeo, false);
});

test("DataForSEO authentication failures are not persisted", async () => {
  const before = db.prepare("SELECT updated_at FROM seo_provider_configs WHERE provider = 'dataforseo'").get().updated_at;
  await assert.rejects(
    testSeoProviderConfiguration({ login: "bad@example.com", password: "wrong" }, async () => new Response("", { status: 401 })),
    (error) => error.code === "SEO_PROVIDER_AUTH_FAILED",
  );
  assert.equal(db.prepare("SELECT updated_at FROM seo_provider_configs WHERE provider = 'dataforseo'").get().updated_at, before);
});

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));
