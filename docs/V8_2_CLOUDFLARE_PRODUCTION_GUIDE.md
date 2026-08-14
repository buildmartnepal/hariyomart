# Hariyo Mart Nepal v8.2 — Cloudflare Production & Commerce Guide

## 1. Final architecture

```text
Buyer / Farmer / Supplier / Staff / Admin / Expo Mobile
                         |
                         v
        Cloudflare DNS + CDN + WAF + Turnstile
                         |
                         v
          hariyomart OpenNext / Workers
                         |
       +-----------------+------------------+
       |                 |                  |
       v                 v                  v
      D1                R2                  KV
 business truth     media + cache       cache/config
       |
       v
       private service binding: HARIYO_SERVICES
       |
       +-- CheckoutCoordinator Durable Object
       +-- InventoryCoordinator Durable Object
       +-- RateLimiter Durable Object
       +-- TenantSequence Durable Object
       +-- TenantRealtimeHub Durable Object
       +-- Queues + dead-letter queue
       +-- Workflows
       +-- Analytics Engine
```

The web Worker handles UI, auth/API validation and same-origin application traffic. D1 is the business system of record. Durable Objects are used only where coordination/strong serialization is needed. R2 stores objects. KV is non-transactional cache/config only. Async events go to Queues and long-running business processes go to Workflows.

## 2. Why the supplied Wrangler snippet was merged rather than copied alone

The supplied config correctly establishes the OpenNext Worker identity, production URL, compatibility date and public variables. A production Hariyo Mart deployment also needs the bindings used by application code. Removing those bindings would make auth/data/media/checkout fail at runtime.

The v8.2 `apps/web/wrangler.jsonc` therefore keeps your values and adds the application bindings already provisioned in this project:

- `HARIYO_DB` — production D1
- `HARIYO_KV` — cache/config namespace
- `HARIYO_MEDIA` — product and document media
- `NEXT_INC_CACHE_R2_BUCKET` — OpenNext incremental cache
- `HARIYO_EVENTS` — event queue producer
- `WORKER_SELF_REFERENCE` — OpenNext self-service binding; target matches `name: hariyomart`
- `HARIYO_SERVICES` — private coordination Worker

It also enables `upload_source_maps`, observability and required-secret declarations.

## 3. Required production secrets

The following names are declared in `secrets.required` and must exist on the web Worker before deployment:

```text
JWT_SECRET
JWT_REFRESH_SECRET
TURNSTILE_SECRET_KEY
```

Set them interactively from the repository root:

```powershell
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

Do not place those values in `vars`, source code or Git.

Optional one-time bootstrap and payment credentials are not declared as required because the core application must be deployable without payment merchant onboarding. Set optional secrets only when those features are activated.

## 4. Turnstile site key

Replace:

```json
"NEXT_PUBLIC_TURNSTILE_SITE_KEY": "REPLACE_WITH_TURNSTILE_SITE_KEY"
```

with the public site key for the production hostname. The secret key must remain a Wrangler secret.

The deployment config checker intentionally blocks production deployment while the public site-key placeholder remains.

For a structural check before inserting the site key:

```powershell
$env:ALLOW_TURNSTILE_PLACEHOLDER="1"
node scripts/check-cloudflare-config.mjs
Remove-Item Env:ALLOW_TURNSTILE_PLACEHOLDER
```

## 5. Install and validate locally

From the extracted project root:

```powershell
npm ci
npm run v8.2:doctor
npm run validate
npm run smoke
```

Generate Cloudflare binding types:

```powershell
npm run cloudflare:types
```

Then run full type checks:

```powershell
npm run typecheck
```

## 6. Local D1 database

Apply all migrations including v8.2 commerce migration `0005`:

```powershell
npm run cloudflare:db:local
```

The migration adds synchronized carts, coupons, delivery slots, RMA returns, price history and inventory-alert rules.

Run the web application:

```powershell
npm run dev:web
```

## 7. Production backup before migration

Always export D1 before applying schema changes:

```powershell
npx wrangler d1 export hariyo-mart-production-apac --remote --output hariyo-pre-v8-2.sql
```

Keep the backup outside the repository after verification.

## 8. Apply production D1 migrations

```powershell
npm run cloudflare:db:remote
```

Verify the schema with a read-only query:

```powershell
npx wrangler d1 execute hariyo-mart-production-apac --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shopping_carts','coupon_codes','delivery_slots','return_requests','product_price_history','inventory_alert_rules');"
```

## 9. Configure / verify infrastructure services

The private service Worker is defined in `infra/cloudflare/services/wrangler.jsonc` and includes:

- CheckoutCoordinator
- RateLimiter
- InventoryCoordinator
- TenantSequence
- TenantRealtimeHub
- `hariyo-mart-events` Queue consumer/producer
- dead-letter queue
- fulfillment Workflow
- scheduled subscription Workflow
- Analytics Engine dataset

Deploy it before the web Worker:

```powershell
npm run deploy:cloudflare:services
```

## 10. Build and deploy web Worker

After replacing the Turnstile site key and setting required secrets:

```powershell
npm run cloudflare:config:check
npm run build:cloudflare
npm run deploy:cloudflare:web
```

Or run the combined deployment only after all validation passes:

```powershell
npm run deploy:cloudflare
```

A build-backed Wrangler dry run is available in v8.2:

```powershell
npm run cloudflare:deploy:dry-run
```

## 11. Post-deploy checks

Open or query:

```text
https://hariyomart.nishrutesh.workers.dev/api/health
https://hariyomart.nishrutesh.workers.dev/api/system/readiness
https://hariyomart.nishrutesh.workers.dev/api/system/supply-stack
```

Then manually verify:

1. Light and dark navigation readability.
2. Footer newsletter input/button readability.
3. Buyer registration and login with Turnstile.
4. Farmer login and tenant switcher.
5. Product creation/edit/photo upload.
6. Price edit and price-history record.
7. Stock edit and Durable Object coordination.
8. Add products to guest cart.
9. Sign in and confirm D1 cart synchronization.
10. Checkout with no coupon/slot.
11. Checkout with a valid coupon.
12. Checkout with a published delivery slot.
13. Buyer return request.
14. Farmer/admin return processing.
15. Queue/Workflow logs and dead-letter queue.

## 12. Commerce data flow

### Product selling

```text
Seller Product Studio
  -> tenant authorization
  -> R2 photo upload
  -> D1 product content
  -> moderation when needed
  -> price history on price change
  -> InventoryCoordinator on stock change
  -> public marketplace
