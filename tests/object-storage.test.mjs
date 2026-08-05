import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-storage-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost:5173";

const {
  deleteStoredFile,
  objectKeyFor,
  objectStorageConfig,
  objectStorageConfiguration,
  putStoredFile,
  readStoredFile,
  saveObjectStorageConfiguration,
  testObjectStorageConfiguration,
} = await import(`../server/object-storage.mjs?storage=${Date.now()}`);

function fakeOssFactory() {
  const objects = new Map();
  return () => ({
    async put(key, content) { objects.set(key, Buffer.from(content)); return { etag: "test-etag" }; },
    async get(key) { return { content: Buffer.from(objects.get(key) || "") }; },
    async delete(key) { objects.delete(key); },
  });
}

test("OSS aliases produce an isolated owner-scoped object key without exposing secrets", () => {
  const env = {
    OFFERSTEADY_OSS_ACCESS_KEY_ID: "test-access-id",
    OFFERSTEADY_OSS_ACCESS_KEY_SECRET: "test-access-secret",
    OFFERSTEADY_OSS_BUCKET: "private-bucket",
    OFFERSTEADY_OSS_ENDPOINT: "https://oss-cn-hangzhou.aliyuncs.com",
    OFFERSTEADY_OSS_REGION: "cn-hangzhou",
    OFFERSTEADY_OSS_KEY_PREFIX: "oneshowtools/private-files",
  };
  const config = objectStorageConfig(env);
  assert.equal(config.configured, true);
  assert.equal(objectKeyFor("user:one", "file-id", "report.pdf", env), "oneshowtools/private-files/users/user-one/file-id.pdf");
  const publicStatus = { provider: "oss", bucket: config.bucket, region: config.region, prefix: config.prefix };
  assert.doesNotMatch(JSON.stringify(publicStatus), /test-access-secret|test-access-id/);
});

test("local compatibility storage writes, reads, and removes only the requested object", async () => {
  const id = randomUUID();
  const stored = await putStoredFile({
    userId: randomUUID(), fileId: id, fileName: "note.txt", mimeType: "text/plain",
    buffer: Buffer.from("storage-roundtrip"), env: {},
  });
  assert.equal(stored.provider, "local");
  assert.equal((await readStoredFile({ ...stored, env: {} })).toString(), "storage-roundtrip");
  await deleteStoredFile({ ...stored, env: {} });
  await assert.rejects(() => readStoredFile({ ...stored, env: {} }), /ENOENT/);
});

test("administrator storage configuration is tested, encrypted, redacted, and becomes the runtime source", async () => {
  const draft = {
    bucket: "projects-yulong",
    endpoint: "https://oss-cn-shanghai.aliyuncs.com",
    region: "cn-shanghai",
    prefix: "oneshowtools",
    accessKeyId: "local-test-access-id",
    accessKeySecret: "local-test-access-secret",
    status: "active",
  };
  const factory = fakeOssFactory();
  const tested = await testObjectStorageConfiguration(draft, factory);
  assert.equal(tested.status, "healthy");
  const saved = await saveObjectStorageConfiguration(draft, "admin-test", factory);
  assert.equal(saved.source, "admin");
  assert.equal(saved.enabled, true);
  assert.equal(saved.prefix, "oneshowtools");
  assert.doesNotMatch(JSON.stringify(saved), /local-test-access-id|local-test-access-secret/);
  assert.match(saved.accessKeyIdHint, /s-id$/);
  const runtime = objectStorageConfig();
  assert.equal(runtime.source, "admin");
  assert.equal(runtime.accessKeyId, draft.accessKeyId);
  assert.equal(objectStorageConfiguration().lastTestStatus, "healthy");
});

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
