-- Hariyo Mart Nepal v9.0.0
-- Demo Lab runtime reliability + buyer saved basket foundation.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saved_baskets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lines_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_saved_baskets_user_updated ON saved_baskets(user_id, updated_at DESC);
