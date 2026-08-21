# Hariyo Mart Nepal v8.6.3 — Standalone Auth + Full Test Seed Hardening

## Fixed
- Fixed production login failing before credential verification when optional `HARIYO_SERVICES` is not deployed. Auth rate limiting now falls back to the always-bound Cloudflare KV namespace.
- Added a D1 checkout fallback in production when the optional coordination Worker is absent or has a 5xx outage.
- Added D1 inventory coordination and tenant sequence fallbacks so seller/admin operations work in standalone mode.
- Added explicit API error IDs and actionable database-setup errors instead of masking expected setup failures as `Unexpected server error`.
- Added Production Test Mode session-secret persistence in D1 when JWT Wrangler secrets have not yet been installed. This fallback is disabled automatically when Production Test Mode is turned off.
- Readiness no longer treats the optional private services Worker as a required dependency.

## Seed / test readiness
- Added migration `0010_standalone_auth_runtime_v863.sql`.
- `npm run prepare:cloudflare:test` applies all migrations, the full idempotent operational seed and all test identities.
- Connected production deployment now seeds operational and test-mode data before deploying the web Worker.
- Production Test Mode login UI exposes buyer, farmer, manager, vendor and platform-admin test workspaces; all 14 test identities are seeded.
- Test identities retain the shared test password `HariyoDemo@2026` while `PRODUCTION_TEST_MODE=true`.

## Promotion to real production
Before accepting real customer data, install strong `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY`, set the real Turnstile site key in Cloudflare Dashboard, remove demo users, and set both `PRODUCTION_TEST_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false`.
