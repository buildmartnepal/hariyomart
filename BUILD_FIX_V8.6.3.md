# Hariyo Mart Nepal v8.6.3 — Login Runtime + Full Seed Fix

## Root cause of `Unexpected server error` on login

v8.6.2 correctly removed the hard Cloudflare service binding so the public Worker could deploy standalone, but `enforceRateLimit()` still failed all production authentication requests when `HARIYO_SERVICES` was absent. The request therefore failed before credential verification.

The earlier Cloudflare deployment also warned that `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY` were unavailable to the deploy environment. v8.6.3 keeps real secrets required for final production, but Production Test Mode can now establish server-only D1-backed test session keys so the seeded test identities remain usable during setup.

## Fixed runtime dependencies
- Auth rate limiting: optional Durable Object service -> KV fallback.
- Checkout coordination: optional service -> D1 checkout core fallback.
- Inventory coordination: optional service -> D1 atomic stock/event fallback.
- Tenant document numbering: optional service -> D1 `tenant_sequences` fallback.
- Readiness: optional private services no longer block standalone readiness.
- Error handling: setup errors are actionable and include a request ID.

## Seed readiness
Run `npm run prepare:cloudflare:test` to apply all migrations, seed all 98 products / 7 tenant workspaces / operational examples, and seed all 14 test identities.

For Cloudflare Workers Builds use:
- Build: `npx @opennextjs/cloudflare build`
- Deploy: `npm run deploy:cloudflare:production`

The deploy command is important because raw `npx @opennextjs/cloudflare deploy` uploads the Worker but does not apply D1 migrations or execute the repository seed SQL.
