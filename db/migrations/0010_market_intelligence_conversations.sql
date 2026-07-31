PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS market_intelligence_conversations (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES market_intelligence_reports(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '市场情报讨论',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(report_id, created_by)
);

CREATE TABLE IF NOT EXISTS market_intelligence_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES market_intelligence_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL DEFAULT '[]',
  suggested_questions_json TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS market_intelligence_messages_conversation_idx
  ON market_intelligence_messages(conversation_id, created_at ASC);
