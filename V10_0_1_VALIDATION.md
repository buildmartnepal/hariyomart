# Hariyo Mart Nepal v10.0.1 — Validation Report

Validated on 2026-08-21.

## Source/build regression validation
- 156 authored `.ts/.tsx` files transpile/parse with 0 syntax diagnostics.
- `ShopClient.tsx` broken conditional JSX repaired.
- `catalog.ts` exports `productCatalog`, `categoryCatalog`, `provinceCatalog`, `getCatalogProduct()`.
- `sync-catalog.mjs` emits the same compatibility exports, preventing regeneration regressions.
- Full v10 preflight passes after actually regenerating catalog + seed.
- All authored `.mjs`/`.js` release scripts pass Node syntax checking.

## Release checks
- v10.0.1 doctor: PASS.
- production guard: PASS.
- Cloudflare configuration check: PASS.
- content/catalog validation: PASS — 420 products, 23 categories, 7 provinces, ~512 routes.
- Cloudflare compatibility smoke check: PASS.

## Fresh database validation (foreign keys ON)
The 13 numbered migrations were applied to a new SQLite/D1-compatible database. The operational seed was executed twice and the demo seed was executed twice.

Final stable counts:
- 84 application tables.
- 420 products.
- 23 categories.
- 28 sourcing tenants.
- 190 export-ready products.
- 28 export supplier profiles.
- 3 promotions.
- 14 demo identities.
- 12 demo tenant memberships.
- `marketplace.release = 10.0.1`.

This verifies operational and Production Test Mode seed idempotency against the v10 sourcing topology.

## Dependency-backed build qualification
This artifact environment does not contain a complete local `node_modules`, so a full local Next/OpenNext build is not claimed here. The supplied Cloudflare log proves its Linux builder successfully installs 449 packages with 0 npm vulnerabilities; v10.0.1 fixes the application-level Turbopack failures that stopped that build.

Recommended Cloudflare build command: `npm run build:cloudflare:production`.
