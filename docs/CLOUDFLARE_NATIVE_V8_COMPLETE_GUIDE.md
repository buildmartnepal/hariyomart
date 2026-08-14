# Hariyo Mart v8 — Complete Cloudflare-Native Setup Guide

This release removes Supabase from the production stack. Cloudflare now owns application runtime, SQL business data, coordination/realtime, object storage, cache/config, event delivery, durable workflows, bot protection and operational analytics.

## 1. Final stack

| Concern | Cloudflare product / v8 implementation |
|---|---|
| Next.js application/API | Workers + OpenNext |
| Transactional business data | D1 |
| Customer/staff auth | Worker auth + D1 users/sessions |
| Bot challenge | Turnstile |
| Race-free stock coordination | Durable Objects |
| Tenant realtime | Durable Objects + Hibernatable WebSockets |
| Images/documents/POD | R2 |
| Rebuildable cache/config | KV |
| Async events | Queues + dead-letter Queue |
| Long-running processes | Workflows |
| Operational event metrics | Analytics Engine |
| DNS/CDN/WAF/DDoS | Cloudflare edge/security |

## 2. Prerequisites

- Node.js 22+
- npm 11+
- Cloudflare account
- Wrangler 4.x+

From the project root:

```powershell
npm ci
npx wrangler --version
npx wrangler whoami
npm run v8:doctor
```

Use `npx wrangler <command> --help` if your installed Wrangler version reports a changed command/flag.

## 3. Cloudflare resources

The included Wrangler files already describe the required bindings. If you are provisioning a fresh account, create the backing resources first and copy their IDs/names into the Wrangler configs.

```powershell
npx wrangler d1 create hariyo-mart-production-apac
npx wrangler kv namespace create HARIYO_KV
npx wrangler r2 bucket create hariyo-mart-media
npx wrangler r2 bucket create hariyo-mart-opennext-cache
npx wrangler queues create hariyo-mart-events
npx wrangler queues create hariyo-mart-events-dlq
```

Do not create a PostgreSQL/Hyperdrive/Supabase connection for v8. D1 is the transactional database.

## 4. Configure Worker bindings

### `apps/web/wrangler.jsonc`

Confirm:

- `HARIYO_DB` → production D1
- `HARIYO_KV` → KV namespace
- `HARIYO_MEDIA` → R2 media bucket
- `NEXT_INC_CACHE_R2_BUCKET` → OpenNext cache bucket
- `HARIYO_EVENTS` → Queue
- `HARIYO_SERVICES` → `hariyo-mart-services` service binding
- public site/API URLs
- `TURNSTILE_ENFORCEMENT_MODE`

### `infra/cloudflare/services/wrangler.jsonc`

Confirm the **same D1 database**, Queue, dead-letter Queue, Analytics Engine dataset, Durable Object classes and Workflows.

After any binding change:

```powershell
npm run cloudflare:types
```

## 5. Apply D1 migrations locally first

```powershell
npm run cloudflare:db:local
npm run v8:doctor
```

The v8 migration adds tenant membership, SaaS plan/subscription records and the full produce supply-chain schema. The seed script backfills seller memberships/settings so fresh local workspaces can immediately access v8 modules.

## 6. Back up and migrate production D1

Before schema changes:

```powershell
npx wrangler d1 export hariyo-mart-production-apac --remote --output hariyo-before-v8.sql
```

Review pending migrations:

```powershell
npx wrangler d1 migrations list hariyo-mart-production-apac --remote
```

Apply migrations only:

```powershell
npm run cloudflare:db:remote
```

For an established production database, **do not seed demo data** unless you intentionally want the supplied reference catalog/operations. If you explicitly need it, run:

```powershell
npm --workspace apps/web run cf:seed:remote
```

The v8 migration itself contains safe backfills for existing tenants/users.

## 7. Configure secrets

Generate strong independent secrets and store them with Wrangler rather than writing them into `wrangler.jsonc`.

