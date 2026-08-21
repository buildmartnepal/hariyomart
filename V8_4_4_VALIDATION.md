# Hariyo Mart Nepal v8.4.4 — Validation Report

## Passed in this packaging environment

- Node syntax checks for the new/changed deployment scripts: PASS.
- Cloudflare production configuration checker: PASS with the public Turnstile placeholder explicitly allowed for packaging.
- Production guard: PASS.
- v8 architecture/feature doctor: PASS.
- Catalog validation: PASS — 98 products, 23 categories, 7 provinces, approximately 190 generated content routes.
- Cloudflare compatibility smoke check: PASS.
- Fresh SQLite execution of all 9 D1 migration files plus `seed/cloudflare.sql`: PASS — 79 application tables present.
- Exact queue-name regression test: PASS — `hariyo-mart-events-dlq` no longer falsely matches `hariyo-mart-events`.
- Config credential leak spot-check: PASS.

## Dependency-backed build limitation

A clean `npm ci` was attempted, but package installation did not complete within this artifact environment's execution window. Because dependencies were not fully installed, a fresh dependency-backed TypeScript/Next/OpenNext production build was not claimed here.

Run the following in Cloudflare Workers Builds, GitHub Actions, WSL, or another normal networked Node environment:

```bash
npm ci
npm run cloudflare:types
npm run v8.4.4:doctor
npm run typecheck
npm run build:cloudflare
npm run deploy:cloudflare:connected
```

## Production launch requirements

- Replace `REPLACE_WITH_TURNSTILE_SITE_KEY` with the real public Cloudflare Turnstile site key.
- Configure `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `TURNSTILE_SECRET_KEY` as Worker secrets.
- Back up production D1 before applying new migrations.
- Remove previously seeded demo accounts if they exist.
- Verify `/api/health`, `/api/system/readiness`, `/api/system/supply-stack`, login/register, product listing, farmer pages, checkout, and admin after deployment.
