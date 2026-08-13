# Hariyo Mart Nepal v6.0.0

## Cloudflare production release

- Migrated the production Next.js runtime to Cloudflare Workers through OpenNext.
- Replaced the live marketplace MongoDB path with a tenant-safe D1 schema and idempotent starter seed.
- Added a private services Worker with Durable Object checkout serialization and rate limiting.
- Added Queue-backed audit events, R2 product media and R2 incremental Next.js cache.
- Replaced signed Cloudinary crop uploads with authenticated same-origin R2 uploads.
- Preserved the responsive buyer, farmer and admin SaaS workspaces and the shared Expo app.
- Added one-command local D1 setup, Cloudflare release scripts, production health checks and GitHub Actions deployment.
- Added a full Cloudflare provisioning, secret, migration, admin bootstrap, domain and rollback runbook.

Cash on delivery remains the only enabled payment method. Nepal payment providers remain disabled until merchant onboarding, signed callbacks, reconciliation and refund certification are complete.
