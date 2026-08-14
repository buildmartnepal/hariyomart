# Hariyo Mart Nepal v7.0 — Cloudflare + Supabase Multi-Tenant Produce SaaS

This is the production rollout guide for the v7 architecture. The goal is to keep Cloudflare as the application/edge/security layer and make Supabase PostgreSQL the authoritative transactional database for each tenant.

## 1. Target architecture

```mermaid
flowchart LR
  U[Buyer / Tenant Staff / Expo App] --> CF[Cloudflare DNS + CDN + WAF + Turnstile]
  CF --> W[Next.js 16 on Cloudflare Workers / OpenNext]
  W --> R2[(R2 media + documents)]
  W --> KV[(KV cache + tenant config)]
  W --> Q[Cloudflare Queues]
  W --> SVC[Private Services Worker]
  SVC --> DO[Durable Objects checkout / rate limiting]
  W --> SBA[Supabase Auth + Data API]
  SBA --> PG[(Supabase PostgreSQL)]
  PG --> RT[Supabase Realtime]
  RT --> U
  W -. optional trusted SQL .-> HD[Cloudflare Hyperdrive]
  HD -. internal jobs / reporting .-> PG
  D1[(D1 v6.4 transition/read model)] -. temporary migration source .-> W
```

### Source-of-truth rule

- **Supabase PostgreSQL:** tenants, memberships, products/SKUs, suppliers, customers, purchase orders, lots, inventory ledger, sales orders, reservations, fulfillments, delivery routes, payments, settlements, subscriptions, audit/outbox.
- **Supabase Auth:** identities, sessions, password reset, MFA/passkeys when enabled.
- **Supabase Realtime:** live order, lot, stock, route and notification changes.
- **R2:** product photos, quality-check evidence, invoices/PDFs, proof-of-delivery images, exports and backups.
- **KV:** feature flags, tenant theme/config cache, public catalogue cache, rate-limit/config hints. Never use KV as the authoritative stock/order/payment store.
- **Queues:** notifications, exports, webhook delivery, audit fan-out, search indexing and other retryable background work.
- **Durable Objects:** serialization where concurrent operations need a coordinator, especially checkout/reservation and rate limiting.
- **D1:** v6.4 compatibility during migration. Do not continue adding new transactional modules to D1 after v7 cutover.
- **Hyperdrive:** optional for trusted Worker-to-Postgres SQL paths. Primary user-scoped CRUD should use Supabase Auth + Data API so PostgreSQL RLS receives the user JWT context.

## 2. What v7 manages for a vegetable / fruit business

### Tenant SaaS

Every farm, cooperative, wholesaler or produce supplier is an `organization` with isolated data. Membership roles are owner, admin, manager, procurement, inventory, sales, delivery, accounting, farmer and viewer. A user can belong to multiple organizations.

Each organization has its own plan, settings, product catalogue, stores/warehouses, suppliers, customers, pricing, procurement, inventory, orders, deliveries and reports. The schema never authorizes a user from editable user metadata; tenant access comes from `organization_members` and RLS helper functions.

### Product master

The product layer supports vegetables, fruits, leafy greens, herbs, roots/tubers, mushrooms, processed produce, bundles and packaging. Each product can have multiple variants/SKUs for grade, size, pack size, barcode, wholesale/retail price and minimum order quantity.

### Harvest and procurement

- harvest forecasts by farm, expected date, quantity and confidence
- farmer/cooperative/wholesaler supplier master
- purchase orders and approval state
- goods receipts with accepted/rejected quantity
- lot creation and unit cost capture
- supplier payment terms and settlement preparation

### Freshness, lot and cold-chain control

- lot number and traceability metadata
- harvest date, received date and best-before date
- quality grade and evidence
- ambient/cool/chilled/frozen warehouse bins
- FEFO-ready indexes for earliest-expiry allocation
- spoilage, damage, expiry, donation and disposal events
- waste/loss reporting

### Inventory

