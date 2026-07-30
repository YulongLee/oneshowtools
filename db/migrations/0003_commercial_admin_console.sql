PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES admin_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS admin_memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  mfa_required INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_membership_roles (
  user_id TEXT NOT NULL REFERENCES admin_memberships(user_id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_mfa_factors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_memberships(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'totp',
  label TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_memberships(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_auth_sessions (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES admin_memberships(user_id) ON DELETE CASCADE,
  mfa_verified_at INTEGER,
  step_up_until INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_approvals (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  requested_by TEXT NOT NULL REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_idempotency (
  key TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  role_codes TEXT NOT NULL DEFAULT '[]',
  permission TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  reason TEXT,
  correlation_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  approval_id TEXT REFERENCES admin_approvals(id) ON DELETE SET NULL,
  result TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit_events(target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS support_notes_user_idx ON support_notes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_versions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  effective_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(kind, version, locale)
);

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version_id TEXT NOT NULL REFERENCES policy_versions(id),
  source TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  UNIQUE(user_id, policy_version_id)
);

CREATE TABLE IF NOT EXISTS legal_holds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_at INTEGER,
  created_at INTEGER NOT NULL,
  released_at INTEGER
);

CREATE TABLE IF NOT EXISTS operational_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER,
  correlation_id TEXT NOT NULL,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS operational_jobs_queue_idx ON operational_jobs(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS operational_alerts (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  correlation_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  acknowledged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS operational_alerts_status_idx ON operational_alerts(status, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS commercial_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT,
  provider_object_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS commercial_orders_user_idx ON commercial_orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commercial_payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES commercial_orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  occurred_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS commercial_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES commercial_orders(id),
  provider TEXT,
  provider_refund_id TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_refund_id)
);

CREATE TABLE IF NOT EXISTS commercial_disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES commercial_orders(id),
  provider TEXT NOT NULL,
  provider_dispute_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_dispute_id)
);

CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  provider TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  details_json TEXT NOT NULL DEFAULT '{}',
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS tool_versions (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  contract_version TEXT NOT NULL DEFAULT 'v1',
  runtime_kind TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  published_at INTEGER,
  UNIQUE(tool_id, version)
);

CREATE TABLE IF NOT EXISTS tool_health_reports (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  error_code TEXT,
  contract_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  reported_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_health_tool_idx ON tool_health_reports(tool_id, reported_at DESC);
