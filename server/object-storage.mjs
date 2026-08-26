import OSS from "ali-oss";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { db, uploadDirectory } from "./database.mjs";

const provider = "aliyun_oss";
const storageError = (code, status = 502) => Object.assign(new Error(code), { code, status });

function value(env, ...names) {
  for (const name of names) if (String(env[name] || "").trim()) return String(env[name]).trim();
  return "";
}

function normalizedPrefix(raw) {
  const prefix = String(raw || "oneshowtools").replace(/^\/+|\/+$/g, "").replace(/[^A-Za-z0-9/_-]/g, "-");
  return prefix || "oneshowtools";
}

function credentialKey() {
  const source = String(
    process.env.OBJECT_STORAGE_CREDENTIAL_ENCRYPTION_KEY
      || process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY
      || (String(process.env.APP_URL || "").startsWith("https://") ? "" : "oneshowtools-local-object-storage-key"),
  ).trim();
  if (!source) throw storageError("OBJECT_STORAGE_CREDENTIAL_KEY_REQUIRED", 503);
  if (/^[a-f\d]{64}$/i.test(source)) return Buffer.from(source, "hex");
  try {
    const decoded = Buffer.from(source, "base64");
    if (decoded.length === 32) return decoded;
  } catch { /* handled by the deterministic development fallback below */ }
  if (String(process.env.APP_URL || "").startsWith("https://")) {
    throw storageError("OBJECT_STORAGE_CREDENTIAL_KEY_INVALID", 503);
  }
  return createHash("sha256").update(source).digest();
}

function aad(field, version) {
  return Buffer.from(`oneshowtools:object-storage:${provider}:${field}:${version}`);
}

function encryptCredential(plainText, field, version) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey(), iv);
  cipher.setAAD(aad(field, version));
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptCredential(row, field) {
  const prefix = field === "access_id" ? "access_id" : "secret";
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(row[`${prefix}_iv`], "base64"));
  decipher.setAAD(aad(field, row.credential_version));
  decipher.setAuthTag(Buffer.from(row[`${prefix}_tag`], "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row[`${prefix}_ciphertext`], "base64")), decipher.final(),
  ]).toString("utf8");
}

function storedRow() {
  return db.prepare("SELECT * FROM object_storage_configs WHERE provider = ?").get(provider);
}

function environmentConfig(env) {
  const config = {
    accessKeyId: value(env, "OSS_ACCESS_KEY_ID", "OFFERSTEADY_OSS_ACCESS_KEY_ID"),
    accessKeySecret: value(env, "OSS_ACCESS_KEY_SECRET", "OFFERSTEADY_OSS_ACCESS_KEY_SECRET"),
    bucket: value(env, "OSS_BUCKET", "OFFERSTEADY_OSS_BUCKET"),
    endpoint: value(env, "OSS_ENDPOINT", "OFFERSTEADY_OSS_ENDPOINT"),
    region: value(env, "OSS_REGION", "OFFERSTEADY_OSS_REGION"),
    prefix: normalizedPrefix(value(env, "OSS_KEY_PREFIX", "OFFERSTEADY_OSS_KEY_PREFIX") || "oneshowtools"),
    source: "environment",
    enabled: true,
  };
  return { ...config, configured: Boolean(config.accessKeyId && config.accessKeySecret && config.bucket && config.endpoint && config.region) };
}

export function objectStorageConfig(env = process.env) {
  if (env === process.env) {
    const row = storedRow();
    if (row) {
      const enabled = row.status === "active";
      return {
        accessKeyId: enabled ? decryptCredential(row, "access_id") : "",
        accessKeySecret: enabled ? decryptCredential(row, "secret") : "",
        bucket: row.bucket,
        endpoint: row.endpoint,
        region: row.region,
        prefix: normalizedPrefix(row.key_prefix),
        source: "admin",
        enabled,
        configured: enabled,
      };
    }
  }
  return environmentConfig(env);
}

