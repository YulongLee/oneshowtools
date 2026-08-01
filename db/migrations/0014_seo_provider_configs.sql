CREATE TABLE IF NOT EXISTS seo_provider_configs (
  provider TEXT PRIMARY KEY CHECK(provider IN ('dataforseo')),
  login TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  password_iv TEXT NOT NULL,
  password_tag TEXT NOT NULL,
  password_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_balance REAL,
  last_currency TEXT,
  last_tested_at INTEGER,
  updated_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
