PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS credit_ledger_metadata (
  ledger_id TEXT PRIMARY KEY REFERENCES credit_ledger(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  permission_code TEXT,
  reason_code TEXT NOT NULL,
  operator_note TEXT,
  original_ledger_id TEXT REFERENCES credit_ledger(id) ON DELETE SET NULL,
  approval_id TEXT REFERENCES admin_approvals(id) ON DELETE SET NULL,
  correlation_id TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  account_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_periods (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  closed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_journal_entries (
  id TEXT PRIMARY KEY,
  period_id TEXT REFERENCES finance_periods(id),
  entry_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  reversal_of TEXT REFERENCES finance_journal_entries(id),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  posted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  posted_at INTEGER,
  UNIQUE(source_type, source_id)
);

CREATE TABLE IF NOT EXISTS finance_postings (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES finance_journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES finance_accounts(id),
  debit_minor INTEGER NOT NULL DEFAULT 0 CHECK(debit_minor >= 0),
  credit_minor INTEGER NOT NULL DEFAULT 0 CHECK(credit_minor >= 0),
  currency TEXT NOT NULL,
  memo TEXT,
  created_at INTEGER NOT NULL,
  CHECK((debit_minor = 0) != (credit_minor = 0))
);

CREATE INDEX IF NOT EXISTS finance_postings_journal_idx ON finance_postings(journal_id);

CREATE TABLE IF NOT EXISTS finance_reconciliation_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_count INTEGER NOT NULL DEFAULT 0,
  exception_count INTEGER NOT NULL DEFAULT 0,
  calculation_version TEXT NOT NULL DEFAULT 'v1',
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS tool_usage_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  usage_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  tool_id TEXT NOT NULL REFERENCES tools(id),
  opaque_user_id TEXT,
  contract_version TEXT NOT NULL DEFAULT 'usage-reporting/v1',
  tool_version TEXT,
  runtime_id TEXT,
  event_type TEXT NOT NULL,
  latency_ms INTEGER,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  credits_refunded INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  provider_cost_minor INTEGER,
  currency TEXT,
  error_code TEXT,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_usage_events_tool_time_idx
  ON tool_usage_events(tool_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS tool_usage_events_usage_idx
  ON tool_usage_events(usage_id, occurred_at);

CREATE TABLE IF NOT EXISTS metric_definitions (
  name TEXT PRIMARY KEY,
  label_zh TEXT NOT NULL,
  label_en TEXT NOT NULL,
  unit TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  warning_threshold REAL,
  critical_threshold REAL,
  freshness_ms INTEGER NOT NULL,
  retention_class TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_samples (
  id TEXT PRIMARY KEY,
  metric_name TEXT NOT NULL REFERENCES metric_definitions(name),
  scope_type TEXT NOT NULL DEFAULT 'service',
  scope_id TEXT NOT NULL DEFAULT 'oneshowtools',
  value REAL NOT NULL,
  collected_at INTEGER NOT NULL,
  UNIQUE(metric_name, scope_type, scope_id, collected_at)
);

CREATE INDEX IF NOT EXISTS metric_samples_lookup_idx
  ON metric_samples(metric_name, scope_type, scope_id, collected_at DESC);

CREATE TABLE IF NOT EXISTS metric_alert_rules (
  id TEXT PRIMARY KEY,
  metric_name TEXT NOT NULL REFERENCES metric_definitions(name),
  scope_type TEXT NOT NULL DEFAULT 'service',
  scope_id TEXT NOT NULL DEFAULT 'oneshowtools',
  warning_threshold REAL,
  critical_threshold REAL,
  comparison TEXT NOT NULL DEFAULT 'gte',
  minimum_samples INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  owner_role TEXT NOT NULL DEFAULT 'operations',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(metric_name, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS operational_incidents (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES operational_alerts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at INTEGER,
  suppressed_until INTEGER,
  resolution_note TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_admin_views (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, module, name)
);

CREATE TABLE IF NOT EXISTS admin_export_jobs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  filters_json TEXT NOT NULL DEFAULT '{}',
  record_count INTEGER,
  storage_name TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS observability_heartbeats (
  collector TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  error_code TEXT,
  collected_at INTEGER NOT NULL
);