function createClient(config, clientFactory = (options) => new OSS(options)) {
  if (!config.configured) throw storageError("OSS_STORAGE_NOT_CONFIGURED", 503);
  return clientFactory({
    region: config.region,
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    authorizationV4: true,
    secure: true,
    // Desktop installers and other generated assets can be hundreds of MB.
    // Keep the request alive long enough for slower cross-region uploads.
    timeout: 300_000,
  });
}

function client(env = process.env) {
  return createClient(objectStorageConfig(env));
}

function safeObjectKey(key, env = process.env) {
  const prefix = `${objectStorageConfig(env).prefix}/`;
  const normalized = String(key || "").replace(/^\/+/, "");
  if (!normalized.startsWith(prefix) || normalized.includes("..")) throw storageError("OSS_OBJECT_SCOPE_INVALID", 400);
  return normalized;
}

// Existing objects keep the prefix that was active when they were uploaded.
// Reading/deleting them must therefore validate the persisted owner-scoped key,
// rather than comparing it with today's configurable prefix.
export function safePersistedObjectKey(key, storageName = "") {
  const normalized = String(key || "").replace(/^\/+/, "");
  const segments = normalized.split("/");
  const namespaceIndex = segments.findIndex((segment) => segment === "users" || segment === "platform");
  const expectedName = String(storageName || "");
  if (
    !normalized
    || normalized.includes("..")
    || normalized.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(normalized)
    || namespaceIndex < 1
    || segments.some((segment) => !segment)
    || (expectedName && segments.at(-1) !== expectedName)
  ) throw storageError("OSS_OBJECT_SCOPE_INVALID", 400);
  return normalized;
}

function storageName(fileId, fileName) {
  const extension = extname(basename(fileName || "")).slice(0, 12).replace(/[^.A-Za-z0-9_-]/g, "");
  return `${fileId}${extension}`;
}

function hint(secret) {
  const text = String(secret || "");
  return text ? `••••${text.slice(-4)}` : null;
}

function publicConfiguration(row = storedRow(), env = process.env) {
  if (row) {
    return {
      provider: row.status === "active" ? "oss" : "local",
      providerName: provider,
      source: "admin",
      configured: true,
      enabled: row.status === "active",
      bucket: row.bucket,
      endpoint: row.endpoint,
      region: row.region,
      prefix: row.key_prefix,
      accessKeyIdHint: row.access_id_hint,
      accessKeySecretHint: row.secret_hint,
      lastTestStatus: row.last_test_status,
      lastTestLatencyMs: row.last_test_latency_ms,
      lastTestedAt: row.last_tested_at,
      updatedAt: row.updated_at,
    };
  }
  const config = environmentConfig(env);
  return {
    provider: config.configured ? "oss" : "local",
    providerName: config.configured ? provider : "local",
    source: config.configured ? "environment" : "none",
    configured: config.configured,
    enabled: config.configured,
    bucket: config.configured ? config.bucket : null,
    endpoint: config.configured ? config.endpoint : null,
    region: config.configured ? config.region : null,
    prefix: config.prefix,
    accessKeyIdHint: config.configured ? hint(config.accessKeyId) : null,
    accessKeySecretHint: config.configured ? hint(config.accessKeySecret) : null,
    lastTestStatus: null,
    lastTestLatencyMs: null,
    lastTestedAt: null,
    updatedAt: null,
  };
}

function validatedDraft(data, row = storedRow()) {
  const accessKeyId = String(data.accessKeyId || "").trim() || (row ? decryptCredential(row, "access_id") : "");
  const accessKeySecret = String(data.accessKeySecret || "").trim() || (row ? decryptCredential(row, "secret") : "");
  const bucket = String(data.bucket || row?.bucket || "").trim();
  const endpoint = String(data.endpoint || row?.endpoint || "").trim().replace(/\/+$/, "");
  const region = String(data.region || row?.region || "").trim();
  const prefix = normalizedPrefix(data.prefix || row?.key_prefix || "oneshowtools");
  const status = data.status === "disabled" ? "disabled" : "active";
  if (!/^[a-z\d][a-z\d-]{1,61}[a-z\d]$/.test(bucket)) throw storageError("OSS_BUCKET_INVALID", 400);
  if (!/^[a-z\d][a-z\d-]{1,62}$/.test(region)) throw storageError("OSS_REGION_INVALID", 400);
  let parsed;
  try { parsed = new URL(endpoint); } catch { throw storageError("OSS_ENDPOINT_INVALID", 400); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw storageError("OSS_ENDPOINT_INVALID", 400);
  }
  if (!accessKeyId || !accessKeySecret) throw storageError("OSS_CREDENTIALS_REQUIRED", 400);
  return { accessKeyId, accessKeySecret, bucket, endpoint, region, prefix, status, configured: true };
}

