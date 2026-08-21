# Hariyo Mart Nepal v8.9.1 — Cloudflare Build Fix + Unified Website/Mobile UX
## v8.9.1 — Build-safe commerce + unified mobile experience

v8.9.1 fixes the two strict TypeScript failures reported by Cloudflare Workers Builds (`minimumOrder` on Compare and `never` narrowing in MarketplaceSearch) at the catalog type boundary, then tightens website/mobile theme consistency, global mobile search, product-card hierarchy, compare UX, safe areas, native navigation and accessibility. v8.9 public content and the complete v8.8 commerce/Farmer OS stack remain intact.


## v8.9.1 — Public Story & Trust Experience

v8.9.1 adds a richer public content system across About, Contact, How It Works and all supporting guide/policy pages: visual story modules, page-specific artwork, metrics, decision cards, contextual FAQs, stronger CTAs, support routing and mobile-responsive system diagrams. The v8.8 commerce/product experience remains intact.


Hariyo Mart Nepal is a Cloudflare-native marketplace and multi-tenant SaaS for farms, cooperatives, produce suppliers, wholesalers, institutional buyers, retailers and household customers across Nepal.

v8.9.1 adds a complete buyer decision and conversion layer: predictive marketplace search, persistent Save/Compare/Recently Viewed, full-screen gallery zoom, seller-grouped basket UX, guest-first checkout, published reviews and seller replies, mobile commerce navigation and stronger product decision information while retaining v8.7 authentication hardening, adaptive brand, Farmer OS and Cloudflare-native runtime fallbacks.

## Production stack

```text
Cloudflare Edge / DNS / CDN / WAF / Turnstile
                    |
                    v
     Next.js + OpenNext on Worker `hariyo-mart-nepal`
                    |
       +------------+-------------+
       |            |             |
       v            v             v
      D1           R2             KV
 business DB   media/cache    config/cache
       |
       v
  optional private `hariyo-mart-services` Worker
       +-- Durable Objects
       +-- Queues + DLQ
       +-- Workflows
       +-- Analytics Engine
```

## Core platform + v8.8 highlights

- Farmer command center with 30-day revenue, expenses, contribution, payouts, stock, expiry, harvest and buyer signals
- crop-cycle planner with area, planting/harvest dates, expected quantity, budget and target price
- farm expense ledger and crop-level profitability
- two-sided B2B buyer-demand network with farmer matching and offers
- QR-ready public lot traceability timeline at `/trace/[token]`
- deterministic farmer recommendation engine for stock, expiry, demand, harvest, waste and plan pressure
- tenant SaaS activity metering and expanded Starter/Growth/Enterprise entitlements
- `/farmer/business-center` tenant SaaS cockpit
- tenant-safe `GET /api/supply/saas-profile`
- Starter / Growth / Enterprise SaaS plan presentation on the farmer onboarding page
- Expo Farmer Studio plan/usage/revenue snapshot
- production Worker name/url aligned to `hariyo-mart-nepal` / `hariyo-mart-nepal.nishrutesh.workers.dev`
- complete D1, R2, KV, Queue and service bindings retained in Wrangler
- OpenNext self-reference matches Worker identity
- source maps + observability enabled
- required Worker secrets declared and deployment-validated
- synchronized authenticated carts with guest/local fallback
- coupon rules and server-side redemption reservation
- delivery-slot capacity and reservation
- RMA / return workflow for real buyer order items
- farmer/admin commerce control dashboard
- low-stock/expiry alert rules
- product price-history audit
- inventory coordination through Durable Objects
- event Queue with integration-outbox fallback
- multi-tenant produce supply modules from v8 retained
- semantic light/dark menu/footer/form contrast from v8.1 retained
- multi-photo product gallery: primary photo + up to 8 R2-backed gallery photos
- product-card slider plus product-detail carousel with thumbnails, keyboard navigation and mobile swipe
- Hariyo Match v3 hard serviceability constraints + explainable ranking reasons
- Best Match sorting in Shop and location-aware Nearby discovery
- actual live seller location/verification/fulfilment fields used in product cards and details
- richer buyer product facts, product story, origin and delivery-zone fit
- Farmer Product Studio + Harvest Publisher multi-file gallery upload/remove workflow
- admin Matching Engine simulator
- mobile gallery paging, real remote-photo handling, match scores and product story
- D1 `images_json` persistence and matching/location indexes in migration `0009`
- synchronized 98-product web/mobile/API catalog and Cloudflare seed

