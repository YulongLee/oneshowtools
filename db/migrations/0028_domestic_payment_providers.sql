CREATE TABLE IF NOT EXISTS payment_provider_configs (
  provider TEXT PRIMARY KEY CHECK(provider IN ('alipay','wechat_pay')),
  mode TEXT NOT NULL DEFAULT 'production' CHECK(mode IN ('sandbox','production')),
  app_id TEXT NOT NULL,
  merchant_id TEXT,
  gateway_url TEXT NOT NULL,
  credential_ciphertext TEXT NOT NULL,
  credential_iv TEXT NOT NULL,
  credential_tag TEXT NOT NULL,
  credential_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK(status IN ('active','disabled')),
  last_test_status TEXT,
  last_tested_at INTEGER,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_provider_configs_status_idx
  ON payment_provider_configs(status, provider);
