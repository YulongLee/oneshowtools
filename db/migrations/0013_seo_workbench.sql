CREATE TABLE IF NOT EXISTS seo_runs (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  website TEXT,
  data_source TEXT NOT NULL,
  data_quality TEXT NOT NULL,
  score INTEGER,
  report_markdown TEXT NOT NULL,
  structured_json TEXT NOT NULL,
  model_route TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seo_runs_user_created ON seo_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_runs_website_created ON seo_runs(website, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_rank_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  keyword TEXT NOT NULL,
  country TEXT,
  language TEXT,
  rank INTEGER,
  result_url TEXT,
  source TEXT NOT NULL,
  observed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history ON seo_rank_snapshots(user_id, website, keyword, observed_at DESC);
