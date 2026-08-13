PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🌱',
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sections_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  seo_title TEXT,
  seo_description TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories(active,sort_order,name);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status,updated_at DESC);

INSERT OR IGNORE INTO categories (slug,name,description,emoji,sort_order) VALUES
  ('fresh-fruits','Fresh Fruits','Seasonal fruits from Nepalese orchards','🍎',10),
  ('vegetables','Vegetables','Farm-fresh everyday vegetables','🥦',20),
  ('leafy-greens','Leafy Greens','Tender greens harvested daily','🥬',30),
  ('mushrooms','Mushrooms','Fresh specialty mushrooms from controlled farms','🍄',40),
  ('eggs-poultry','Eggs & Poultry','Traceable eggs and responsibly raised poultry','🥚',50),
  ('dairy','Dairy','Fresh milk, ghee, paneer and yoghurt','🥛',60),
  ('herbs-spices','Herbs & Spices','Aromatic herbs and mountain spices','🌿',70),
  ('tea-coffee','Tea & Coffee','Premium Nepali tea and specialty coffee','🍵',80),
  ('honey','Honey','Raw and traceable local honey','🍯',90),
  ('grains','Grains','Rice, millet, maize and heritage grains','🌾',100),
  ('flour-baking','Flour & Baking','Stoneground flour and local baking staples','🥣',110),
  ('lentils-beans','Lentils & Beans','Protein-rich pulses and beans','🫘',120),
  ('oils','Natural Oils','Cold-pressed edible oils','🫙',130),
  ('pickles','Pickles','Traditional Nepali achar and ferments','🥒',140),
  ('snacks','Healthy Snacks','Nutritious traditional and modern snacks','🥜',150),
  ('farm-boxes','Farm Boxes','Curated seasonal baskets from nearby growers','🧺',160),
  ('seedlings-plants','Seedlings & Plants','Healthy nursery plants for farms and home gardens','🌱',170),
  ('flowers','Flowers','Fresh local flowers and seasonal garlands','🌼',180),
  ('natural-care','Natural Care','Farm-origin soaps, balms and botanical care','🧼',190),
  ('baby-food','Baby Food','Gentle organic foods for young children','🧸',200),
  ('sugar-free','Sugar-Free','Naturally sweet and low-sugar choices','🌱',210),
  ('juices','Juices','Fresh fruit and vegetable beverages','🧃',220),
  ('dry-fruits','Dry Fruits','Nuts, seeds and dried fruits','🌰',230);
