PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

ALTER TABLE image_provider_configs RENAME TO image_provider_configs_before_image_text_ocr;

CREATE TABLE image_provider_configs (
  purpose TEXT PRIMARY KEY CHECK(purpose IN ('music_cover','image_editing','image_upscaling','image_text_ocr')),
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
  updated_at INTEGER NOT NULL,
  credential_source TEXT NOT NULL DEFAULT 'direct' CHECK(credential_source IN ('direct','workspace'))
);

INSERT INTO image_provider_configs (
  purpose, adapter, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint,
  credential_version, status, credit_cost, last_test_status, last_test_latency_ms,
  last_tested_at, updated_by, created_at, updated_at, credential_source
)
SELECT purpose, adapter, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint,
  credential_version, status, credit_cost, last_test_status, last_test_latency_ms,
  last_tested_at, updated_by, created_at, updated_at, credential_source
FROM image_provider_configs_before_image_text_ocr;

DROP TABLE image_provider_configs_before_image_text_ocr;
COMMIT;
PRAGMA foreign_keys = ON;
