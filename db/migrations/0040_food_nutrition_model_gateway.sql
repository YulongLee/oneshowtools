PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

ALTER TABLE platform_model_configs RENAME TO platform_model_configs_before_food_nutrition;

CREATE TABLE platform_model_configs (
  purpose TEXT PRIMARY KEY CHECK(purpose IN ('managed_runtime','market_intelligence','oneshow_home_chat','food_nutrition')),
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

INSERT INTO platform_model_configs (
  purpose, name, provider_template, base_url, model_id, workspace_id,
  key_ciphertext, key_iv, key_tag, key_hint, credential_version, status,
  last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at
)
SELECT
  purpose, name, provider_template, base_url, model_id, workspace_id,
  key_ciphertext, key_iv, key_tag, key_hint, credential_version, status,
  last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at
FROM platform_model_configs_before_food_nutrition;

DROP TABLE platform_model_configs_before_food_nutrition;
COMMIT;
PRAGMA foreign_keys = ON;
