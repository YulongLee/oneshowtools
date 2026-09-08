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
// The generation tests inject a local model double; no external request is made.
process.env.ONESHOW_MODEL_API_KEY = "test-only-unused-key";
process.env.ONESHOW_MODEL_EXECUTION_ENABLED = "true";

const { db } = await import("../server/database.mjs");
const {
  createCustomVocabularyBook,
  createImmersionDocument,
  createImmersionGeneration,
  executeImmersionTask,
  deleteImmersionDocument,
  getImmersionDocument,
  immersionCatalog,
  recordVocabularyAction,
  seedVocabularyBooks,
  splitImmersionChapters,
  selectImmersionWords,
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

  const source = "真正有效的学习，需要从故事中获得洞见，不是把单词孤立地背下来，而是在你关心的故事和知识中反复遇见它。熟悉的语境会让新词更容易被理解，也更容易留下长期记忆。";
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
    return { text: JSON.stringify({ replacements: [{ word: "insight", original: "洞见", english: "insight" }] }) };
  };
  const completed = await executeImmersionTask(task, JSON.parse(task.input_json), fakeModel);
  assert.equal(completed.status, "completed");
  const document = getImmersionDocument(user.id, created.id);
  assert.equal(document.status, "ready");
  assert.equal(document.chapters[0].segments[1].word, "insight");
  assert.doesNotMatch(JSON.stringify(document), /目标词库|沉浸式阅读改写引擎/);

  let vocabulary = userVocabulary(user.id);
  assert.equal(vocabulary.stats.encountered, 0, "generating a document is not a reading exposure");
  const visit = updateReadingProgress(user.id, created.id, { chapterIndex: 0 });
  assert.equal(visit.percentage, 0, "opening the only chapter does not finish the book");
  vocabulary = userVocabulary(user.id);
  assert.equal(vocabulary.stats.encountered, 1);
  assert.equal(vocabulary.words[0].exposureCount, 1);
  const known = recordVocabularyAction(user.id, { word: "insight", action: "known" });
  assert.equal(known.knownStatus, "known");
  assert.ok(known.familiarityScore >= 20);
  const progress = updateReadingProgress(user.id, created.id, { chapterIndex: 0, completed: true });
  assert.equal(progress.percentage, 100);
  assert.equal(getImmersionDocument(user.id, created.id).readingProgress, 100);
  updateReadingProgress(user.id, created.id, { chapterIndex: 0 });
  assert.equal(userVocabulary(user.id).words[0].exposureCount, 1, "reopening must not inflate encounter counts");
  assert.equal(getImmersionDocument(user.id, created.id).chapters[0].completed, true);
  assert.throws(() => updateReadingProgress(user.id, created.id, { chapterIndex: NaN }), /IMMERSION_PROGRESS_INVALID/);
  assert.throws(() => updateReadingProgress(user.id, created.id, { chapterIndex: 1 }), /IMMERSION_PROGRESS_INVALID/);
  assert.throws(() => getImmersionDocument(addUser().id, created.id), /IMMERSION_DOCUMENT_NOT_FOUND/);
  assert.throws(() => createImmersionGeneration(user, created.id, { vocabularyBookId: custom.id }), /IMMERSION_ALREADY_READY/);
});

test("chapter splitting preserves every heading and all long-document text", () => {
  const source = Array.from({ length: 25 }, (_, index) => `第${index + 1}章 标题\n${"阅读内容需要完整保留。".repeat(100)}`).join("\n\n");
  const chapters = splitImmersionChapters(source);
  assert.equal(chapters.map((c) => c.text).join("").replace(/\s/g, ""), source.replace(/\s/g, ""));
  assert.equal(chapters.length, 25);
  const long = "中文长段落".repeat(9000);
  const pieces = splitImmersionChapters(long);
  assert.equal(pieces.map((c) => c.text).join(""), long);
  assert.ok(pieces.every((c) => c.text.length <= 4500));
});

test("visiting is distinct from completion and jumping chapters does not mark unread chapters complete", async () => {
  const user = addUser();
  const created = await createImmersionDocument(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "第一章 开始\n这是一段用于测试阅读进度的中文内容。\n第二章 后续\n这是一段用于测试跳转章节的中文内容。" }) }), user);
  db.prepare("UPDATE immersion_chapters SET status='ready',segments_json=? WHERE document_id=?").run(JSON.stringify([{ type: "normal", text: "测试文本" }]), created.id);
  assert.equal(updateReadingProgress(user.id, created.id, { chapterIndex: 1, percentage: 100 }).percentage, 0);
  assert.equal(updateReadingProgress(user.id, created.id, { chapterIndex: 1, completed: true }).percentage, 50);
  assert.equal(updateReadingProgress(user.id, created.id, { chapterIndex: 0 }).percentage, 50);
  assert.equal(updateReadingProgress(user.id, created.id, { chapterIndex: 0, completed: true }).percentage, 100);
});

test("viewing a word does not postpone its due date; save restores it to learning", () => {
  const user = addUser();
  const due = Date.now() - 1000;
  db.prepare("INSERT INTO user_vocabulary_progress (id,user_id,word,known_status,next_review_at,created_at,updated_at) VALUES (?,?,'test','known',?,?,?)").run(randomUUID(), user.id, due, due, due);
  assert.equal(userVocabulary(user.id).stats.due, 1);
  assert.equal(recordVocabularyAction(user.id, { word: "test", action: "view" }).nextReviewAt, due);
  assert.equal(recordVocabularyAction(user.id, { word: "test", action: "save" }).knownStatus, "learning");
  assert.equal(userVocabulary(user.id).stats.due, 0);
});

