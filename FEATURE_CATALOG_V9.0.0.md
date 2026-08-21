# Hariyo Mart Nepal v9.0.0 — Feature Catalog

## Marketplace & discovery
- Predictive search, category/province discovery, Hariyo Match v3, nearby radius matching, verified/same-day/organic/top-rated filters.
- Multi-photo product galleries, full-screen lightbox, structured descriptions, seller trust, MOQ, stock, delivery radius and product reviews.
- Saved products, compare, recently viewed and seller-grouped basket.

## Repeat commerce — new in v9.0.0
- Saved Baskets stored in D1 per authenticated buyer.
- Save current basket from the basket drawer.
- Restore or delete saved baskets from `/saved-baskets`.
- Quick Reorder from buyer order history on web.
- Quick Reorder from native mobile order history.
- Minimum-order-aware mobile cart behavior.

## Demo Lab — new in v9.0.0
- Direct `/api/auth/demo-session` role launch.
- Runtime creation/repair of allow-listed demo identities.
- Dedicated verified Enterprise demo sandbox tenant.
- Automatic demo tenant membership assignment by role.
- Three runtime demo products for seller/inventory/order testing.
- Live readiness dashboard and one-click role launcher.
- Mobile Demo Lab role buttons discovered from live `/api/demo-config`.

## Buyer workspace
- Orders, saved addresses, wishlist, rewards, reviews, subscriptions, returns, settings, nearby discovery and repeat buying.

## Farmer / vendor workspace
- Product/gallery management, inventory, orders, customers, payments, payouts, farm planning, expenses, profitability, buyer demand, traceability, procurement, lots, quality, warehouses, pricing, routes, subscriptions, team and reports.

## Admin
- Farmer onboarding, tenant verification, users, matching engine, catalog, CMS, media, orders, commerce controls, settlements, delivery/service areas, promotions, reviews, support, analytics, audit, plans/billing and supply network.

## Platform
- Next.js/OpenNext on Cloudflare Workers, D1, KV, R2, Queues, Workers AI and optional advanced coordination Worker.
- Standalone D1/KV fallbacks for login, checkout, inventory and numbering.
- Adaptive Auto/Light/Dark brand themes and responsive mobile web.
- Native Expo mobile app source for Android/iOS.
