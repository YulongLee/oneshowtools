#!/usr/bin/env node

import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const sourceDirectory = resolve(process.argv[2] || "");
const outputDirectory = resolve(process.argv[3] || "apps/stock-pet/public/default-actions");
const ffmpeg = process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg";
const gifsicle = process.env.GIFSICLE || "/opt/homebrew/bin/gifsicle";
const rembgPython = process.env.REMBG_PYTHON || "python3";
const processor = join(dirname(fileURLToPath(import.meta.url)), "stock-pet-rembg.py");
const frameRate = 16;
const frameSize = 480;

const assets = [
  ["上涨.mp4", "up.gif"],
  ["下跌.mp4", "down.gif"],
  ["平静.mp4", "flat.gif"],
  ["收盘休息 .mp4", "closed.gif"],
  ["明显上涨.mp4", "strong-up.gif"],
  ["涨停.mp4", "limit-up.gif"],
  ["疑惑.mp4", "confused.gif"],
  ["虚惊一场.mp4", "alert.gif"],
  ["轻微失落.mp4", "slight-loss.gif"],
];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${basename(command)} failed with exit code ${result.status}`);
  }
}

if (!process.argv[2]) {
  throw new Error(
    "Usage: REMBG_PYTHON=/path/to/python node scripts/build-stock-pet-default-gifs.mjs <source-directory> [output-directory]",
  );
}

await mkdir(outputDirectory, { recursive: true });
const workDirectory = await mkdtemp(join(tmpdir(), "stock-pet-gifs-"));
const rawRoot = join(workDirectory, "raw");
const alphaRoot = join(workDirectory, "alpha");
await mkdir(rawRoot);
await mkdir(alphaRoot);

try {
  for (const [sourceName, outputName] of assets) {
    const assetDirectory = join(rawRoot, outputName.replace(/\.gif$/, ""));
    await mkdir(assetDirectory);
    run(ffmpeg, [
      "-y", "-loglevel", "error", "-i", join(sourceDirectory, sourceName),
      "-vf",
      `drawbox=x=1120:y=1300:w=320:h=140:color=black:t=fill,fps=${frameRate},scale=${frameSize}:${frameSize}:flags=lanczos`,
      "-an", join(assetDirectory, "frame-%04d.png"),
    ]);
  }

  // Black eyes, hair and hooves cannot be separated safely from the black
  // background with a chroma key. Use a semantic foreground model instead.
  run(rembgPython, [processor, rawRoot, alphaRoot]);

  for (const [, outputName] of assets) {
    const assetName = outputName.replace(/\.gif$/, "");
    const encoded = join(workDirectory, outputName);
    run(ffmpeg, [
      "-y", "-loglevel", "error", "-framerate", String(frameRate),
      "-i", join(alphaRoot, assetName, "frame-%04d.png"),
      "-filter_complex",
      "[0:v]split[a][b];[a]palettegen=stats_mode=diff:reserve_transparent=1[p];[b][p]paletteuse=dither=sierra2_4a:alpha_threshold=128",
      // Kling clips are action sequences, not seamless loops. Play once and
      // hold the last frame rather than jumping back to the opening pose.
      "-loop", "-1", encoded,
    ]);
    // Full-size disposal-background frames avoid ghost trails in GIF viewers
    // that mishandle delta-frame offsets or transparency differencing.
    run(gifsicle, [
      "--unoptimize", "--disposal=background", encoded,
      "-o", join(outputDirectory, outputName),
    ]);
    console.log(`Created ${outputName}`);
  }
} finally {
  await rm(workDirectory, { recursive: true, force: true });
}
