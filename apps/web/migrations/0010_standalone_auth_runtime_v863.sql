-- Hariyo Mart Nepal v8.6.3
-- Standalone production runtime hardening for auth/test sessions.

CREATE TABLE IF NOT EXISTS runtime_test_secrets (
  secret_key TEXT PRIMARY KEY,
  secret_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email,status);
