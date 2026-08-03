import sharp from "sharp";
import JSZip from "jszip";
import jsQR from "jsqr";
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createWorker } from "tesseract.js";
import engData from "@tesseract.js-data/eng";
import chiSimData from "@tesseract.js-data/chi_sim";

const imageError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const formats = new Set(["jpeg", "png", "webp", "avif"]);
const socialPresets = {
  "xiaohongshu-cover": { width: 1242, height: 1660, label: "xiaohongshu-cover" },
  "wechat-cover": { width: 900, height: 383, label: "wechat-cover" },
  "instagram-square": { width: 1080, height: 1080, label: "instagram-square" },
  "youtube-thumbnail": { width: 1280, height: 720, label: "youtube-thumbnail" },
};
const idPhotoPresets = {
  "one-inch": { width: 295, height: 413, label: "one-inch" },
  "two-inch": { width: 413, height: 579, label: "two-inch" },
  passport: { width: 600, height: 600, label: "passport" },
};

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const safeName = (value, fallback = "image") => String(value || fallback).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 80) || fallback;
const escapeXml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);

async function fileBuffer(file) {
  if (!file?.size) throw imageError("IMAGE_REQUIRED", 400);
  if (file.size > MAX_IMAGE_BYTES) throw imageError("IMAGE_TOO_LARGE", 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  try { await sharp(buffer).metadata(); } catch { throw imageError("IMAGE_INVALID"); }
  return buffer;
}

function encode(image, format, quality = 82) {
  if (format === "png") return image.png({ compressionLevel: 9, palette: false });
  if (format === "avif") return image.avif({ quality, effort: 5 });
  if (format === "webp") return image.webp({ quality, effort: 5 });
  return image.jpeg({ quality, mozjpeg: true });
}

function extension(format) { return format === "jpeg" ? "jpg" : format; }

async function convert(file, form, forcedFormat = null) {
  const input = await fileBuffer(file);
  const requested = forcedFormat || String(form.get("format") || "webp").toLowerCase().replace("jpg", "jpeg");
  if (!formats.has(requested)) throw imageError("IMAGE_FORMAT_UNSUPPORTED");
  const quality = clamp(form.get("quality"), 30, 95, 82);
  const output = await encode(sharp(input).rotate(), requested, quality).toBuffer();
  const metadata = await sharp(output).metadata();
  return { buffer: output, extension: `.${extension(requested)}`, mimeType: `image/${requested}`, name: `${safeName(file.name)}.${extension(requested)}`, output: { mode: "local", format: requested, width: metadata.width, height: metadata.height, originalBytes: file.size, compressedBytes: output.length, savedPercent: Math.max(0, Math.round((1 - output.length / file.size) * 100)) } };
}

async function compressToTarget(file, form) {
  const input = await fileBuffer(file);
  const targetBytes = clamp(form.get("targetKb"), 20, 5000, 200) * 1024;
  const metadata = await sharp(input).metadata();
  let width = metadata.width;
  let best = null;
  for (let scaleStep = 0; scaleStep < 6; scaleStep += 1) {
    let low = 20; let high = 92;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const quality = Math.floor((low + high) / 2);
      const candidate = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toBuffer();
      if (!best || Math.abs(candidate.length - targetBytes) < Math.abs(best.length - targetBytes)) best = candidate;
      if (candidate.length > targetBytes) high = quality - 1; else low = quality + 1;
    }
    if (best.length <= targetBytes) break;
    width = Math.max(320, Math.floor(width * 0.86));
  }
  const outputMetadata = await sharp(best).metadata();
  return { buffer: best, extension: ".webp", mimeType: "image/webp", name: `${safeName(file.name)}-${Math.round(targetBytes / 1024)}kb.webp`, output: { mode: "local", targetBytes, targetMet: best.length <= targetBytes, width: outputMetadata.width, height: outputMetadata.height, originalBytes: file.size, compressedBytes: best.length, savedPercent: Math.max(0, Math.round((1 - best.length / file.size) * 100)) } };
}

