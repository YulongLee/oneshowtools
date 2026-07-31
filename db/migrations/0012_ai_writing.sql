CREATE TABLE IF NOT EXISTS writing_runs (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  output_language TEXT NOT NULL,
  output_length TEXT NOT NULL,
  tone TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  model_route TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_writing_runs_template_created ON writing_runs(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_writing_runs_user_created ON writing_runs(user_id, created_at DESC);