`inventory_movements` is an append-only ledger. An insert trigger updates the related lot quantity atomically and refuses movements that would create negative stock. Update/delete permissions are revoked for the ledger.

Recommended movement types: opening, receipt, sale, reservation, reservation release, transfer in/out, return, adjustment, spoilage and disposal.

### Pricing and B2B

- default cost, retail and wholesale price per SKU
- price lists by retail/wholesale/contract/restaurant/institution
- quantity breaks
- customer-specific contracts
- customer credit limits and payment days
- hotel/restaurant/school/hospital/corporate/reseller customer types

### Sales and fulfillment

- storefront/manual/phone/WhatsApp/marketplace/subscription/API order channels
- idempotency key per tenant
- stock reservations by lot
- picking, packing, dispatch and delivery states
- proof of delivery
- customer payments and supplier settlements

### Last-mile delivery

- delivery zones, minimum order, cutoff and fee rules
- route date, driver and vehicle assignment
- ordered stops, ETA and delivery result
- failed/skipped stop capture

### Recurring produce boxes

Weekly, biweekly, monthly or custom subscriptions can keep customer preferences, flexible box contents, next delivery date and estimated total.

## 3. Supabase project setup

### 3.1 Create the project

Create one Supabase project for the production Hariyo Mart SaaS and a separate project or branch for staging. Choose a region appropriate for your users and Cloudflare/Supabase architecture.

In the Supabase Dashboard copy:

- Project URL → `SUPABASE_URL`
- Publishable key (`sb_publishable_...`) → client/browser/mobile configuration
- Secret key (`sb_secret_...`) → server-only Cloudflare Worker secret

Do not put the secret key in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

### 3.2 Create the migration correctly

The repository intentionally keeps the reviewed SQL at:

```text
supabase/schema/v7_supply_saas.sql
```

Generate a real timestamped migration with the Supabase CLI rather than inventing a filename:

```bash
supabase --help
supabase migration new v7_supply_saas < supabase/schema/v7_supply_saas.sql
```

For local Supabase development with Docker available:

```bash
supabase start
supabase db reset
supabase db advisors
```

Fix advisor findings before production. Then link the intended project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

For a first staging setup where Docker is unavailable, you can review and run the schema in the Supabase SQL Editor, but return to migration-based deployment before production so schema history remains reproducible.

### 3.3 Confirm Data API exposure and RLS

The migration explicitly grants the required `anon`/`authenticated` table access and enables RLS. After deployment:

1. Confirm `public` is an exposed schema in Data API settings.
2. Confirm every operational table shows RLS enabled.
3. Confirm an authenticated user cannot read another organization's rows.
4. Confirm `inventory_movements` and `audit_events` cannot be updated/deleted by authenticated users.
5. Confirm shared `plans` and global produce categories are readable as intended.

### 3.4 Authentication settings

Recommended production baseline:

- Email confirmation ON for public signup.
- Configure a production SMTP provider for branded auth emails.
- Add allowed redirect URLs for the Workers production domain and custom domain.
- Enable MFA/passkeys after the base login flow is verified.
- Keep authorization roles in `organization_members`; never trust user-editable metadata for permissions.

## 4. Cloudflare setup

The existing v6.4 resources remain valid during migration:

- Worker: `hariyo-mart-nepal`
- Private services Worker: `hariyo-mart-services`
- R2: `hariyo-mart-media`
- R2 OpenNext cache bucket
- KV: `HARIYO_KV`
- D1: `HARIYO_DB` (transition/read model)
- Queue: `hariyo-mart-events`
- Durable Objects: checkout coordinator and rate limiter

### 4.1 Worker secrets

Set the Supabase server values on the public Worker:

```bash
cd apps/web
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SECRET_KEY
```

