CREATE TABLE IF NOT EXISTS user_phone_identities (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL UNIQUE,
  phone_last4 TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+86',
  verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  code_hash TEXT NOT NULL,
  code_salt TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  provider_request_id TEXT,
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sms_verification_lookup_idx
  ON sms_verification_codes(phone_hash, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS sms_verification_expiry_idx
  ON sms_verification_codes(expires_at, consumed_at);