export async function testObjectStorageConfiguration(data, clientFactory) {
  const config = validatedDraft(data);
  const instance = createClient(config, clientFactory);
  const objectKey = `${config.prefix}/_connection-tests/${randomUUID()}.txt`;
  const content = Buffer.from(`OneShowTools OSS connection test ${Date.now()}`);
  const started = Date.now();
  let written = false;
  try {
    await instance.put(objectKey, content, { headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-oss-object-acl": "private",
      "x-oss-forbid-overwrite": "true",
    } });
    written = true;
    const downloaded = await instance.get(objectKey);
    const received = Buffer.isBuffer(downloaded?.content) ? downloaded.content : Buffer.from(downloaded?.content || "");
    if (!received.equals(content)) throw storageError("OSS_TEST_CONTENT_MISMATCH", 502);
    // A storage connection is not healthy for File Center unless it can also
    // remove objects. Previously delete failures were silently ignored here.
    await instance.delete(objectKey);
    written = false;
    return { status: "healthy", latencyMs: Date.now() - started, testedAt: Date.now() };
  } catch (error) {
    if (error?.code?.startsWith?.("OSS_")) throw error;
    const failure = storageError("OSS_CONNECTION_TEST_FAILED", error?.status || 502);
    failure.details = String(error?.code || error?.message || "unknown").slice(0, 120);
    throw failure;
  } finally {
    if (written) await instance.delete(objectKey).catch(() => {});
  }
}

