PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS singing_provider_configs (
  provider TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  credit_cost INTEGER NOT NULL DEFAULT 80 CHECK(credit_cost BETWEEN 1 AND 10000),
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  updated_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS singing_voices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'myvocal',
  provider_voice_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'training' CHECK(status IN ('training','ready','failed','deleting')),
  webhook_id TEXT,
  callback_token_hash TEXT NOT NULL UNIQUE,
  error_code TEXT,
  consent_confirmed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS singing_voice_files (
  voice_id TEXT NOT NULL REFERENCES singing_voices(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  PRIMARY KEY (voice_id, file_id)
);

CREATE TABLE IF NOT EXISTS singing_cover_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL UNIQUE REFERENCES music_tracks(id) ON DELETE CASCADE,
  voice_id TEXT REFERENCES singing_voices(id) ON DELETE SET NULL,
  source_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  provider_job_id TEXT,
  provider_cover_id TEXT,
  callback_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','processing','completed','failed')),
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS singing_voices_user_created_idx
  ON singing_voices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS singing_cover_jobs_status_idx
  ON singing_cover_jobs(status, updated_at);
