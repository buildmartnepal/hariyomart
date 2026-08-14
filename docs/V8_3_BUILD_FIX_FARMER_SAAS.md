# Hariyo Mart v8.3 — Cloudflare build fix and Farmer SaaS

## Why the v8.2 build failed

The application compiled, then `next build` stopped during TypeScript checking. The failures came from stricter `unknown` handling around JSON responses, an over-narrowed Wrangler generated environment literal, optional/defaulted numeric input inference, and a D1 result success literal comparison.

v8.3 fixes the types at their source. Production TypeScript checking stays enabled.

## Farmer SaaS operating model

Every farmer/cooperative remains an isolated Hariyo tenant. The Business Center reads the existing `tenant_subscriptions`, `plan_catalog`, `tenant_members`, `products`, `warehouses`, `sales_orders`, `purchase_orders`, `produce_subscriptions`, and `business_customers` tables.

### Business Center

Open:

```text
/farmer/business-center
```

It shows:

- current SaaS plan and subscription status;
- monthly plan amount;
- team, product and warehouse usage against entitlement limits;
- 30-day revenue and procurement value;
- active recurring produce-box subscriptions;
- B2B customer count;
- tenant identity and operating location.

### API

```text
GET /api/supply/saas-profile
```

The route requires the logged-in user's active tenant membership and never accepts a tenant id from a public query string.

## Mobile

The Expo Farmer Studio reuses the same endpoint with the farmer bearer token. It displays plan health and usage without creating a second mobile-only data model.

## Verification commands

```bash
npm ci
npm run v8.3:doctor
npm run validate
npm run smoke
npm run typecheck
npm run build
npm run build:cloudflare
```