## First local checks

```powershell
npm ci
npm run v8.8:doctor
npm run validate
npm run smoke
npm run cloudflare:types
npm run typecheck
```

Apply local D1 migrations:

```powershell
npm run cloudflare:db:local
```

Run the web app:

```powershell
npm run dev:web
```

## Before production deploy

1. Keep the public Turnstile site key in the Cloudflare Dashboard; `keep_vars=true` preserves it.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY` as Wrangler secrets before real production. Production Test Mode can be used temporarily for verification.
3. Export/backup the production D1 database.
4. Run `npm run deploy:cloudflare:production` (or `DEPLOY-HARIYO-V8.9.1.cmd`). The connected deploy applies all D1 migrations through `0011`, refreshes the idempotent seed/test identities when enabled, builds OpenNext when needed and deploys the standalone public Worker.
5. Verify `/api/health`, `/api/system/readiness`, one-click demo login, `/shop`, `/nearby`, a live product gallery and `/admin/matching-engine`.

See `docs/V8_2_CLOUDFLARE_PRODUCTION_GUIDE.md` for the complete Windows/PowerShell production procedure.


## v8.4.1 — Real photos and demo access

- 98 built-in catalog products now render photographic seed imagery rather than SVG placeholders.
- Complete role-based demo identities are available through `DEMO-ACCOUNTS.md`.
- Shared demo password: `HariyoDemo@2026`.
- Seed locally with `npm run demo:seed:local`; seed a dedicated staging/demo D1 with `npm run demo:seed:remote`.
- Keep `NEXT_PUBLIC_DEMO_MODE=false` for a real production launch and remove demo users with `npm run demo:remove:remote`.


## v8.9.1 deployment

For Cloudflare Workers Builds use `npm run build:cloudflare` followed by `npm run deploy:cloudflare:connected`. The deploy step keeps `hariyo-mart-services` optional, applies D1 migrations and idempotent seed repair before web cutover, and then publishes the standalone `hariyo-mart-nepal` Worker. See `CLOUDFLARE_CONNECTED_DEPLOY.md`.


## v8.9.1 commerce experience

- Predictive global search with product/category suggestions, recent-search memory and Shop query handoff.
- Real signed-in D1 wishlist with guest local fallback and guest-to-account merge.
- Compare up to three products, dedicated comparison workspace and recently-viewed recovery.
- Zoomable multi-photo product gallery, structured buying facts, service-zone/seller trust context and fixed mobile buy bar.
- Published product reviews, rating summary, seller replies and moderated buyer review submission.
- Seller-grouped basket/cart, guest-first checkout, clearer delivery-date decisions and mobile commerce dock.
- Expanded Shop quick filters for verified sellers, same-day local fulfillment, organic, top-rated and price ceilings.

## v8.7 standalone auth hardening retained

Production login, checkout, inventory and tenant sequencing no longer require the optional `hariyo-mart-services` Worker. KV/D1 fallbacks keep the public Worker operational. Run `npm run prepare:cloudflare:test` before the first Production Test Mode deployment, or use `npm run deploy:cloudflare:production`, which applies migrations and idempotent seed data automatically.


## v8.7 adaptive brand + demo login retained

- Auto theme follows the operating system and changes Hariyo's brand accents between a bright daytime lime/emerald palette and a mint/forest night palette.
- Manual Light and Dark remain stable choices.
- Known Production Test Mode identities support one-click role login and self-heal stale demo password hashes without weakening real account authentication.
- Migration `0011_demo_identity_repair_v870.sql` repairs already-deployed stale demo credentials.
- Demo seeding uses upserts and reactivates the known test identities, so reruns are safe.
- Password visibility, clearer errors, larger touch targets, mobile header/form spacing and card depth are improved across the public and authenticated UI.