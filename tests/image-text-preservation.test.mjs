import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { composeProtectedResult, editRegions, generatePreservedTextImage, verifyReplacementText, textInsideRegion, retryContext, replacementPrompt } from "../server/image-text-preservation.mjs";

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
    generate: async (input) => { calls++; if (calls === 1) assert.deepEqual(input.buffer, source); return { buffer: input.buffer }; },
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

test("OCR ignores neighboring lines and restores spatial reading order", () => {
  const word = (text, x, y) => ({ text, bbox: { x, y, width: 18, height: 10 } });
  assert.equal(textInsideRegion([word("旁边", 80, 40), word("界", 40, 11), word("世", 20, 10)], { x: 10, y: 9, width: 60, height: 15 }), "世界");
});

test("three regions verify concurrently but concurrency never exceeds three", async () => {
  let active = 0, maximum = 0, calls = 0;
  await verifyReplacementText(await image("white"), Array.from({ length: 8 }, () => ({ ...edits[0], currentText: "OK" })), async () => {
    active++; maximum = Math.max(maximum, active); calls++;
    await new Promise((resolve) => setTimeout(resolve, 25)); active--;
    return [{ text: "OK" }];
  });
  assert.equal(maximum, 3); assert.equal(calls, 8); assert.equal(active, 0);
});

test("all mismatching regions are reported, not just the first", async () => {
  await assert.rejects(verifyReplacementText(await image("white"), edits, async () => [{ text: "wrong" }]), (cause) => {
    assert.deepEqual(cause.mismatches.map((item) => item.regionIndex), [0, 1]); return true;
  });
});

test("punctuation and digits still require an exact match", async () => {
  await assert.rejects(verifyReplacementText(await image("white"), [{ ...edits[0], currentText: "2026!" }], async () => [{ text: "2026" }]), { code: "IMAGE_TEXT_QUALITY_REJECTED" });
});

test("empty OCR is a quality failure, while service errors are not disguised as wrong text", async () => {
  await assert.rejects(verifyReplacementText(await image("white"), edits, async () => { throw Object.assign(new Error(), { code: "IMAGE_TEXT_OCR_EMPTY" }); }), { code: "IMAGE_TEXT_QUALITY_REJECTED" });
  await assert.rejects(verifyReplacementText(await image("white"), edits, async () => { throw Object.assign(new Error(), { code: "IMAGE_PROVIDER_RATE_LIMITED" }); }), { code: "IMAGE_PROVIDER_RATE_LIMITED" });
});

test("regional retry retains correct regions and rechecks the whole final result", async () => {
  const source = await image("#aabbcc"); let calls = 0, reads = 0;
  const first = await sharp(source).composite([{ input: Buffer.from('<svg width="300" height="200"><rect x="40" y="40" width="12" height="12" fill="#123456"/></svg>') }]).png().toBuffer();
  const events = [];
  const result = await generatePreservedTextImage({ source, edits, onDiagnostic: (event) => events.push(event),
    generate: async (request) => {
      if (++calls === 1) return { buffer: first };
      assert.ok(request.prompt.includes('"2026"')); assert.ok(!request.prompt.includes('Summer'));
      const context = retryContext(edits[1].bbox, 300, 200);
      const scale = Math.min(2048 / Math.max(context.width, context.height), Math.max(1, 512 / Math.min(context.width, context.height)));
      assert.deepEqual(request.buffer, await sharp(source).extract(context).resize(Math.round(context.width * scale), Math.round(context.height * scale)).png().toBuffer());
      return { buffer: request.buffer };
    },
    recognize: async () => [{ text: ["Summer", "2025", "Summer", "2026"][reads++] }],
  });
  assert.equal(calls, 2); assert.equal(reads, 4);
  assert.equal(events.find((event) => event.attempt === 2 && event.phase === "generation").mode, "regional");
  const raw = await sharp(result.buffer).removeAlpha().raw().toBuffer();
  assert.deepEqual([...raw.subarray((42 * 300 + 42) * 3, (42 * 300 + 42) * 3 + 3)], [18, 52, 86]);
});

test("retry context remains in bounds at every image corner", () => {
  for (const x of [0, 260]) for (const y of [0, 180]) {
    const context = retryContext({ x, y, width: 40, height: 20 }, 300, 200);
    assert.ok(context.left >= 0 && context.top >= 0 && context.left + context.width <= 300 && context.top + context.height <= 200);
    assert.ok(context.left <= x && context.left + context.width >= x + 40);
  }
});

test("longer replacements explicitly retain added numbers and punctuation", () => {
  const prompt = replacementPrompt([{ ...edits[0], currentText: "Summer1!" }], 300, 200);
  assert.ok(prompt.includes('Summer1!')); assert.ok(prompt.includes('新增数字和标点必须保留'));
});
