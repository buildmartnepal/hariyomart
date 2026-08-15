PRAGMA foreign_keys = ON;

-- Hariyo Mart Nepal v8.4 Farmer OS + B2B demand network.
-- Extends the existing v8 supply SaaS without duplicating farms, products, lots or customers.

CREATE TABLE IF NOT EXISTS crop_cycles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  variety TEXT,
  area_value REAL NOT NULL DEFAULT 0 CHECK (area_value >= 0),
  area_unit TEXT NOT NULL DEFAULT 'ropani' CHECK (area_unit IN ('ropani','hectare','bigha','kattha','sqm','acre')),
  planting_date TEXT,
  expected_harvest_date TEXT,
  actual_harvest_date TEXT,
  expected_quantity REAL NOT NULL DEFAULT 0 CHECK (expected_quantity >= 0),
  actual_quantity REAL NOT NULL DEFAULT 0 CHECK (actual_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  target_price_npr REAL NOT NULL DEFAULT 0 CHECK (target_price_npr >= 0),
  budget_npr REAL NOT NULL DEFAULT 0 CHECK (budget_npr >= 0),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','planted','growing','ready','harvesting','completed','cancelled')),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_tenant_status ON crop_cycles(tenant_id,status,expected_harvest_date);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm ON crop_cycles(tenant_id,farm_id,planting_date);

CREATE TABLE IF NOT EXISTS farm_expenses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  crop_cycle_id TEXT REFERENCES crop_cycles(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('seed','fertilizer','labor','irrigation','electricity','equipment','rent','packaging','transport','storage','commission','certification','other')),
  description TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  unit_cost_npr REAL,
  amount_npr REAL NOT NULL CHECK (amount_npr >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','wallet','credit','other')),
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','payable','partial')),
  receipt_key TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_farm_expenses_tenant_date ON farm_expenses(tenant_id,expense_date DESC,category);
CREATE INDEX IF NOT EXISTS idx_farm_expenses_cycle ON farm_expenses(tenant_id,crop_cycle_id,expense_date DESC);

CREATE TABLE IF NOT EXISTS buyer_demands (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  buyer_tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_type TEXT NOT NULL DEFAULT 'business' CHECK (buyer_type IN ('household','restaurant','hotel','retailer','wholesaler','school','hospital','processor','corporate','cooperative','other')),
  product_name TEXT NOT NULL,
  category TEXT,
  grade TEXT,
  organic_required INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time','weekly','biweekly','monthly','contract')),
  target_price_npr REAL,
  province TEXT,
  district TEXT,
  municipality TEXT,
  delivery_date TEXT,
  contract_months INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','matched','awarded','closed','cancelled')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_buyer_demands_market ON buyer_demands(status,province,district,category,delivery_date);
CREATE INDEX IF NOT EXISTS idx_buyer_demands_user ON buyer_demands(buyer_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS buyer_demand_offers (
  id TEXT PRIMARY KEY,
  demand_id TEXT NOT NULL REFERENCES buyer_demands(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_price_npr REAL NOT NULL CHECK (unit_price_npr >= 0),
  available_from TEXT,
  delivery_fee_npr REAL NOT NULL DEFAULT 0 CHECK (delivery_fee_npr >= 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','accepted','rejected','withdrawn')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(demand_id,tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_demand_offers_tenant ON buyer_demand_offers(tenant_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS lot_traceability_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES produce_lots(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('planted','harvested','received','quality_checked','graded','packed','stored','transferred','dispatched','delivered','returned','disposed','note')),
  event_at TEXT NOT NULL,
  location_label TEXT,
  actor_name TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  evidence_key TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trace_events_lot ON lot_traceability_events(tenant_id,lot_id,event_at);

CREATE TABLE IF NOT EXISTS lot_traceability_links (
  lot_id TEXT PRIMARY KEY REFERENCES produce_lots(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trace_public_token ON lot_traceability_links(public_token,enabled);

CREATE TABLE IF NOT EXISTS tenant_usage_daily (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id,usage_date,metric_key)
);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_metric ON tenant_usage_daily(tenant_id,metric_key,usage_date DESC);

CREATE TABLE IF NOT EXISTS farmer_recommendations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('stock','expiry','demand','pricing','profit','harvest','delivery','saas','quality','waste')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  action_href TEXT,
  entity_type TEXT,
  entity_id TEXT,
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','completed')),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  UNIQUE(tenant_id,recommendation_type,entity_type,entity_id,title)
);
CREATE INDEX IF NOT EXISTS idx_farmer_recommendations_open ON farmer_recommendations(tenant_id,status,priority,score DESC,generated_at DESC);

-- Expand plan entitlements while retaining existing limits and feature flags.
UPDATE plan_catalog SET features_json='{"marketplace":true,"inventory_basic":true,"harvest_planning":true,"profitability":true,"buyer_demand":true,"traceability":true,"ai_recommendations":true,"procurement":true,"lots":true,"delivery":true,"max_ai_monthly":50}' WHERE code='starter';
UPDATE plan_catalog SET features_json='{"marketplace":true,"inventory_basic":true,"inventory_advanced":true,"harvest_planning":true,"profitability":true,"buyer_demand":true,"traceability":true,"ai_recommendations":true,"procurement":true,"lots":true,"delivery":true,"subscriptions":true,"advanced_reports":true,"crm":true,"team_roles":true,"max_ai_monthly":500}' WHERE code='growth';
UPDATE plan_catalog SET features_json='{"marketplace":true,"inventory_basic":true,"inventory_advanced":true,"harvest_planning":true,"profitability":true,"buyer_demand":true,"traceability":true,"ai_recommendations":true,"procurement":true,"lots":true,"delivery":true,"subscriptions":true,"advanced_reports":true,"crm":true,"team_roles":true,"custom_domains":true,"api_access":true,"isolated_data_tier":true,"max_ai_monthly":5000}' WHERE code='enterprise';

-- Create public trace tokens for existing lots without touching operational lot data.
INSERT OR IGNORE INTO lot_traceability_links(lot_id,tenant_id,public_token)
SELECT id,tenant_id,lower(hex(randomblob(16))) FROM produce_lots;
