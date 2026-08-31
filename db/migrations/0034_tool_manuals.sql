PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tool_manuals (
  tool_id TEXT PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
  title_zh TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  summary_zh TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  content_zh TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  homepage_visible INTEGER NOT NULL DEFAULT 0,
  support_enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_manuals_public_idx
  ON tool_manuals(status, homepage_visible, updated_at DESC);
