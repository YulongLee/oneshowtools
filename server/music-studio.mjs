import { randomUUID } from "node:crypto";
import { db, audit } from "./database.mjs";
import { deleteStoredFile, putStoredFile } from "./object-storage.mjs";
import { generateMusic, musicProviderConfiguration } from "./music-provider.mjs";
import { generateMusicCover, imageProviderConfiguration } from "./image-provider.mjs";

const studioError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const allowedModes = new Set(["inspiration", "lyrics", "instrumental"]);

function creditBalance(userId) {
  return Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId)?.balance || 0);
}

function normalizedInput(data) {
  const mode = allowedModes.has(data.mode) ? data.mode : "inspiration";
  const title = clean(data.title || "未命名音乐", 100);
  const idea = clean(data.idea, 1000);
  const lyrics = clean(data.lyrics, 3500);
  const language = clean(data.language || "中文", 40);
  const genre = clean(data.genre || "流行", 120);
  const mood = clean(data.mood || "自然", 120);
  const instruments = clean(data.instruments, 300);
  const vocal = clean(data.vocal || "自动选择", 80);
  const durationSeconds = Math.max(15, Math.min(300, Number(data.durationSeconds || 120)));
  const variants = Math.max(1, Math.min(2, Number(data.variants || 1)));
  if (!idea) throw studioError("MUSIC_IDEA_REQUIRED", 422);
  if (mode === "lyrics" && !lyrics) throw studioError("MUSIC_LYRICS_REQUIRED", 422);
  if (!data.rightsConfirmed) throw studioError("MUSIC_RIGHTS_CONFIRMATION_REQUIRED", 422);
  const prompt = [
    idea,
    `Genre: ${genre}`,
    `Mood: ${mood}`,
    `Language: ${language}`,
    mode === "instrumental" ? "Instrumental only, no vocals" : `Vocal: ${vocal}`,
    instruments ? `Instruments: ${instruments}` : "",
    `Target duration: about ${durationSeconds} seconds`,
    "Create an original composition. Do not imitate a named artist or reproduce an existing song.",
  ].filter(Boolean).join(". ");
  return { mode, title, idea, lyrics, language, genre, mood, instruments, vocal, durationSeconds, variants, prompt };
}

export function musicStudioStatus() {
  const configuration = musicProviderConfiguration();
  const coverConfiguration = imageProviderConfiguration();
  return {
    ready: Boolean(configuration.configured && configuration.enabled),
    providerAlias: "OneShowMusic",
    creditCost: configuration.creditCost,
    maxDurationSeconds: configuration.maxDurationSeconds,
    outputFormat: configuration.outputFormat,
    modes: ["inspiration", "lyrics", "instrumental"],
    cover: { ready: Boolean(coverConfiguration.configured && coverConfiguration.enabled), creditCost: coverConfiguration.creditCost },
  };
}

