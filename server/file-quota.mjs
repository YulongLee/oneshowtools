import { db } from "./database.mjs";

export const USER_FILE_LIMIT = 100;

export function userFileQuota(userId) {
  const used = Number(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(userId)?.count || 0);
  return { used, limit: USER_FILE_LIMIT, remaining: Math.max(0, USER_FILE_LIMIT - used) };
}

export function assertUserFileCapacity(userId, incoming = 1) {
  const quota = userFileQuota(userId);
  const requested = Math.max(0, Number(incoming) || 0);
  if (quota.used + requested > quota.limit) {
    throw Object.assign(new Error("USER_FILE_LIMIT_REACHED"), {
      code: "USER_FILE_LIMIT_REACHED",
      status: 409,
      quota,
    });
  }
  return quota;
}
