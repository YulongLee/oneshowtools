import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-manuals-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";

const { db } = await import("../server/database.mjs");
const { handleApi } = await import(`../server/api.mjs?manuals=${Date.now()}`);
const { listPublicToolManuals, publicToolManual, saveToolManual, supportToolManuals } = await import("../server/tool-manuals.mjs");

test("tool guides can be hidden from homepage while remaining available to support", async () => {
  db.prepare("UPDATE tools SET active=1 WHERE id='tool_music_studio'").run();
  saveToolManual("tool_music_studio", {
    titleZh: "AI 音乐工作室使用手册", titleEn: "AI Music Studio Guide",
    summaryZh: "从创作到下载的完整说明。", summaryEn: "A complete creation and download guide.",
    contentZh: "第一步：填写创作灵感。\n\n第二步：生成并试听音乐。", contentEn: "Step 1: Describe the track.\n\nStep 2: Generate and preview it.",
    status: "published", homepageVisible: false, supportEnabled: true,
  }, null);

  assert.equal(listPublicToolManuals({ homepageOnly: true }).length, 0);
  assert.equal(publicToolManual("ai-music-studio").titleZh, "AI 音乐工作室使用手册");
  assert.match(supportToolManuals("zh-CN")[0].answer, /https:\/\/oneshowtools\.com\/help\/ai-music-studio/);

  const hiddenResponse = await handleApi(new Request("http://localhost/api/tool-manuals?homepage=1"));
  assert.equal(hiddenResponse.status, 200);
  assert.deepEqual((await hiddenResponse.json()).manuals, []);

  saveToolManual("tool_music_studio", {
    titleZh: "AI 音乐工作室使用手册", summaryZh: "从创作到下载的完整说明。", contentZh: "填写灵感，然后生成音乐。",
    status: "published", homepageVisible: true, supportEnabled: true,
  }, null);
  assert.equal(listPublicToolManuals({ homepageOnly: true })[0].slug, "ai-music-studio");

  const publicResponse = await handleApi(new Request("http://localhost/api/tool-manuals/ai-music-studio"));
  assert.equal(publicResponse.status, 200);
  assert.equal((await publicResponse.json()).manual.url, "/help/ai-music-studio");
});

test.after(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
});
