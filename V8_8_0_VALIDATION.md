# Hariyo Mart Nepal v8.8.0 — Validation Report

## Passed in the packaging environment

- Production guard: PASS.
- Cloudflare configuration validation: PASS.
- v8.8 commerce doctor: PASS.
- Content/catalog validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated content routes.
- Cloudflare compatibility smoke check: PASS.
- Authored TypeScript/TSX parse: PASS — 150 files, 0 syntax errors.
- Fresh SQLite execution of numbered D1 migrations 0001 through 0011 plus operational seed: PASS.
- Operational seed rerun: PASS with stable counts.
- Demo/test identity seed rerun: PASS with stable counts.
- Fresh database: 80 application tables, 98 products, 7 tenants/workspaces, 7 sample orders, 14 demo identities.
- `products.images_json`: present.
- Seed release marker: `marketplace.release = 8.8.0`.
- Demo buyer identity is active and has a 60-character bcrypt hash.
- ZIP packaging excludes local secret files, dependency folders and generated build caches.

## Dependency-backed build limitation in this container

A clean `npm ci` was attempted but registry installation did not finish within the execution window. The partial dependency tree is incomplete (`vitest`, React/Next type packages and other package metadata are missing), so local `npm run typecheck`, `npm test` or OpenNext build failures from that partial tree are not valid application-source failures.

The connected Cloudflare Linux builder previously demonstrated successful clean dependency installation, Next.js compilation, strict TypeScript, static-page generation and OpenNext bundling on the preceding release. For v8.8.0 run the full clean pipeline in Cloudflare/Git CI:

```bash
npm ci
npm run catalog:sync
npm run v8.8:doctor
npm run production:guard
npm run typecheck
npm run test
npm run build:cloudflare
npm run deploy:cloudflare:production
```

Do not deploy a local partial `node_modules` directory. It is intentionally excluded from this handoff.
