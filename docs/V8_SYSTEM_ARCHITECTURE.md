# Hariyo Mart Nepal v8 System Architecture

## 1. Target architecture

```text
BUYER WEB / EXPO MOBILE / TENANT STAFF / PLATFORM ADMIN
                         │
                         ▼
          Cloudflare DNS + CDN + WAF + Turnstile
                         │
                         ▼
        Next.js 16 + OpenNext on Cloudflare Workers
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
  Cloudflare D1         R2                 KV
 business records   media/docs/POD    cache/config/flags
       │
       ├─────────────── service binding ───────────────┐
       ▼                                               ▼
Cloudflare Services Worker                         Queues
       │                                         event bus
       ├── InventoryCoordinator DO                   │
       ├── TenantSequence DO                         ├── audit
       ├── TenantRealtimeHub DO + WebSockets         ├── analytics
       ├── CheckoutCoordinator DO                    └── workflows
       └── RateLimiter DO                              │
                                                       ▼
                                              Cloudflare Workflows
                                              ├── fulfillment
                                              └── subscription runs
```

## 2. Data ownership rules

**D1 owns durable business truth:** tenants, memberships, users/sessions, products, suppliers, customers, farms, lots, warehouses, purchase/sales orders, deliveries, payments, settlements, subscriptions and audit/outbox records.

**Durable Objects coordinate contention:** inventory reservations/adjustments, checkout idempotency, document sequences and tenant WebSocket fan-out. DO storage is not used as a hidden replacement for the full business database.

**R2 owns binary objects:** product/lot/quality images, invoices/exports, proof-of-delivery attachments and future supplier documents.

**KV owns disposable edge data only:** cache entries, public configuration, feature flags and other data that can be rebuilt. Stock, money, authorization and order state never depend on KV consistency.

**Queues own delivery of asynchronous events, not business truth.** Queue handlers are idempotent because messages can be retried.

**Workflows own long-running execution state:** fulfillment orchestration, subscription generation and future approval/settlement/export flows.

## 3. Multi-tenant model

A user can belong to multiple tenant businesses through `tenant_members`. `users.active_tenant_id` selects the current workspace. Protected tenant APIs resolve the requested tenant and read the current membership from D1 before applying role gates.

Roles supported by the v8 data model:

- owner
- admin
- manager
- procurement
- inventory
- sales
- delivery
- accounting
- farmer
- viewer

Platform administrators remain separate from tenant roles.

## 4. Produce domain model

```text
Tenant
 ├─ Farms ── Harvest Plans
 ├─ Suppliers ── Purchase Orders ── Goods Receipts
 ├─ Products ── Variants / Grades / Packs
 │                └─ Produce Lots ── Quality Checks / Waste
 ├─ Warehouses ── Bins ── Transfers / Counts
 ├─ Price Lists ── Customer / Wholesale Terms
 ├─ Sales Orders ── Stock Reservations
 ├─ Delivery Routes ── Stops ── POD
 ├─ Payments / Settlements
 └─ Produce Subscriptions ── Subscription Runs
```

## 5. Inventory architecture

Each product ID maps deterministically to one `InventoryCoordinator` Durable Object. That gives one serialization point per product instead of one global inventory lock.

Checkout lifecycle:

1. Validate cart against D1.
2. Reserve quantity per product in the relevant InventoryCoordinator.
3. Commit reservations to D1 product stock.
4. Write order/fulfillment/payment/idempotency records through D1 batch operations.
5. If order persistence fails, restore committed stock through the same coordinator.
6. Publish `order.created` into the event bus.

Cancellation lifecycle uses `cancel:<order>:<product>` operation IDs. The HTTP path attempts immediate inventory restoration and also writes an outbox event. Queue replay uses the same operation ID, so retries are safe.

## 6. Realtime architecture

Each tenant ID maps to one `TenantRealtimeHub`. Browser/admin/farmer clients can connect over WebSocket for stock, order, delivery and workflow events. The Hibernation WebSocket model allows idle hubs to leave memory while connections remain attached to the Cloudflare network.

For a future very large tenant, realtime can be further sharded by `<tenant>:orders`, `<tenant>:inventory` and `<tenant>:delivery` without changing the business tables.

## 7. SaaS plans and tenancy

`plan_catalog` provides Starter, Growth and Enterprise limits/features. `tenant_subscriptions` tracks tenant plan/trial state and future billing-provider references. `tenant_domains` supports custom storefront domains. `tenant_settings_v8` stores order, inventory and delivery behavior per tenant.

Recommended entitlement enforcement order:

1. Resolve tenant + membership.
2. Load active plan/subscription.
3. Check feature/usage entitlement.
4. Run operation.
5. Emit usage/audit event to Analytics Engine/Queue.

## 8. Scale evolution

### Stage A — current v8
A shared D1 database with strict `tenant_id` scoping is easiest to operate and is appropriate while tenant volume is moderate. Durable Objects remove the most sensitive product-level write races.

### Stage B — high-volume tenants
Move large tenants to dedicated D1 databases while retaining a small control-plane D1 for tenant directory, plans and database routing. This follows D1's horizontal scale model. Migration tooling should copy one tenant at a time and flip a routing record only after reconciliation.

### Stage C — isolated execution when required
If customers eventually need separately deployed/custom code, evaluate Workers for Platforms. It is not required for v8's ordinary data-isolated SaaS tenancy.

## 9. Security boundaries

- Customer authentication is application auth implemented in Workers/D1; Cloudflare Access is not used as a consumer login replacement.
- Turnstile validates browser authentication challenges on the server.
- Rate limiting is stateful through a Durable Object.
- Password hashes and refresh-session records remain server side.
- Browser auth uses HttpOnly cookies; mobile refresh credentials use device secure storage.
- All mutations enforce allowed Origin/content type/body limits.
- Tenant authorization uses D1 membership checks, never browser claims alone.
- Worker secrets are configured outside source control.

## 10. Operational modules exposed in v8

Tenant APIs cover overview, suppliers, wholesale customers, warehouses, harvest plans, lots, quality, purchase orders, price lists, delivery routes, subscriptions, team access and reports. Platform APIs cover tenants, plans, network aggregates, events and data-stack readiness.

The schema also includes goods receipts, transfers, stock counts, payments and settlements so the next UI iterations can add richer forms without another database redesign.
