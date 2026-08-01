CREATE TABLE IF NOT EXISTS seo_agent_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  site_origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ownership_status TEXT NOT NULL DEFAULT 'unverified',
  automation_mode TEXT NOT NULL DEFAULT 'approval',
  daily_credit_limit INTEGER NOT NULL DEFAULT 100,
  scan_hour INTEGER NOT NULL DEFAULT 8,
  scan_minute INTEGER NOT NULL DEFAULT 30,
  last_scanned_at INTEGER,
  next_scan_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, site_origin)
);

CREATE INDEX IF NOT EXISTS idx_seo_agent_projects_user
  ON seo_agent_projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS seo_agent_connectors (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES seo_agent_projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  config_json TEXT NOT NULL DEFAULT '{}',
  secret_ciphertext TEXT,
  secret_iv TEXT,
  secret_tag TEXT,
  secret_version INTEGER NOT NULL DEFAULT 1,
  last_test_status TEXT,
  last_tested_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, provider)
);

CREATE TABLE IF NOT EXISTS seo_agent_scans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES seo_agent_projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'crawl',
  health_score INTEGER,
  coverage_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_seo_agent_scans_project
  ON seo_agent_scans(project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS seo_agent_opportunities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES seo_agent_projects(id) ON DELETE CASCADE,
  scan_id TEXT NOT NULL REFERENCES seo_agent_scans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_zh TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  risk TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  credit_cost INTEGER NOT NULL,
  execution_kind TEXT NOT NULL DEFAULT 'draft',
  status TEXT NOT NULL DEFAULT 'detected',
  evidence_json TEXT NOT NULL DEFAULT '{}',
  proposal_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_agent_opportunities_project
  ON seo_agent_opportunities(project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_agent_actions (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES seo_agent_opportunities(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES seo_agent_projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  execution_kind TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  provider_response_json TEXT NOT NULL DEFAULT '{}',
  rollback_token TEXT,
  error_code TEXT,
  approved_at INTEGER NOT NULL,
  executed_at INTEGER,
  rolled_back_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_seo_agent_actions_project
  ON seo_agent_actions(project_id, approved_at DESC);
