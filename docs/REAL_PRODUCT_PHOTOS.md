# Real Product Photography — v8.4.1

## What changed

- All 98 built-in catalog products now use real photographic image URLs rather than generated SVG category placeholders.
- `images.unsplash.com` is allowed by Next.js image configuration and the Content Security Policy.
- D1 migration `0007_real_product_photos_v841.sql` upgrades existing **seed products / SVG-placeholder products only**.
- Farmer-uploaded images are intentionally preserved and are not overwritten by the migration.
- `apps/web/migrations/seed.sql`, `apps/web/seed/cloudflare.sql`, web catalog, API catalog and mobile catalog are synchronized to the photographic URLs.

## Production principle

The built-in catalog uses representative category photography for launch/demo content. A real seller listing should use the seller's own crop/product photo through the existing media/product workflow so the image accurately represents the actual item being sold.

## External photo hosts

The seed catalog currently references selected Unsplash image assets for representative vegetables, fruit, grains/beans, tea, honey/spices, dairy and snack/dry-product groups. Keep the source URLs/license provenance with the project if these assets are retained.
