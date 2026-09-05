import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { composeProtectedResult, editRegions, generatePreservedTextImage } from "../server/image-text-preservation.mjs";

const edits = [{ originalText: "Spring", currentText: "Summer", bbox: { x: 30, y: 30, width: 90, height: 30 } }, { originalText: "2025", currentText: "2026", bbox: { x: 150, y: 110, width: 80, height: 30 } }];
const image = (background, width = 300, height = 200) => sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
test("all pixels outside both replacement regions remain exactly the original", async () => {
  const source = await image("#aabbcc");
  const candidate = await sharp(source).composite(edits.map((e) => ({ input: Buffer.from(`<svg width="${e.bbox.width}" height="${e.bbox.height}"><rect x="4" y="5" width="20" height="16" fill="#113355"/></svg>`), left: e.bbox.x, top: e.bbox.y }))).png().toBuffer();
  const result = await composeProtectedResult(source, candidate, edits);
  const raw = await sharp(result).removeAlpha().raw().toBuffer();
  const regions = editRegions(edits, 300, 200);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 300; x++) {
    if (!regions.some((r) => x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height)) assert.deepEqual([...raw.subarray((y * 300 + x) * 3, (y * 300 + x) * 3 + 3)], [170, 187, 204]);
  }
  for (const e of edits) assert.deepEqual([...raw.subarray(((e.bbox.y + 5) * 300 + e.bbox.x + 5) * 3, ((e.bbox.y + 5) * 300 + e.bbox.x + 5) * 3 + 3)], [17, 51, 85]);
});
test("a missed second replacement rejects the complete result after one bounded retry", async () => {
  const source = await image("#aabbcc"); let calls = 0; let reads = 0;
  await assert.rejects(generatePreservedTextImage({ source, edits,
    generate: async (input) => { calls++; assert.deepEqual(input.buffer, source); return { buffer: source }; },
    recognize: async () => [{ text: reads++ % 2 ? "2025" : "Summer" }],
  }), { code: "IMAGE_TEXT_QUALITY_REJECTED" });
  assert.equal(calls, 2); assert.equal(reads, 4);
});
test("provider failure is propagated without manufacturing a blurred successful image", async () => {
  let reads = 0;
  await assert.rejects(generatePreservedTextImage({ source: await image("white"), edits,
    generate: async () => { throw Object.assign(new Error("unavailable"), { code: "IMAGE_PROVIDER_UNAVAILABLE" }); },
    recognize: async () => { reads++; return []; },
  }), { code: "IMAGE_PROVIDER_UNAVAILABLE" });
  assert.equal(reads, 0);
});
test("changed aspect ratio cannot be silently stretched into the original", async () => {
  await assert.rejects(composeProtectedResult(await image("white"), await image("black", 200, 300), edits), { code: "IMAGE_TEXT_LAYOUT_CHANGED" });
});
test("new model-added rectangular outlines are rejected", async () => {
  const source = await image("#112233");
  const framed = await sharp(source).composite([{ input: Buffer.from('<svg width="300" height="200"><rect x="30" y="30" width="90" height="30" fill="none" stroke="#ffff00" stroke-width="3"/></svg>') }]).png().toBuffer();
  await assert.rejects(composeProtectedResult(source, framed, edits), { code: "IMAGE_TEXT_LAYOUT_CHANGED" });
});
test("subtle generated background noise does not create rectangular patches", async () => {
  const source = await image("#112233");
  const result = await composeProtectedResult(source, await image("#18293a"), edits);
  assert.deepEqual(await sharp(result).removeAlpha().raw().toBuffer(), await sharp(source).raw().toBuffer());
});
