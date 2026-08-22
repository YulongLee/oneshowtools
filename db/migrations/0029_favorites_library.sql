CREATE TABLE IF NOT EXISTS favorite_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS favorite_collections_user_updated_idx
  ON favorite_collections(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('tool', 'file', 'prompt', 'material')),
  item_id TEXT NOT NULL,
  collection_id TEXT REFERENCES favorite_collections(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_type_created_idx
  ON user_favorites(user_id, item_type, created_at DESC);
CREATE INDEX IF NOT EXISTS user_favorites_collection_idx
  ON user_favorites(collection_id, created_at DESC);
