import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { audit, db } from "./database.mjs";
import { getServerConfig } from "./config.mjs";
import { deleteStoredFile, putStoredFile, readStoredFile } from "./object-storage.mjs";
import { assertUserFileCapacity } from "./file-quota.mjs";
import { hashToken } from "./security.mjs";
import {
  createSingingCover, createSingingVoice, deleteSingingVoice, querySingingCover,
  safeSingingOutputUrl, singingProviderConfiguration,
} from "./singing-provider.mjs";
import { normalizedReferenceAudio } from "./music-studio.mjs";

const singingError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);

function balance(userId) {
  return Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?").get(userId)?.balance || 0);
}

async function persistFile(userId, fileName, mimeType, buffer) {
  assertUserFileCapacity(userId);
  const fileId = randomUUID();
  const safeName = basename(fileName || "audio.mp3").replace(/[\\/:*?"<>|]/g, "-").slice(0, 160) || "audio.mp3";
  const stored = await putStoredFile({ userId, fileId, fileName: safeName, mimeType, buffer });
  const timestamp = Date.now();
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare("INSERT INTO files (id, user_id, name, storage_name, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(fileId, userId, safeName, stored.storageName, mimeType, buffer.length, timestamp);
    db.prepare("INSERT INTO file_storage_objects (file_id, provider, object_key, etag, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'available', ?, ?)")
      .run(fileId, stored.provider, stored.objectKey, stored.etag, timestamp, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    await deleteStoredFile({ provider: stored.provider, objectKey: stored.objectKey, storageName: stored.storageName }).catch(() => {});
    throw error;
  }
  return { fileId, fileName: safeName, mimeType, buffer, ...stored };
}

function fileStorage(fileId, userId) {
  return db.prepare(`SELECT f.*, COALESCE(s.provider, 'local') AS storage_provider, s.object_key
    FROM files f LEFT JOIN file_storage_objects s ON s.file_id = f.id WHERE f.id = ? AND f.user_id = ?`).get(fileId, userId);
}

async function removeFile(fileId, userId) {
  const file = fileStorage(fileId, userId);
  if (!file) return;
  await deleteStoredFile({ provider: file.storage_provider, objectKey: file.object_key, storageName: file.storage_name }).catch(() => {});
  db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(fileId, userId);
}

function callbackUrl(token) {
  return `${getServerConfig().appUrl}/api/music/singing-provider/callback/${encodeURIComponent(token)}`;
}

export function listSingingVoices(userId) {
  return db.prepare(`SELECT id, name, status, error_code AS errorCode, created_at AS createdAt, updated_at AS updatedAt
    FROM singing_voices WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(userId);
}

export async function enrollSingingVoice(user, form, fetchImpl = fetch) {
  const configuration = singingProviderConfiguration();
  if (!configuration.configured || !configuration.enabled) throw singingError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  if (String(form.get("consentConfirmed")) !== "true") throw singingError("SINGING_VOICE_CONSENT_REQUIRED", 422);
  const name = clean(form.get("name"), 32);
  if (!name) throw singingError("SINGING_VOICE_NAME_REQUIRED", 422);
  const rawFiles = form.getAll("files").filter((file) => file instanceof File && file.size);
  if (!rawFiles.length || rawFiles.length > 25) throw singingError("SINGING_VOICE_FILES_REQUIRED", 422);
  assertUserFileCapacity(user.id, rawFiles.length);
  const normalized = [];
  for (const file of rawFiles) {
    if (file.size > 10 * 1024 * 1024) throw singingError("SINGING_VOICE_FILE_TOO_LARGE", 413);
    if (!/\.(mp3|wav|m4a|webm)$/i.test(file.name || "")) throw singingError("SINGING_VOICE_FORMAT_UNSUPPORTED", 422);
    normalized.push(await normalizedReferenceAudio(file));
  }
  const id = randomUUID(); const token = randomUUID(); const timestamp = Date.now(); const storedFiles = [];
  try {
    for (const file of normalized) storedFiles.push(await persistFile(user.id, file.fileName, file.mimeType, file.buffer));
    db.exec("BEGIN IMMEDIATE");
    db.prepare(`INSERT INTO singing_voices
      (id, user_id, provider, name, status, callback_token_hash, consent_confirmed_at, created_at, updated_at)
      VALUES (?, ?, 'myvocal', ?, 'training', ?, ?, ?, ?)`)
      .run(id, user.id, name, hashToken(token), timestamp, timestamp, timestamp);
    for (const file of storedFiles) db.prepare("INSERT INTO singing_voice_files (voice_id, file_id) VALUES (?, ?)").run(id, file.fileId);
    db.exec("COMMIT");
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may not have started */ }
    for (const file of storedFiles) await removeFile(file.fileId, user.id);
    throw error;
  }
  try {
    const submitted = await createSingingVoice({ name, files: normalized, callbackUrl: callbackUrl(token) }, fetchImpl);
    db.prepare("UPDATE singing_voices SET webhook_id = ?, updated_at = ? WHERE id = ?").run(submitted.webhookId, Date.now(), id);
  } catch (error) {
    db.prepare("UPDATE singing_voices SET status = 'failed', error_code = ?, updated_at = ? WHERE id = ?")
      .run(error.code || "SINGING_VOICE_TRAINING_FAILED", Date.now(), id);
    throw error;
  }
  audit(user.id, "music.singing_voice.enroll", "singing_voice", id, { sampleCount: normalized.length, consentConfirmed: true });
  return listSingingVoices(user.id).find((voice) => voice.id === id);
}

export async function removeSingingVoice(user, id, fetchImpl = fetch) {
  const voice = db.prepare("SELECT * FROM singing_voices WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!voice) throw singingError("SINGING_VOICE_NOT_FOUND", 404);
  const active = db.prepare("SELECT 1 FROM singing_cover_jobs WHERE voice_id = ? AND status IN ('submitted','processing') LIMIT 1").get(id);
  if (active) throw singingError("SINGING_VOICE_IN_USE", 409);
  db.prepare("UPDATE singing_voices SET status = 'deleting', updated_at = ? WHERE id = ?").run(Date.now(), id);
  try {
    if (voice.provider_voice_id) await deleteSingingVoice(voice.provider_voice_id, fetchImpl);
  } catch (error) {
    db.prepare("UPDATE singing_voices SET status = ?, updated_at = ? WHERE id = ?")
      .run(voice.status, Date.now(), id);
    throw error;
  }
  const files = db.prepare("SELECT file_id AS fileId FROM singing_voice_files WHERE voice_id = ?").all(id);
  db.prepare("DELETE FROM singing_voices WHERE id = ?").run(id);
  for (const file of files) await removeFile(file.fileId, user.id);
  audit(user.id, "music.singing_voice.delete", "singing_voice", id);
  return { ok: true };
}

function refund(task) {
  const settlement = db.prepare("INSERT OR IGNORE INTO task_settlements (id, task_id, kind, amount, created_at) VALUES (?, ?, 'refund', ?, ?)")
    .run(randomUUID(), task.id, task.credit_cost, Date.now());
  if (settlement.changes) db.prepare(`INSERT INTO credit_ledger
    (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
    VALUES (?, ?, 'refund', ?, '歌曲翻唱失败，积分已退回', 'Song cover failed; credits refunded', 'task', ?, ?)`)
    .run(randomUUID(), task.user_id, task.credit_cost, task.id, Date.now());
}

function failCover(job, errorCode) {
  if (!job || ["failed", "completed"].includes(job.status)) return;
  const timestamp = Date.now(); const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(job.task_id);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE singing_cover_jobs SET status = 'failed', error_code = ?, updated_at = ?, completed_at = ? WHERE id = ?").run(errorCode, timestamp, timestamp, job.id);
    db.prepare("UPDATE music_tracks SET status = 'failed', error_code = ?, updated_at = ?, completed_at = ? WHERE id = ?").run(errorCode, timestamp, timestamp, job.track_id);
    db.prepare("UPDATE tasks SET status = 'failed', error_code = ?, updated_at = ?, completed_at = ? WHERE id = ?").run(errorCode, timestamp, timestamp, job.task_id);
    refund(task); db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export async function submitSingingCover(user, form, fetchImpl = fetch) {
  const configuration = singingProviderConfiguration();
  if (!configuration.configured || !configuration.enabled) throw singingError("SINGING_PROVIDER_NOT_CONFIGURED", 503);
  if (String(form.get("rightsConfirmed")) !== "true") throw singingError("SINGING_COVER_RIGHTS_REQUIRED", 422);
  const voice = db.prepare("SELECT * FROM singing_voices WHERE id = ? AND user_id = ? AND status = 'ready'").get(clean(form.get("voiceId"), 100), user.id);
  if (!voice?.provider_voice_id) throw singingError("SINGING_VOICE_NOT_READY", 422);
  const targetFile = form.get("file");
  if (!(targetFile instanceof File) || !/\.(mp3|wav)$/i.test(targetFile.name || "")) throw singingError("SINGING_COVER_FORMAT_UNSUPPORTED", 422);
  assertUserFileCapacity(user.id, 2);
  const audio = await normalizedReferenceAudio(targetFile);
  const title = clean(form.get("title") || "歌曲翻唱", 32);
  if (balance(user.id) < configuration.creditCost) throw singingError("INSUFFICIENT_CREDITS", 402);
  const source = await persistFile(user.id, audio.fileName, audio.mimeType, audio.buffer);
  const taskId = randomUUID(); const trackId = randomUUID(); const jobId = randomUUID(); const token = randomUUID(); const timestamp = Date.now();
  const tool = db.prepare("SELECT * FROM tools WHERE slug = 'ai-music-studio'").get();
  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare("INSERT INTO tasks (id, user_id, tool_id, status, input_json, credit_cost, created_at, updated_at) VALUES (?, ?, ?, 'running', ?, ?, ?, ?)")
      .run(taskId, user.id, tool.id, JSON.stringify({ mode: "singing_cover", voiceId: voice.id, sourceFileId: source.fileId, title }), configuration.creditCost, timestamp, timestamp);
    db.prepare(`INSERT INTO music_tracks
      (id, user_id, task_id, title, mode, prompt, lyrics, options_json, variant_index, status, provider_alias, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'singing_cover', 'Authorized singing voice conversion', '', ?, 1, 'running', 'OneShowVoice', ?, ?)`)
      .run(trackId, user.id, taskId, title, JSON.stringify({ voiceId: voice.id, voiceName: voice.name, sourceFileId: source.fileId }), timestamp, timestamp);
    db.prepare("INSERT INTO singing_cover_jobs (id, user_id, task_id, track_id, voice_id, source_file_id, callback_token_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)")
      .run(jobId, user.id, taskId, trackId, voice.id, source.fileId, hashToken(token), timestamp, timestamp);
    db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(taskId, source.fileId);
    db.prepare(`INSERT INTO credit_ledger (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'consumption', ?, '生成授权歌曲翻唱', 'Generated authorized song cover', 'task', ?, ?)`)
      .run(randomUUID(), user.id, -configuration.creditCost, taskId, timestamp);
    db.prepare("INSERT INTO task_settlements (id, task_id, kind, amount, created_at) VALUES (?, ?, 'reserve', ?, ?)").run(randomUUID(), taskId, configuration.creditCost, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK"); await removeFile(source.fileId, user.id); throw error;
  }
  try {
    const submitted = await createSingingCover({ voiceId: voice.provider_voice_id, title, file: audio, callbackUrl: callbackUrl(token) }, fetchImpl);
    db.prepare("UPDATE singing_cover_jobs SET provider_job_id = ?, status = 'processing', updated_at = ? WHERE id = ?").run(submitted.webhookId, Date.now(), jobId);
  } catch (error) {
    failCover(db.prepare("SELECT * FROM singing_cover_jobs WHERE id = ?").get(jobId), error.code || "SINGING_COVER_SUBMIT_FAILED");
    throw error;
  }
  audit(user.id, "music.singing_cover.submit", "task", taskId, { voiceId: voice.id, creditCost: configuration.creditCost });
  return { taskId, trackId, creditCost: configuration.creditCost };
}

async function completeCover(job, coverId, directUrl, fetchImpl) {
  if (job.status === "completed") return;
  if (job.status === "failed") throw singingError("SINGING_COVER_ALREADY_FAILED", 409);
  const output = directUrl ? { url: directUrl } : await querySingingCover(coverId, fetchImpl);
  const url = safeSingingOutputUrl(output.url);
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!response?.ok) throw singingError("SINGING_COVER_DOWNLOAD_FAILED", 502);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 100 * 1024 * 1024) throw singingError("SINGING_COVER_OUTPUT_INVALID", 502);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(job.task_id);
  const track = db.prepare("SELECT * FROM music_tracks WHERE id = ?").get(job.track_id);
  const file = await persistFile(job.user_id, `${track.title}.mp3`, "audio/mpeg", buffer);
  const timestamp = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE music_tracks SET file_id = ?, status = 'completed', provider_track_id = ?, updated_at = ?, completed_at = ? WHERE id = ?")
      .run(file.fileId, clean(coverId, 200) || null, timestamp, timestamp, job.track_id);
    db.prepare("UPDATE singing_cover_jobs SET provider_cover_id = ?, status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?")
      .run(clean(coverId, 200) || null, timestamp, timestamp, job.id);
    db.prepare("UPDATE tasks SET status = 'completed', output_json = ?, updated_at = ?, completed_at = ? WHERE id = ?")
      .run(JSON.stringify({ kind: "singing_cover", trackId: job.track_id, fileId: file.fileId, provider: "OneShowVoice" }), timestamp, timestamp, task.id);
    db.prepare("INSERT INTO task_files (task_id, file_id) VALUES (?, ?)").run(task.id, file.fileId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK"); await removeFile(file.fileId, job.user_id); throw error;
  }
  audit(job.user_id, "music.singing_cover.complete", "task", job.task_id, { trackId: job.track_id });
}

export async function handleSingingProviderCallback(request, token, fetchImpl = fetch) {
  const tokenHash = hashToken(clean(token, 200));
  const payload = await request.json().catch(() => ({}));
  const success = clean(payload?.status, 40).toUpperCase() === "SUCCESS";
  const voice = db.prepare("SELECT * FROM singing_voices WHERE callback_token_hash = ?").get(tokenHash);
  if (voice) {
    if (["ready", "failed", "deleting"].includes(voice.status)) return { ok: true };
    if (!success) db.prepare("UPDATE singing_voices SET status = 'failed', error_code = 'SINGING_VOICE_TRAINING_FAILED', updated_at = ? WHERE id = ?").run(Date.now(), voice.id);
    else {
      const providerVoiceId = clean(payload?.data?.id || payload?.data?.voiceId, 200);
      if (!providerVoiceId) throw singingError("SINGING_CALLBACK_INVALID", 422);
      db.prepare("UPDATE singing_voices SET provider_voice_id = ?, status = 'ready', error_code = NULL, updated_at = ? WHERE id = ?").run(providerVoiceId, Date.now(), voice.id);
      audit(voice.user_id, "music.singing_voice.ready", "singing_voice", voice.id);
    }
    return { ok: true };
  }
  const job = db.prepare("SELECT * FROM singing_cover_jobs WHERE callback_token_hash = ?").get(tokenHash);
  if (!job) throw singingError("SINGING_CALLBACK_NOT_FOUND", 404);
  if (["completed", "failed"].includes(job.status)) return { ok: true };
  if (!success) { failCover(job, "SINGING_COVER_PROVIDER_FAILED"); return { ok: true }; }
  const coverId = clean(payload?.data?.id || payload?.data?.coverId, 200);
  const directUrl = clean(payload?.data?.url, 2000);
  try { await completeCover(job, coverId, directUrl, fetchImpl); }
  catch (error) { failCover(job, error.code || "SINGING_COVER_FINALIZE_FAILED"); throw error; }
  return { ok: true };
}