export function createMusicGeneration(user, data) {
  const configuration = musicProviderConfiguration();
  if (!configuration.configured || !configuration.enabled) throw studioError("MUSIC_PROVIDER_NOT_CONFIGURED", 503);
  const input = normalizedInput(data);
  input.durationSeconds = Math.min(input.durationSeconds, configuration.maxDurationSeconds);
  const tool = db.prepare("SELECT * FROM tools WHERE slug = 'ai-music-studio' AND active = 1").get();
  if (!tool) throw studioError("MUSIC_TOOL_NOT_AVAILABLE", 404);
  const totalCost = configuration.creditCost * input.variants;
  if (creditBalance(user.id) < totalCost) throw studioError("INSUFFICIENT_CREDITS", 402);
  const taskId = randomUUID();
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO tasks (id, user_id, tool_id, status, input_json, credit_cost, created_at, updated_at)
      VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)
    `).run(taskId, user.id, tool.id, JSON.stringify({ ...input, locale: data.locale === "en" ? "en" : "zh-CN" }), totalCost, timestamp, timestamp);
    db.prepare(`
      INSERT INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'consumption', ?, '生成 AI 音乐', 'Generated AI music', 'task', ?, ?)
    `).run(randomUUID(), user.id, -totalCost, taskId, timestamp);
    db.prepare(`INSERT INTO task_settlements (id, task_id, kind, amount, created_at) VALUES (?, ?, 'reserve', ?, ?)`)
      .run(randomUUID(), taskId, totalCost, timestamp);
    const insertTrack = db.prepare(`
      INSERT INTO music_tracks
      (id, user_id, task_id, title, mode, prompt, lyrics, options_json, variant_index, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)
    `);
    for (let index = 1; index <= input.variants; index += 1) {
      insertTrack.run(randomUUID(), user.id, taskId, input.variants > 1 ? `${input.title} · V${index}` : input.title,
        input.mode, input.prompt, input.lyrics, JSON.stringify(input), index, timestamp, timestamp);
    }
    db.prepare(`
      INSERT INTO execution_jobs (id, task_id, status, attempts, max_attempts, next_attempt_at, created_at, updated_at)
      VALUES (?, ?, 'queued', 0, 3, ?, ?, ?)
    `).run(randomUUID(), taskId, timestamp, timestamp, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(user.id, "music.generate", "task", taskId, { mode: input.mode, variants: input.variants, creditCost: totalCost });
  return { taskId, creditCost: totalCost, tracks: listMusicTracks(user.id).filter((track) => track.taskId === taskId) };
}

export function listMusicTracks(userId) {
  return db.prepare(`
    SELECT m.id, m.task_id AS taskId, m.file_id AS fileId, m.cover_file_id AS coverFileId,
      m.title, m.mode, m.lyrics, m.lyrics_source AS lyricsSource,
      m.options_json AS optionsJson, m.variant_index AS variantIndex, m.status,
      m.provider_alias AS providerAlias, m.duration_ms AS durationMs, m.error_code AS errorCode,
      m.created_at AS createdAt, m.updated_at AS updatedAt, m.completed_at AS completedAt,
      f.name AS fileName, f.size_bytes AS sizeBytes, f.mime_type AS mimeType,
      cf.name AS coverFileName
    FROM music_tracks m LEFT JOIN files f ON f.id = m.file_id
    LEFT JOIN files cf ON cf.id = m.cover_file_id
    WHERE m.user_id = ? ORDER BY m.created_at DESC, m.variant_index ASC LIMIT 100
  `).all(userId).map((track) => ({
    ...track,
    options: JSON.parse(track.optionsJson || "{}"),
    optionsJson: undefined,
    downloadUrl: track.fileId ? `/api/files/${track.fileId}/download` : null,
    coverUrl: track.coverFileId ? `/api/files/${track.coverFileId}/download` : null,
  }));
}

async function storeTrackFile(task, track, generated) {
  const fileId = randomUUID();
  const safeTitle = track.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "OneShowMusic";
  const fileName = `${safeTitle}.${generated.extension}`;
  const stored = await putStoredFile({ userId: task.user_id, fileId, fileName, mimeType: generated.mimeType, buffer: generated.buffer });
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(fileId, task.user_id, fileName, stored.storageName, generated.mimeType, generated.buffer.length, timestamp);
    db.prepare(`INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'available', ?, ?)`)
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.prepare(`UPDATE music_tracks SET file_id = ?, lyrics = ?, lyrics_source = ?, status = 'completed', provider_track_id = ?, duration_ms = ?, updated_at = ?, completed_at = ? WHERE id = ?`)
      .run(fileId, generated.lyrics || track.lyrics || "", generated.lyricsSource || "input", generated.providerTrackId, generated.durationMs, timestamp, timestamp, track.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    await deleteStoredFile({ provider: stored.provider, objectKey: stored.objectKey, storageName: stored.storageName }).catch(() => {});
    throw error;
  }
  return { trackId: track.id, fileId, downloadUrl: `/api/files/${fileId}/download`, durationMs: generated.durationMs, lyrics: generated.lyrics || track.lyrics || "" };
}

export async function createMusicCover(user, trackId, fetchImpl = fetch) {
  const track = db.prepare("SELECT * FROM music_tracks WHERE id = ? AND user_id = ? AND status = 'completed'").get(trackId, user.id);
  if (!track) throw studioError("MUSIC_TRACK_NOT_FOUND", 404);
  const configuration = imageProviderConfiguration();
  if (!configuration.configured || !configuration.enabled) throw studioError("IMAGE_PROVIDER_NOT_CONFIGURED", 503);
  if (creditBalance(user.id) < configuration.creditCost) throw studioError("INSUFFICIENT_CREDITS", 402);
  const options = JSON.parse(track.options_json || "{}");
  const prompt = [
    "Create a commercial square album cover with no text, logo, watermark, border, or recognizable public figure.",
    `Song title concept: ${track.title}.`, `Genre: ${options.genre || "original music"}.`,
    `Mood: ${options.mood || "cinematic"}.`, `Story: ${options.idea || track.prompt}.`,
    track.lyrics ? `Visual motifs from lyrics: ${track.lyrics.slice(0, 500)}.` : "Instrumental abstract visual storytelling.",
    "High-quality editorial artwork, strong focal point, suitable as a 1024x1024 music cover.",
  ].join(" ");
  const generated = await generateMusicCover(prompt, fetchImpl);
  const fileId = randomUUID();
  const taskId = randomUUID();
  const safeTitle = track.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "OneShowMusic";
  const fileName = `${safeTitle}-cover.${generated.extension}`;
  const stored = await putStoredFile({ userId: user.id, fileId, fileName, mimeType: generated.mimeType, buffer: generated.buffer });
  const oldCover = track.cover_file_id ? db.prepare(`
    SELECT f.id, f.storage_name, COALESCE(s.provider, 'local') AS provider, s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ?
  `).get(track.cover_file_id) : null;
  const timestamp = Date.now();
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(fileId, user.id, fileName, stored.storageName, generated.mimeType, generated.buffer.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'available', ?, ?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    const tool = db.prepare("SELECT id FROM tools WHERE slug = 'ai-music-studio'").get();
    db.prepare("INSERT INTO tasks (id, user_id, tool_id, status, input_json, output_json, credit_cost, created_at, updated_at, completed_at) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)")
      .run(taskId, user.id, tool.id, JSON.stringify({ action: "music_cover", trackId, prompt }), JSON.stringify({ kind: "music_cover", trackId, fileId }), configuration.creditCost, timestamp, timestamp, timestamp);
    db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(taskId, fileId);
    db.prepare("INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at) VALUES (?, ?, 'consumption', ?, '生成音乐封面', 'Generated music cover', 'task', ?, ?)")
      .run(randomUUID(), user.id, -configuration.creditCost, taskId, timestamp);
    db.prepare("UPDATE music_tracks SET cover_file_id = ?, updated_at = ? WHERE id = ?").run(fileId, timestamp, trackId);
    if (oldCover) db.prepare("DELETE FROM files WHERE id = ?").run(oldCover.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    await deleteStoredFile({ provider: stored.provider, objectKey: stored.objectKey, storageName: stored.storageName }).catch(() => {});
    throw error;
  }
  if (oldCover) await deleteStoredFile({ provider: oldCover.provider, objectKey: oldCover.object_key, storageName: oldCover.storage_name }).catch(() => {});
  audit(user.id, "music.cover.generate", "music_track", trackId, { taskId, creditCost: configuration.creditCost });
  return { taskId, trackId, coverFileId: fileId, coverUrl: `/api/files/${fileId}/download`, creditCost: configuration.creditCost };
}

export async function executeMusicTask(task, input, fetchImpl = fetch) {
  const tracks = db.prepare("SELECT * FROM music_tracks WHERE task_id = ? ORDER BY variant_index").all(task.id);
  if (!tracks.length) throw studioError("MUSIC_TRACKS_NOT_FOUND", 500);
  db.prepare("UPDATE music_tracks SET status = 'running', error_code = NULL, updated_at = ? WHERE task_id = ?")
    .run(Date.now(), task.id);
  const stored = [];
  try {
    const generatedTracks = [];
    for (const track of tracks) generatedTracks.push(await generateMusic({ ...input, prompt: track.prompt }, fetchImpl));
    for (let index = 0; index < tracks.length; index += 1) stored.push(await storeTrackFile(task, tracks[index], generatedTracks[index]));
    return { status: "completed", output: { kind: "music", tracks: stored, provider: "OneShowMusic" } };
  } catch (error) {
    for (const item of stored) {
      const file = db.prepare(`
        SELECT f.storage_name, COALESCE(s.provider, 'local') AS provider, s.object_key
        FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ?
      `).get(item.fileId);
      if (file) {
        await deleteStoredFile({ provider: file.provider, objectKey: file.object_key, storageName: file.storage_name }).catch(() => {});
        db.prepare("DELETE FROM files WHERE id = ?").run(item.fileId);
      }
    }
    db.prepare("UPDATE music_tracks SET status = 'failed', error_code = ?, updated_at = ?, completed_at = ? WHERE task_id = ?")
      .run(error?.code || "MUSIC_GENERATION_FAILED", Date.now(), Date.now(), task.id);
    throw error;
  }
}

export async function deleteMusicTrack(userId, trackId) {
  const track = db.prepare(`
    SELECT m.*, f.storage_name, COALESCE(s.provider, 'local') AS storage_provider, s.object_key,
      cf.storage_name AS cover_storage_name, COALESCE(cs.provider, 'local') AS cover_storage_provider,
      cs.object_key AS cover_object_key
    FROM music_tracks m LEFT JOIN files f ON f.id = m.file_id
    LEFT JOIN file_storage_objects s ON s.file_id = f.id
    LEFT JOIN files cf ON cf.id = m.cover_file_id
    LEFT JOIN file_storage_objects cs ON cs.file_id = cf.id
    WHERE m.id = ? AND m.user_id = ?
  `).get(trackId, userId);
  if (!track) throw studioError("MUSIC_TRACK_NOT_FOUND", 404);
  if (track.file_id) {
    await deleteStoredFile({ provider: track.storage_provider, objectKey: track.object_key, storageName: track.storage_name });
    db.prepare("DELETE FROM files WHERE id = ?").run(track.file_id);
  }
  if (track.cover_file_id) {
    await deleteStoredFile({ provider: track.cover_storage_provider, objectKey: track.cover_object_key, storageName: track.cover_storage_name });
    db.prepare("DELETE FROM files WHERE id = ?").run(track.cover_file_id);
  }
  db.prepare("DELETE FROM music_tracks WHERE id = ?").run(trackId);
  audit(userId, "music.track.delete", "music_track", trackId);
  return { ok: true };
}
