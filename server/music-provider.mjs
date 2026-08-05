import { db, refreshRuntimeStatuses } from "./database.mjs";
import { decryptCredential, encryptCredential } from "./model-gateway.mjs";

const owner = "platform:music";
const provider = "minimax";
const clean = (value, max = 2000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const providerError = (code, status = 400, retryable = false) => Object.assign(new Error(code), { code, status, retryable });
const keyHint = (value) => {
  const key = clean(value, 2048);
  return key.length > 4 ? `••••${key.slice(-4)}` : "••••";
};

function safeBaseUrl(value) {
  let url;
  try { url = new URL(clean(value || "https://api.minimaxi.com", 500)); } catch { throw providerError("MUSIC_BASE_URL_INVALID", 422); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw providerError("MUSIC_BASE_URL_INVALID", 422);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw providerError("MUSIC_BASE_URL_INVALID", 422);
  }
  return url.toString().replace(/\/$/, "");
}

function row() {
  return db.prepare("SELECT * FROM music_provider_configs WHERE provider = ?").get(provider);
}

function credentialRow(config) {
  return {
    user_id: owner,
    id: provider,
    credential_version: config.credential_version,
    key_ciphertext: config.key_ciphertext,
    key_iv: config.key_iv,
    key_tag: config.key_tag,
  };
}

function publicConfig(config = row()) {
  if (!config) return {
    provider, configured: false, enabled: false, baseUrl: "https://api.minimaxi.com",
    modelId: "music-2.6", keyHint: null, outputFormat: "mp3", creditCost: 30,
    maxDurationSeconds: 300, lastTestStatus: null, lastTestLatencyMs: null,
    lastTestedAt: null, updatedAt: null,
  };
  return {
    provider, configured: true, enabled: config.status === "active", baseUrl: config.base_url,
    modelId: config.model_id, keyHint: config.key_hint, outputFormat: config.output_format,
    creditCost: config.credit_cost, maxDurationSeconds: config.max_duration_seconds,
    lastTestStatus: config.last_test_status, lastTestLatencyMs: config.last_test_latency_ms,
    lastTestedAt: config.last_tested_at, updatedAt: config.updated_at,
  };
}

export function musicProviderConfiguration() {
  return publicConfig();
}

export function musicProviderCredentials() {
  const config = row();
  if (!config || config.status !== "active") return null;
  return { ...publicConfig(config), apiKey: decryptCredential(credentialRow(config)) };
}

function normalize(data, existing) {
  const baseUrl = safeBaseUrl(data.baseUrl || existing?.base_url || "https://api.minimaxi.com");
  const modelId = clean(data.modelId || existing?.model_id || "music-2.6", 120);
  const apiKey = clean(data.apiKey, 2048);
  const outputFormat = data.outputFormat === "wav" ? "wav" : "mp3";
  const creditCost = Math.max(1, Math.min(10000, Number(data.creditCost || existing?.credit_cost || 30)));
  const maxDurationSeconds = Math.max(15, Math.min(600, Number(data.maxDurationSeconds || existing?.max_duration_seconds || 300)));
  const status = data.status === "disabled" ? "disabled" : "active";
  if (!modelId) throw providerError("MUSIC_MODEL_REQUIRED", 422);
  if (!apiKey && !existing) throw providerError("MUSIC_API_KEY_REQUIRED", 422);
  return { baseUrl, modelId, apiKey, outputFormat, creditCost, maxDurationSeconds, status };
}

function responseError(payload, responseStatus = 502) {
  const statusCode = Number(payload?.base_resp?.status_code ?? payload?.status_code ?? 0);
  const message = clean(payload?.base_resp?.status_msg || payload?.status_msg || "", 500).toLowerCase();
  if ([401, 403].includes(responseStatus) || /api.?key|auth|token|unauthorized|鉴权|认证/.test(message)) return providerError("MUSIC_PROVIDER_AUTH_FAILED", 422);
  if (statusCode && statusCode !== 0) return providerError("MUSIC_PROVIDER_REJECTED", 422);
  return null;
}

async function verify(input, apiKey, fetchImpl = fetch) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchImpl(`${input.baseUrl}/v1/music_generation`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: input.modelId, prompt: "", is_instrumental: true, output_format: "url" }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch { throw providerError("MUSIC_PROVIDER_UNREACHABLE", 502); }
  const payload = await response.json().catch(() => ({}));
  const error = responseError(payload, response.status);
  if (error?.code === "MUSIC_PROVIDER_AUTH_FAILED") throw error;
  if (response.status >= 500) throw providerError("MUSIC_PROVIDER_UNAVAILABLE", 502);
  return { status: "healthy", latencyMs: Date.now() - startedAt };
}

