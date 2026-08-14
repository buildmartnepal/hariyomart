PRAGMA foreign_keys = ON;

-- Hariyo Mart Nepal v8.2 commerce control plane.
-- Adds persistent carts, promotion rules, delivery-slot capacity, return/RMA handling,
-- price history, low-stock alert rules, and normalized customer commerce metadata.

CREATE TABLE IF NOT EXISTS shopping_carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'NPR',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shopping_cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity REAL NOT NULL CHECK (quantity > 0),
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON shopping_cart_items(cart_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS coupon_codes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value REAL NOT NULL CHECK (discount_value > 0),
  minimum_subtotal REAL NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
  maximum_discount REAL,
  starts_at TEXT,
  ends_at TEXT,
  max_redemptions INTEGER,
  max_redemptions_per_user INTEGER NOT NULL DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupon_codes(id) ON DELETE RESTRICT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  discount_npr REAL NOT NULL CHECK (discount_npr >= 0),
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id, coupon_id, redeemed_at DESC);

CREATE TABLE IF NOT EXISTS coupon_user_counters (
  coupon_id TEXT NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(coupon_id, user_id)
);

CREATE TABLE IF NOT EXISTS delivery_slots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  zone_name TEXT,
  slot_date TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity_orders INTEGER NOT NULL DEFAULT 25 CHECK (capacity_orders > 0),
  reserved_orders INTEGER NOT NULL DEFAULT 0 CHECK (reserved_orders >= 0),
  cutoff_at TEXT,
  fee_override_npr REAL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, slot_date, starts_at, ends_at)
);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_public ON delivery_slots(slot_date, active, starts_at);

ALTER TABLE orders ADD COLUMN coupon_id TEXT REFERENCES coupon_codes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN discount_npr REAL NOT NULL DEFAULT 0 CHECK (discount_npr >= 0);
ALTER TABLE orders ADD COLUMN delivery_slot_id TEXT REFERENCES delivery_slots(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY,
  rma_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  buyer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  resolution TEXT CHECK (resolution IN ('refund','replacement','credit','reject')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','received','refunded','replaced','closed')),
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  closed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_returns_buyer ON return_requests(buyer_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_tenant ON return_requests(tenant_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  condition TEXT NOT NULL DEFAULT 'unknown' CHECK (condition IN ('unknown','unopened','damaged','spoiled','wrong_item','quality_issue')),
  disposition TEXT CHECK (disposition IN ('restock','dispose','supplier_claim','customer_keep')),
  UNIQUE(return_id, order_item_id)
);

CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_price REAL,
  new_price REAL NOT NULL CHECK (new_price >= 0),
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS inventory_alert_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('low_stock','out_of_stock','expiry','overstock')),
  threshold_value REAL,
  threshold_days INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_tenant ON inventory_alert_rules(tenant_id, active, rule_type);

CREATE TABLE IF NOT EXISTS commerce_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commerce_events_tenant ON commerce_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_events_user ON commerce_events(user_id, occurred_at DESC);
