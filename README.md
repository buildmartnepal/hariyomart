# Hariyo Mart Nepal v8.0.0

**Cloudflare-native multi-tenant marketplace + produce supply SaaS for vegetables, fruits, farms, cooperatives, wholesalers and delivery operations.**

v8 removes Supabase from the production runtime. The production system is now designed around Cloudflare Workers/OpenNext, D1, Durable Objects, R2, KV, Queues, Workflows, Turnstile and Analytics Engine.

## Architecture

```text
Web + Expo Mobile
      │
Cloudflare DNS/CDN/WAF/Turnstile
      │
Next.js/OpenNext Worker
      ├── D1: tenants, users/sessions, products, lots, procurement, orders, delivery, payments
      ├── R2: product/quality/POD/doc media
      ├── KV: cache/config only
      ├── Queue: async events + dead-letter recovery
      └── Service binding → hariyo-mart-services
             ├── InventoryCoordinator Durable Object (per product)
             ├── TenantSequence Durable Object (per tenant)
             ├── TenantRealtimeHub Durable Object + WebSockets
             ├── CheckoutCoordinator + RateLimiter
             ├── Workflows: fulfillment + subscriptions
             └── Analytics Engine
```

## Produce SaaS modules

- Tenant SaaS plans, memberships, roles and active workspace switching
- Farms, suppliers and wholesale/institutional customers
- Harvest and supply forecasts
- Purchase orders and receiving data model
- Product grades, variants, weights and pack sizes
- Lots/batches, harvest dates, expiry/best-before and quality checks
- Warehouses, cold chain bins, stock transfers/counts and inventory movements
- FEFO-ready traceability and waste/spoilage records
- Retail, wholesale and contract price lists
- Sales orders, reservations and fulfillment
- Delivery routes/stops and proof-of-delivery-ready records
- Payments and supplier settlements
- Weekly/biweekly/monthly produce subscriptions
- Tenant reports, platform network metrics, audit/outbox and async event processing

## Development

```bash
npm ci
npm run v8:doctor
npm run dev
```

Cloudflare local database:

```bash
npm run cloudflare:db:local
```

## Production verification

```bash
npm run v8:doctor
npm run validate
npm run smoke
npm run cloudflare:types
npm run cloudflare:config:check
npm run typecheck
npm run build:cloudflare
```

Deploy Cloudflare service worker **before** web because production checkout depends on the inventory coordinator:

```bash
npm run deploy:cloudflare:services
npm run deploy:cloudflare:web
```

## Documentation

- [`docs/V8_SYSTEM_ARCHITECTURE.md`](docs/V8_SYSTEM_ARCHITECTURE.md) — architecture and scale model
- [`docs/CLOUDFLARE_NATIVE_V8_COMPLETE_GUIDE.md`](docs/CLOUDFLARE_NATIVE_V8_COMPLETE_GUIDE.md) — setup/deployment guide
- [`docs/V8_IMPLEMENTATION_STATUS.md`](docs/V8_IMPLEMENTATION_STATUS.md) — coded vs cloud-account activation work
- [`RELEASE_NOTES_V8.md`](RELEASE_NOTES_V8.md) — release changes

Legacy v7 Supabase migration material is retained only under `docs/legacy/` as historical documentation; it is not part of the v8 runtime.
