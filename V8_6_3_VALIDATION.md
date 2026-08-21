# Hariyo Mart Nepal v8.6.3 — Validation Report

## Passed in packaging environment
- Production guard: PASS.
- Cloudflare v8.6.3 configuration checker: PASS.
- v8 architecture/feature doctor: PASS.
- Catalog validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated routes.
- Compatibility smoke check: PASS.
- Fresh SQLite execution of migrations 0001–0010: PASS.
- Full operational seed: PASS — 7 tenant workspaces, 98 products, 7 operational orders.
- Full Production Test Mode identity seed: PASS — 14 demo users and 12 tenant memberships.
- Seed idempotency: PASS when operational + demo seeds are executed twice.
- `products.images_json`: present.
- `runtime_test_secrets`: present.
- D1 tenant sequence fallback SQL: PASS (1, 2, 3).
- D1 inventory fallback SQL/event write: PASS.
- MJS syntax validation: PASS.
- TS/TSX parser: 131 application source files, 0 parse errors.

## Cloudflare semantic build
The previous connected Cloudflare build for v8.6.1 completed Next.js compilation, TypeScript checking, all 144 generated pages and OpenNext bundling before deployment. The packaging container does not currently have a complete npm registry dependency tree, so the v8.6.3 semantic `next build` must be run in the connected Cloudflare Linux build environment.

Recommended Workers Builds settings:
- Build command: `npx @opennextjs/cloudflare build`
- Deploy command: `npm run deploy:cloudflare:production`

The deploy command applies D1 migrations and idempotent seed data before publishing the Worker.
