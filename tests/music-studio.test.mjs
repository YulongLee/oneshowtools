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
  createMusicCover, createMusicGeneration, createMusicReference, executeMusicTask, listMusicTracks, musicStudioStatus,
} = await import(`../server/music-studio.mjs?test=${Date.now()}`);
const { saveImageProviderConfiguration } = await import(`../server/image-provider.mjs?test=${Date.now()}`);
const { saveSingingProviderConfiguration, singingProviderConfiguration } = await import(`../server/singing-provider.mjs?test=${Date.now()}`);
const { enrollSingingVoice, handleSingingProviderCallback, listSingingVoices, submitSingingCover } = await import(`../server/singing-cover.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");

const providerFetch = async (url, options = {}) => {
  assert.equal(options.headers.authorization, "Bearer music-provider-secret-1234");
  const payload = JSON.parse(options.body);
  if (String(url).includes("music_cover_preprocess")) {
    assert.equal(payload.model, "music-cover");
    assert.ok(payload.audio_base64);
    return new Response(JSON.stringify({
      cover_feature_id: "cover-feature-private-123", formatted_lyrics: "[Verse]\n沿着海岸慢慢走\n[Chorus]\n让风带我回家",
      structure_result: "{\"num_segments\":2}", audio_duration: 62, base_resp: { status_code: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (payload.model === "music-cover") {
    assert.equal(payload.cover_feature_id, "cover-feature-private-123");
    assert.ok(payload.lyrics.length >= 10);
  } else {
    assert.equal(payload.model, "music-2.6");
  }
  if (payload.prompt) assert.equal(payload.audio_setting.bitrate, 256000);
  return new Response(JSON.stringify({
    data: { audio: Buffer.from("real-audio-result").toString("hex"), status: 2 },
    extra_info: { music_duration: 62_000 }, trace_id: "provider-trace-redacted",
    base_resp: { status_code: 0, status_msg: "success" },
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const fullProviderFetch = async (url, options = {}) => {
  assert.equal(options.headers.authorization, "Bearer music-provider-secret-1234");
  if (String(url).includes("lyrics_generation")) return new Response(JSON.stringify({ song_title: "归途", style_tags: "pop, warm", lyrics: "[Verse]\n晚风穿过城市\n[Chorus]\n我正在回家", base_resp: { status_code: 0 } }), { status: 200, headers: { "content-type": "application/json" } });
  return providerFetch(url, options);
};

const imageFetch = async (_url, options = {}) => {
  assert.equal(options.headers.authorization, "Bearer image-provider-secret-5678");
  return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("real-cover-image").toString("base64") }] }), { status: 200, headers: { "content-type": "application/json" } });
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
  assert.match(tracks[0].streamUrl, /^\/api\/files\/.*\?preview=1$/);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM file_storage_objects WHERE file_id = ?").get(tracks[0].fileId).count, 1);
  assert.doesNotMatch(JSON.stringify(tracks), /music-provider-secret|provider-trace-redacted/);
});

test("music generation rejects unowned material declarations before reserving credits", () => {
  const user = addUser();
  const before = db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance;
  assert.throws(() => createMusicGeneration(user, { mode: "inspiration", idea: "test", rightsConfirmed: false }), (error) => error.code === "MUSIC_RIGHTS_CONFIRMATION_REQUIRED");
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance, before);
});

test("reference audio is privately stored, preprocessed, and used for a real cover task", async () => {
  const user = addUser();
  const reference = await createMusicReference(user, new File([Buffer.from("private-reference-audio")], "authorized-song.mp3", { type: "audio/mpeg" }), providerFetch);
  assert.equal(reference.durationSeconds, 62);
  assert.match(reference.formattedLyrics, /沿着海岸/);
  assert.match(reference.previewUrl, /^\/api\/files\//);
  assert.equal(db.prepare("SELECT provider FROM file_storage_objects WHERE file_id = ?").get(reference.fileId).provider, "local");

  const generation = createMusicGeneration(user, {
    mode: "cover", referenceId: reference.id, title: "海岸翻唱", idea: "爵士酒吧风格，萨克斯和轻柔鼓组",
    lyrics: reference.formattedLyrics, language: "中文", genre: "爵士", mood: "平静", vocal: "自动选择",
    durationSeconds: 60, variants: 1, rightsConfirmed: true,
  });
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(generation.taskId);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id = ? AND file_id = ?").get(task.id, reference.fileId).count, 1);
  const input = JSON.parse(task.input_json);
  assert.equal(input.coverFeatureId, "cover-feature-private-123");
  assert.equal(input.referenceFileId, reference.fileId);
  assert.doesNotMatch(task.input_json, /private-reference-audio/);
  await executeMusicTask(task, input, providerFetch);
  const track = listMusicTracks(user.id)[0];
  assert.equal(track.mode, "cover");
  assert.equal(track.status, "completed");
  assert.equal(track.lyricsSource, "reference_edited");
});

test("inspiration mode persists provider lyrics and a billed, private cover artifact", async () => {
  await saveImageProviderConfiguration({ adapter: "openai", baseUrl: "https://api.openai.com/v1", modelId: "gpt-image-1", apiKey: "image-provider-secret-5678", creditCost: 10, status: "active" }, "admin-user", imageFetch);
  const user = addUser();
  const generation = createMusicGeneration(user, { mode: "inspiration", title: "归途", idea: "深夜回家的温暖", language: "中文", genre: "流行", mood: "治愈", durationSeconds: 60, variants: 1, rightsConfirmed: true });
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(generation.taskId);
  await executeMusicTask(task, JSON.parse(task.input_json), fullProviderFetch);
  let track = listMusicTracks(user.id)[0];
  assert.match(track.lyrics, /我正在回家/);
  assert.equal(track.lyricsSource, "provider_generated");
  const cover = await createMusicCover(user, track.id, imageFetch);
  assert.match(cover.coverUrl, /^\/api\/files\//);
  track = listMusicTracks(user.id)[0];
  assert.equal(track.coverFileId, cover.coverFileId);
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance, 460);
  assert.equal(db.prepare("SELECT provider FROM file_storage_objects WHERE file_id = ?").get(cover.coverFileId).provider, "local");
});

test("authorized singing covers train an owner-scoped voice, bill once, and persist provider output", async () => {
  const callbacks = [];
  const singingFetch = async (url, options = {}) => {
    const target = String(url);
    if (target === "https://cdn.example.com/cover.mp3") return new Response(Buffer.from("real-authorized-song-cover"), { status: 200, headers: { "content-type": "audio/mpeg" } });
    assert.equal(options.headers?.accessKey, "singing-provider-secret-9012");
    if (target.endsWith("/user/info")) return new Response(JSON.stringify({ code: 1, message: "Success", data: { plan: "api" } }), { status: 200, headers: { "content-type": "application/json" } });
    if (target.endsWith("/voices/vc")) {
      callbacks.push(options.body.get("callbackUrl"));
      assert.equal(options.body.get("name"), "我的声音");
      return new Response(JSON.stringify({ code: 1, message: "Success", data: { webhookId: "voice-webhook" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.endsWith("/cover/query")) return new Response(JSON.stringify({ code: 1, message: "Success", data: [{ id: "cover-1", url: "https://cdn.example.com/cover.mp3" }] }), { status: 200, headers: { "content-type": "application/json" } });
    if (target.endsWith("/cover")) {
      callbacks.push(options.body.get("callbackUrl"));
      assert.equal(options.body.get("voiceId"), "provider-voice-1");
      return new Response(JSON.stringify({ code: 1, message: "Success", data: { webhookId: "cover-webhook" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected singing URL: ${target}`);
  };
  const configured = await saveSingingProviderConfiguration({ baseUrl: "https://api.myvocal.ai", apiKey: "singing-provider-secret-9012", creditCost: 80, status: "active" }, "admin-user", singingFetch);
  assert.equal(configured.configured, true);
  assert.equal(configured.keyHint, "••••9012");
  assert.doesNotMatch(JSON.stringify(singingProviderConfiguration()), /singing-provider-secret/);
  assert.equal(musicStudioStatus().singingCover.ready, true);

  const user = addUser();
  const voiceForm = new FormData();
  voiceForm.append("name", "我的声音"); voiceForm.append("consentConfirmed", "true");
  voiceForm.append("files", new File([Buffer.from("authorized-voice-sample")], "voice.mp3", { type: "audio/mpeg" }));
  const voice = await enrollSingingVoice(user, voiceForm, singingFetch);
  assert.equal(voice.status, "training");
  const voiceToken = new URL(callbacks.shift()).pathname.split("/").pop();
  await handleSingingProviderCallback(new Request("http://localhost/callback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ webhookType: "TRAIN_COVER_SPEAKER", status: "SUCCESS", data: { id: "provider-voice-1" } }) }), voiceToken, singingFetch);
  assert.equal(listSingingVoices(user.id)[0].status, "ready");
  assert.doesNotMatch(JSON.stringify(listSingingVoices(user.id)), /provider-voice-1/);

  const before = db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance;
  const coverForm = new FormData(); coverForm.append("voiceId", voice.id); coverForm.append("title", "授权翻唱"); coverForm.append("rightsConfirmed", "true");
  coverForm.append("file", new File([Buffer.from("authorized-target-song")], "song.mp3", { type: "audio/mpeg" }));
  const submitted = await submitSingingCover(user, coverForm, singingFetch);
  assert.equal(db.prepare("SELECT COALESCE(SUM(amount),0) AS balance FROM credit_ledger WHERE user_id = ?").get(user.id).balance, before - 80);
  const coverToken = new URL(callbacks.shift()).pathname.split("/").pop();
  await handleSingingProviderCallback(new Request("http://localhost/callback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ webhookType: "COVER_SONG", status: "SUCCESS", data: { id: "cover-1" } }) }), coverToken, singingFetch);
  const track = listMusicTracks(user.id).find((item) => item.taskId === submitted.taskId);
  assert.equal(track.mode, "singing_cover");
  assert.equal(track.status, "completed");
  assert.match(track.downloadUrl, /^\/api\/files\//);
  assert.match(track.streamUrl, /^\/api\/files\/.*\?preview=1$/);
  assert.equal(db.prepare("SELECT status FROM singing_cover_jobs WHERE task_id = ?").get(submitted.taskId).status, "completed");
});

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));
