# Hariyo Mart Nepal v8.7.0 — Validation Report

## Passed in the packaging environment

- Production guard: PASS.
- Cloudflare production configuration check: PASS.
- v8.7 architecture/feature doctor: PASS.
- Catalog validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated routes.
- Cloudflare compatibility smoke check: PASS.
- TypeScript/TSX syntax parse: PASS — 142 files, 0 parse errors.
- Fresh SQLite/D1-compatible migration execution: PASS — 11 numbered migrations.
- Full operational seed executed twice: PASS / idempotent.
- Demo identity seed executed twice: PASS / idempotent.
- Fresh seeded data: 7 tenants, 98 products, 7 sample orders, 14 demo users, 12 tenant-role memberships.
- Demo buyer bcrypt hash independently verified against `HariyoDemo@2026`: PASS.
- Simulated stale demo hash + suspended status followed by migration `0011_demo_identity_repair_v870.sql`: PASS; credential restored and status reactivated.
- Production Test Mode demo auth is restricted to exact known demo identities + exact shared test password.
- Demo runtime login can self-heal stale/malformed stored hashes; real accounts never use this bypass.
- `/api/system/readiness` now exposes `DEMO_LOGIN` and `demoCredentialReady`.
- Adaptive Auto theme markers and one-click demo-login UX are enforced by the v8.7 doctor.

## Dependency-backed build note

The source package intentionally excludes `node_modules`. A fresh `npm ci` in this packaging container could not complete within the execution window because registry installation stalled. The connected Cloudflare Linux builder previously completed dependency installation, Next.js compilation, strict TypeScript, all 144 static pages and OpenNext bundling for v8.6.1. Run the same registry-backed build for v8.7.0:

```bash
npm ci
npx @opennextjs/cloudflare build
npm run deploy:cloudflare:production
```

The deploy command applies migration 0011 and refreshes test identities before web cutover.
