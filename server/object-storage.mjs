import OSS from "ali-oss";
import { readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { uploadDirectory } from "./database.mjs";

const storageError = (code, status = 502) => Object.assign(new Error(code), { code, status });

function value(env, ...names) {
  for (const name of names) if (String(env[name] || "").trim()) return String(env[name]).trim();
  return "";
}

function normalizedPrefix(raw) {
  const prefix = String(raw || "oneshowtools").replace(/^\/+|\/+$/g, "").replace(/[^A-Za-z0-9/_-]/g, "-");
  return prefix || "oneshowtools";
}

export function objectStorageConfig(env = process.env) {
  const config = {
    accessKeyId: value(env, "OSS_ACCESS_KEY_ID", "OFFERSTEADY_OSS_ACCESS_KEY_ID"),
    accessKeySecret: value(env, "OSS_ACCESS_KEY_SECRET", "OFFERSTEADY_OSS_ACCESS_KEY_SECRET"),
    bucket: value(env, "OSS_BUCKET", "OFFERSTEADY_OSS_BUCKET"),
    endpoint: value(env, "OSS_ENDPOINT", "OFFERSTEADY_OSS_ENDPOINT"),
    region: value(env, "OSS_REGION", "OFFERSTEADY_OSS_REGION"),
    prefix: normalizedPrefix(value(env, "OSS_KEY_PREFIX", "OFFERSTEADY_OSS_KEY_PREFIX") || "oneshowtools"),
  };
  return { ...config, configured: Boolean(config.accessKeyId && config.accessKeySecret && config.bucket && config.endpoint && config.region) };
}

function client(env = process.env) {
  const config = objectStorageConfig(env);
  if (!config.configured) throw storageError("OSS_STORAGE_NOT_CONFIGURED", 503);
  return new OSS({
    region: config.region,
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    authorizationV4: true,
    secure: true,
  });
}

function safeObjectKey(key, env = process.env) {
  const prefix = `${objectStorageConfig(env).prefix}/`;
  const normalized = String(key || "").replace(/^\/+/, "");
  if (!normalized.startsWith(prefix) || normalized.includes("..")) throw storageError("OSS_OBJECT_SCOPE_INVALID", 400);
  return normalized;
}

function storageName(fileId, fileName) {
  const extension = extname(basename(fileName || "")).slice(0, 12).replace(/[^.A-Za-z0-9_-]/g, "");
  return `${fileId}${extension}`;
}

export function objectKeyFor(userId, fileId, fileName, env = process.env) {
  const config = objectStorageConfig(env);
  const opaqueUser = String(userId || "unknown").replace(/[^A-Za-z0-9_-]/g, "-");
  return `${config.prefix}/users/${opaqueUser}/${storageName(fileId, fileName)}`;
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
    const result = await client(env).put(objectKey, buffer, {
      headers: {
        "content-type": mimeType || "application/octet-stream",
        "x-oss-object-acl": "private",
        "x-oss-forbid-overwrite": "true",
      },
    });
    return {
      provider: "oss",
      storageName: localName,
      objectKey,
      etag: result?.res?.headers?.etag || result?.etag || null,
    };
  } catch (error) {
    throw storageError(error?.code === "FileAlreadyExists" ? "OSS_OBJECT_COLLISION" : "OSS_UPLOAD_FAILED", 502);
  }
}

export async function readStoredFile({ provider, objectKey, storageName, env = process.env }) {
  if (provider !== "oss") return readFile(resolve(uploadDirectory, storageName));
  try {
    const result = await client(env).get(safeObjectKey(objectKey, env));
    return Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content);
  } catch (error) {
    if (error?.status === 404 || error?.code === "NoSuchKey") throw storageError("FILE_OBJECT_NOT_FOUND", 404);
    throw storageError("OSS_DOWNLOAD_FAILED", 502);
  }
}

export async function deleteStoredFile({ provider, objectKey, storageName, env = process.env }) {
  if (provider !== "oss") {
    await rm(resolve(uploadDirectory, storageName), { force: true });
    return;
  }
  try {
    await client(env).delete(safeObjectKey(objectKey, env));
  } catch (error) {
    if (error?.status === 404 || error?.code === "NoSuchKey") return;
    throw storageError("OSS_DELETE_FAILED", 502);
  }
}

export function objectStorageStatus(env = process.env) {
  const config = objectStorageConfig(env);
  return {
    provider: config.configured ? "oss" : "local",
    configured: config.configured,
    bucket: config.configured ? config.bucket : null,
    region: config.configured ? config.region : null,
    prefix: config.prefix,
  };
}