async function resizeOne(input, width, height, fit = "inside", format = "webp") {
  const image = sharp(input).rotate().resize({ width, height, fit, position: "centre", withoutEnlargement: fit === "inside" });
  return encode(image, format, 84).toBuffer();
}

async function batchResize(files, form) {
  if (!files.length) throw imageError("IMAGE_REQUIRED", 400);
  if (files.length > 20) throw imageError("IMAGE_BATCH_LIMIT", 413);
  const width = clamp(form.get("width"), 16, 8000, 1200);
  const heightValue = String(form.get("height") || "").trim();
  const height = heightValue ? clamp(heightValue, 16, 8000, 1200) : null;
  const zip = new JSZip();
  for (const file of files) {
    const input = await fileBuffer(file);
    zip.file(`${safeName(file.name)}-${width}${height ? `x${height}` : "w"}.webp`, await resizeOne(input, width, height, "inside"));
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { buffer, extension: ".zip", mimeType: "application/zip", name: `resized-images-${width}${height ? `x${height}` : "w"}.zip`, output: { mode: "local", count: files.length, width, height } };
}

async function socialResize(file, form) {
  const preset = socialPresets[String(form.get("preset") || "xiaohongshu-cover")] || socialPresets["xiaohongshu-cover"];
  const input = await fileBuffer(file);
  const buffer = await resizeOne(input, preset.width, preset.height, "cover");
  return { buffer, extension: ".webp", mimeType: "image/webp", name: `${safeName(file.name)}-${preset.label}.webp`, output: { mode: "local", ...preset } };
}

function icoFromPngs(entries) {
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const directory = Buffer.alloc(entries.length * 16);
  let offset = header.length + directory.length;
  entries.forEach(({ size, buffer }, index) => {
    const row = index * 16; directory[row] = size === 256 ? 0 : size; directory[row + 1] = size === 256 ? 0 : size;
    directory[row + 2] = 0; directory[row + 3] = 0; directory.writeUInt16LE(1, row + 4); directory.writeUInt16LE(32, row + 6);
    directory.writeUInt32LE(buffer.length, row + 8); directory.writeUInt32LE(offset, row + 12); offset += buffer.length;
  });
  return Buffer.concat([header, directory, ...entries.map((entry) => entry.buffer)]);
}

async function favicon(file) {
  const input = await fileBuffer(file);
  const entries = await Promise.all([16, 32, 48, 256].map(async (size) => ({ size, buffer: await sharp(input).rotate().resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() })));
  const buffer = icoFromPngs(entries);
  return { buffer, extension: ".ico", mimeType: "image/x-icon", name: `${safeName(file.name)}-favicon.ico`, output: { mode: "local", sizes: entries.map((entry) => entry.size) } };
}

async function ogImage(form) {
  const title = escapeXml(String(form.get("title") || "OneShowTools").slice(0, 90));
  const subtitle = escapeXml(String(form.get("subtitle") || "Make useful work easier").slice(0, 140));
  const brand = escapeXml(String(form.get("brand") || "OneShowTools").slice(0, 50));
  const accent = /^#[0-9a-f]{6}$/i.test(String(form.get("accent") || "")) ? String(form.get("accent")) : "#1769e8";
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7faff"/><stop offset="1" stop-color="#e9f2ff"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1030" cy="90" r="250" fill="${accent}" opacity=".10"/><circle cx="1100" cy="620" r="310" fill="${accent}" opacity=".08"/><rect x="76" y="72" width="56" height="56" rx="16" fill="${accent}"/><text x="151" y="112" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#182033">${brand}</text><text x="76" y="286" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="#152038">${title}</text><text x="76" y="360" font-family="Arial,sans-serif" font-size="30" fill="#65738a">${subtitle}</text><rect x="76" y="470" width="130" height="8" rx="4" fill="${accent}"/></svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, extension: ".png", mimeType: "image/png", name: "og-image.png", output: { mode: "local", width: 1200, height: 630 } };
}

async function removeExif(file) {
  const input = await fileBuffer(file);
  const metadata = await sharp(input).metadata();
  const format = formats.has(metadata.format) ? metadata.format : "jpeg";
  const buffer = await encode(sharp(input).rotate(), format, 90).toBuffer();
  return { buffer, extension: `.${extension(format)}`, mimeType: `image/${format}`, name: `${safeName(file.name)}-clean.${extension(format)}`, output: { mode: "local", metadataRemoved: true, originalBytes: file.size, compressedBytes: buffer.length } };
}

async function watermark(file, form) {
  const input = await fileBuffer(file);
  const metadata = await sharp(input).metadata();
  const text = escapeXml(String(form.get("watermark") || "OneShowTools").slice(0, 80));
  const opacity = clamp(form.get("opacity"), 10, 100, 55) / 100;
  const fontSize = clamp(form.get("fontSize"), 12, 180, Math.max(24, Math.round((metadata.width || 1200) / 24)));
  const svg = `<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg"><style>.w{fill:white;stroke:rgba(0,0,0,.45);stroke-width:2;paint-order:stroke;font:bold ${fontSize}px Arial,sans-serif}</style><text class="w" x="${Math.max(20, (metadata.width || 1200) - 30)}" y="${Math.max(fontSize + 20, (metadata.height || 800) - 30)}" text-anchor="end" opacity="${opacity}">${text}</text></svg>`;
  const buffer = await sharp(input).rotate().composite([{ input: Buffer.from(svg), gravity: "southeast" }]).png().toBuffer();
  return { buffer, extension: ".png", mimeType: "image/png", name: `${safeName(file.name)}-watermarked.png`, output: { mode: "local", watermark: String(form.get("watermark") || "OneShowTools"), opacity } };
}

async function nineGrid(file) {
  const input = await fileBuffer(file);
  const metadata = await sharp(input).metadata();
  const square = Math.floor(Math.min(metadata.width || 0, metadata.height || 0) / 3) * 3;
  if (square < 96) throw imageError("IMAGE_TOO_SMALL");
  const base = await sharp(input).rotate().resize(square, square, { fit: "cover" }).png().toBuffer();
  const cell = square / 3; const zip = new JSZip();
  for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
    zip.file(`${row * 3 + column + 1}.png`, await sharp(base).extract({ left: column * cell, top: row * cell, width: cell, height: cell }).png().toBuffer());
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, extension: ".zip", mimeType: "application/zip", name: `${safeName(file.name)}-nine-grid.zip`, output: { mode: "local", count: 9, cellWidth: cell, cellHeight: cell } };
}

