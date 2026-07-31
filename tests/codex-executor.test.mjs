import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  codexExecutorConfig,
  createCodexExecutor,
} from "../server/codex-executor.mjs";

const workspaceRoot = await mkdtemp(join(tmpdir(), "oneshow-codex-test-"));
const toolWorkspace = join(workspaceRoot, "tool-a");
await mkdir(toolWorkspace);

const baseEnv = {
  CODEX_EXECUTOR_ENABLED: "true",
  DASHSCOPE_API_KEY: "server-only-test-key",
  DASHSCOPE_BASE_URL: "https://dashscope.example.test/compatible-mode/v1",
  CODEX_WORKSPACE_ROOT: workspaceRoot,
  CODEX_MODEL: "test-codex-model",
  CODEX_EXECUTOR_TIMEOUT_MS: "1000",
  PATH: process.env.PATH,
};

test("Codex executor is opt-in and does not expose configuration details", () => {
  const executor = createCodexExecutor({ env: {} });
  assert.deepEqual(executor.status(), {
    enabled: false,
    configured: false,
    ready: false,
  });
  const config = codexExecutorConfig({ CODEX_REASONING_EFFORT: "unsupported" });
  assert.equal(config.modelReasoningEffort, "medium");
  assert.equal(config.model, "qwen3.6-flash");
});

test("Codex executor runs inside the allowed workspace with a redacted result", async () => {
  let constructorOptions;
  let threadOptions;
  class FakeCodex {
    constructor(options) {
      constructorOptions = options;
    }

    startThread(options) {
      threadOptions = options;
      return {
        id: "thread-test",
        async run(prompt) {
          assert.equal(prompt, "Build the tool");
          return {
            finalResponse: "Implemented",
            items: [
              {
                type: "file_change",
                changes: [{ path: "src/tool.js", kind: "update" }],
              },
            ],
            usage: {
              input_tokens: 10,
              cached_input_tokens: 2,
              cache_write_input_tokens: 0,
              output_tokens: 4,
              reasoning_output_tokens: 1,
            },
          };
        },
      };
    }
  }

  const executor = createCodexExecutor({ CodexClass: FakeCodex, env: baseEnv });
  const result = await executor.run({
    prompt: "Build the tool",
    workingDirectory: toolWorkspace,
  });

  assert.equal(constructorOptions.apiKey, "server-only-test-key");
  assert.equal(
    constructorOptions.baseUrl,
    "https://dashscope.example.test/compatible-mode/v1",
  );
  assert.equal(constructorOptions.env.OPENAI_API_KEY, undefined);
  assert.equal(constructorOptions.env.DASHSCOPE_API_KEY, undefined);
  assert.equal(threadOptions.sandboxMode, "workspace-write");
  assert.equal(threadOptions.networkAccessEnabled, false);
  assert.equal(threadOptions.webSearchMode, "disabled");
  assert.equal(threadOptions.model, "test-codex-model");
  assert.deepEqual(result.changedFiles, ["src/tool.js"]);
  assert.doesNotMatch(JSON.stringify(result), /server-only-test-key|test-codex-model/);
});

test("Codex executor rejects workspaces outside its configured root", async () => {
  const outside = await mkdtemp(join(tmpdir(), "oneshow-codex-outside-"));
  const executor = createCodexExecutor({
    CodexClass: class {},
    env: baseEnv,
  });
  await assert.rejects(
    executor.run({ prompt: "Inspect", workingDirectory: outside }),
    { code: "CODEX_WORKSPACE_OUTSIDE_ALLOWED_ROOT" },
  );
});

test("Codex executor stays unavailable until explicitly enabled and configured", async () => {
  const disabled = createCodexExecutor({
    CodexClass: class {},
    env: { DASHSCOPE_API_KEY: "present", CODEX_WORKSPACE_ROOT: workspaceRoot },
  });
  await assert.rejects(disabled.run({ prompt: "Inspect" }), {
    code: "CODEX_EXECUTOR_DISABLED",
  });

  const missingKey = createCodexExecutor({
    CodexClass: class {},
    env: { CODEX_EXECUTOR_ENABLED: "true", CODEX_WORKSPACE_ROOT: workspaceRoot },
  });
  await assert.rejects(missingKey.run({ prompt: "Inspect" }), {
    code: "DASHSCOPE_API_KEY_REQUIRED",
  });
});

test("Codex executor accepts the supplied OfferSteady DashScope aliases", () => {
  const config = codexExecutorConfig({
    OFFERSTEADY_DASHSCOPE_API_KEY: "offersteady-key",
    OFFERSTEADY_CHAT_QWEN_BASE_URL: "https://dashscope.example.test/compatible-mode/v1",
    OFFERSTEADY_CHAT_MODEL: "qwen3.6-flash",
  });
  assert.equal(config.configured, true);
  assert.equal(config.model, "qwen3.6-flash");
  assert.equal(
    config.baseUrl,
    "https://dashscope.example.test/compatible-mode/v1",
  );
});