```powershell
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put ADMIN_BOOTSTRAP_KEY --config apps/web/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

Payment credentials are also Worker secrets when enabled. Never expose them in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## 8. Configure Turnstile

Create a Turnstile widget for the production hostname in Cloudflare. Put the public site key into the web build environment as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and the secret through `wrangler secret put TURNSTILE_SECRET_KEY`.

The package defaults to:

```text
TURNSTILE_ENFORCEMENT_MODE=web
```

This protects browser authentication while allowing the existing Expo client to use the rate-limited mobile API flow. After adding a mobile Turnstile challenge, switch the mode to `all`.

## 9. Deploy Cloudflare services first

The service Worker owns Durable Object classes, the Queue consumer, scheduled outbox drain, Analytics Engine binding and Workflows. Deploy it before web checkout is put into production because v8 checkout deliberately fails closed if inventory coordination is unavailable.

```powershell
npm run deploy:cloudflare:services
```

Check logs:

```powershell
npx wrangler tail hariyo-mart-services
```

## 10. Deploy the OpenNext web Worker

```powershell
npm run build:cloudflare
npm run deploy:cloudflare:web
```

Or after configuration is verified:

```powershell
npm run deploy:cloudflare
```

## 11. Verify the stack

Open:

```text
https://YOUR_DOMAIN/api/system/supply-stack
```

Expected high-level state:

- `mode: cloudflare-native`
- D1 `schemaReady: true`
- services `configured: true`
- inventory coordinator reachable
- Workflows available
- no Supabase dependency

Then test these journeys:

1. Buyer register/login/logout/refresh.
2. Farmer/cooperative registration creates a tenant + owner membership.
3. Farmer can switch between tenant memberships.
4. Product stock edit goes through the inventory coordinator.
5. Two concurrent checkouts cannot oversell the same product.
6. Cancellation returns stock exactly once even if the Queue event is retried.
7. Supply modules return only the active tenant's data.
8. Admin platform views can see tenant-safe aggregates.
9. Product/quality/POD media uploads resolve through R2.
10. Subscription Workflow creates due sales orders without duplicate runs.

## 12. Main tenant API map

```text
GET  /api/supply/overview
GET/POST /api/supply/suppliers
GET/POST /api/supply/customers
GET/POST /api/supply/warehouses
GET/POST /api/supply/harvest-plans
GET/POST /api/supply/lots
GET/POST /api/supply/quality
GET/POST /api/supply/purchase-orders
GET/POST /api/supply/price-lists
GET/POST /api/supply/delivery-routes
GET/POST /api/supply/subscriptions
GET      /api/supply/team
GET      /api/supply/reports
GET      /api/tenants/memberships
POST     /api/tenants/switch
```

Platform admin API map:

```text
GET /api/supply/platform/tenants
GET /api/supply/platform/plans
GET /api/supply/platform/network
GET /api/supply/platform/events
GET /api/system/supply-stack
```

## 13. Operating model for produce

### Procurement
Harvest forecast → supplier commitment → PO → receiving → quality check → lot → warehouse/bin.

### Inventory
Lot/grade/pack → stock movement → FEFO allocation → transfer/count → waste/expiry → reconciliation.

### Sales
Retail/B2B price list → sales order → inventory reservation → pick/pack → delivery route → POD → payment/settlement.

### Subscription
Customer box → schedule → Workflow generation → sales order → fulfillment → next delivery date.

## 14. Scaling beyond the first D1

Do not prematurely create one D1 database per tenant. Begin with v8's shared tenant-scoped database and measure actual query latency/throughput. If one database becomes a bottleneck, move large tenants to dedicated D1 databases and keep a control-plane database mapping tenant IDs to data-plane bindings. Preserve product-level Durable Object coordination during the move.

A production migration should be tenant-by-tenant:

1. Quiesce writes for that tenant.
2. Export/copy tenant rows.
3. Reconcile row counts, balances and inventory.
4. Flip the tenant database routing record.
5. Resume writes.
6. Keep the old copy read-only for rollback until verified.

## 15. Disaster recovery and operations

- Export D1 before high-risk migrations.
- Retain R2 object lifecycle/backups appropriate to business requirements.
- Watch Worker/D1/Queue errors and dead-letter messages.
- Keep Queue handlers idempotent.
- Use the audit log and `integration_outbox` to reconcile failed asynchronous operations.
- Rotate bootstrap/payment/JWT secrets if exposed.
- Remove/rotate `ADMIN_BOOTSTRAP_KEY` after owner bootstrap.
- Do not use KV as a recovery source for stock/order/payment state.

## 16. Optional next modules

The schema already supports richer screens for goods receiving, stock transfers, stock counts, supplier settlement, payment allocation, POD attachments, tenant invitations/domain verification and plan checkout. These are incremental UI/API enhancements, not another platform migration.