```

### Buyer cart and checkout

```text
Guest cart (local)
  -> buyer signs in
  -> merge with D1 shopping cart
  -> server validates active products
  -> coupon reservation
  -> delivery-slot reservation
  -> InventoryCoordinator reservations
  -> D1 order + fulfillments + items + coupon ledger
  -> Queue order.created
  -> Workflow fulfillment
```

If checkout fails after coupon/slot allocation, v8.2 compensates those reservations. If Queue publishing fails after the D1 order is committed, the order remains successful and an `integration_outbox` record preserves the event for later delivery.

## 13. Returns / RMA

Buyer Account → Returns can create a case only against items found in the authenticated buyer's eligible order history. Seller/admin Commerce Control can move the case through approval, received and final resolution states.

The RMA records remain linked to order, tenant, buyer and return items in D1.

## 14. Inventory alerts

Farmer/Admin → Commerce Control can define tenant-wide:

- low-stock alerts
- out-of-stock alerts
- expiry-window alerts
- overstock alerts

The schema also supports product-specific rules through the backend API/product tooling.

## 15. Coupons

Coupons support:

- fixed or percentage discounts
- minimum subtotal
- maximum discount cap
- active date range
- global redemption cap
- per-user redemption cap
- global marketplace or tenant-specific applicability

The client may preview a discount, but checkout always revalidates and reserves server-side. Tenant-specific coupons are restricted to single-seller orders for that tenant in this release.

## 16. Delivery slots

The public checkout selector returns marketplace/global delivery slots. The backend also supports tenant-specific slots for single-seller orders. Capacity reservation is conditional and is compensated on failed checkout.

## 17. Authentication model

Browser:

- HttpOnly session cookies
- refresh sessions persisted/revocable in D1
- no access/refresh token exposure to browser JavaScript
- Turnstile and scoped Durable Object rate limiting

Mobile:

- explicit tokens only for the mobile client flow
- secure device storage expected

Authorization:

- fresh tenant membership checks for tenant operations
- role-specific write permissions
- platform admin is separate from tenant membership

## 18. Recommended release procedure

```powershell
npm ci
npm run v8.2:doctor
npm run validate
npm run smoke
npm run cloudflare:types
npm run typecheck
npm run build:cloudflare
npx wrangler d1 export hariyo-mart-production-apac --remote --output hariyo-pre-v8-2.sql
npm run cloudflare:db:remote
npm run deploy:cloudflare:services
npm run deploy:cloudflare:web
```

Do not run the final deployment until the Turnstile site key is replaced and required secrets exist in Cloudflare.
