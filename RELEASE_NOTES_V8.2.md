# Hariyo Mart Nepal v8.2.0 — Cloudflare Commerce Production Release

v8.2 turns the v8.1 Cloudflare-native marketplace into a more complete commerce operating system while adopting the production Worker identity and URL supplied for `hariyomart`.

## Wrangler / Cloudflare production configuration

- Web Worker renamed consistently to `hariyomart`.
- Production URL set to `https://hariyomart.nishrutesh.workers.dev`.
- Keeps the user-supplied compatibility date `2026-08-14` and flags `nodejs_compat` + `global_fetch_strictly_public`.
- Restores all bindings required by the real application instead of using a minimal OpenNext-only shell:
  - D1 `HARIYO_DB`
  - KV `HARIYO_KV`
  - R2 `HARIYO_MEDIA`
  - R2 `NEXT_INC_CACHE_R2_BUCKET`
  - Queue producer `HARIYO_EVENTS`
  - service binding `HARIYO_SERVICES`
  - OpenNext `WORKER_SELF_REFERENCE`, matching the Worker name exactly
- Enables source-map upload and Worker observability.
- Declares required production secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `TURNSTILE_SECRET_KEY`.
- Production config validation now checks resource IDs, Worker identity/self-reference, required bindings, secrets, queues, Durable Objects, Workflows, observability and Turnstile readiness.
- The Turnstile site key remains intentionally placeholder-safe in the distributable source and must be replaced before production deployment.

## Commerce control plane

New D1 migration `0005_commerce_control_plane.sql` adds:

- persistent signed-in shopping carts and cart lines
- coupons, redemption ledger and per-user redemption counters
- delivery-slot capacity and reservation state
- RMA / return requests and return line items
- product price history
- inventory alert rules
- commerce event records
- order-level coupon, discount and delivery-slot references

## Checkout hardening

- Signed-in carts synchronize between browser sessions through D1 while preserving guest/local cart fallback.
- Checkout accepts coupon codes and revalidates them on the server; browser calculations are never authoritative.
- Coupon global and per-user redemption capacity is reserved server-side and compensated if checkout fails.
- Delivery slot capacity is reserved with a conditional D1 write and released automatically if checkout fails.
- Checkout idempotency is preserved across inventory, coupon and slot coordination.
- Durable Object inventory reservation remains the authoritative stock coordination path in production.
- Failed queue publication after a committed order writes an `integration_outbox` fallback instead of turning a successfully created order into a false checkout failure.
- Order responses include discount and delivery-slot state.

## Buyer experience

- Checkout now includes delivery-slot selection and coupon entry.
- Order summary visibly reports cloud-synchronized basket state for authenticated buyers.
- Buyer order documents include actual order items, enabling real RMA creation.
- Account → Returns is backed by D1 and can create a return request against eligible purchased items.
- Return request status is visible by RMA/order number.

## Seller / admin commerce operations

- New `commerce-control` workspace for farmers and admins.
- 30-day order count and gross sales snapshot.
- Open return queue.
- Low-stock and expiring-lot indicators.
- Return approval, receiving, refund and rejection actions.
- Tenant inventory alert-rule creation.
- Product price edits write immutable price-history records.

## Retained v8.1 improvements

- semantic light/dark theme contrast fixes
- dark navigation and mobile drawer readability
- light footer/newsletter contrast fixes
- Cloudflare-native auth with HttpOnly browser sessions
- tenant memberships and workspace switching
- R2 product media
- seller Product Studio and moderation lifecycle
- D1 produce/supply SaaS schema
- Durable Object stock coordination
- Queues, Workflows, Analytics Engine and realtime tenant hub architecture

## Release validation commands

```powershell
npm ci
npm run v8.2:doctor
npm run cloudflare:config:check
npm run validate
npm run smoke
npm run cloudflare:types
npm run typecheck
npm run build:cloudflare
```

`cloudflare:config:check` intentionally fails until the real Turnstile site key replaces the source placeholder.
