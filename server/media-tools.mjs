import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const mediaError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_FILES = 10;

export const mediaToolSlugs = new Set([
  "video-compressor", "mov-to-mp4", "mkv-to-mp4", "video-trimmer", "video-to-gif",
  "video-extract-audio", "mp4-to-mp3", "audio-format-converter", "audio-trimmer",
  "audio-merger", "audio-normalizer",
]);

const safeName = (value, fallback = "media") => String(value || fallback)
  .replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 80) || fallback;

const number = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

async function validateFiles(files, multiple = false) {
  const present = files.filter((file) => file?.size);
  if (!present.length) throw mediaError("MEDIA_REQUIRED", 400);
  if (!multiple && present.length !== 1) throw mediaError("MEDIA_SINGLE_FILE_REQUIRED", 400);
  if (present.length > MAX_MEDIA_FILES) throw mediaError("MEDIA_BATCH_LIMIT", 413);
  if (present.some((file) => file.size > MAX_MEDIA_BYTES)) throw mediaError("MEDIA_TOO_LARGE", 413);
  return present;
}

async function ffmpeg(args) {
  if (!ffmpegPath) throw mediaError("MEDIA_RUNTIME_UNAVAILABLE", 503);
  try {
    await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (error) {
    if (error.killed) throw mediaError("MEDIA_PROCESS_TIMEOUT", 504);
    throw mediaError("MEDIA_PROCESS_FAILED", 422);
  }
}

async function withMediaFiles(files, callback) {
  const directory = await mkdtemp(join(tmpdir(), "oneshow-media-"));
  try {
    const paths = [];
    for (let index = 0; index < files.length; index += 1) {
      const extension = extname(files[index].name || "") || ".bin";
      const path = join(directory, `input-${index}${extension.slice(0, 10)}`);
      await writeFile(path, Buffer.from(await files[index].arrayBuffer()));
      paths.push(path);
    }
    return await callback({ directory, paths });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const result = async (path, name, mimeType, output) => {
  const buffer = await readFile(path);
  const originalBytes = Number(output.originalBytes || 0);
  return {
    buffer,
    extension: extname(name),
    mimeType,
    name,
    output: {
      mode: "server-ffmpeg", ...output, outputBytes: buffer.length,
      ...(originalBytes ? { compressedBytes: buffer.length, savedPercent: Math.round((1 - buffer.length / originalBytes) * 100) } : {}),
    },
  };
};

export async function processMediaTool(slug, form) {
  const multiple = slug === "audio-merger";
  const rawFiles = multiple ? form.getAll("files") : [form.get("file")];
  const files = await validateFiles(rawFiles, multiple);
  return withMediaFiles(files, async ({ directory, paths }) => {
    const base = safeName(files[0].name);
    if (slug === "video-compressor") {
      const quality = String(form.get("quality") || "balanced");
      const crf = { quality: "22", balanced: "27", small: "32" }[quality] || "27";
      const outputPath = join(directory, "compressed.mp4");
      await ffmpeg(["-i", paths[0], "-map_metadata", "-1", "-c:v", "libx264", "-preset", "medium", "-crf", crf, "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath]);
      return result(outputPath, `${base}-compressed.mp4`, "video/mp4", { quality, originalBytes: files[0].size });
    }
    if (slug === "mov-to-mp4" || slug === "mkv-to-mp4") {
      const outputPath = join(directory, "converted.mp4");
      await ffmpeg(["-i", paths[0], "-map_metadata", "-1", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", outputPath]);
      return result(outputPath, `${base}.mp4`, "video/mp4", { sourceFormat: slug.startsWith("mov") ? "mov" : "mkv" });
    }
    if (slug === "video-trimmer") {
      const start = number(form.get("start"), 0, 21600, 0);
      const duration = number(form.get("duration"), 0.1, 3600, 10);
      const outputPath = join(directory, "trimmed.mp4");
      await ffmpeg(["-ss", String(start), "-i", paths[0], "-t", String(duration), "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", outputPath]);
      return result(outputPath, `${base}-trimmed.mp4`, "video/mp4", { start, duration });
    }
    if (slug === "video-to-gif") {
      const start = number(form.get("start"), 0, 21600, 0);
      const duration = number(form.get("duration"), 0.2, 30, 5);
      const width = number(form.get("width"), 240, 960, 640);
      const outputPath = join(directory, "preview.gif");
      await ffmpeg(["-ss", String(start), "-t", String(duration), "-i", paths[0], "-vf", `fps=10,scale=${width}:-1:flags=lanczos`, "-loop", "0", outputPath]);
      return result(outputPath, `${base}.gif`, "image/gif", { start, duration, width });
    }
    if (slug === "video-extract-audio" || slug === "mp4-to-mp3") {
      const outputPath = join(directory, "audio.mp3");
      await ffmpeg(["-i", paths[0], "-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "192k", outputPath]);
      return result(outputPath, `${base}.mp3`, "audio/mpeg", { format: "mp3" });
    }
    if (slug === "audio-format-converter") {
      const format = new Set(["mp3", "wav", "flac"]).has(String(form.get("format"))) ? String(form.get("format")) : "mp3";
      const mimeType = { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac" }[format];
      const codec = format === "mp3" ? ["-c:a", "libmp3lame", "-b:a", "192k"] : format === "wav" ? ["-c:a", "pcm_s16le"] : ["-c:a", "flac"];
      const outputPath = join(directory, `converted.${format}`);
      await ffmpeg(["-i", paths[0], "-vn", "-map_metadata", "-1", ...codec, outputPath]);
      return result(outputPath, `${base}.${format}`, mimeType, { format });
    }
    if (slug === "audio-trimmer") {
      const start = number(form.get("start"), 0, 21600, 0);
      const duration = number(form.get("duration"), 0.1, 3600, 10);
      const outputPath = join(directory, "trimmed.mp3");
      await ffmpeg(["-ss", String(start), "-i", paths[0], "-t", String(duration), "-vn", "-c:a", "libmp3lame", "-b:a", "192k", outputPath]);
      return result(outputPath, `${base}-trimmed.mp3`, "audio/mpeg", { start, duration });
    }
    if (slug === "audio-merger") {
      const filter = paths.map((_, index) => `[${index}:a]`).join("") + `concat=n=${paths.length}:v=0:a=1[out]`;
      const outputPath = join(directory, "merged.mp3");
      await ffmpeg([...paths.flatMap((path) => ["-i", path]), "-filter_complex", filter, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k", outputPath]);
      return result(outputPath, "merged-audio.mp3", "audio/mpeg", { count: paths.length });
    }
    if (slug === "audio-normalizer") {
      const target = number(form.get("target"), -24, -10, -16);
      const outputPath = join(directory, "normalized.mp3");
      await ffmpeg(["-i", paths[0], "-af", `loudnorm=I=${target}:LRA=11:TP=-1.5`, "-c:a", "libmp3lame", "-b:a", "192k", outputPath]);
      return result(outputPath, `${base}-normalized.mp3`, "audio/mpeg", { targetLufs: target });
    }
    throw mediaError("TOOL_ACTION_NOT_SUPPORTED", 404);
  });
}
