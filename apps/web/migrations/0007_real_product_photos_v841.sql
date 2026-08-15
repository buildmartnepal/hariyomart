-- Replace only built-in placeholder SVGs / seed product art with photo URLs.
-- Farmer-uploaded product images are never overwritten.
UPDATE products
SET image_url = CASE
  WHEN category IN ('fresh-fruits','juices') THEN 'https://images.unsplash.com/photo-1773739686762-140369959d7f?auto=format&fit=crop&w=1200&q=82'
  WHEN category IN ('grains','lentils-beans','flour-baking') THEN 'https://images.unsplash.com/photo-1763368403529-0b8d9108cf9c?auto=format&fit=crop&w=1200&q=82'
  WHEN category IN ('tea-coffee') THEN 'https://images.unsplash.com/photo-1521012012373-6a85bade18da?auto=format&fit=crop&w=1200&q=82'
  WHEN category IN ('honey','herbs-spices','oils','pickles','natural-care') THEN 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=82'
  WHEN category IN ('dairy','eggs-poultry') THEN 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=82'
  WHEN category IN ('snacks','dry-fruits','baby-food','sugar-free') THEN 'https://images.unsplash.com/photo-1771626717980-0049820ed4e1?auto=format&fit=crop&w=1200&q=82'
  ELSE 'https://images.unsplash.com/photo-1748342319942-223b99937d4e?auto=format&fit=crop&w=1200&q=82'
END,
updated_at = datetime('now')
WHERE image_url LIKE '/products/%.svg'
   OR (id LIKE 'seed-product-%' AND (image_url IS NULL OR trim(image_url) = ''));