async function solidBackground(input, tolerance = 48) {
  const image = sharp(input).rotate().ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const positions = [0, (info.width - 1) * 4, (info.height - 1) * info.width * 4, ((info.height - 1) * info.width + info.width - 1) * 4];
  const background = positions.reduce((sum, offset) => [sum[0] + data[offset], sum[1] + data[offset + 1], sum[2] + data[offset + 2]], [0, 0, 0]).map((value) => value / positions.length);
  const threshold = tolerance * tolerance * 3;
  for (let offset = 0; offset < data.length; offset += 4) {
    const distance = (data[offset] - background[0]) ** 2 + (data[offset + 1] - background[1]) ** 2 + (data[offset + 2] - background[2]) ** 2;
    if (distance <= threshold) data[offset + 3] = Math.round(255 * Math.min(1, distance / threshold));
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function idPhoto(file, form) {
  const input = await fileBuffer(file);
  const preset = idPhotoPresets[String(form.get("preset") || "one-inch")] || idPhotoPresets["one-inch"];
  const background = /^#[0-9a-f]{6}$/i.test(String(form.get("background") || "")) ? String(form.get("background")) : "#ffffff";
  const foreground = await solidBackground(input, clamp(form.get("tolerance"), 18, 100, 48));
  const buffer = await sharp({ create: { width: preset.width, height: preset.height, channels: 4, background } }).composite([{ input: await sharp(foreground).resize(preset.width, preset.height, { fit: "cover", position: "centre" }).png().toBuffer() }]).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { buffer, extension: ".jpg", mimeType: "image/jpeg", name: `${safeName(file.name)}-${preset.label}.jpg`, output: { mode: "local-solid-background", ...preset, background, advancedAiAvailable: false } };
}

async function prepareOcrLanguages() {
  const directory = join(process.env.DATA_DIR || "data", "ocr-languages");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    copyFile(join(engData.langPath, "eng.traineddata.gz"), join(directory, "eng.traineddata.gz")).catch((error) => { if (error.code !== "EEXIST") throw error; }),
    copyFile(join(chiSimData.langPath, "chi_sim.traineddata.gz"), join(directory, "chi_sim.traineddata.gz")).catch((error) => { if (error.code !== "EEXIST") throw error; }),
  ]);
  return directory;
}

