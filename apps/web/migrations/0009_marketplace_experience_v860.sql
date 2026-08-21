-- Hariyo Mart v8.6.0: multi-photo product merchandising + explainable location matching
ALTER TABLE products ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_products_market_match ON products(status,category,province,stock,rating,featured,updated_at);
CREATE INDEX IF NOT EXISTS idx_products_delivery_geo ON products(status,lat,lng,delivery_radius_km);
