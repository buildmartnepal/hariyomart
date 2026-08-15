# Hariyo Mart Nepal v8.4.0 — Farm-to-Market Operating System

v8.4 moves Hariyo Mart beyond marketplace + seller dashboard into a multi-tenant Farmer OS and B2B demand network while preserving the v8 Cloudflare-native supply chain, commerce control plane, Expo app and deploy-fixed two-Worker architecture.

## Implemented in v8.4

### Farmer OS command center
- 30-day farmer revenue and fulfilled-order count
- recorded farm expenses and operating contribution
- pending marketplace payout
- active products and stock units
- low-stock product count
- lots approaching best-before
- upcoming harvest cycles and expected volume
- matching B2B buyer requirements
- active B2B customer count
- Farmer OS monthly activity metering

### Crop & harvest planning
- crop cycles per tenant/farm/product
- planting and expected harvest dates
- area + unit
- expected and actual quantity
- target price and budget
- lifecycle status from planned to completed
- projected revenue and actual farm cost view

### Farm profitability
- categorized farm expense ledger
- optional crop-cycle and supplier linkage
- payment state and payment method fields
- 30-day operating contribution
- 90-day category spend
- crop-level estimated revenue, cost and margin

### B2B demand network
- buyers can publish produce requirements from `/account/business-demand`
- buyer type, product, quantity, frequency, target rate and delivery location/date
- farmer matching score using product/category availability + district/province proximity
- farmer offers with quantity and unit price
- buyer view shows offer count and best offer

### QR lot traceability
- traceability token per produce lot
- append-only lot events for harvest, QC, packing, storage, transfer, dispatch and delivery
- public trace route `/trace/[token]`
- public origin, lot, farm, harvest/grade and event timeline

### Hariyo recommendation engine
- low stock
- expiry risk
- matched buyer demand
- upcoming harvest
- recorded waste loss
- SaaS plan capacity pressure
- usable without AI inference

### Hariyo AI
- Workers AI binding `AI`
- model: `@cf/zai-org/glm-4.7-flash`
- English + Nepali questions
- tenant-context prompt with current products, crop cycles, expenses, B2B demand and marketplace revenue
- deterministic data-engine fallback if Workers AI is unavailable
- SaaS monthly AI-call metering using plan entitlements
- deliberately instructed not to invent missing weather, disease, market-price or legal facts

### SaaS entitlements + usage
Starter/Growth/Enterprise feature JSON is expanded for:
- harvest planning
- profitability
- buyer demand
- traceability
- AI recommendations
- inventory capability tiers
- CRM/team roles on higher plans
- API/custom-domain capability on Enterprise
- monthly AI-call limits

### Enforced SaaS limits
- active product creation is blocked when the tenant reaches its plan product allowance
- active warehouse creation is blocked at the plan warehouse allowance
- recurring produce-box subscriptions require Growth or Enterprise
- Hariyo AI enforces each plan's monthly AI-call allowance
- usage is accumulated in `tenant_usage_daily` for Business Center visibility and future billing

### Public Farmer OS positioning
The public home page now explains Crop Planning, Profitability, B2B Demand, Traceability, Hariyo AI and Farmer SaaS so the website sells the operating system—not only groceries.

### Mobile Farmer Studio
The Expo Farmer Studio now surfaces Farmer OS revenue, expenses, buyer matches, upcoming harvest and the top operational recommendations alongside the existing SaaS plan and harvest-publishing workflow.

## D1 migration

Apply `apps/web/migrations/0006_farmer_os_growth.sql` after migrations 0001–0005.

New tables:
- `crop_cycles`
- `farm_expenses`
- `buyer_demands`
- `buyer_demand_offers`
- `lot_traceability_events`
- `lot_traceability_links`
- `tenant_usage_daily`
- `farmer_recommendations`

## New API surface

```text
GET  /api/farmer-os/overview
GET/POST /api/farmer-os/crop-cycles
GET/POST /api/farmer-os/expenses
GET  /api/farmer-os/profitability
GET/POST /api/farmer-os/buyer-demands
POST /api/farmer-os/buyer-demand-offers
GET/POST /api/farmer-os/traceability
GET  /api/farmer-os/recommendations
POST /api/farmer-os/ai-assistant
GET  /api/trace/:token
```

## Deployment order

1. `npm ci`
2. `npm run cloudflare:types`
3. `npm run v8.4:doctor`
4. `npm run typecheck`
5. backup production D1
6. `npm run cloudflare:db:remote`
7. `npm run deploy:cloudflare:services`
8. `npm run deploy:cloudflare:web`
9. verify `/api/system/supply-stack`

The web Worker remains `hariyo-mart-nepal`; the internal services Worker remains `hariyo-mart-services` and must exist before the web Worker deployment because of the `HARIYO_SERVICES` service binding.
