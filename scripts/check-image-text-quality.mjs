// Explicit live smoke test: synthetic poster, no customer images, no task or credit writes.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generatePreservedTextImage } from "../server/image-text-preservation.mjs";
const providerRoot = process.env.IMAGE_TEST_PROVIDER_ROOT || resolve(import.meta.dirname, "..");
const { editPlatformImage, recognizePlatformImageText } = await import(pathToFileURL(resolve(providerRoot, "server/image-edit-provider.mjs")));
const directory = process.argv[2];
if (!directory) throw new Error("Output directory required");
await mkdir(directory, { recursive: true });
const source = await sharp(Buffer.from(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg"><stop stop-color="#102447"/><stop offset="1" stop-color="#224963"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/><circle cx="850" cy="180" r="260" fill="#476c84" opacity=".4"/><path d="M0 760 Q420 540 1024 770" fill="none" stroke="#65b7ad" stroke-width="3"/><text x="96" y="160" font-family="sans-serif" font-size="26" fill="#9cebdc">ONSHOW MUSIC</text><text x="96" y="350" font-family="Noto Serif CJK SC,serif" font-weight="700" font-size="84" fill="#edbf73">春日音乐会</text><text x="96" y="470" font-family="Noto Sans CJK SC,sans-serif" font-size="38" fill="#ffffff">周六晚上八点</text><text x="96" y="910" font-family="sans-serif" font-size="24" fill="#9cebdc">LIVE MUSIC · CITY STAGE</text></svg>`)).png().toBuffer();
const screenshot = process.argv[3] === "screenshot";
const fixture = screenshot ? await sharp(Buffer.from(`<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="800" fill="#f3f5f9"/><rect width="1200" height="96" fill="#172c48"/><text x="56" y="62" font-family="sans-serif" font-size="28" fill="white">OneShowTools</text><rect x="48" y="140" width="1104" height="550" rx="18" fill="white"/><text x="88" y="226" font-family="Noto Sans CJK SC,sans-serif" font-size="44" fill="#172c48">会议纪要</text><path d="M88 268 H1112 M88 398 H1112 M88 528 H1112" stroke="#dce3ee" stroke-width="2"/><text x="88" y="350" font-family="Noto Sans CJK SC,sans-serif" font-size="28" fill="#586579">任务进度</text><text x="820" y="350" font-family="Noto Sans CJK SC,sans-serif" font-size="32" fill="#19835e">已完成</text><text x="88" y="480" font-family="Noto Sans CJK SC,sans-serif" font-size="28" fill="#586579">文件数量</text><text x="820" y="480" font-family="sans-serif" font-size="32" fill="#172c48">12</text></svg>`)).png().toBuffer() : source;
await writeFile(resolve(directory, "original.png"), fixture);
const edits = screenshot ? [{ originalText: "会议纪要", currentText: "项目总结", bbox: { x: 82, y: 170, width: 220, height: 65 } }, { originalText: "已完成", currentText: "待处理", bbox: { x: 813, y: 307, width: 116, height: 55 } }] : [{ originalText: "春日音乐会", currentText: "夏日音乐会", bbox: { x: 88, y: 260, width: 465, height: 110 } }, { originalText: "周六晚上八点", currentText: "周日晚上七点", bbox: { x: 90, y: 421, width: 280, height: 61 } }];
let attempt = 0;
const result = await generatePreservedTextImage({ source: fixture, edits,
  generate: async (request) => { const output = await editPlatformImage(request); await writeFile(resolve(directory, `candidate-${++attempt}.png`), output.buffer); return output; },
  recognize: async (request) => { const words = await recognizePlatformImageText(request); console.log(JSON.stringify({ recognized: words.map((item) => item.text) })); return words; },
  onProgress: (phase) => console.log(phase) });
await writeFile(resolve(directory, "result.png"), result.buffer);
console.log(JSON.stringify({ ok: true, attempts: result.attempts, textVerified: result.textVerified, output: directory }));
