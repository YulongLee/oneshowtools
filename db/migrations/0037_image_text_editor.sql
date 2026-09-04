CREATE TABLE IF NOT EXISTS image_text_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('detecting','ready','processing','failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS image_text_projects_user_updated_idx
  ON image_text_projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS image_text_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES image_text_projects(id) ON DELETE CASCADE,
  original_file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  current_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'detecting' CHECK(status IN ('detecting','ready','processing','failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS image_text_assets_project_idx
  ON image_text_assets(project_id, created_at);

CREATE TABLE IF NOT EXISTS image_text_detections (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES image_text_assets(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  current_text TEXT NOT NULL,
  bbox_json TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  rotation REAL NOT NULL DEFAULT 0,
  style_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS image_text_detections_asset_idx
  ON image_text_detections(asset_id, created_at);

CREATE TABLE IF NOT EXISTS image_text_operations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES image_text_projects(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES image_text_assets(id) ON DELETE CASCADE,
  detection_id TEXT REFERENCES image_text_detections(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS image_text_operations_asset_idx
  ON image_text_operations(asset_id, created_at DESC);
