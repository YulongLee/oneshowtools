CREATE TABLE IF NOT EXISTS ppt_text_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  current_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slide_count INTEGER NOT NULL DEFAULT 0,
  slide_width INTEGER NOT NULL DEFAULT 12192000,
  slide_height INTEGER NOT NULL DEFAULT 6858000,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','processing','failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ppt_text_projects_user_updated_idx
  ON ppt_text_projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ppt_text_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES ppt_text_projects(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  shape_index INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  current_text TEXT NOT NULL,
  bbox_json TEXT NOT NULL DEFAULT '{}',
  style_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, slide_number, shape_index)
);

CREATE INDEX IF NOT EXISTS ppt_text_items_project_slide_idx
  ON ppt_text_items(project_id, slide_number, shape_index);