export async function saveObjectStorageConfiguration(data, actorUserId, clientFactory) {
  const existing = storedRow();
  const config = validatedDraft(data, existing);
  const test = await testObjectStorageConfiguration(config, clientFactory);
  const existingAccessId = existing ? decryptCredential(existing, "access_id") : "";
  const existingSecret = existing ? decryptCredential(existing, "secret") : "";
  const credentialsChanged = !existing || existingAccessId !== config.accessKeyId || existingSecret !== config.accessKeySecret;
  const version = existing ? existing.credential_version + (credentialsChanged ? 1 : 0) : 1;
  const encryptedAccessId = encryptCredential(config.accessKeyId, "access_id", version);
  const encryptedSecret = encryptCredential(config.accessKeySecret, "secret", version);
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO object_storage_configs
    (provider, bucket, endpoint, region, key_prefix, access_id_ciphertext, access_id_iv,
      access_id_tag, access_id_hint, secret_ciphertext, secret_iv, secret_tag, secret_hint,
      credential_version, status, last_test_status, last_test_latency_ms, last_tested_at,
      updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      bucket = excluded.bucket, endpoint = excluded.endpoint, region = excluded.region,
      key_prefix = excluded.key_prefix, access_id_ciphertext = excluded.access_id_ciphertext,
      access_id_iv = excluded.access_id_iv, access_id_tag = excluded.access_id_tag,
      access_id_hint = excluded.access_id_hint, secret_ciphertext = excluded.secret_ciphertext,
      secret_iv = excluded.secret_iv, secret_tag = excluded.secret_tag,
      secret_hint = excluded.secret_hint, credential_version = excluded.credential_version,
      status = excluded.status, last_test_status = excluded.last_test_status,
      last_test_latency_ms = excluded.last_test_latency_ms, last_tested_at = excluded.last_tested_at,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(
    provider, config.bucket, config.endpoint, config.region, config.prefix,
    encryptedAccessId.ciphertext, encryptedAccessId.iv, encryptedAccessId.tag, hint(config.accessKeyId),
    encryptedSecret.ciphertext, encryptedSecret.iv, encryptedSecret.tag, hint(config.accessKeySecret),
    version, config.status, test.latencyMs, test.testedAt, actorUserId || null,
    existing?.created_at || timestamp, timestamp,
  );
  return publicConfiguration();
}

export function objectStorageConfiguration() {
  return publicConfiguration();
}

export function objectKeyFor(userId, fileId, fileName, env = process.env) {
  const config = objectStorageConfig(env);
  const opaqueUser = String(userId || "unknown").replace(/[^A-Za-z0-9_-]/g, "-");
  return `${config.prefix}/users/${opaqueUser}/${storageName(fileId, fileName)}`;
}

export function platformAssetKey(scope, assetId, fileName, env = process.env) {
  const config = objectStorageConfig(env);
  const safeScope = String(scope || "assets").replace(/[^A-Za-z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "") || "assets";
  const safeAssetId = String(assetId || randomUUID()).replace(/[^A-Za-z0-9_-]/g, "-");
  return `${config.prefix}/platform/${safeScope}/${storageName(safeAssetId, fileName)}`;
}

const stockPetReleaseFiles = {
  windows: { suffix: "windows-setup.exe", mimeType: "application/vnd.microsoft.portable-executable" },
  macos: { suffix: "macos-universal.dmg", mimeType: "application/x-apple-diskimage" },
};

function safeReleaseVersion(version) {
  const normalized = String(version || "0.1.1").trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/.test(normalized)) {
    throw storageError("RELEASE_VERSION_INVALID", 400);
  }
  return normalized;
}

export function stockPetReleaseObject(platform, version = process.env.STOCK_PET_VERSION || "0.1.1", env = process.env) {
  const file = stockPetReleaseFiles[platform];
  if (!file) throw storageError("DOWNLOAD_PLATFORM_INVALID", 400);
  const releaseVersion = safeReleaseVersion(version);
  const fileName = `niu-lai-le-${releaseVersion}-${file.suffix}`;
  return {
    platform,
    version: releaseVersion,
    fileName,
    mimeType: file.mimeType,
    objectKey: `${objectStorageConfig(env).prefix}/releases/stock-pet/${releaseVersion}/${fileName}`,
  };
}

export async function putStockPetRelease({ platform, version, filePath, env = process.env }, clientFactory) {
  const release = stockPetReleaseObject(platform, version, env);
  const instance = createClient(objectStorageConfig(env), clientFactory);
  try {
    const headers = {
      "content-type": release.mimeType,
      "x-oss-object-acl": "private",
    };
    const file = await stat(filePath);
    const result = file.size >= 64 * 1024 * 1024 && typeof instance.multipartUpload === "function"
      ? await instance.multipartUpload(release.objectKey, filePath, {
        parallel: 4,
        partSize: 10 * 1024 * 1024,
        headers,
      })
      : await instance.put(release.objectKey, filePath, { headers });
    return { ...release, etag: result?.res?.headers?.etag || result?.etag || null };
  } catch (error) {
    const failure = storageError("OSS_RELEASE_UPLOAD_FAILED", error?.status || 502);
    failure.details = String(error?.code || error?.message || "unknown").slice(0, 120);
    throw failure;
  }
}

export async function signStockPetRelease(platform, {
  version = process.env.STOCK_PET_VERSION || "0.1.1",
  expires = 900,
  env = process.env,
} = {}, clientFactory) {
  const release = stockPetReleaseObject(platform, version, env);
  const ttl = Math.max(60, Math.min(Number(expires) || 900, 3600));
  const instance = createClient(objectStorageConfig(env), clientFactory);
  try {
    await instance.head(release.objectKey);
    const url = typeof instance.signatureUrlV4 === "function"
      ? await instance.signatureUrlV4("GET", ttl, {}, release.objectKey)
      : await instance.asyncSignatureUrl(release.objectKey, { expires: ttl });
    return { ...release, url, expiresAt: Date.now() + ttl * 1000 };
  } catch (error) {
    if (error?.status === 404 || error?.statusCode === 404 || error?.code === "NoSuchKey") {
      throw storageError("DOWNLOAD_NOT_CONFIGURED", 503);
    }
    if (error?.code?.startsWith?.("OSS_") || error?.code === "DOWNLOAD_NOT_CONFIGURED") throw error;
    const failure = storageError("OSS_RELEASE_DOWNLOAD_FAILED", error?.status || 502);
    failure.details = String(error?.code || error?.message || "unknown").slice(0, 120);
    throw failure;
  }
}

export async function putPlatformAsset({ scope, assetId, fileName, mimeType, buffer, env = process.env }) {
  const config = objectStorageConfig(env);
  const localName = storageName(assetId, fileName);
  if (!config.configured) {
    await writeFile(resolve(uploadDirectory, localName), buffer);
    return { provider: "local", storageName: localName, objectKey: localName, etag: null };
  }
  const objectKey = safeObjectKey(platformAssetKey(scope, assetId, fileName, env), env);
  try {
    const result = await client(env).put(objectKey, buffer, { headers: {
      "content-type": mimeType || "application/octet-stream",
      "x-oss-object-acl": "private",
      "x-oss-forbid-overwrite": "true",
    } });
    return { provider: "oss", storageName: localName, objectKey, etag: result?.res?.headers?.etag || result?.etag || null };
  } catch (error) {
    throw storageError(error?.code === "FileAlreadyExists" ? "OSS_OBJECT_COLLISION" : "OSS_UPLOAD_FAILED", 502);
  }
}

export async function putStoredFile({ userId, fileId, fileName, mimeType, buffer, env = process.env }) {
  const config = objectStorageConfig(env);
  const localName = storageName(fileId, fileName);
  if (!config.configured) {
    await writeFile(resolve(uploadDirectory, localName), buffer);
    return { provider: "local", storageName: localName, objectKey: localName, etag: null };
  }
  const objectKey = safeObjectKey(objectKeyFor(userId, fileId, fileName, env), env);
  try {
    const result = await client(env).put(objectKey, buffer, { headers: {
      "content-type": mimeType || "application/octet-stream",
      "x-oss-object-acl": "private",
      "x-oss-forbid-overwrite": "true",
    } });
    return { provider: "oss", storageName: localName, objectKey, etag: result?.res?.headers?.etag || result?.etag || null };
  } catch (error) {
    throw storageError(error?.code === "FileAlreadyExists" ? "OSS_OBJECT_COLLISION" : "OSS_UPLOAD_FAILED", 502);
  }
}

export async function readStoredFile({ provider: storageProvider, objectKey, storageName, env = process.env }) {
  if (storageProvider !== "oss") return readFile(resolve(uploadDirectory, storageName));
  try {
    const result = await client(env).get(safePersistedObjectKey(objectKey, storageName));
    return Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content);
  } catch (error) {
    if (error?.status === 404 || error?.code === "NoSuchKey") throw storageError("FILE_OBJECT_NOT_FOUND", 404);
    throw storageError("OSS_DOWNLOAD_FAILED", 502);
  }
}

export async function deleteStoredFile({ provider: storageProvider, objectKey, storageName, env = process.env }) {
  if (storageProvider !== "oss") {
    await rm(resolve(uploadDirectory, storageName), { force: true });
    return;
  }
  try {
    await client(env).delete(safePersistedObjectKey(objectKey, storageName));
  } catch (error) {
    if (error?.status === 404 || error?.code === "NoSuchKey") return;
    if ([401, 403].includes(Number(error?.status || error?.statusCode)) || error?.code === "AccessDenied") {
      throw storageError("OSS_DELETE_FORBIDDEN", 502);
    }
    throw storageError("OSS_DELETE_FAILED", 502);
  }
}

export function objectStorageStatus(env = process.env) {
  if (env === process.env) return publicConfiguration();
  const config = environmentConfig(env);
  return {
    provider: config.configured ? "oss" : "local", configured: config.configured,
    enabled: config.configured, source: config.configured ? "environment" : "none",
    bucket: config.configured ? config.bucket : null, endpoint: config.configured ? config.endpoint : null,
    region: config.configured ? config.region : null, prefix: config.prefix,
  };
}
