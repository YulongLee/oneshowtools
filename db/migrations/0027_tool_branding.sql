CREATE TABLE IF NOT EXISTS tool_branding (
  tool_id TEXT PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
  storage_provider TEXT,
  storage_name TEXT,
  object_key TEXT,
  etag TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  accent_color TEXT NOT NULL DEFAULT '#2768EB',
  background_color TEXT NOT NULL DEFAULT '#EDF4FF',
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_branding_updated_idx ON tool_branding(updated_at DESC);
