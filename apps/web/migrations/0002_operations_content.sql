PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_image TEXT,
  content_json TEXT NOT NULL DEFAULT '[]',
  related_category TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  scheduled_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

CREATE TABLE IF NOT EXISTS service_areas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  province TEXT NOT NULL,
  districts TEXT NOT NULL DEFAULT '[]',
  center_lat REAL,
  center_lng REAL,
  radius_km REAL NOT NULL DEFAULT 35 CHECK (radius_km > 0),
  delivery_fee REAL NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  free_delivery_above REAL,
  minimum_order REAL NOT NULL DEFAULT 0 CHECK (minimum_order >= 0),
  delivery_days TEXT NOT NULL DEFAULT '[]',
  cutoff_time TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'free_delivery')),
  discount_value REAL NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  minimum_order REAL NOT NULL DEFAULT 0,
  maximum_discount REAL,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  seller_reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, buyer_id, order_id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_events (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('harvest', 'adjustment', 'reservation', 'sale', 'return', 'spoilage')),
  quantity_change REAL NOT NULL,
  stock_after REAL NOT NULL,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_status_date ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_areas_location ON service_areas(active, province);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_events(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

INSERT OR IGNORE INTO platform_settings (setting_key,value_json,is_public)
VALUES
  ('marketplace.name','"Hariyo Mart Nepal"',1),
  ('marketplace.currency','"NPR"',1),
  ('payments.online_enabled','false',0),
  ('marketplace.default_radius_km','150',1),
  ('support.email','"support@hariyomart.example"',1);

INSERT OR IGNORE INTO service_areas
  (id,name,province,districts,center_lat,center_lng,radius_km,delivery_fee,free_delivery_above,minimum_order,delivery_days,cutoff_time,active)
VALUES
  ('area-kathmandu','Kathmandu Valley','bagmati','["Kathmandu","Lalitpur","Bhaktapur"]',27.7172,85.3240,35,120,1500,300,'["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]','11:00',1),
  ('area-pokhara','Pokhara Market','gandaki','["Kaski"]',28.2096,83.9856,45,140,1800,350,'["Sun","Mon","Tue","Wed","Thu","Fri"]','10:30',1),
  ('area-biratnagar','Biratnagar Market','koshi','["Morang","Sunsari"]',26.4525,87.2718,50,130,1600,300,'["Sun","Mon","Tue","Wed","Thu","Fri"]','10:30',1),
  ('area-nepalgunj','Nepalgunj Market','lumbini','["Banke","Bardiya"]',28.0500,81.6167,55,150,2000,400,'["Sun","Mon","Tue","Wed","Thu","Fri"]','10:00',1);
