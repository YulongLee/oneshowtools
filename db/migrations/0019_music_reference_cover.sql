PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS music_references (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  cover_feature_id TEXT NOT NULL,
  formatted_lyrics TEXT NOT NULL DEFAULT '',
  structure_json TEXT NOT NULL DEFAULT '{}',
  audio_duration_seconds REAL NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','expired','failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS music_references_user_created_idx
  ON music_references(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS music_references_expiry_idx
  ON music_references(status, expires_at);
