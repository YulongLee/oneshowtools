CREATE TABLE IF NOT EXISTS vocabulary_books (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_zh TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'built_in' CHECK(kind IN ('built_in','custom')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, code)
);

CREATE INDEX IF NOT EXISTS vocabulary_books_owner_active_idx
  ON vocabulary_books(owner_user_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS vocabulary_words (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES vocabulary_books(id) ON DELETE CASCADE,
  word TEXT NOT NULL COLLATE NOCASE,
  phonetic TEXT NOT NULL DEFAULT '',
  translation_zh TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL,
  UNIQUE(book_id, word)
);

CREATE INDEX IF NOT EXISTS vocabulary_words_book_idx ON vocabulary_words(book_id, difficulty, word);

CREATE TABLE IF NOT EXISTS immersion_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  vocabulary_book_id TEXT REFERENCES vocabulary_books(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('paste','pdf','docx','txt','markdown')),
  source_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued','generating','ready','failed')),
  immersion_level INTEGER NOT NULL DEFAULT 20 CHECK(immersion_level BETWEEN 10 AND 70),
  word_count INTEGER NOT NULL DEFAULT 0,
  chapter_count INTEGER NOT NULL DEFAULT 0,
  generated_chapters INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS immersion_documents_user_updated_idx
  ON immersion_documents(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS immersion_chapters (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES immersion_documents(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  source_text TEXT NOT NULL,
  segments_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','generating','ready','failed')),
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(document_id, chapter_index)
);

CREATE TABLE IF NOT EXISTS immersion_generation_tasks (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES immersion_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
  completed_chapters INTEGER NOT NULL DEFAULT 0,
  total_chapters INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL COLLATE NOCASE,
  translation_zh TEXT NOT NULL DEFAULT '',
  phonetic TEXT NOT NULL DEFAULT '',
  exposure_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  known_status TEXT NOT NULL DEFAULT 'learning' CHECK(known_status IN ('learning','known','unknown')),
  familiarity_score INTEGER NOT NULL DEFAULT 0 CHECK(familiarity_score BETWEEN 0 AND 100),
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  next_review_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS user_vocabulary_progress_user_status_idx
  ON user_vocabulary_progress(user_id, known_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS word_exposures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES immersion_documents(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES immersion_chapters(id) ON DELETE CASCADE,
  word TEXT NOT NULL COLLATE NOCASE,
  context_text TEXT NOT NULL DEFAULT '',
  exposure_level INTEGER NOT NULL DEFAULT 1,
  clicked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS word_exposures_user_word_idx
  ON word_exposures(user_id, word, created_at DESC);

CREATE TABLE IF NOT EXISTS immersion_reading_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES immersion_documents(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL DEFAULT 0,
  paragraph_index INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0 CHECK(percentage BETWEEN 0 AND 100),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, document_id)
);
