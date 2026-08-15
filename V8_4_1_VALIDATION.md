# Hariyo Mart Nepal v8.4.1 Validation

## Passed

- 126 project TS/TSX source files parsed with zero syntax diagnostics using TypeScript transpilation.
- Root/package/catalog JSON parsing passed.
- `apps/web/next.config.mjs` syntax passed.
- `scripts/v8-doctor.mjs` syntax passed.
- `node scripts/v8-doctor.mjs` passed for v8.4.1.
- `node scripts/validate-content.mjs` passed: 98 products, 23 categories, 7 provinces, 190 estimated public routes.
- `node scripts/smoke-check.mjs` passed.
- Fresh SQLite/D1-equivalent migration execution through `0007_real_product_photos_v841.sql` passed.
- Production seed plus demo account seed passed.
- Demo seed is idempotent: re-running preserves 14 demo users rather than duplicating them.
- Demo removal seed removes all 14 demo identities.
- Global demo roles cover customer, farmer, vendor and admin.
- Tenant demo roles cover owner, admin, manager, procurement, inventory, sales, delivery, accounting, farmer and viewer.
- Fresh seeded product catalog resolves all 98 seed products to photographic URLs; zero seeded SVG image placeholders remain.
- Photo migration safety test passed: an SVG placeholder is upgraded while an existing custom/non-placeholder seller image is preserved.

## Dependency-backed build status

A clean `npm ci` was attempted in the packaging environment, but the container package-install operation failed before dependency installation completed. Therefore this release does **not** claim a fresh dependency-backed `next build` or full workspace `tsc` pass in this environment.

Before production deployment run:

```bash
npm ci
npm run cloudflare:types
npm run typecheck
npm run build:cloudflare
```
