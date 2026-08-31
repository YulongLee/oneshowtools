import test from "node:test";
import assert from "node:assert/strict";
import { publicTaskInput } from "../server/task-presentation.mjs";

test("music task presentation never exposes internal prompts or provider references", () => {
  const result = publicTaskInput({
    title: "热舞",
    idea: "节奏明快的舞曲",
    prompt: "Internal orchestration prompt. Do not imitate an artist.",
    coverFeatureId: "private-feature-id",
    referenceFileId: "private-file-id",
    genre: "流行",
  }, "ai-music-studio");
  assert.deepEqual(result, { title: "热舞", idea: "节奏明快的舞曲", genre: "流行" });
  assert.doesNotMatch(JSON.stringify(result), /Internal orchestration|private-/);
});

test("non-music task input remains available to its own product workspace", () => {
  const input = { text: "润色这段文案", tone: "professional" };
  assert.equal(publicTaskInput(input, "copy-polish"), input);
});
