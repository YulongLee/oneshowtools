export const identityRepository = (db) => ({
  async updateLocale(userId, locale) {
    await db.prepare("UPDATE users SET locale = ?, updated_at = ? WHERE id = ? AND status = 'active'")
      .bind(locale, Date.now(), userId).run();
  },
  async account(userId) {
    return db.prepare("SELECT id, name, email, email_verified AS emailVerified, status, locale FROM users WHERE id = ?")
      .bind(userId).first();
  },
});

export const billingRepository = (db) => ({
  async activeOffers() {
    const result = await db.prepare(`SELECT o.id, o.code, o.kind, o.currency, o.amount_minor AS amountMinor,
      o.credits, p.code AS planCode, p.name_zh AS nameZh, p.name_en AS nameEn, p.interval
      FROM offers o LEFT JOIN plans p ON p.id = o.plan_id WHERE o.active = 1 ORDER BY o.amount_minor`).all();
    return result.results;
  },
  async offer(id) {
    return db.prepare("SELECT * FROM offers WHERE id = ? AND active = 1").bind(id).first();
  },
  async summary(userId) {
    const [balance, subscription, history] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = ?").bind(userId).first(),
      db.prepare(`SELECT s.status, s.current_period_end AS currentPeriodEnd, s.cancel_at_period_end AS cancelAtPeriodEnd,
        p.code AS planCode, p.name_zh AS nameZh, p.name_en AS nameEn
        FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ?
        ORDER BY s.updated_at DESC LIMIT 1`).bind(userId).first(),
      db.prepare(`SELECT id, type, amount, reference_type AS referenceType, created_at AS createdAt
        FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`).bind(userId).all(),
    ]);
    return { balance: Number(balance?.balance || 0), subscription: subscription || null, ledger: history.results };
  },
});

export const integrationRepository = (db) => ({
  async findTool(toolId) {
    return db.prepare("SELECT id, credential_hash AS credentialHash, allowed_operations_json AS allowedOperations FROM tools WHERE id = ? AND revoked_at IS NULL")
      .bind(toolId).first();
  },
  async access(userId) {
    return db.prepare(`SELECT u.id, u.locale, u.status, u.email_verified AS emailVerified,
      COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE user_id = u.id), 0) AS balance
      FROM users u WHERE u.id = ?`).bind(userId).first();
  },
  async audit({ actorId, action, targetType, targetId, correlationId, metadata = {} }) {
    await db.prepare(`INSERT INTO audit_events
      (id, actor_type, actor_id, action, target_type, target_id, correlation_id, metadata_json, created_at)
      VALUES (?, 'tool', ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), actorId, action, targetType, targetId, correlationId, JSON.stringify(metadata), Date.now()).run();
  },
});

export const ledgerRepository = (db) => ({
  async reserve({ toolId, userId, usageKey, amount, requestHash, expiresAt }) {
    const existing = await db.prepare("SELECT * FROM reservations WHERE tool_id = ? AND usage_key = ?")
      .bind(toolId, usageKey).first();
    if (existing) return existing.request_hash === requestHash ? { ...existing, replay: true } : { conflict: true };
    const id = crypto.randomUUID();
    const now = Date.now();
    const result = await db.prepare(`INSERT INTO reservations
      (id, tool_id, user_id, usage_key, amount, status, request_hash, expires_at, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?
      WHERE (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE user_id = ?)
        - (SELECT COALESCE(SUM(amount), 0) FROM reservations WHERE user_id = ? AND status = 'reserved') >= ?`)
      .bind(id, toolId, userId, usageKey, amount, requestHash, expiresAt, now, now, userId, userId, amount).run();
    return result.meta.changes === 1 ? { id, status: "reserved", amount, expiresAt } : { insufficient: true };
  },
  async settle({ toolId, reservationId, action }) {
    const reservation = await db.prepare("SELECT * FROM reservations WHERE id = ? AND tool_id = ?")
      .bind(reservationId, toolId).first();
    if (!reservation) return { missing: true };
    const target = action === "commit" ? "committed" : "released";
    if (reservation.status === target) return { ...reservation, replay: true };
    if (reservation.status !== "reserved") return { conflict: true, status: reservation.status };
    const now = Date.now();
    const statements = [
      db.prepare("UPDATE reservations SET status = ?, settled_at = ?, updated_at = ? WHERE id = ? AND status = 'reserved'")
        .bind(target, now, now, reservationId),
    ];
    if (action === "commit") {
      statements.push(db.prepare(`INSERT INTO ledger_entries
        (id, user_id, type, amount, reference_type, reference_id, tool_id, metadata_json, created_at)
        VALUES (?, ?, 'consumption', ?, 'reservation', ?, ?, '{}', ?)`)
        .bind(crypto.randomUUID(), reservation.user_id, -reservation.amount, reservationId, toolId, now));
    }
    await db.batch(statements);
    return { id: reservationId, status: target, amount: reservation.amount };
  },
});
