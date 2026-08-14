PRAGMA foreign_keys = ON;

-- Hariyo Mart Nepal v8.0 Cloudflare-native produce SaaS extension.
-- Existing marketplace tables remain the compatibility layer; the tables below
-- add multi-tenant operations, procurement, traceability, warehousing, pricing,
-- delivery, subscriptions, billing metadata and event-outbox capabilities.

-- v8 allows one user to belong to multiple tenant workspaces while preserving
-- users.tenant_id as the legacy/default seller link for backwards compatibility.
ALTER TABLE users ADD COLUMN active_tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL;
UPDATE users SET active_tenant_id=tenant_id WHERE active_tenant_id IS NULL AND tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS plan_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_npr REAL NOT NULL DEFAULT 0 CHECK (monthly_price_npr >= 0),
  max_members INTEGER NOT NULL DEFAULT 2 CHECK (max_members > 0),
  max_warehouses INTEGER NOT NULL DEFAULT 1 CHECK (max_warehouses > 0),
  max_products INTEGER NOT NULL DEFAULT 100 CHECK (max_products > 0),
  features_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plan_catalog(code,name,monthly_price_npr,max_members,max_warehouses,max_products,features_json) VALUES
 ('starter','Starter',0,3,1,150,'{"procurement":true,"lots":true,"delivery":true}'),
 ('growth','Growth',2499,15,5,2000,'{"procurement":true,"lots":true,"delivery":true,"subscriptions":true,"advanced_reports":true}'),
 ('enterprise','Enterprise',9999,100,50,100000,'{"procurement":true,"lots":true,"delivery":true,"subscriptions":true,"advanced_reports":true,"custom_domains":true,"isolated_data_tier":true}');

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','manager','procurement','inventory','sales','delivery','accounting','farmer','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  joined_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id,status,tenant_id);

CREATE TABLE IF NOT EXISTS tenant_invites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','procurement','inventory','sales','delivery','accounting','farmer','viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_lookup ON tenant_invites(tenant_id,email,expires_at);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'starter' REFERENCES plan_catalog(code),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','paused','cancelled')),
  trial_ends_at TEXT,
  current_period_starts_at TEXT,
  current_period_ends_at TEXT,
  external_customer_ref TEXT,
  external_subscription_ref TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_settings_v8 (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  order_prefix TEXT NOT NULL DEFAULT 'HM',
  purchase_prefix TEXT NOT NULL DEFAULT 'PO',
  default_tax_rate REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 10,
  expiry_warning_days INTEGER NOT NULL DEFAULT 3,
  allow_negative_stock INTEGER NOT NULL DEFAULT 0,
  auto_allocate_stock INTEGER NOT NULL DEFAULT 1,
  default_price_mode TEXT NOT NULL DEFAULT 'retail' CHECK (default_price_mode IN ('retail','wholesale','mixed')),
  delivery_cutoff_local TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','failed','disabled')),
  ssl_mode TEXT NOT NULL DEFAULT 'cloudflare',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  province TEXT,
  district TEXT,
  municipality TEXT,
  ward TEXT,
  latitude REAL,
  longitude REAL,
  certifications_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,code)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_type TEXT NOT NULL DEFAULT 'farmer' CHECK (supplier_type IN ('farmer','cooperative','wholesaler','processor','importer','other')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  pan_vat_number TEXT,
  province TEXT,
  district TEXT,
  municipality TEXT,
  address_line TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  credit_limit_npr REAL NOT NULL DEFAULT 0,
  rating REAL,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,code)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_active ON suppliers(tenant_id,active,name);

CREATE TABLE IF NOT EXISTS business_customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail','wholesale','restaurant','hotel','school','hospital','corporate','reseller','other')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  pan_vat_number TEXT,
  province TEXT,
  district TEXT,
  municipality TEXT,
  address_line TEXT,
  credit_days INTEGER NOT NULL DEFAULT 0,
  credit_limit_npr REAL NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,code)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  warehouse_type TEXT NOT NULL DEFAULT 'standard' CHECK (warehouse_type IN ('standard','cold_room','collection_center','store','vehicle')),
  province TEXT,
  district TEXT,
  municipality TEXT,
  address_line TEXT,
  latitude REAL,
  longitude REAL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,code)
);

