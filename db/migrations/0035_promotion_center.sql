CREATE TABLE IF NOT EXISTS promotion_channels (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','paused','completed')),
  starts_at INTEGER,
  ends_at INTEGER,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_links (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  channel_id TEXT NOT NULL REFERENCES promotion_channels(id),
  campaign_id TEXT REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  content_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_touchpoints (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  link_id TEXT NOT NULL REFERENCES promotion_links(id),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  clicked_at INTEGER NOT NULL,
  bound_at INTEGER
);

CREATE INDEX IF NOT EXISTS promotion_touchpoints_link_clicked_idx ON promotion_touchpoints(link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS promotion_touchpoints_user_clicked_idx ON promotion_touchpoints(user_id, clicked_at DESC);

CREATE TABLE IF NOT EXISTS promotion_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  touchpoint_id TEXT REFERENCES promotion_touchpoints(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('download','custom')),
  reference_type TEXT NOT NULL DEFAULT '',
  reference_id TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at INTEGER NOT NULL,
  UNIQUE(event_type, reference_type, reference_id, user_id)
);

CREATE INDEX IF NOT EXISTS promotion_events_touchpoint_time_idx ON promotion_events(touchpoint_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS promotion_user_attributions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_touchpoint_id TEXT NOT NULL REFERENCES promotion_touchpoints(id),
  last_touchpoint_id TEXT NOT NULL REFERENCES promotion_touchpoints(id),
  attributed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_costs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  channel_id TEXT REFERENCES promotion_channels(id) ON DELETE CASCADE,
  cost_minor INTEGER NOT NULL CHECK(cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  occurred_on TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS promotion_costs_date_idx ON promotion_costs(occurred_on DESC);
