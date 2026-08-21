# Hariyo Mart Nepal v10.0.1 — Feature Catalog

## Marketplace & buyer commerce
- 420 seeded Nepal-origin SKUs / 210 product families / 23 categories / 7 provinces.
- Predictive search, category/province filters, Hariyo Match v3, nearby discovery, seller verification and delivery-radius matching.
- Multi-photo product gallery, fullscreen zoom, save/wishlist, compare, recently viewed and reviews.
- Seller-grouped cart, Saved Baskets, Quick Reorder, guest checkout, coupons and delivery-slot support.
- Public About, Contact, How It Works, trust, policy and knowledge pages.

## Nepal origin / wholesale / export
- Domestic city, wholesale/institutional and trade/export product variants.
- Product fields for sourcing cluster, source type, botanical name, altitude, season, processing method, storage, shelf life and traceability.
- Export-ready status, HS-code hint, trade pack, export MOQ, lead time, destination markets and compliance note.
- `/export` sourcing and RFQ experience.
- Export inquiries API/admin handling.
- Export supplier profiles and export document data model.
- Lot-level compliance model: certification/permit claims are not fabricated by the seed.

## Farmer / producer SaaS
- Product Studio, Harvest Publisher, farm planning, crop cycles, expenses, profitability, inventory, lots/quality and traceability.
- Wholesale, subscriptions, buyer demand, pricing, procurement, warehouses, routes, orders, payments and payouts.
- Trade catalog, export readiness, RFQ/sample, compliance-document, packing/label and shipment-oriented modules.

## Platform SaaS/admin
- Multi-tenant RBAC, tenant plans/usage, farmer onboarding, users, products/categories, CMS/media, Matching Engine and commerce control.
- Orders, inventory, settlements, delivery zones, warehouses, promotions, reviews, support, analytics, audit and supply network controls.
- Cloudflare-native D1, R2, KV, Queues, Workers AI and optional private coordination Worker.

## Test/release operations
- Production Test Mode and Demo Lab with allow-listed runtime demo-session bootstrap.
- D1 migration chain through `0013_nepal_origin_export_os_v1000.sql`.
- Reproducible catalog sync and seed generation.
- v10 doctor, production guard, Cloudflare config validator, catalog/content validator and smoke checks.