CREATE TABLE IF NOT EXISTS warehouse_bins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  temperature_zone TEXT NOT NULL DEFAULT 'ambient' CHECK (temperature_zone IN ('ambient','cool','chilled','frozen')),
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(warehouse_id,code)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_bins_tenant ON warehouse_bins(tenant_id,warehouse_id,active);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  grade TEXT,
  pack_label TEXT,
  unit TEXT NOT NULL,
  pack_quantity REAL NOT NULL DEFAULT 1 CHECK (pack_quantity > 0),
  barcode TEXT,
  base_price REAL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,sku)
);

CREATE TABLE IF NOT EXISTS harvest_plans (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  expected_harvest_date TEXT NOT NULL,
  expected_quantity REAL NOT NULL CHECK (expected_quantity >= 0),
  unit TEXT NOT NULL,
  committed_quantity REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'forecast' CHECK (status IN ('forecast','committed','harvested','cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_harvest_plans_tenant_date ON harvest_plans(tenant_id,expected_harvest_date,status);

CREATE TABLE IF NOT EXISTS produce_lots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  bin_id TEXT REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  harvest_date TEXT,
  received_date TEXT,
  best_before_date TEXT,
  grade TEXT,
  origin_label TEXT,
  quantity_received REAL NOT NULL DEFAULT 0,
  quantity_available REAL NOT NULL DEFAULT 0,
  quantity_reserved REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('quarantine','available','held','depleted','expired','disposed')),
  trace_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,lot_code)
);
CREATE INDEX IF NOT EXISTS idx_lots_fefo ON produce_lots(tenant_id,product_id,status,best_before_date,harvest_date);
CREATE INDEX IF NOT EXISTS idx_lots_warehouse ON produce_lots(tenant_id,warehouse_id,bin_id,status);

CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES produce_lots(id) ON DELETE CASCADE,
  checked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('pass','conditional','reject')),
  grade TEXT,
  temperature_c REAL,
  weight_received REAL,
  rejected_quantity REAL NOT NULL DEFAULT 0,
  defects_json TEXT NOT NULL DEFAULT '[]',
  evidence_keys_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_movements_v8 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  bin_id TEXT REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt','reservation','reservation_release','sale','return','transfer_out','transfer_in','adjustment','spoilage','count')),
  quantity_change REAL NOT NULL,
  unit_cost REAL,
  reference_type TEXT,
  reference_id TEXT,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inv_move_tenant_product ON inventory_movements_v8(tenant_id,product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_move_lot ON inventory_movements_v8(lot_id,created_at DESC);

CREATE TABLE IF NOT EXISTS waste_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (reason IN ('expired','damaged','quality_reject','temperature','shrinkage','donation','other')),
  estimated_cost_npr REAL NOT NULL DEFAULT 0,
  notes TEXT,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_number TEXT NOT NULL,
  from_warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','in_transit','received','cancelled')),
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  dispatched_at TEXT,
  received_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,transfer_number)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  quantity_requested REAL NOT NULL CHECK (quantity_requested > 0),
  quantity_received REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_counts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  count_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','counted','approved','posted','cancelled')),
  counted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  posted_at TEXT,
  UNIQUE(tenant_id,count_number)
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id TEXT PRIMARY KEY,
  stock_count_id TEXT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  system_quantity REAL NOT NULL,
  counted_quantity REAL NOT NULL,
  variance_quantity REAL NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  price_mode TEXT NOT NULL DEFAULT 'retail' CHECK (price_mode IN ('retail','wholesale','contract')),
  customer_id TEXT REFERENCES business_customers(id) ON DELETE SET NULL,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,code)
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  min_quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  UNIQUE(price_list_id,product_id,variant_id,min_quantity)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  order_date TEXT NOT NULL,
  expected_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','partially_received','received','cancelled')),
  subtotal_npr REAL NOT NULL DEFAULT 0,
  tax_npr REAL NOT NULL DEFAULT 0,
  total_npr REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,po_number)
);
CREATE INDEX IF NOT EXISTS idx_po_tenant_status ON purchase_orders(tenant_id,status,order_date DESC);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  ordered_quantity REAL NOT NULL CHECK (ordered_quantity > 0),
  received_quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
  line_total REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','inspected','posted','cancelled')),
  received_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,receipt_number)
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id TEXT PRIMARY KEY,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_item_id TEXT REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  quantity_received REAL NOT NULL CHECK (quantity_received > 0),
  quantity_rejected REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_number TEXT NOT NULL,
  customer_id TEXT REFERENCES business_customers(id) ON DELETE SET NULL,
  marketplace_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','allocated','picking','packed','dispatched','delivered','cancelled')),
  order_date TEXT NOT NULL,
  requested_delivery_date TEXT,
  subtotal_npr REAL NOT NULL DEFAULT 0,
  discount_npr REAL NOT NULL DEFAULT 0,
  tax_npr REAL NOT NULL DEFAULT 0,
  delivery_npr REAL NOT NULL DEFAULT 0,
  total_npr REAL NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,sales_order_number)
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  ordered_quantity REAL NOT NULL CHECK (ordered_quantity > 0),
  allocated_quantity REAL NOT NULL DEFAULT 0,
  fulfilled_quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  line_total REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_id TEXT REFERENCES produce_lots(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released','expired')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,product_id,reference_type,reference_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_res_active ON stock_reservations(tenant_id,product_id,status,expires_at);

CREATE TABLE IF NOT EXISTS delivery_routes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_number TEXT NOT NULL,
  route_date TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_number TEXT,
  zone_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','loading','in_progress','completed','cancelled')),
  started_at TEXT,
  completed_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id,route_number)
);
CREATE INDEX IF NOT EXISTS idx_routes_tenant_date ON delivery_routes(tenant_id,route_date,status);

