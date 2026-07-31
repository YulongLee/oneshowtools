CREATE TABLE IF NOT EXISTS user_model_connection_endpoints (
  connection_id TEXT PRIMARY KEY REFERENCES user_model_connections(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
