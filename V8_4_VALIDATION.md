# Hariyo Mart Nepal v8.4.0 — Validation Report

## Completed in the packaging environment

- TypeScript/TSX syntax parse: PASS — 124 source files, 0 parse errors.
- Cloudflare v8.4 production configuration checker: PASS with the Turnstile placeholder explicitly allowed for packaging.
- v8.4 architecture/feature doctor: PASS.
- Catalog validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated content routes.
- Cloudflare compatibility smoke check: PASS.
- Fresh SQLite execution of D1 migrations 0001 through 0006 plus seed: PASS.
- Fresh schema contains 79 tables; all eight v8.4 Farmer OS tables exist.
- Starter/Growth/Enterprise Farmer OS feature entitlements and AI limits are present in the migrated plan catalog.

## Dependency-backed check limitation

A clean `npm ci` could not complete in this artifact execution environment. The preloaded dependency tree is partial and does not contain complete package/type metadata, so a full dependency-backed `tsc` or Next/OpenNext build here would report missing-package errors unrelated to source correctness. Do not treat that as a successful production build.

Run these in the Cloudflare/Git environment, which has already demonstrated successful registry installation for this repository:

```bash
npm ci
npm run cloudflare:types
npm run v8.4:doctor
npm run typecheck
npm run build:cloudflare
```

Before production cutover, replace the Turnstile placeholder, configure Worker secrets, back up D1, apply migration 0006, deploy `hariyo-mart-services`, then deploy `hariyo-mart-nepal`.