export async function testMusicProviderConfiguration(data, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  return verify(input, apiKey, fetchImpl);
}

export async function saveMusicProviderConfiguration(data, actorUserId = null, fetchImpl = fetch) {
  const existing = row();
  const input = normalize(data, existing);
  const apiKey = input.apiKey || decryptCredential(credentialRow(existing));
  const tested = await verify(input, apiKey, fetchImpl);
  const version = existing ? existing.credential_version + (input.apiKey ? 1 : 0) : 1;
  const encrypted = input.apiKey
    ? encryptCredential(apiKey, owner, provider, version)
    : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, tag: existing.key_tag };
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO music_provider_configs (
      provider, base_url, model_id, key_ciphertext, key_iv, key_tag, key_hint,
      credential_version, status, output_format, credit_cost, max_duration_seconds,
      last_test_status, last_test_latency_ms, last_tested_at, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      base_url=excluded.base_url, model_id=excluded.model_id, key_ciphertext=excluded.key_ciphertext,
      key_iv=excluded.key_iv, key_tag=excluded.key_tag, key_hint=excluded.key_hint,
      credential_version=excluded.credential_version, status=excluded.status,
      output_format=excluded.output_format, credit_cost=excluded.credit_cost,
      max_duration_seconds=excluded.max_duration_seconds, last_test_status=excluded.last_test_status,
      last_test_latency_ms=excluded.last_test_latency_ms, last_tested_at=excluded.last_tested_at,
      updated_by=excluded.updated_by, updated_at=excluded.updated_at
  `).run(
    provider, input.baseUrl, input.modelId, encrypted.ciphertext, encrypted.iv, encrypted.tag,
    input.apiKey ? keyHint(apiKey) : existing.key_hint, version, input.status, input.outputFormat,
    input.creditCost, input.maxDurationSeconds, tested.status, tested.latencyMs, timestamp,
    actorUserId, existing?.created_at || timestamp, timestamp,
  );
  db.prepare("UPDATE tools SET credit_cost = ?, updated_at = ? WHERE id = 'tool_music_studio'")
    .run(input.creditCost, timestamp);
  refreshRuntimeStatuses();
  return publicConfig();
}

function audioBuffer(payload) {
  const audio = payload?.data?.audio;
  if (!audio || typeof audio !== "string") throw providerError("MUSIC_PROVIDER_EMPTY_OUTPUT", 502);
  if (/^[0-9a-f]+$/i.test(audio) && audio.length % 2 === 0) return { buffer: Buffer.from(audio, "hex"), sourceUrl: null };
  let url;
  try { url = new URL(audio); } catch { throw providerError("MUSIC_PROVIDER_OUTPUT_INVALID", 502); }
  if (url.protocol !== "https:") throw providerError("MUSIC_PROVIDER_OUTPUT_INVALID", 502);
  return { buffer: null, sourceUrl: url.toString() };
}

async function generateProviderLyrics(config, input, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/v1/lyrics_generation`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ mode: "write_full_song", prompt: clean(input.prompt, 2000), title: clean(input.title, 120) || undefined }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw providerError("MUSIC_LYRICS_TIMEOUT", 504, true);
    throw providerError("MUSIC_LYRICS_UNREACHABLE", 502, true);
  }
  const payload = await response.json().catch(() => ({}));
  const error = responseError(payload, response.status);
  if (error) throw error;
  const lyrics = clean(payload?.lyrics, 3500);
  if (!response.ok || !lyrics) throw providerError("MUSIC_LYRICS_EMPTY_OUTPUT", 502);
  return { lyrics, title: clean(payload?.song_title, 120) || null, styleTags: clean(payload?.style_tags, 500) || null };
}

