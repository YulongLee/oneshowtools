CREATE TABLE IF NOT EXISTS model_endpoint_policies (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  base_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_model_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider_template TEXT NOT NULL REFERENCES model_endpoint_policies(code),
  model_id TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_tag TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','deleted')),
  is_default INTEGER NOT NULL DEFAULT 0,
  last_test_status TEXT,
  last_test_latency_ms INTEGER,
  last_tested_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS user_model_connections_owner_idx
  ON user_model_connections(user_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS user_model_connections_one_default
  ON user_model_connections(user_id) WHERE is_default = 1 AND status = 'active';

CREATE TABLE IF NOT EXISTS model_credential_versions (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES user_model_connections(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('created','rotated','revoked')),
  key_hint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(connection_id, version, event)
);

CREATE TABLE IF NOT EXISTS model_invocations (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_kind TEXT NOT NULL CHECK(route_kind IN ('managed','user_connection')),
  connection_id TEXT REFERENCES user_model_connections(id) ON DELETE SET NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  error_class TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS model_invocations_user_created_idx
  ON model_invocations(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS model_invocations_status_created_idx
  ON model_invocations(status, started_at DESC);

CREATE TABLE IF NOT EXISTS execution_jobs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'tool_execution',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','running','retrying','completed','failed','cancelled','quarantined')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  lease_token TEXT,
  lease_until INTEGER,
  heartbeat_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  last_error_class TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS execution_jobs_claim_idx
  ON execution_jobs(status, next_attempt_at, lease_until);

CREATE TABLE IF NOT EXISTS execution_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES execution_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  worker_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error_class TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE(job_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS task_settlements (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('reserve','commit','refund','release')),
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(task_id, kind)
);
