import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { processTierList } from "../server/tier-list-generator.mjs";

const imageFile = async (name, color) => new File([
  await sharp({ create: { width: 160, height: 160, channels: 3, background: color } }).png().toBuffer(),
], name, { type: "image/png" });

test("tier list generator renders assigned images into a portrait PNG", async () => {
  const form = new FormData();
  form.append("files", await imageFile("red.png", "#ff0000"));
  form.append("files", await imageFile("blue.png", "#0066ff"));
  form.append("title", "奶茶品牌大比拼");
  form.append("layout", "portrait");
  form.append("template", "aurora");
  form.append("tiers", JSON.stringify([
    { id: "hang", name: "夯", color: "#ef4444" },
    { id: "pull", name: "拉完了", color: "#4f6de8" },
  ]));
  form.append("assignments", JSON.stringify([
    { tierId: "hang", fileIndex: 0, order: 0 },
    { tierId: "pull", fileIndex: 1, order: 0 },
  ]));

  const result = await processTierList(form);
  const metadata = await sharp(result.buffer).metadata();
  assert.equal(result.mimeType, "image/png");
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1920);
  assert.equal(result.output.tierCount, 2);
  assert.equal(result.output.itemCount, 2);
});

test("tier list generator rejects more than ten levels", async () => {
  const form = new FormData();
  form.append("tiers", JSON.stringify(Array.from({ length: 11 }, (_, index) => ({ id: `t${index}`, name: `T${index}`, color: "#6757f5" }))));
  await assert.rejects(() => processTierList(form), (error) => error.code === "TIER_LIST_LEVEL_COUNT_INVALID");
});

test("empty tier rows stay visually clean without instructional copy", async () => {
  const source = await readFile(new URL("../src/TierListGenerator.jsx", import.meta.url), "utf8");
  assert.equal(source.includes("把下方素材拖到这里"), false);
  assert.equal(source.includes("横版 (16:9)"), false);
});

test("retired landscape exports fall back to the visible portrait format", async () => {
  const form = new FormData();
  form.append("layout", "landscape");
  form.append("tiers", JSON.stringify([
    { id: "hang", name: "夯", color: "#ef4444" },
    { id: "pull", name: "拉完了", color: "#4f6de8" },
  ]));
  form.append("assignments", "[]");

  const result = await processTierList(form);
  assert.equal(result.output.layout, "portrait");
  assert.equal(result.output.width, 1080);
  assert.equal(result.output.height, 1920);
});
