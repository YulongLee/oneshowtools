import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeDatabase } from "../server/database.mjs";
import { putStockPetRelease, signStockPetRelease } from "../server/object-storage.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

const version = argument("version") || process.env.STOCK_PET_VERSION || "0.1.6";
const inputs = [
  ["windows", argument("windows")],
  ["macos", argument("macos")],
].filter(([, filePath]) => filePath);

if (!inputs.length) {
  throw new Error("Provide --windows and/or --macos release package paths.");
}

initializeDatabase();
for (const [platform, inputPath] of inputs) {
  const filePath = resolve(inputPath);
  await access(filePath);
  const info = await stat(filePath);
  if (!info.isFile() || info.size < 1024 * 1024) throw new Error(`${platform} release package is invalid.`);
  const release = await putStockPetRelease({ platform, version, filePath });
  const signed = await signStockPetRelease(platform, { version, expires: 120 });
  const response = await fetch(signed.url, { headers: { range: "bytes=0-1023" } });
  if (![200, 206].includes(response.status)) throw new Error(`${platform} release verification failed (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`${platform} release verification returned no data.`);
  process.stdout.write(`${platform}: ${release.objectKey} (${info.size} bytes) verified\n`);
}
