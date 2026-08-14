# Hariyo Mart Nepal v8.2.0 — Implementation Status

## Implemented in this release

- Cloudflare-native production architecture using OpenNext Workers, D1, R2, KV, Durable Objects, Queues, Workflows, Analytics Engine, Turnstile and Worker observability.
- Production Worker identity changed to `hariyomart` with `WORKER_SELF_REFERENCE` matching the Worker name.
- D1 migration `0005_commerce_control_plane.sql` for persistent carts, coupons, coupon redemption counters, delivery-slot capacity, returns/RMA, price history, inventory alerts and commerce events.
- Authenticated cloud cart synchronization with guest/offline local-cart fallback and post-login merge.
- Server-authoritative coupon validation/reservation and delivery-slot capacity reservation during checkout, including rollback compensation.
- Inventory reservation remains coordinated through Durable Objects; order failures restore reservations safely.
- Queue failure after committed checkout falls back to the transactional outbox rather than invalidating a successful order.
- Product price changes write to price history; seller stock changes continue through the inventory coordinator.
- Buyer return/RMA creation based on actual order lines, plus seller/admin return processing.
- Seller/admin commerce control panel with KPIs, returns and inventory alert-rule management.
- Cloudflare production configuration validator, deployment doctor and safer end-to-end deployment helper.
- Production seed generator updated for v8.2 tenant memberships, subscriptions, release metadata and the complete 98-product catalog.

## Verified in this build environment

- TypeScript/TSX parser validation across the source tree.
- Catalog validation: 98 products, 23 categories and all 7 Nepal provinces.
- Cloudflare-native architecture doctor and compatibility smoke test.
- Wrangler configuration structural validation, while explicitly allowing the Turnstile public-key placeholder for packaging only.
- Fresh SQLite-compatible application of D1 migrations `0001` through `0005` followed by the generated Cloudflare production seed.
- Seed result: 7 tenants, 98 products, 7 tenant memberships, 7 tenant subscriptions and 7 realistic orders.
- Secret leakage and Supabase-runtime regression scans.

## Requires activation in your Cloudflare account

1. Replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY=REPLACE_WITH_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc` with the real Turnstile site key for the production hostname.
2. Add the required Worker secrets with Wrangler: `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `TURNSTILE_SECRET_KEY`.
3. Run `npm ci`, then regenerate Worker types, execute the full TypeScript check and build OpenNext on a machine with npm registry access.
4. Back up the production D1 database before applying migration `0005`.
5. Apply remote D1 migrations and deploy the services Worker before the web Worker.
6. Configure real payment-provider credentials/callback validation when eSewa, Khalti or Fonepay production checkout is enabled.
7. Run the live health/readiness endpoints and one controlled purchase/stock/return test after deployment.

## Intentionally not claimed as verified here

A dependency-backed `npm run typecheck` and full OpenNext production build were not completed in this environment because the npm package cache could not supply required packages. Static parsing, migrations, seed verification and release checks passed, but the dependency-backed checks must still be run after `npm ci` in your normal development/deployment environment.
