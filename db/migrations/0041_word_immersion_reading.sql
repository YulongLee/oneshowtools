CREATE TABLE IF NOT EXISTS immersion_chapter_readings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES immersion_chapters(id) ON DELETE CASCADE,
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
  visited_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, chapter_id)
);
