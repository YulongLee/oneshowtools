PRAGMA foreign_keys = OFF;

ALTER TABLE image_provider_configs RENAME TO image_provider_configs_legacy;

CREATE TABLE image_provider_configs (
  purpose TEXT PRIMARY KEY CHECK(purpose IN ('music_cover','image_editing','image_upscaling')),
  adapter TEXT NOT NULL CHECK(adapter IN ('openai','minimax','dashscope')),
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  credit_cost INTEGER NOT NULL DEFAULT 10 CHECK(credit_cost BETWEEN 1 AND 10000),
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  updated_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO image_provider_configs SELECT * FROM image_provider_configs_legacy;
DROP TABLE image_provider_configs_legacy;

PRAGMA foreign_keys = ON;