test("failed generation resumes completed chapters and reserves credits only once per accepted request", async () => {
  const { failTaskExecution } = await import("../server/runtime.mjs");
  const user = addUser();
  const book = createCustomVocabularyBook(user.id, { name: "测试词库", words: "learn：学习" });
  const created = await createImmersionDocument(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "第一章 开始\n这是一段用于测试的学习内容，需要完整保留。\n第二章 继续\n这是接下来的学习内容，需要继续处理。" }) }), user);
  const run = createImmersionGeneration(user, created.id, { vocabularyBookId: book.id, immersionLevel: 20 });
  assert.throws(() => createImmersionGeneration(user, created.id, { vocabularyBookId: book.id }), /IMMERSION_GENERATION_IN_PROGRESS/);
  await assert.rejects(deleteImmersionDocument(user, created.id), /IMMERSION_GENERATION_IN_PROGRESS/);
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(run.id);
  let calls = 0;
  const response = { text: JSON.stringify({ replacements: [{ word: "learn", original: "学习", english: "learn" }] }) };
  await assert.rejects(executeImmersionTask(task, JSON.parse(task.input_json), async () => { if (++calls === 2) throw new Error("MODEL_TIMEOUT"); return response; }), /MODEL_TIMEOUT/);
  failTaskExecution(task.id, "MODEL_TIMEOUT");
  failTaskExecution(task.id, "MODEL_TIMEOUT");
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 200);
  const retry = createImmersionGeneration(user, created.id, { vocabularyBookId: book.id, immersionLevel: 20 });
  assert.equal(getImmersionDocument(user.id, created.id).generation.completedChapters, 1);
  const retryTask = db.prepare("SELECT * FROM tasks WHERE id=?").get(retry.id);
  let retried = 0;
  await executeImmersionTask(retryTask, JSON.parse(retryTask.input_json), async () => { retried++; return response; });
  assert.equal(retried, 1);
  assert.equal(userVocabulary(user.id).stats.encountered, 0);
  assert.equal(getImmersionDocument(user.id, created.id).status, "ready");
  assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 180);
});

test("missing generation model is reported before reserving credits", async () => {
  const user = addUser();
  const created = await createImmersionDocument(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "这是一篇用于验证模型尚未配置时不会扣除积分的中文文章。" }) }), user);
  const previous = process.env.ONESHOW_MODEL_EXECUTION_ENABLED;
  process.env.ONESHOW_MODEL_EXECUTION_ENABLED = "false";
  try {
    assert.equal(immersionCatalog(user.id).generationAvailable, false);
    assert.throws(() => createImmersionGeneration(user, created.id, { vocabularyBookId: "vocab_cet4" }), /MODEL_PROVIDER_NOT_CONFIGURED/);
    assert.equal(db.prepare("SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?").get(user.id).balance, 200);
    assert.equal(getImmersionDocument(user.id, created.id).status, "draft");
  } finally { process.env.ONESHOW_MODEL_EXECUTION_ENABLED = previous; }
});

test("a relevant word beyond the first 160 entries is available to the model", () => {
  const words = Array.from({ length: 300 }, (_, index) => ({ word: `word${index}`, translation: "" }));
  words.push({ word: "momentum", translation: "动力；势头" });
  const selected = selectImmersionWords(words, "持续学习需要动力和积极反馈。");
  assert.equal(selected.length, 160);
  assert.equal(selected[0].word, "momentum");
});

test('TXT, Markdown and DOCX imports preserve extracted content; empty and unsupported files fail', async () => {
  const user = addUser();
  const text = '这是一篇用于测试文件上传和文字提取的文章，包含学习、阅读和新的挑战。';
  async function upload(file) {
    const form = new FormData(); form.set('file', file);
    return createImmersionDocument(new Request('http://localhost', {method:'POST',body:form}),user);
  }
  for (const [name,type] of [['sample.txt','text/plain'],['sample.md','text/markdown']]) {
    const document = await upload(new File([text],name,{type}));
    assert.equal(getImmersionDocument(user.id,document.id,{includeSource:true}).chapters.length,1);
    assert.equal(db.prepare('SELECT source_text FROM immersion_chapters WHERE document_id=?').get(document.id).source_text,text);
  }
  const {default: JSZip} = await import('jszip');
  const zip=new JSZip();zip.file('word/document.xml',`<w:document><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  const document=await upload(new File([await zip.generateAsync({type:'nodebuffer'})],'sample.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
  assert.equal(db.prepare('SELECT source_text FROM immersion_chapters WHERE document_id=?').get(document.id).source_text,text);
  await assert.rejects(upload(new File(['short'],'empty.txt',{type:'text/plain'})),/IMMERSION_TEXT_NOT_FOUND/);
  await assert.rejects(upload(new File([text],'sample.exe',{type:'application/octet-stream'})),/IMMERSION_FILE_UNSUPPORTED/);
});

test('a document with no matching vocabulary is not sold as a successful generation', async () => {
  const user=addUser();
  const document=await createImmersionDocument(new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'这是一篇与所选词汇完全没有关系的中文文章，用于检查生成质量。'})}),user);
  const generation=createImmersionGeneration(user,document.id,{vocabularyBookId:'vocab_cet4'});
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(generation.id);
  await assert.rejects(executeImmersionTask(task,JSON.parse(task.input_json),async()=>({text:'{"replacements":[]}'})),/IMMERSION_NO_MATCHING_WORDS/);
  const {failTaskExecution}=await import('../server/runtime.mjs');
  failTaskExecution(task.id,'IMMERSION_NO_MATCHING_WORDS');
  assert.equal(db.prepare('SELECT SUM(amount) AS balance FROM credit_ledger WHERE user_id=?').get(user.id).balance,200);
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