Also keep the existing v6.4 session/bootstrap secrets while the compatibility auth path is enabled:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
npx wrangler secret put ADMIN_BOOTSTRAP_KEY
```

Then verify the redacted stack endpoint:

```bash
curl https://YOUR_DOMAIN/api/system/supply-stack
```

Expected after schema deployment:

```json
{
  "version": "7.0.0",
  "mode": "cloudflare-supabase",
  "sourceOfTruth": "supabase-postgresql",
  "supabase": {
    "configured": true,
    "reachable": true,
    "schemaReady": true
  }
}
```

### 4.2 R2 object naming

Use immutable, tenant-prefixed keys:

```text
tenants/{organizationId}/products/{productId}/{uuid}.webp
tenants/{organizationId}/lots/{lotId}/quality/{uuid}.webp
tenants/{organizationId}/orders/{orderId}/pod/{uuid}.webp
tenants/{organizationId}/exports/{yyyy-mm}/{uuid}.csv
```

Store only the R2 object key in PostgreSQL. The API decides whether a file is public, signed or private.

### 4.3 KV key conventions

Recommended keys:

```text
tenant:{organizationId}:public-config
tenant:{organizationId}:feature-flags
catalog:{organizationId}:{hash}
delivery-zone:{organizationId}:{zoneId}
platform:public-config
```

Do not store stock balances, lot balances, payment state, order state, role membership or permission truth in KV.

### 4.4 Queue topics

One physical Cloudflare Queue is sufficient initially. Put the logical topic in each message:

```text
order.created
order.confirmed
inventory.low_stock
inventory.expiry_warning
lot.quality_failed
delivery.route_started
delivery.completed
payment.paid
settlement.approved
notification.requested
export.requested
webhook.requested
```

Keep handlers idempotent. Use a dedupe key where the external effect must occur only once.

### 4.5 Durable Objects

Keep the existing checkout coordinator. In the v7 cutover, coordinate by an order/idempotency key and have the coordinator perform the reservation transaction through the authoritative database path.

Use Durable Objects for concurrency coordination, not as a replacement for the PostgreSQL business ledger.

## 5. Optional Cloudflare Hyperdrive

Cloudflare recommends Hyperdrive when a Worker connects directly to external PostgreSQL. For Supabase, create Hyperdrive from the **direct** PostgreSQL connection string; do not point Hyperdrive at Supabase's pooled connection string because Hyperdrive performs pooling itself.

Example:

```bash
npx wrangler hyperdrive create hariyo-supabase \
  --connection-string="postgres://USER:PASSWORD@DIRECT_SUPABASE_HOST:5432/postgres"