export async function preprocessMusicCover(buffer, fetchImpl = fetch) {
  const config = musicProviderCredentials();
  if (!config) throw providerError("MUSIC_PROVIDER_NOT_CONFIGURED", 503);
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 50 * 1024 * 1024) {
    throw providerError("MUSIC_REFERENCE_INVALID", 422);
  }
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/v1/music_cover_preprocess`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "music-cover", audio_base64: buffer.toString("base64") }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw providerError("MUSIC_REFERENCE_PREPROCESS_TIMEOUT", 504, true);
    throw providerError("MUSIC_REFERENCE_PREPROCESS_UNREACHABLE", 502, true);
  }
  const payload = await response.json().catch(() => ({}));
  const error = responseError(payload, response.status);
  if (error) throw error;
  if (!response.ok) throw providerError("MUSIC_REFERENCE_PREPROCESS_FAILED", 502, response.status >= 500);
  const coverFeatureId = clean(payload?.cover_feature_id, 500);
  const formattedLyrics = clean(payload?.formatted_lyrics, 12_000);
  const durationSeconds = Number(payload?.audio_duration || 0);
  if (!coverFeatureId || !Number.isFinite(durationSeconds)) throw providerError("MUSIC_REFERENCE_PREPROCESS_INVALID", 502);
  if (durationSeconds < 6 || durationSeconds > 360) throw providerError("MUSIC_REFERENCE_DURATION_INVALID", 422);
  return {
    coverFeatureId,
    formattedLyrics,
    structureJson: clean(payload?.structure_result || "{}", 100_000),
    durationSeconds,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };
}

export async function generateMusic(input, fetchImpl = fetch) {
  const config = musicProviderCredentials();
  if (!config) throw providerError("MUSIC_PROVIDER_NOT_CONFIGURED", 503);
  const generatedLyrics = input.mode === "inspiration" ? await generateProviderLyrics(config, input, fetchImpl) : null;
  const resolvedLyrics = input.mode === "instrumental" ? "" : (input.lyrics || generatedLyrics?.lyrics || "");
  if (input.mode === "cover" && !clean(input.coverFeatureId, 500)) throw providerError("MUSIC_REFERENCE_REQUIRED", 422);
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/v1/music_generation`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: input.mode === "cover" ? "music-cover" : config.modelId,
        prompt: clean(input.prompt, 2000),
        lyrics: resolvedLyrics || undefined,
        ...(input.mode === "cover" ? { cover_feature_id: clean(input.coverFeatureId, 500) } : {
          lyrics_optimizer: false,
          is_instrumental: input.mode === "instrumental",
        }),
        output_format: "url",
        audio_setting: { sample_rate: 44100, bitrate: 256000, format: config.outputFormat },
      }),
      signal: AbortSignal.timeout(600_000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw providerError("MUSIC_PROVIDER_TIMEOUT", 504, true);
    throw providerError("MUSIC_PROVIDER_UNREACHABLE", 502, true);
  }
  const payload = await response.json().catch(() => ({}));
  const error = responseError(payload, response.status);
  if (error) throw error;
  if (!response.ok) throw providerError("MUSIC_PROVIDER_UNAVAILABLE", 502, response.status >= 500);
  const audio = audioBuffer(payload);
  let buffer = audio.buffer;
  if (!buffer) {
    const download = await fetchImpl(audio.sourceUrl, { signal: AbortSignal.timeout(120_000) }).catch(() => null);
    if (!download?.ok) throw providerError("MUSIC_DOWNLOAD_FAILED", 502, true);
    buffer = Buffer.from(await download.arrayBuffer());
  }
  if (!buffer?.length || buffer.length > 100 * 1024 * 1024) throw providerError("MUSIC_PROVIDER_OUTPUT_INVALID", 502);
  return {
    buffer,
    mimeType: config.outputFormat === "wav" ? "audio/wav" : "audio/mpeg",
    extension: config.outputFormat === "wav" ? "wav" : "mp3",
    durationMs: Number(payload?.extra_info?.music_duration || 0) || null,
    providerTrackId: clean(payload?.trace_id || payload?.data?.id || "", 200) || null,
    lyrics: resolvedLyrics,
    lyricsSource: input.mode === "inspiration" ? "provider_generated" : input.mode === "cover" ? "reference_edited" : input.mode === "lyrics" ? "user_input" : "instrumental",
  };
}
