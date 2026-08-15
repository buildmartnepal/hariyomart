# v8.4 Farmer OS implementation guide

## Product architecture

Hariyo Mart v8.4 has four connected surfaces over one tenant model:

1. Consumer marketplace — household discovery, cart, checkout, delivery, returns.
2. Buyer workspace — procurement requirements and incoming farm offers.
3. Farmer Studio — crop planning, farm costs, inventory, orders, demand matching, traceability and SaaS.
4. Platform admin — tenant control, plans, supply network, events and operational moderation.

All operational records use Cloudflare D1 through Worker bindings. Media remains in R2, configuration/cache in KV, async events in Queues, coordination/realtime in the private services Worker, and optional AI through Workers AI.

## New Farmer Studio routes

- `/farmer/overview`
- `/farmer/farm-planning`
- `/farmer/profitability`
- `/farmer/buyer-demand`
- `/farmer/traceability`
- `/farmer/ai-advisor`
- existing `/farmer/business-center`, inventory, lots, procurement, pricing, subscriptions, routes and reports remain intact.

## Buyer demand loop

```text
Buyer publishes requirement
        ↓
Hariyo stores buyer demand
        ↓
Farmer tenant matching
(product/category + geography)
        ↓
Farmer sends offer
        ↓
Buyer sees offer count/best rate
        ↓
Future contract/order conversion
```

The v8.4 schema deliberately separates demand/offers from sales orders so negotiation does not mutate inventory or create a financial document before the buyer selects a supplier.

## Crop economics

Crop cycles model production intent and expected economics. Farm expenses can be linked to a cycle. The profitability API returns both 30-day operating contribution and cycle economics, so a farmer can evaluate production before a full accounting module is enabled.

## Traceability

A lot has one public token and many append-only events. The public trace endpoint does not expose user IDs, internal costs or private tenant controls. It exposes only product/lot/origin information and explicitly recorded trace events.

## Hariyo AI safety and resilience

Hariyo AI receives a compact tenant business snapshot. It is asked to answer from that data only and not invent external weather, crop-disease, price, regulatory or legal facts. If the AI binding is absent or inference fails, v8.4 returns a deterministic business summary so Farmer Studio remains functional.

The current model is `@cf/zai-org/glm-4.7-flash`. The binding is declared in `apps/web/wrangler.jsonc` as `AI`.

## SaaS metering

`tenant_usage_daily` is intentionally generic. v8.4 records:
- `crop_cycles_created`
- `expenses_recorded`
- `buyer_demand_offers`
- `traceability_events`
- `ai_calls`

This supports future billing/entitlement checks without introducing a separate usage service.

## Plan enforcement

The plan catalog is operational, not decorative. v8.4 enforces:

- `max_products` when a tenant creates a product listing;
- `max_warehouses` when a tenant creates an active warehouse;
- the `subscriptions` capability before a recurring produce subscription can be created;
- `max_ai_monthly` before Hariyo AI inference.

The checks fall back to Starter limits when a legacy tenant has no explicit subscription row, preserving safe multi-tenant defaults.

## Production migration

Back up D1 before applying the new migration.

```powershell
npm run cloudflare:types
npm run typecheck
npm run v8.4:doctor
npm run cloudflare:db:remote
```

Then deploy the private services Worker before the web Worker.
