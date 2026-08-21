-- Hariyo Mart Nepal v10.0.0 — Nepal Origin Supply & Export OS
-- Extends marketplace listings with trade/export specifications and adds a public RFQ desk.

ALTER TABLE products ADD COLUMN export_ready INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN export_status TEXT;
ALTER TABLE products ADD COLUMN hs_code_hint TEXT;
ALTER TABLE products ADD COLUMN botanical_name TEXT;
ALTER TABLE products ADD COLUMN origin_altitude TEXT;
ALTER TABLE products ADD COLUMN harvest_season TEXT;
ALTER TABLE products ADD COLUMN processing_method TEXT;
ALTER TABLE products ADD COLUMN typical_shelf_life_days INTEGER;
ALTER TABLE products ADD COLUMN storage_guidance TEXT;
ALTER TABLE products ADD COLUMN trade_pack TEXT;
ALTER TABLE products ADD COLUMN export_moq REAL;
ALTER TABLE products ADD COLUMN lead_time_days INTEGER;
ALTER TABLE products ADD COLUMN destination_markets TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN domestic_markets TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN traceability_level TEXT;
ALTER TABLE products ADD COLUMN compliance_note TEXT;
ALTER TABLE products ADD COLUMN source_type TEXT;
ALTER TABLE products ADD COLUMN supplier_cluster TEXT;

CREATE INDEX IF NOT EXISTS idx_products_export_ready ON products(export_ready,status,category);
CREATE INDEX IF NOT EXISTS idx_products_supplier_cluster ON products(supplier_cluster,status);
CREATE INDEX IF NOT EXISTS idx_products_trade_search ON products(category,province,district,export_status,status);

CREATE TABLE IF NOT EXISTS export_inquiries (
  id TEXT PRIMARY KEY,
  inquiry_number TEXT NOT NULL UNIQUE,
  buyer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT NOT NULL,
  buyer_type TEXT NOT NULL DEFAULT 'importer',
  product_slug TEXT,
  product_interest TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  target_pack TEXT,
  incoterm TEXT,
  destination_port TEXT,
  required_documents TEXT NOT NULL DEFAULT '[]',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','qualified','sampling','quoted','negotiating','won','lost','closed')),
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_export_inquiries_status ON export_inquiries(status,created_at DESC);

CREATE TABLE IF NOT EXISTS export_supplier_profiles (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  export_capable INTEGER NOT NULL DEFAULT 0,
  exporter_code TEXT,
  company_registration_ref TEXT,
  pan_vat_ref TEXT,
  food_license_ref TEXT,
  plant_resource_permission_ref TEXT,
  lab_partner TEXT,
  packing_capabilities TEXT NOT NULL DEFAULT '[]',
  certifications TEXT NOT NULL DEFAULT '[]',
  documents_updated_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS export_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  inquiry_id TEXT REFERENCES export_inquiries(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  document_ref TEXT,
  file_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO platform_settings (setting_key,value_json,is_public,updated_at)
VALUES ('marketplace.release','"10.0.0"',1,datetime('now'));
