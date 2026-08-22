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
export const hashIdentifier = (value) => createHash("sha256").update(String(value || "")).digest("hex");

const supportedClients = new Set(["mobile", "wechat-miniprogram"]);

export function requestClientKind(request) {
  const value = String(request.headers.get("x-oneshow-client") || "").trim().toLowerCase();
  return supportedClients.has(value) ? value : null;
}

export function requestSessionToken(request) {
  const authorization = String(request.headers.get("authorization") || "");
  const bearer = authorization.match(/^Bearer\s+([A-Za-z0-9_-]{32,})$/i)?.[1];
  return bearer || parseCookies(request.headers.get("cookie") || "").ost_session || null;
}

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

export function requestClient(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipHash: hashIdentifier(forwarded || request.headers.get("cf-connecting-ip") || "local"),
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 240),
  };
}

export function sameOrigin(request, appUrl) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  // Native clients do not carry browser cookies or a browser Origin. Their
  // authenticated calls use a revocable bearer session instead, so CSRF does
  // not apply. Requests claiming to be native while carrying an Origin still
  // go through the normal web-origin check.
  if (!origin && requestClientKind(request)) return true;
  if (!origin) return !String(appUrl).startsWith("https://");
  return origin === new URL(appUrl).origin;
}
