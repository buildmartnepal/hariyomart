-- Hariyo Mart v8.5.0: multi-photo product merchandising + matching support
ALTER TABLE products ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_products_market_match ON products(status,category,province,stock,rating,featured,updated_at);
CREATE INDEX IF NOT EXISTS idx_products_delivery_geo ON products(status,lat,lng,delivery_radius_km);
