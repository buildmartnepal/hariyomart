-- Hariyo Mart v8.3.3: production-safe single Worker fallbacks.
-- The optional hariyo-mart-services Worker can still be enabled later for
-- Durable Object coordination, but the public web Worker no longer depends on it.

CREATE TABLE IF NOT EXISTS api_rate_limit_windows (
  scope_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (scope_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_expiry ON api_rate_limit_windows(expires_at);
