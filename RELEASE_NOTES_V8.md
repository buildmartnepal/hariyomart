# Hariyo Mart Nepal v8.0.0 — Cloudflare-Native Produce SaaS

## Release goal

v8 removes Supabase from the production runtime and makes Hariyo Mart a Cloudflare-native multi-tenant produce operating system. The existing marketplace remains intact while the supply side gains tenant isolation, procurement, warehouse, lot/quality, wholesale, routing, subscriptions and platform administration.

## Architecture replacement

| v7 hybrid dependency | v8 Cloudflare-native replacement |
|---|---|
| Supabase PostgreSQL | Cloudflare D1 business system of record |
| Supabase Auth | Workers auth + D1 users/refresh sessions + HttpOnly browser cookies + SecureStore mobile refresh tokens |
| Supabase Realtime | TenantRealtimeHub Durable Object + Hibernatable WebSockets |
| Supabase authorization/RLS | Worker authorization + fresh D1 tenant membership/role checks on every protected tenant API |
| External database coordination | Per-product InventoryCoordinator Durable Objects |

Cloudflare KV remains cache/config only. R2 remains durable media/document storage. Queues carry asynchronous domain events. Workflows execute durable multi-step order/subscription processes. Analytics Engine receives high-cardinality operational events.

## New tenant SaaS capabilities

- Multi-business membership for one user, active tenant switching and role isolation.
- Starter/Growth/Enterprise plan catalog, tenant subscriptions, domains and tenant settings.
- Farms, suppliers, wholesale/institutional customers and tenant teams.
- Harvest forecasts and supply planning.
- Warehouses, cold rooms, bins and stock-location model.
- Produce variants, grades, pack sizes, lots, harvest/expiry/best-before dates and FEFO-ready lot data.
- Quality checks, rejection, waste/spoilage and traceability.
- Purchase orders, receiving schema, transfers, stock counts and inventory ledger.
- Retail/wholesale/contract price lists and quantity breaks.
- Sales orders and stock reservations.
- Delivery routes/stops and proof-of-delivery-ready records.
- Payments, supplier settlements and B2B credit fields.
- Recurring weekly/biweekly/monthly produce boxes.
- Platform outbox, Queue event bus, retry/dead-letter architecture and audit trail.
- Tenant operational reports and platform aggregate operations views.

## Inventory correctness

Checkout now fails closed in production if the coordination Worker is not reachable. Every product is mapped to its own `InventoryCoordinator` Durable Object, which serializes reserve/commit/release/restore/adjust operations for that product. Cancellation inventory recovery uses idempotent operation IDs and is also written to the outbox so a Queue retry cannot double-return stock.

## Security upgrades

- Cloudflare Turnstile server validation for browser login/registration when configured.
- Mobile-safe transition mode keeps mobile auth rate-limited while Turnstile is enabled for web; switch enforcement to `all` only after adding a mobile challenge flow.
- Tenant membership and role authorization is read fresh from D1 rather than trusted from user-editable metadata.
- Sensitive Cloudflare and payment credentials remain Worker secrets, never `NEXT_PUBLIC_*`/Expo public values.
- Existing secure refresh-session architecture and HttpOnly browser cookies are preserved.

## Realtime and background processing

- `TenantRealtimeHub` provides tenant-scoped WebSocket fan-out.
- `OrderFulfillmentWorkflow` starts from `order.created` events.
- `SubscriptionGenerationWorkflow` creates recurring sales orders and advances subscription dates.
- Scheduled outbox drain moves retriable integration/event work into Cloudflare Queues.
- Queue consumers write audit/analytics events and retry failed messages.

## Compatibility

The v6.4/v7 marketplace routes and catalog are preserved. The old `apps/api` package remains only as a legacy compatibility adapter; production Next.js `/api` continues through the Worker/D1 route.
