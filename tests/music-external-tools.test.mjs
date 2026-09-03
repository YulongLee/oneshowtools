import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/MusicStudio.jsx", import.meta.url), "utf8");

test("music studio exposes a clearly labeled external tools directory", () => {
  assert.match(source, /otherToolsTab: "更多音乐工具"/);
  assert.match(source, /https:\/\/suno\.com\//);
  assert.match(source, /https:\/\/www\.udio\.com\//);
  assert.match(source, /https:\/\/stableaudio\.com\//);
  assert.match(source, /target="_blank" rel="noopener noreferrer nofollow"/);
  assert.match(source, /第三方服务/);
});
