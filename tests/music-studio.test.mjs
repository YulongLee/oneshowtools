import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-music-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const {
  musicProviderConfiguration, musicProviderCredentials, saveMusicProviderConfiguration,
  testMusicProviderConfiguration,
} = await import(`../server/music-provider.mjs?test=${Date.now()}`);
const {
  createMusicGeneration, executeMusicTask, listMusicTracks, musicStudioStatus,
} = await import(`../server/music-studio.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const providerFetch = async (_url, options = {}) => {
  assert.equal(options.headers.authorization, "Bearer music-provider-secret-1234");
  const payload = JSON.parse(options.body);
  assert.equal(payload.model, "music-2.6");
  return new Response(JSON.stringify({
    data: { audio: Buffer.from("real-audio-result").toString("hex"), status: 2 },
    extra_info: { music_duration: 62_000 }, trace_id: "provider-trace-redacted",
    base_resp: { status_code: 0, status_msg: "success" },
  }), { status: 200, headers: { "content-type": "application/json" } });
};

function addUser() {
  const id = randomUUID();
  const timestamp = Date.now();
  db.prepare(`INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, 'Music tester', ?, 'unused', 1, ?, ?)`)
    .run(id, `music-${id}@example.com`, timestamp, timestamp);
  db.prepare(`INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES (?, ?, 'grant', 500, '测试积分', 'Test credits', 'test', ?, ?)`)
    .run(randomUUID(), id, id, timestamp);
  return { id };
}

test("music provider stays unavailable until an encrypted admin configuration passes a real test", async () => {
  assert.equal(musicStudioStatus().ready, false);
  assert.equal(db.prepare("SELECT runtime_status FROM tools WHERE id = 'tool_music_studio'").get().runtime_status, "configuration_required");
  const tested = await testMusicProviderConfiguration({
    baseUrl: "https://api.minimaxi.com", modelId: "music-2.6", apiKey: "music-provider-secret-1234",
  }, providerFetch);
  assert.equal(tested.status, "healthy");
  assert.equal(musicProviderConfiguration().configured, false);

  const saved = await saveMusicProviderConfiguration({
    baseUrl: "https://api.minimaxi.com", modelId: "music-2.6", apiKey: "music-provider-secret-1234",
    outputFormat: "mp3", creditCost: 30, maxDurationSeconds: 300, status: "active",
  }, "admin-user", providerFetch);
  assert.equal(saved.configured, true);
  assert.equal(saved.keyHint, "••••1234");
  assert.doesNotMatch(JSON.stringify(saved), /music-provider-secret/);
  const stored = db.prepare("SELECT * FROM music_provider_configs WHERE provider = 'minimax'").get();
  assert.notEqual(stored.key_ciphertext, "music-provider-secret-1234");
  assert.equal(musicProviderCredentials().apiKey, "music-provider-secret-1234");
  assert.equal(musicStudioStatus().ready, true);
  assert.equal(db.prepare("SELECT runtime_status FROM tools WHERE id = 'tool_music_studio'").get().runtime_status, "ready");
});

test("music generation reserves real credits, stores a private artifact, and exposes a playable library record", async () => {
  const user = addUser();
  const generation = createMusicGeneration(user, {
    mode: "lyrics", title: "夏夜", idea: "一首关于夏夜回家的温柔歌曲", lyrics: "[Verse]\n晚风吹过街道\n[Chorus]\n我正在回家",
    language: "中文", genre: "流行", mood: "治愈", vocal: "女声", instruments: "钢琴",
    durationSeconds: 60, variants: 1, rightsConfirmed: true,
  });
  assert.equal(generation.creditCost, 30);
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance, 470);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(generation.taskId);
  const result = await executeMusicTask(task, JSON.parse(task.input_json), providerFetch);
  assert.equal(result.status, "completed");
  const tracks = listMusicTracks(user.id);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].status, "completed");
  assert.equal(tracks[0].durationMs, 62_000);
  assert.match(tracks[0].downloadUrl, /^\/api\/files\//);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM file_storage_objects WHERE file_id = ?").get(tracks[0].fileId).count, 1);
  assert.doesNotMatch(JSON.stringify(tracks), /music-provider-secret|provider-trace-redacted/);
});

test("music generation rejects unowned material declarations before reserving credits", () => {
  const user = addUser();
  const before = db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance;
  assert.throws(() => createMusicGeneration(user, { mode: "inspiration", idea: "test", rightsConfirmed: false }), (error) => error.code === "MUSIC_RIGHTS_CONFIRMATION_REQUIRED");
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance, before);
});

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));
