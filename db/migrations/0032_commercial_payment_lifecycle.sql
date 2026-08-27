PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS membership_purchase_periods (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE REFERENCES commercial_orders(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  provider TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS membership_purchase_periods_order_idx
  ON membership_purchase_periods(order_id);

CREATE INDEX IF NOT EXISTS commercial_orders_membership_guard_idx
  ON commercial_orders(user_id, kind, status, created_at DESC);
