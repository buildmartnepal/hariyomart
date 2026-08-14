# Hariyo Mart Nepal v7.0.0 — Cloudflare + Supabase Produce OS

## Major upgrade

v7 adds a production migration architecture for a multi-tenant vegetable, fruit and fresh-produce SaaS while preserving the working v6.4 Cloudflare marketplace during cutover.

### New Supabase transactional model

- tenant organizations and memberships with PostgreSQL RLS
- SaaS plans, subscriptions and tenant settings
- farms, suppliers, customers, warehouses, cold-room bins and delivery zones
- product master, variants/SKUs, barcodes, grade, pack size and wholesale/retail pricing
- harvest forecasts
- produce lots, harvest/best-before dates and traceability
- quality checks and evidence keys
- append-only inventory movement ledger with atomic lot balance protection
- waste/spoilage/loss events
- price lists and quantity breaks
- purchase orders and goods receipts
- sales orders, stock reservations and fulfillments
- delivery routes/stops and proof-of-delivery support
- payments, supplier settlements and recurring produce subscriptions
- notifications, audit events and integration outbox
- Realtime publication setup for operational tables

### New tenant/admin workspace modules

Farmer tenant workspace now includes supply planning, procurement, lots/quality, warehouses, pricing, wholesale, delivery routes, subscriptions, reports and team access.

Admin workspace adds SaaS tenants, plans/billing, supply network, platform events and data platform screens.

### Cloudflare architecture

- existing Workers/OpenNext app remains the public runtime
- R2 remains media/document storage
- KV is explicitly cache/config only
- Queues remain the async event layer
- Durable Objects remain coordination/rate-limit infrastructure
- optional Hyperdrive template added for trusted direct PostgreSQL jobs
- D1 remains available only as a transition/read-model path until Supabase cutover

### Operations

- `/api/system/supply-stack` reports redacted Cloudflare/Supabase setup state
- `npm run v7:doctor` checks required v7 artifacts and environment readiness
- complete staged D1 → Supabase migration/runbook added

## Important cutover note

This release intentionally avoids silently switching the existing production marketplace from D1/custom sessions to Supabase in one deployment. Deploy the Supabase schema, validate RLS, backfill data, reconcile, then switch the transactional/auth paths in a controlled production cutover.
