import { db } from "./database.mjs";

const current = () => Date.now();

export function effectiveMembership(userId, timestamp = current()) {
  const override = db.prepare(`
    SELECT p.id AS planId, p.code, p.name_zh AS nameZh, p.name_en AS nameEn,
      p.file_limit AS fileLimit, p.recurring_credits AS recurringCredits,
      o.status, o.expires_at AS currentPeriodEnd, 'admin' AS provider, 1 AS managedByAdmin
    FROM user_membership_overrides o JOIN plans p ON p.id = o.plan_id
    WHERE o.user_id = ? AND o.status = 'active' AND (o.expires_at IS NULL OR o.expires_at > ?)
  `).get(userId, timestamp);
  if (override) return { ...override, managedByAdmin: true };
  const subscription = db.prepare(`
    SELECT p.id AS planId, p.code, p.name_zh AS nameZh, p.name_en AS nameEn,
      p.file_limit AS fileLimit, p.recurring_credits AS recurringCredits,
      s.status, s.current_period_end AS currentPeriodEnd, s.provider, 0 AS managedByAdmin
    FROM subscriptions s JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = ? AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > ?)
    ORDER BY s.created_at DESC LIMIT 1
  `).get(userId, timestamp);
  if (subscription) return { ...subscription, managedByAdmin: false };
  const free = db.prepare(`
    SELECT id AS planId, code, name_zh AS nameZh, name_en AS nameEn,
      file_limit AS fileLimit, recurring_credits AS recurringCredits
    FROM plans WHERE code = 'free' LIMIT 1
  `).get();
  return free ? { ...free, status: 'active', currentPeriodEnd: null, provider: 'system', managedByAdmin: false } : {
    planId: null, code: 'free', nameZh: '免费版', nameEn: 'Free', fileLimit: 100,
    recurringCredits: 300, status: 'active', currentPeriodEnd: null, provider: 'system', managedByAdmin: false,
  };
}

export function membershipPlans() {
  return db.prepare(`
    SELECT id AS planId, code, name_zh AS nameZh, name_en AS nameEn,
      recurring_credits AS recurringCredits, file_limit AS fileLimit
    FROM plans WHERE active = 1 AND interval = 'month' ORDER BY amount_minor
  `).all();
}
