import { db } from "./database.mjs";
import { effectiveMembership } from "./membership.mjs";

export const USER_FILE_LIMIT = 100;

export function userFileQuota(userId) {
  const used = Number(db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id = ?").get(userId)?.count || 0);
  const membership = effectiveMembership(userId);
  const limit = Math.max(USER_FILE_LIMIT, Number(membership.fileLimit || USER_FILE_LIMIT));
  return { used, limit, remaining: Math.max(0, limit - used) };
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
