PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS market_intelligence_source_runs (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES market_intelligence_reports(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL,
  configured INTEGER NOT NULL DEFAULT 1,
  item_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  collected_at INTEGER NOT NULL,
  UNIQUE(report_id, source_key)
);

CREATE INDEX IF NOT EXISTS market_intelligence_source_runs_date_idx
  ON market_intelligence_source_runs(report_date DESC, source_key);

CREATE TABLE IF NOT EXISTS market_intelligence_signals (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES market_intelligence_reports(id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_label TEXT NOT NULL,
  signal_kind TEXT NOT NULL,
  category TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  published_at TEXT,
  engagement REAL NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  fingerprint TEXT NOT NULL,
  collected_at INTEGER NOT NULL,
  UNIQUE(report_id, evidence_id),
  UNIQUE(report_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS market_intelligence_signals_report_idx
  ON market_intelligence_signals(report_id, quality_score DESC);
CREATE INDEX IF NOT EXISTS market_intelligence_signals_category_idx
  ON market_intelligence_signals(category, collected_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_behavior_events (
  id TEXT PRIMARY KEY,
  opaque_user_id TEXT,
  event_kind TEXT NOT NULL,
  tool_slug TEXT,
  category TEXT,
  query TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_behavior_events_created_idx
  ON marketplace_behavior_events(created_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_behavior_events_tool_idx
  ON marketplace_behavior_events(tool_slug, event_kind, created_at DESC);
