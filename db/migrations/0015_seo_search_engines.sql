ALTER TABLE seo_rank_snapshots ADD COLUMN search_engine TEXT NOT NULL DEFAULT 'google';
ALTER TABLE seo_rank_snapshots ADD COLUMN device TEXT NOT NULL DEFAULT 'desktop';

CREATE INDEX IF NOT EXISTS idx_seo_rank_engine_history
  ON seo_rank_snapshots(user_id, website, keyword, search_engine, device, observed_at DESC);
