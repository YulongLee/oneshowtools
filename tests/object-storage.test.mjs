import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-storage-"));
process.env.DATA_DIR = dataDirectory;

const {
  deleteStoredFile,
  objectKeyFor,
  objectStorageConfig,
  putStoredFile,
  readStoredFile,
} = await import(`../server/object-storage.mjs?storage=${Date.now()}`);

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

test.after(() => rm(dataDirectory, { recursive: true, force: true }));
