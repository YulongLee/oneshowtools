CREATE TABLE IF NOT EXISTS platform_model_configs (
  purpose TEXT PRIMARY KEY CHECK(purpose IN ('managed_runtime','market_intelligence')),
  name TEXT NOT NULL,
  provider_template TEXT NOT NULL CHECK(provider_template IN ('openai','anthropic')),
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  workspace_id TEXT,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  updated_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS file_storage_objects (
  file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('local','oss')),
  object_key TEXT NOT NULL UNIQUE,
  etag TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','deleting','failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS file_storage_provider_created_idx
  ON file_storage_objects(provider, created_at DESC);
