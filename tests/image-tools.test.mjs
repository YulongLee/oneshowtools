import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import JSZip from "jszip";
import QRCode from "qrcode";
import { processImageTool } from "../server/image-tools.mjs";

const source = await sharp({ create: { width: 1200, height: 900, channels: 4, background: "#f4f7fb" } })
  .composite([{ input: Buffer.from('<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg"><rect x="260" y="120" width="680" height="700" rx="120" fill="#1769e8"/><circle cx="600" cy="370" r="150" fill="#fff"/></svg>') }])
  .png()
  .withMetadata({ orientation: 1, comment: "private metadata" })
  .toBuffer();

function imageFile(name = "source.png", type = "image/png") { return new File([source], name, { type }); }
function formWithFile(extra = {}, name) {
  const form = new FormData(); form.append("file", imageFile(name));
  for (const [key, value] of Object.entries(extra)) form.append(key, String(value));
  return form;
}

test("HEIC conversion and all requested output formats produce real decodable images", async () => {
  const heifSource = await sharp(source).avif({ quality: 70 }).toBuffer();
  const heicForm = new FormData(); heicForm.append("file", new File([heifSource], "phone.heic", { type: "image/heic" }));
  const jpg = await processImageTool("heic-to-jpg", heicForm);
  assert.equal((await sharp(jpg.buffer).metadata()).format, "jpeg");
  assert.equal(Boolean(sharp.format.heif?.input?.buffer), true);
  for (const format of ["jpeg", "png", "webp", "avif"]) {
    const result = await processImageTool("image-format-converter", formWithFile({ format }));
    assert.equal((await sharp(result.buffer).metadata()).format, format === "avif" ? "heif" : format);
  }
});

test("target compression supports the advertised presets and returns a valid WebP", async () => {
  for (const targetKb of [100, 200, 500]) {
    const result = await processImageTool("target-image-compressor", formWithFile({ targetKb }));
    assert.equal((await sharp(result.buffer).metadata()).format, "webp");
    assert.equal(result.output.targetBytes, targetKb * 1024);
    assert.equal(result.output.targetMet, true);
  }
});

test("batch resize packages every selected image", async () => {
  const form = new FormData();
  form.append("files", imageFile("one.png")); form.append("files", imageFile("two.png"));
  form.append("width", "640"); form.append("height", "480");
  const result = await processImageTool("batch-image-resizer", form);
  const zip = await JSZip.loadAsync(result.buffer);
  assert.equal(Object.keys(zip.files).length, 2);
  assert.equal(result.output.count, 2);
});

test("social presets render their contracted dimensions", async () => {
  const presets = { "xiaohongshu-cover": [1242, 1660], "wechat-cover": [900, 383], "instagram-square": [1080, 1080], "youtube-thumbnail": [1280, 720] };
  for (const [preset, dimensions] of Object.entries(presets)) {
    const result = await processImageTool("social-image-resizer", formWithFile({ preset }));
    const metadata = await sharp(result.buffer).metadata();
    assert.deepEqual([metadata.width, metadata.height], dimensions);
  }
});

test("favicon, OG image, EXIF removal, watermark, nine-grid, and ID photo all emit real artifacts", async () => {
  const favicon = await processImageTool("favicon-generator", formWithFile());
  assert.equal(favicon.buffer.readUInt16LE(2), 1);
  assert.equal(favicon.buffer.readUInt16LE(4), 4);

  const ogForm = new FormData(); ogForm.append("title", "OneShowTools 图片工具"); ogForm.append("subtitle", "真实可下载的处理结果"); ogForm.append("brand", "OneShowTools"); ogForm.append("accent", "#1769e8");
  const og = await processImageTool("og-image-generator", ogForm);
  assert.deepEqual([(await sharp(og.buffer).metadata()).width, (await sharp(og.buffer).metadata()).height], [1200, 630]);

  const cleaned = await processImageTool("exif-remover", formWithFile());
  assert.equal((await sharp(cleaned.buffer).metadata()).exif, undefined);

  const watermarked = await processImageTool("image-watermark", formWithFile({ watermark: "OneShowTools", opacity: 60, fontSize: 54 }));
  assert.equal((await sharp(watermarked.buffer).metadata()).format, "png");

  const grid = await processImageTool("nine-grid-image", formWithFile());
  assert.equal(Object.keys((await JSZip.loadAsync(grid.buffer)).files).length, 9);

  for (const [preset, width, height] of [["one-inch", 295, 413], ["two-inch", 413, 579], ["passport", 600, 600]]) {
    const photo = await processImageTool("id-photo-maker", formWithFile({ preset, background: "#ffffff", tolerance: 48 }));
    const metadata = await sharp(photo.buffer).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.format], [width, height, "jpeg"]);
    assert.equal(photo.output.advancedAiAvailable, false);
  }
});

test("reads a generated QR code from an uploaded image", async () => {
  const qr = await QRCode.toBuffer("https://oneshowtools.com/tools", { width: 600, margin: 4 });
  const form = new FormData(); form.append("file", new File([qr], "qr.png", { type: "image/png" }));
  const result = await processImageTool("qr-code-reader", form);
  assert.equal(result.output.text, "https://oneshowtools.com/tools");
});

test("recognizes English text from an uploaded image and exports text", async () => {
  const textImage = await sharp({ create: { width: 1200, height: 320, channels: 3, background: "white" } })
    .composite([{ input: Buffer.from('<svg width="1200" height="320" xmlns="http://www.w3.org/2000/svg"><text x="70" y="205" font-family="Arial" font-size="120" font-weight="700" fill="black">OneShow Tools</text></svg>') }]).png().toBuffer();
  const form = new FormData(); form.append("file", new File([textImage], "text.png", { type: "image/png" })); form.append("language", "eng");
  const result = await processImageTool("image-ocr", form);
  assert.equal(result.mimeType, "text/plain; charset=utf-8");
  assert.match(result.output.text.toLowerCase(), /oneshow/);
});