```

Copy the returned ID and merge the block in:

```text
infra/cloudflare/hyperdrive.supabase.example.jsonc
```

into `apps/web/wrangler.jsonc`, then regenerate Worker types:

```bash
npm run cloudflare:types
```

### Hyperdrive safety rule

Direct PostgreSQL connections do not automatically receive the Supabase user's JWT/RLS context. Therefore:

- use Supabase Auth + Data API for user-scoped requests where RLS must authorize each row;
- use Hyperdrive only for trusted internal jobs/reporting or implement an explicit secure session-context design before using it for tenant CRUD;
- every trusted direct-SQL query must still include explicit `organization_id` filters and API authorization.

## 6. Supabase Realtime

The v7 schema adds these tables to `supabase_realtime` when the publication exists:

- `sales_orders`
- `fulfillments`
- `produce_lots`
- `inventory_movements`
- `delivery_routes`
- `notifications`

Use tenant filters in the client subscription and keep RLS active. Realtime is for UI freshness, not for business correctness; the database transaction remains authoritative.

Suggested live screens:

- packing dashboard
- stock/lot board
- delivery route board
- low-stock/expiry alert center
- customer order tracking

## 7. Multi-tenant onboarding flow

1. User signs up with Supabase Auth.
2. Auth trigger creates `profiles`.
3. User creates an `organization` with `created_by = auth.uid()`.
4. Organization trigger creates owner membership, tenant settings and trial SaaS subscription.
5. Owner creates first warehouse/collection center.
6. Owner adds farms/suppliers.
7. Owner creates/imports products and variants.
8. Owner invites procurement/inventory/sales/delivery/accounting staff.
9. Tenant config is cached in KV after commit.
10. Storefront is enabled on `{slug}.your-domain` or mapped custom domain.

## 8. Recommended tenant plans

### Starter

Good for a farm, micro supplier or small vegetable shop.

- 3 members
- 1 warehouse
- 150 products
- lots/inventory/orders/realtime

### Growth

Good for wholesalers, cooperatives and multi-location suppliers.

- 10 members
- 5 warehouses
- 2,000 products
- procurement
- routes
- reports
- API access

### Enterprise

Good for large distributors or regional networks.

- larger team and warehouse limits
- custom domain
- advanced roles
- priority support
- full feature entitlement

The database seed creates these as editable starting values; actual billing prices and entitlement policy should be set before commercial launch.

## 9. D1 → Supabase migration plan

Do not perform a big-bang switch on production orders.

### Phase A — prepare

- Deploy v7 code while D1 remains active.
- Create Supabase schema.
- Create tenant mapping table externally or in a one-time migration script: D1 `tenant.id` → Supabase `organization.id`.
- Create user mapping: existing D1 user → Supabase Auth user.
- Freeze schema changes to old D1 business tables.

### Phase B — backfill masters

Move in this order:

1. tenants → organizations
2. users → Supabase Auth + profiles + organization_members
3. categories
4. products → products + default variants
5. service areas → delivery_zones
6. existing inventory → opening lots + opening inventory movements
7. buyers → customers where applicable

Validate counts and tenant ownership after each import.

### Phase C — backfill open operations

Move only the operational records that still matter:

- open orders
- active fulfillments
- pending payouts/settlements
- unresolved support or operational references as needed

Keep historical D1 as a read-only archive if moving every historical row adds more risk than value.

### Phase D — dual-read verification

For a controlled period:

- write new v7 test tenants to Supabase only;
- compare catalogue/order/inventory totals between systems;
- run tenant-isolation tests;
- run checkout race tests;
- run expiry/FEFO tests;
- run mobile auth/session tests.

Do not dual-write indefinitely. Dual-write creates reconciliation problems and two sources of truth.

### Phase E — cut over

- switch production auth to Supabase Auth;
- switch product/inventory/order APIs to Supabase PostgreSQL;
- leave D1 mounted only for legacy history/read model if needed;
- stop all transactional writes to D1;
- monitor queue failures, database errors, checkout latency and authorization failures.

### Phase F — retire old auth/data writes

After a stable period:

- remove custom JWT session code
- rotate/remove legacy session secrets
- remove D1 transactional mutations
- keep only intentionally retained edge projections or archives

## 10. API design for v7

Keep public/mobile traffic same-origin through Cloudflare Worker APIs when practical:

```text
/api/auth/*
/api/tenant/*
/api/suppliers/*
/api/products/*
/api/lots/*
/api/inventory/*
/api/procurement/*
/api/orders/*
/api/fulfillment/*
/api/delivery/*
/api/reports/*
```

For each request:

1. validate the Supabase session JWT;
2. resolve the active organization membership;
3. validate input with Zod;
4. call Supabase Data API with the user JWT for RLS-backed row access, or use a trusted server path only when required;
5. enqueue non-critical work;
6. return the request result;
7. never trust `organization_id` solely because the client sent it.

## 11. Produce-specific operational rules

### FEFO

Allocate lots by `best_before_date ASC NULLS LAST, received_date ASC` unless a tenant explicitly overrides the strategy.

### Expiry

A scheduled job should mark past-best-before lots as expired/quarantine according to tenant policy and enqueue alerts before expiry.

### Quality rejection

Rejected receiving quantity should never enter sellable inventory. Record rejected quantity and reason on the goods receipt line.

### Transfers

Warehouse transfers create paired movements: transfer-out from source and transfer-in to destination. Link both with a common reference.

### Reservations

Checkout should create reservations before final confirmation. Reservations must expire/release if payment or confirmation fails.

### Waste

Every spoilage/disposal event should create a negative inventory movement and a waste event with estimated loss.

### Pricing

Never overwrite historical order prices when a product price changes. Sales order lines store the actual unit price used for that order.

## 12. Security checklist before launch

- [ ] RLS enabled on every exposed tenant table.
- [ ] Cross-tenant read/write tests fail as expected.
- [ ] `SUPABASE_SECRET_KEY` exists only in Worker/server secrets.
- [ ] Browser/mobile receive only publishable keys.
- [ ] Cloudflare WAF/Turnstile protects public auth and abuse-prone endpoints.
- [ ] R2 objects are private by default unless intentionally public.
- [ ] Upload MIME/type/size validation is enforced by Worker.
- [ ] Inventory/audit ledgers are append-only.
- [ ] Payment webhooks are signature verified and idempotent.
- [ ] Queue consumers are idempotent and have a dead-letter path.
- [ ] Admin/support actions are audited.
- [ ] Production SMTP is configured for Supabase Auth.
- [ ] Backups and restore test completed.
- [ ] Supabase database advisors are clean or findings are accepted/documented.

## 13. Local developer workflow

Existing marketplace/D1 transition path:

```bash
npm ci
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run cloudflare:db:local
npm run dev
```

Supabase local stack in a separate terminal:

```bash
supabase start
supabase migration new v7_supply_saas < supabase/schema/v7_supply_saas.sql
supabase db reset
supabase db advisors
```

Run repository checks:

```bash
npm run v7:doctor
npm run typecheck
npm run test
npm run build
npm run build:cloudflare
```

## 13.1 Windows PowerShell quick start

For the Windows setup used by this project, PowerShell commands are:

```powershell
npm ci
Copy-Item apps/web/.dev.vars.example apps/web/.dev.vars
npm run cloudflare:db:local
npm run dev
```

Create the Supabase migration without relying on shell input redirection:

```powershell
supabase migration new v7_supply_saas
$migration = Get-ChildItem supabase/migrations/*_v7_supply_saas.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item supabase/schema/v7_supply_saas.sql $migration.FullName -Force
supabase db reset
supabase db advisors
```

For production, link the intended project and review before pushing:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push --dry-run
supabase db push
```

## 14. Production deployment order

1. Back up current D1/R2 configuration.
2. Deploy Supabase schema to staging.
3. Run RLS and tenant-isolation tests.
4. Add Worker Supabase secrets.
5. Optionally create Hyperdrive and regenerate Wrangler types.
6. Deploy private services Worker.
7. Deploy web Worker.
8. Open `/api/system/supply-stack` and confirm `schemaReady: true`.
9. Sign in to admin and farmer workspaces; inspect the new v7 supply modules.
10. Backfill/migrate selected D1 data.
11. Cut over auth/data APIs only after reconciliation passes.
12. Monitor logs, queue retries, order creation, reservations and delivery updates.

## 15. Commands summary

```bash
# Repository
npm ci
npm run v7:doctor
npm run typecheck
npm run test
npm run build:cloudflare

# Supabase
supabase --help
supabase migration new v7_supply_saas < supabase/schema/v7_supply_saas.sql
supabase db reset
supabase db advisors
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push

# Cloudflare secrets
cd apps/web
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SECRET_KEY

# Cloudflare deployment
cd ../..
npm run cloudflare:types
npm run deploy:cloudflare
```

## 16. Files added/changed in v7

- `supabase/schema/v7_supply_saas.sql` — multi-tenant PostgreSQL/RLS schema
- `supabase/README.md` — migration workflow
- `infra/cloudflare/hyperdrive.supabase.example.jsonc` — optional Hyperdrive binding template
- `apps/web/lib/supply-saas.ts` — v7 module definitions
- `apps/web/components/SupplySaaSWorkbench.tsx` — tenant/admin supply SaaS UI
- `apps/web/server/cloudflare/supply-stack.ts` — redacted Supabase/Cloudflare readiness probe
- `scripts/v7-doctor.mjs` — architecture/config doctor
- `RELEASE_NOTES_V7.md` — release summary

