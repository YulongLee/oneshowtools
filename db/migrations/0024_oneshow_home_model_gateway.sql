BEGIN IMMEDIATE;

ALTER TABLE platform_model_configs RENAME TO platform_model_configs_before_oneshow_home;

CREATE TABLE platform_model_configs (
  purpose TEXT PRIMARY KEY CHECK(purpose IN ('managed_runtime','market_intelligence','oneshow_home_chat')),
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

INSERT INTO platform_model_configs SELECT * FROM platform_model_configs_before_oneshow_home;
DROP TABLE platform_model_configs_before_oneshow_home;

COMMIT;

CREATE TABLE IF NOT EXISTS platform_model_invocations (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
  model_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  error_class TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS platform_model_invocations_purpose_started_idx
  ON platform_model_invocations(purpose, started_at DESC);
