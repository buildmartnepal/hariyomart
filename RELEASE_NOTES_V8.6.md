# Hariyo Mart Nepal v8.6.0 — Marketplace Experience

v8.6.0 upgrades the Cloudflare-native marketplace without regressing the v8.4.4 production deployment guard, Farmer OS, commerce control plane or real-photo catalog.

## Buyer experience

- Multi-photo product galleries on product cards and product detail pages with arrows, thumbnails, counters and mobile swipe/paging.
- Richer product description, farm-origin context, stock/freshness signals and verified seller presentation.
- Product-level location-fit panel showing distance, delivery-zone eligibility, same-day hint and nearby alternatives.
- Nearby marketplace search plus category, organic, wholesale and subscription intent filters.
- Hariyo Match v3 explainable ranking by serviceability, distance, freshness, stock, rating, seller trust, category/query intent, quality flags and budget fit.
- Match scores and concise reasons are exposed to web cards, Nearby results and mobile discovery.

## Seller / admin experience

- Main photo plus up to 8 buyer-facing gallery photos per product.
- Multi-file JPEG/PNG/WebP upload to the existing authenticated R2 media flow with 8 MB per-file validation.
- Gallery preview/removal in product management and Harvest Publisher.
- Admin Matching Center for testing location and buyer-intent ranking behavior.

## Data and Cloudflare

- Migration `0009_marketplace_experience_v860.sql` adds `products.images_json` and location/matching indexes.
- Product create/update/public API now persists and returns gallery arrays.
- Nearby API uses the shared explainable ranking engine instead of a distance-only sort.
- Production remains Cloudflare-native: Workers/OpenNext, D1, R2, KV, Queues, Workers AI and the internal services Worker.
- v8.4.4 connected-deploy ordering and production guard are retained and versioned for v8.6.0.

## Mobile

- Horizontal paged product gallery with photo count.
- Live product refresh, rich product context, stock and fulfilment UI.
- Nearby results expose Match v3 scores.
- Responsive touch targets and compact marketplace filters are retained for small screens.