async function imageOcr(file, form) {
  const input = await fileBuffer(file);
  const language = String(form.get("language") || "chi_sim+eng");
  if (!["chi_sim+eng", "eng", "chi_sim"].includes(language)) throw imageError("OCR_LANGUAGE_INVALID", 400);
  const langPath = await prepareOcrLanguages(); const cachePath = join(process.env.DATA_DIR || "data", "ocr-cache");
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker(language, 1, { langPath, cachePath, gzip: true, logger: () => {} });
  let result;
  try { result = await worker.recognize(input); } finally { await worker.terminate(); }
  const recognized = String(result?.data?.text || "").trim();
  if (!recognized) throw imageError("IMAGE_TEXT_NOT_FOUND");
  const buffer = Buffer.from(recognized, "utf8");
  return { buffer, name: `${safeName(file.name)}-ocr.txt`, mimeType: "text/plain; charset=utf-8", output: { text: recognized.slice(0, 40000), language, confidence: Math.round(Number(result.data.confidence || 0)), mode: "ocr" } };
}

async function qrCodeReader(file) {
  const input = await fileBuffer(file);
  const { data, info } = await sharp(input).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: "attemptBoth" });
  if (!result?.data) throw imageError("QR_CODE_NOT_FOUND");
  return { output: { text: result.data, data: result.data, version: result.version, mode: "local" } };
}

export const imageToolSlugs = new Set(["background-remover", "image-compressor", "heic-to-jpg", "image-format-converter", "target-image-compressor", "batch-image-resizer", "social-image-resizer", "favicon-generator", "og-image-generator", "exif-remover", "image-watermark", "nine-grid-image", "id-photo-maker", "image-ocr", "qr-code-reader"]);

export async function processImageTool(slug, form) {
  const file = form.get("file");
  const files = form.getAll("files").filter((item) => item?.size);
  if (slug === "heic-to-jpg") return convert(file, form, "jpeg");
  if (slug === "image-format-converter") return convert(file, form);
  if (slug === "target-image-compressor") return compressToTarget(file, form);
  if (slug === "batch-image-resizer") return batchResize(files.length ? files : (file?.size ? [file] : []), form);
  if (slug === "social-image-resizer") return socialResize(file, form);
  if (slug === "favicon-generator") return favicon(file);
  if (slug === "og-image-generator") return ogImage(form);
  if (slug === "exif-remover") return removeExif(file);
  if (slug === "image-watermark") return watermark(file, form);
  if (slug === "nine-grid-image") return nineGrid(file);
  if (slug === "id-photo-maker") return idPhoto(file, form);
  if (slug === "image-ocr") return imageOcr(file, form);
  if (slug === "qr-code-reader") return qrCodeReader(file);
  throw imageError("IMAGE_TOOL_NOT_SUPPORTED", 404);
}
