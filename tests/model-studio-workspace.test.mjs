import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "oneshowtools-model-studio-workspace-"));
process.env.APP_URL = "http://localhost";
process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const workspaceModule = await import(`../server/model-studio-workspace.mjs?test=${Date.now()}`);
const imageModule = await import(`../server/image-edit-provider.mjs?test=${Date.now()}`);
const imageGenerationModule = await import(`../server/image-provider.mjs?test=${Date.now()}`);
const { db } = await import("../server/database.mjs");

let probeCalls = 0;
const probeFetch = async (url, options) => {
  probeCalls += 1;
  assert.equal(String(url), "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation");
  assert.equal(options.headers.authorization, "Bearer sk-ws-workspace-secret");
  assert.equal(options.headers["X-DashScope-WorkSpace"], "ws-enno3y3wsyqun34w");
  return new Response(JSON.stringify({ code: "InvalidParameter", message: "Model not exist." }), { status: 400, headers: { "content-type": "application/json" } });
};

test("Model Studio workspace is tested without generation, encrypted, and saved without a second request", async () => {
  const draft = { name: "默认百炼", region: "cn-beijing", workspaceId: "ws-enno3y3wsyqun34w", endpointMode: "public", apiKey: "DASHSCOPE_API_KEY=\"sk-ws-workspace-secret\"", status: "active" };
  const tested = await workspaceModule.testModelStudioWorkspaceConfiguration(draft, probeFetch);
  assert.equal(tested.status, "healthy");
  const saved = await workspaceModule.saveModelStudioWorkspaceConfiguration(draft, "admin-test", probeFetch);
  assert.equal(probeCalls, 1);
  assert.equal(saved.configured, true);
  assert.equal(saved.baseUrl, "https://dashscope.aliyuncs.com/api/v1");
  assert.equal(saved.keyHint, "••••cret");
  assert.doesNotMatch(JSON.stringify(saved), /workspace-secret/);
  const stored = db.prepare("SELECT * FROM model_studio_workspace_configs WHERE id='default'").get();
  assert.notEqual(stored.key_ciphertext, "sk-ws-workspace-secret");
  const inheritedOcr = db.prepare("SELECT model_id,credential_source,status FROM image_provider_configs WHERE purpose='image_text_ocr'").get();
  assert.equal(inheritedOcr.model_id, "qwen-vl-ocr-latest");
  assert.equal(inheritedOcr.credential_source, "workspace");
  assert.equal(inheritedOcr.status, "active");
});

test("image editing can inherit the encrypted default workspace connection", async () => {
  const resultPng = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#fff" } }).png().toBuffer();
  const providerFetch = async (url, options) => {
    if (String(url) === "https://provider.example/result.png") return new Response(resultPng, { status: 200 });
    assert.equal(options.headers.authorization, "Bearer sk-ws-workspace-secret");
    assert.equal(options.headers["X-DashScope-WorkSpace"], "ws-enno3y3wsyqun34w");
    return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://provider.example/result.png" }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const saved = await imageModule.saveImageEditProviderConfiguration("image_editing", {
    credentialSource: "workspace", modelId: "qwen-image-2.0", creditCost: 30, status: "active",
  }, "admin-test", providerFetch);
  assert.equal(saved.credentialSource, "workspace");
  assert.equal(saved.keyHint, "••••cret");
  const stored = db.prepare("SELECT credential_source,key_ciphertext FROM image_provider_configs WHERE purpose='image_editing'").get();
  assert.equal(stored.credential_source, "workspace");
  assert.doesNotMatch(stored.key_ciphertext, /workspace-secret/);
});

test("image text OCR can inherit the workspace key and return positioned text", async () => {
  let calls = 0;
  const providerFetch = async (url, options) => {
    calls += 1;
    assert.equal(String(url), "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation");
    assert.equal(options.headers.authorization, "Bearer sk-ws-workspace-secret");
    assert.equal(options.headers["X-DashScope-WorkSpace"], "ws-enno3y3wsyqun34w");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "qwen-vl-ocr-latest");
    return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ text: '```json\n[{"text":"TEST 123","bbox":[80,190,390,280],"confidence":0.98,"rotation":0,"style":{"fontFamily":"sans","fontSize":72,"color":"#111827","bold":true,"align":"left"}}]\n```' }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const saved = await imageModule.saveImageEditProviderConfiguration("image_text_ocr", {
    credentialSource: "workspace", modelId: "qwen-vl-ocr-latest", creditCost: 1, status: "active",
  }, "admin-test", providerFetch);
  assert.equal(saved.credentialSource, "workspace");
  assert.equal(saved.modelId, "qwen-vl-ocr-latest");
  const sample = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#fff" } }).png().toBuffer();
  const detections = await imageModule.recognizePlatformImageText({ buffer: sample, fetchImpl: providerFetch });
  assert.equal(calls, 2);
  assert.equal(detections[0].text, "TEST 123");
  assert.deepEqual(detections[0].bbox, { x: 80, y: 190, width: 310, height: 90 });
  assert.equal(detections[0].style.color, "#111827");
});

test("a provider model permission denial is not misreported as an invalid API key", async () => {
  await assert.rejects(
    imageModule.testImageEditProviderConfiguration("image_editing", {
      credentialSource: "workspace", modelId: "qwen-image-2.0", creditCost: 30, status: "active",
    }, async () => new Response(JSON.stringify({ code: "Model.AccessDenied", message: "Model access denied." }), {
      status: 403, headers: { "content-type": "application/json" },
    })),
    (error) => error?.code === "IMAGE_PROVIDER_MODEL_UNAVAILABLE",
  );
});

test("image generation can inherit the workspace connection without duplicating its API key", async () => {
  const resultPng = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#345cff" } }).png().toBuffer();
  const providerFetch = async (url, options) => {
    if (String(url) === "https://provider.example/generated.png") return new Response(resultPng, { status: 200 });
    assert.equal(String(url), "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation");
    assert.equal(options.headers.authorization, "Bearer sk-ws-workspace-secret");
    return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://provider.example/generated.png" }] } }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const saved = await imageGenerationModule.saveImageProviderConfiguration({
    credentialSource: "workspace", modelId: "qwen-image-2.0", creditCost: 10, status: "active",
  }, "admin-test", providerFetch);
  assert.equal(saved.credentialSource, "workspace");
  assert.equal(saved.adapter, "dashscope");
  assert.equal(saved.keyHint, "••••cret");
  const stored = db.prepare("SELECT credential_source,key_ciphertext FROM image_provider_configs WHERE purpose='music_cover'").get();
  assert.equal(stored.credential_source, "workspace");
  assert.doesNotMatch(stored.key_ciphertext, /workspace-secret/);
});
