PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS market_intelligence_reports (
  id TEXT PRIMARY KEY,
  report_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_kind TEXT NOT NULL DEFAULT 'scheduled',
  model TEXT NOT NULL,
  summary_zh TEXT,
  summary_en TEXT,
  opportunities_json TEXT,
  sources_json TEXT,
  internal_snapshot_json TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  opportunity_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS market_intelligence_reports_status_date_idx
  ON market_intelligence_reports(status, report_date DESC);

CREATE TABLE IF NOT EXISTS marketplace_search_events (
  id TEXT PRIMARY KEY,
  opaque_user_id TEXT,
  query TEXT NOT NULL,
  category TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_search_events_created_idx
  ON marketplace_search_events(created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_search_events_query_idx
  ON marketplace_search_events(query, created_at DESC);