CREATE TABLE IF NOT EXISTS delivery_stops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_id TEXT REFERENCES sales_orders(id) ON DELETE SET NULL,
  marketplace_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  stop_sequence INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  latitude REAL,
  longitude REAL,
  eta TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','arrived','delivered','failed','skipped')),
  proof_object_key TEXT,
  delivered_at TEXT,
  failure_reason TEXT,
  UNIQUE(route_id,stop_sequence)
);

CREATE TABLE IF NOT EXISTS payments_v8 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  sales_order_id TEXT REFERENCES sales_orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount_npr REAL NOT NULL CHECK (amount_npr >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','paid','failed','refunded','partially_refunded')),
  idempotency_key TEXT UNIQUE,
  provider_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  gross_npr REAL NOT NULL DEFAULT 0,
  deductions_npr REAL NOT NULL DEFAULT 0,
  net_npr REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','held','cancelled')),
  paid_at TEXT,
  payment_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS produce_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES business_customers(id) ON DELETE SET NULL,
  buyer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly')),
  box_size TEXT,
  preferences_json TEXT NOT NULL DEFAULT '{}',
  delivery_address_json TEXT NOT NULL DEFAULT '{}',
  next_delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_due ON produce_subscriptions(tenant_id,status,next_delivery_date);

CREATE TABLE IF NOT EXISTS produce_subscription_items (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES produce_subscriptions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  substitution_allowed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription ON produce_subscription_items(subscription_id,product_id);

CREATE TABLE IF NOT EXISTS subscription_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES produce_subscriptions(id) ON DELETE CASCADE,
  delivery_date TEXT NOT NULL,
  sales_order_id TEXT REFERENCES sales_orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','skipped','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id,delivery_date)
);
CREATE INDEX IF NOT EXISTS idx_subscription_runs_tenant_date ON subscription_runs(tenant_id,delivery_date DESC);

CREATE TABLE IF NOT EXISTS integration_outbox (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  available_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON integration_outbox(status,available_at,created_at);

CREATE TABLE IF NOT EXISTS auth_security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email_hash TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('login_success','login_failure','logout','refresh','password_change','turnstile_failure','session_revoked')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_security_user ON auth_security_events(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_sequences (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_key TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value > 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(tenant_id,sequence_key)
);

-- Backfill a membership for every existing tenant owner/farmer account.
INSERT OR IGNORE INTO tenant_members(tenant_id,user_id,role,status,joined_at)
SELECT tenant_id,id,'owner','active',created_at FROM users WHERE tenant_id IS NOT NULL;

INSERT OR IGNORE INTO tenant_subscriptions(tenant_id,plan_code,status)
SELECT id,CASE WHEN plan='enterprise' THEN 'enterprise' WHEN plan='growth' THEN 'growth' ELSE 'starter' END,'active' FROM tenants;

INSERT OR IGNORE INTO tenant_settings_v8(tenant_id)
SELECT id FROM tenants;
