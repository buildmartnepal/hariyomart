# Hariyo Mart Nepal v8.3.0 — Build Fix + Farmer SaaS Business Center

## Production build fixes

This release fixes the six strict TypeScript errors reported by the Cloudflare build on 2026-08-14:

- `app/checkout/page.tsx`: narrows `response.json()` before delivery-slot state updates.
- `components/SupplySaaSWorkbench.tsx`: types platform status JSON and preserves `[string, unknown]` tuple keys.
- `server/cloudflare/platform.ts`: normalizes Wrangler-generated Turnstile mode to a runtime string so `off`, `web`, and `all` remain valid.
- `server/cloudflare/supply-api.ts`: normalizes optional/defaulted purchase-order tax before arithmetic and D1 binding.
- `server/cloudflare/supply-stack.ts`: treats a successful D1 batch as schema-ready instead of comparing a success literal to `false`.

No `ignoreBuildErrors` escape hatch is used.

## Farmer SaaS upgrade

- New `/farmer/business-center` workspace.
- New tenant-scoped `GET /api/supply/saas-profile` endpoint.
- Shows SaaS plan, subscription state and monthly price.
- Shows members/products/warehouses used vs plan limits.
- Shows 30-day sales revenue and purchase-order value.
- Shows active recurring produce boxes and B2B customer count.
- Expo Farmer Studio now loads and displays the same tenant SaaS profile.
- Existing marketplace, procurement, lot, warehouse, delivery, subscription and admin modules remain intact.

## Deployment

Run from repository root:

```bash
npm ci
npm run v8.3:doctor
npm run typecheck
npm run build
npm run build:cloudflare
```
