import assert from "node:assert/strict";
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
