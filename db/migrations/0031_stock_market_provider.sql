CREATE TABLE IF NOT EXISTS stock_market_provider_configs (
  provider TEXT PRIMARY KEY,
  quote_url TEXT NOT NULL,
  search_url TEXT NOT NULL DEFAULT '',
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  cache_ttl_ms INTEGER NOT NULL DEFAULT 12000,
  status TEXT NOT NULL DEFAULT 'active',
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
