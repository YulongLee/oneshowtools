import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import ffmpegPath from "ffmpeg-static";
import { processMediaTool } from "../server/media-tools.mjs";

const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "oneshow-media-test-"));
const videoPath = join(directory, "sample.mp4");
const audioPath = join(directory, "sample.wav");
await exec(ffmpegPath, ["-y", "-f", "lavfi", "-i", "color=c=1769e8:s=320x240:d=2", "-f", "lavfi", "-i", "sine=frequency=880:duration=2", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", videoPath]);
await exec(ffmpegPath, ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", "pcm_s16le", audioPath]);
const video = await readFile(videoPath); const audio = await readFile(audioPath);

const form = (file, fields = {}) => { const value = new FormData(); value.append("file", file); Object.entries(fields).forEach(([key, item]) => value.append(key, String(item))); return value; };
const videoFile = (name = "sample.mp4") => new File([video], name, { type: "video/mp4" });
const audioFile = (name = "sample.wav") => new File([audio], name, { type: "audio/wav" });
const assertArtifact = (result, type) => { assert.ok(result.buffer.length > 100); assert.ok(result.mimeType.startsWith(type)); assert.equal(result.output.mode, "server-ffmpeg"); };

test("video compression, conversion, trimming, GIF, and audio extraction produce real files", async () => {
  for (const [slug, fields, type] of [
    ["video-compressor", { quality: "balanced" }, "video/"], ["mov-to-mp4", {}, "video/"], ["mkv-to-mp4", {}, "video/"],
    ["video-trimmer", { start: 0.2, duration: 0.8 }, "video/"], ["video-to-gif", { start: 0, duration: 1, width: 480 }, "image/"],
    ["video-extract-audio", {}, "audio/"], ["mp4-to-mp3", {}, "audio/"],
  ]) assertArtifact(await processMediaTool(slug, form(videoFile(slug.includes("mov") ? "sample.mov" : slug.includes("mkv") ? "sample.mkv" : "sample.mp4"), fields)), type);
});

test("audio conversion, trimming, merging, and normalization produce playable outputs", async () => {
  for (const format of ["mp3", "wav", "flac"]) assertArtifact(await processMediaTool("audio-format-converter", form(audioFile(), { format })), "audio/");
  assertArtifact(await processMediaTool("audio-trimmer", form(audioFile(), { start: 0.2, duration: 0.8 })), "audio/");
  assertArtifact(await processMediaTool("audio-normalizer", form(audioFile(), { target: -16 })), "audio/");
  const merge = new FormData(); merge.append("files", audioFile("one.wav")); merge.append("files", audioFile("two.wav"));
  const merged = await processMediaTool("audio-merger", merge); assertArtifact(merged, "audio/"); assert.equal(merged.output.count, 2);
});

test.after(async () => rm(directory, { recursive: true, force: true }));
