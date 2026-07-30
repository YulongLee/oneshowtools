CREATE TABLE IF NOT EXISTS user_tool_model_preferences (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  route_kind TEXT NOT NULL DEFAULT 'managed'
    CHECK(route_kind IN ('managed','user_connection')),
  model_connection_id TEXT REFERENCES user_model_connections(id) ON DELETE SET NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, tool_id)
);

CREATE INDEX IF NOT EXISTS user_tool_model_preferences_connection_idx
  ON user_tool_model_preferences(model_connection_id);
