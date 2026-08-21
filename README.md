# Hariyo Mart Nepal v8.6.1 — Smart Farm-to-Market Marketplace OS

Hariyo Mart Nepal is a Cloudflare-native marketplace and multi-tenant SaaS for farms, cooperatives, produce suppliers, wholesalers, institutional buyers, retailers and household customers across Nepal.

v8.6.1 keeps the Cloudflare-native Farmer OS, commerce, traceability and deployment architecture while adding a buyer-facing marketplace experience layer: real multi-photo product galleries, explainable location-aware ranking, richer product details, seller media tooling and stronger mobile discovery.

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
  private `hariyo-mart-services` Worker
       +-- Durable Objects
       +-- Queues + DLQ
       +-- Workflows
       +-- Analytics Engine
```

## Core platform + v8.6 highlights

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
npm run v8.6:doctor
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

1. Replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc`.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY` as Wrangler secrets.
3. Export/backup the production D1 database.
4. Run `npm run deploy:cloudflare:production` (or `DEPLOY-HARIYO-V8.6.1.cmd`). The connected deploy verifies the services Worker, applies D1 migration `0009`, builds OpenNext and deploys the public Worker in the safe order.
5. Verify `/api/health`, `/api/system/readiness`, `/shop`, `/nearby`, a live product gallery and `/admin/matching-engine`.

See `docs/V8_2_CLOUDFLARE_PRODUCTION_GUIDE.md` for the complete Windows/PowerShell production procedure.


## v8.4.1 — Real photos and demo access

- 98 built-in catalog products now render photographic seed imagery rather than SVG placeholders.
- Complete role-based demo identities are available through `DEMO-ACCOUNTS.md`.
- Shared demo password: `HariyoDemo@2026`.
- Seed locally with `npm run demo:seed:local`; seed a dedicated staging/demo D1 with `npm run demo:seed:remote`.
- Keep `NEXT_PUBLIC_DEMO_MODE=false` for a real production launch and remove demo users with `npm run demo:remove:remote`.


## v8.6.1 deployment

For Cloudflare Workers Builds use `npm run build:cloudflare` followed by `npm run deploy:cloudflare:connected`. The deploy step verifies `hariyo-mart-services`, applies D1 migrations before web cutover, and then publishes `hariyo-mart-nepal`. See `CLOUDFLARE_CONNECTED_DEPLOY.md`.
