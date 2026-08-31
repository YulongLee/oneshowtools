CREATE TABLE IF NOT EXISTS tool_search_profiles (
  tool_id TEXT PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
  aliases_zh_json TEXT NOT NULL DEFAULT '[]',
  aliases_en_json TEXT NOT NULL DEFAULT '[]',
  example_queries_json TEXT NOT NULL DEFAULT '[]',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  exclusions_json TEXT NOT NULL DEFAULT '[]',
  search_priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_search_profiles_enabled_priority_idx
  ON tool_search_profiles(enabled, search_priority DESC);
