PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'farm' CHECK (type IN ('farm', 'cooperative', 'vendor')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended', 'rejected')),
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  municipality TEXT NOT NULL,
  ward TEXT,
  lat REAL,
  lng REAL,
  specialties TEXT NOT NULL DEFAULT '[]',
  delivery_radius_km REAL NOT NULL DEFAULT 35,
  pickup_enabled INTEGER NOT NULL DEFAULT 1,
  same_day_enabled INTEGER NOT NULL DEFAULT 0,
  commission_rate REAL NOT NULL DEFAULT 0.08,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'farmer', 'vendor', 'admin')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ne')),
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  addresses TEXT NOT NULL DEFAULT '[]',
  wishlist TEXT NOT NULL DEFAULT '[]',
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  municipality TEXT,
  unit TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  old_price REAL,
  stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0),
  minimum_order REAL NOT NULL DEFAULT 1 CHECK (minimum_order > 0),
  organic INTEGER NOT NULL DEFAULT 0,
  grade TEXT,
  harvest_date TEXT,
  harvest_window TEXT,
  unique_story TEXT,
  short_description TEXT,
  description TEXT,
  benefits TEXT NOT NULL DEFAULT '[]',
  image_key TEXT,
  image_url TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  delivery_radius_km REAL NOT NULL DEFAULT 35,
  wholesale INTEGER NOT NULL DEFAULT 0,
  subscription INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft', 'pending_review', 'active', 'paused', 'rejected', 'archived')),
  rating REAL NOT NULL DEFAULT 4.8,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  buyer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_customer TEXT,
  delivery_address TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'esewa', 'khalti', 'fonepay', 'card')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded')),
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'partially_fulfilled', 'delivered', 'cancelled')),
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL,
  total REAL NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picking', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'cancelled')),
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL,
  commission_amount REAL NOT NULL,
  farmer_net REAL NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'scheduled', 'paid', 'held')),
  distance_km REAL,
  timeline TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fulfillment_id TEXT NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip TEXT,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_public ON products(status, category, province, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_geo ON products(lat, lng);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fulfillments_tenant ON fulfillments(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);

