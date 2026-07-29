import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, digest] = String(encoded).split(":");
  if (algorithm !== "scrypt" || !salt || !digest) return false;
  const candidate = Buffer.from(await scrypt(password, salt, 64));
  const stored = Buffer.from(digest, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export const createSessionToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return [name, decodeURIComponent(value.join("=") || "")];
  }).filter(([name]) => name));
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 14) {
  const secure = process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
  return `ost_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
