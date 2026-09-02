import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-word-immersion-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { db } = await import("../server/database.mjs");
const {
  createCustomVocabularyBook,
  createImmersionDocument,
  createImmersionGeneration,
  executeImmersionTask,
  getImmersionDocument,
  immersionCatalog,
  recordVocabularyAction,
  seedVocabularyBooks,
  splitImmersionChapters,
  updateReadingProgress,
  userVocabulary,
} = await import("../server/word-immersion.mjs");

seedVocabularyBooks();

function addUser() {
  const id = randomUUID();
  const timestamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,'WordIn tester',?,'unused',1,?,?)")
    .run(id, `wordin-${id}@example.com`, timestamp, timestamp);
  db.prepare("INSERT INTO credit_ledger (id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'grant',200,'测试','Test','test',?,?)")
    .run(randomUUID(), id, id, timestamp);
  return { id };
}

test("word immersion is seeded as an administrator-only testing product", () => {
  const tool = db.prepare("SELECT id,credit_cost AS creditCost FROM tools WHERE slug='word-immersion'").get();
  assert.equal(tool.id, "tool_word_immersion");
  assert.equal(tool.creditCost, 20);
  const version = db.prepare("SELECT lifecycle_state AS lifecycleState,visibility FROM tool_versions WHERE tool_id=? ORDER BY version DESC LIMIT 1").get(tool.id);
  assert.equal(version.lifecycleState, "testing");
  assert.equal(version.visibility, "private");
  const catalog = immersionCatalog("nobody");
  assert.equal(catalog.books.length, 6);
  assert.deepEqual(catalog.levels.map((item) => item.value), [10, 20, 30, 50, 70]);
});

test("chapter splitting keeps headings and bounds long reading material", () => {
  const source = `第一章 开始\n\n${"这是一段用于测试的文章内容。".repeat(240)}\n\n第二章 继续\n\n${"这里是下一章内容。".repeat(80)}`;
  const chapters = splitImmersionChapters(source, "测试读物");
  assert.ok(chapters.length >= 2);
  assert.ok(chapters.length <= 16);
  assert.match(chapters.at(-1).text, /下一章内容/);
});

test("a user can import a vocabulary list, generate a reading and retain learning progress", async () => {
  const user = addUser();
  const custom = createCustomVocabularyBook(user.id, {
    name: "产品英语",
    words: "insight：洞见\nresilient：有韧性的\nmomentum：动力",
  });
  assert.equal(custom.wordCount, 3);

  const source = "真正有效的学习，不是把单词孤立地背下来，而是在你关心的故事和知识中反复遇见它。熟悉的语境会让新词更容易被理解，也更容易留下长期记忆。";
  const created = await createImmersionDocument(new Request("http://localhost/api/word-immersion/documents", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "真实语境中的学习", text: source }),
  }), user);
  assert.equal(created.status, "draft");
  assert.equal(created.chapters.length, 1);

  const generation = createImmersionGeneration(user, created.id, { vocabularyBookId: custom.id, immersionLevel: 20 });
  assert.equal(generation.creditCost, 20);
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 180);
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(generation.id);
  const fakeModel = async ({ capability, text }) => {
    assert.equal(capability, "word-immersion");
    assert.match(text, /insight/);
    return { text: JSON.stringify({ segments: [
      { type: "normal", text: "真正有效的学习，是在关心的知识中获得" },
      { type: "word", text: "insight（洞见）", word: "insight", original: "洞见", translation: "洞见", phonetic: "/ˈɪnsaɪt/", exposureLevel: 1 },
      { type: "normal", text: "，并通过真实语境留下长期记忆。" },
    ] }) };
  };
  const completed = await executeImmersionTask(task, JSON.parse(task.input_json), fakeModel);
  assert.equal(completed.status, "completed");
  const document = getImmersionDocument(user.id, created.id);
  assert.equal(document.status, "ready");
  assert.equal(document.chapters[0].segments[1].word, "insight");
  assert.doesNotMatch(JSON.stringify(document), /目标词库|沉浸式阅读改写引擎/);

  let vocabulary = userVocabulary(user.id);
  assert.equal(vocabulary.stats.encountered, 1);
  assert.equal(vocabulary.words[0].exposureCount, 1);
  const known = recordVocabularyAction(user.id, { word: "insight", action: "known" });
  assert.equal(known.knownStatus, "known");
  assert.ok(known.familiarityScore >= 20);
  const progress = updateReadingProgress(user.id, created.id, { chapterIndex: 0, percentage: 100 });
  assert.equal(progress.percentage, 100);
  assert.equal(getImmersionDocument(user.id, created.id).readingProgress, 100);
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
