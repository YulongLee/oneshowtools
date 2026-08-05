PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS music_provider_configs (
  provider TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  model_id TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  output_format TEXT NOT NULL DEFAULT 'mp3' CHECK(output_format IN ('mp3','wav')),
  credit_cost INTEGER NOT NULL DEFAULT 30 CHECK(credit_cost BETWEEN 1 AND 10000),
  max_duration_seconds INTEGER NOT NULL DEFAULT 300 CHECK(max_duration_seconds BETWEEN 15 AND 600),
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  updated_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS music_tracks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('inspiration','lyrics','instrumental')),
  prompt TEXT NOT NULL,
  lyrics TEXT NOT NULL DEFAULT '',
  options_json TEXT NOT NULL DEFAULT '{}',
  variant_index INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
  provider_alias TEXT NOT NULL DEFAULT 'OneShowMusic',
  provider_track_id TEXT,
  duration_ms INTEGER,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE(task_id, variant_index)
);

CREATE INDEX IF NOT EXISTS music_tracks_user_created_idx
  ON music_tracks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS music_tracks_task_idx
  ON music_tracks(task_id, variant_index);
