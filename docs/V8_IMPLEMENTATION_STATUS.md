# Hariyo Mart v8 Implementation Status

## Implemented in this package

- Cloudflare-only production data architecture; Supabase runtime code/config removed.
- D1 migration `0004_cloudflare_native_supply_saas.sql` with the complete produce/SaaS operational schema.
- Multi-tenant membership and active workspace switching.
- Tenant role authorization gates in the Worker API.
- Worker/D1 authentication retained and extended with Turnstile server verification.
- Browser Turnstile UI for buyer login/register and farmer registration.
- Per-product Durable Object inventory reservation and adjustment coordinator.
- Idempotent cancellation stock recovery with outbox + Queue replay.
- Tenant document sequence Durable Object.
- Tenant Hibernatable WebSocket hub.
- Queue producer/consumer, dead-letter configuration and scheduled outbox drain.
- Order fulfillment and produce-subscription Workflows.
- Analytics Engine event writes.
- Tenant APIs for the core produce modules plus platform administration APIs.
- Live module-data panel in the farmer/admin supply workspace.
- v8 stack/readiness endpoint at `/api/system/supply-stack`.
- Seed backfill so seeded seller workspaces receive v8 memberships/subscriptions/settings.

## Schema-ready, UI/API depth can be expanded further

The following are modeled in D1 but currently have less UI workflow depth than the headline modules: goods receiving, warehouse transfers, stock counts, payment allocation, supplier settlement, proof-of-delivery attachments, plan checkout/billing, tenant invitations and domain verification.

They do **not** require another architecture migration. They can be implemented as additional screens/routes over the existing v8 tables.

## Cloud account actions still required

These cannot be completed safely without access to the user's Cloudflare account/project runtime:

1. Confirm/create the production Queue and dead-letter Queue.
2. Apply D1 migration 0004 to production.
3. Deploy `hariyo-mart-services` so Durable Object migrations and Workflows are registered.
4. Deploy the OpenNext web Worker with the service binding.
5. Create/configure Turnstile and set its secret.
6. Verify secrets, custom domain, WAF/security settings and payment credentials.
7. Run production smoke tests with real buyer/farmer/admin accounts.

## Turnstile migration note

Default `TURNSTILE_ENFORCEMENT_MODE=web` protects web login/registration while preserving the existing mobile login flow, which sends `x-client-platform: mobile` and remains rate-limited. After a Turnstile-capable mobile flow is implemented, change the mode to `all` for uniform enforcement.

## Verification expectations

Before production cutover run:

```bash
npm ci
npm run v8:doctor
npm run validate
npm run smoke
npm run cloudflare:types
npm run cloudflare:config:check
npm run typecheck
npm run build:cloudflare
```

Then apply the remote migrations through `0006`, deploy the web Worker, and verify `/api/system/supply-stack` reports D1 schema ready. The services Worker is optional in v8.3.3 and may be enabled later for advanced coordination.

## Verification completed while packaging

The package was checked with the repository's dependency-independent validation path:

- TypeScript/TSX syntax parser: **103 files parsed**.
- `npm run v8:doctor`: **PASS**.
- catalog/content validator: **98 products, 23 categories, 7 provinces**.
- compatibility smoke test: **PASS**.
- SQLite execution of migrations `0001` through `0004`, migration seed and operational seed: **PASS**.
- fresh seeded database check: **7 tenants, 98 products, 7 tenant memberships, 7 tenant subscriptions**.

A full dependency-backed Next/OpenNext build and TypeScript typecheck still requires `npm ci` in an environment with npm registry/package cache access. Run the production verification commands above after extraction before deployment.
