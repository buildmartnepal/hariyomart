# Hariyo Mart v8.6.1 — Cloudflare Connected Deployment

Use the repository root as the Cloudflare Workers Builds root.

## Recommended Workers Builds settings

Build command:

```bash
npm run build:cloudflare
```

Deploy command:

```bash
npm run deploy:cloudflare:connected
```

The v8.6 production deploy is self-checking and follows this order:

1. Production guard verifies production mode, demo isolation, v8.6 release identity, migration `0009`, and required bindings.
2. Cloudflare configuration validation runs before any remote write.
3. Queue bootstrap uses exact queue-name matching.
4. Binding types and private services are validated.
5. `hariyo-mart-services` is deployed and verified first, so the public Worker never targets a missing service binding.
6. D1 migrations are applied remotely, including `0009_marketplace_experience_v860.sql` for product galleries and matching indexes.
7. The current OpenNext artifact is reused when available or rebuilt when needed.
8. `hariyo-mart-nepal` is deployed only after the service Worker and D1 schema are ready.

This ordering prevents both service-binding deployment failures and a web/schema mismatch during the v8.6 cutover.

## Required production secrets

Set these on `hariyo-mart-nepal` before deployment:

```bash
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

Private secret values must not be committed to source control.

## Turnstile public key

Replace `REPLACE_WITH_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc` with the real public Turnstile site key. The production `.cmd` deploy wrapper intentionally blocks if this remains a placeholder.

## One-command Windows deployment

```text
DEPLOY-HARIYO-V8.6.1.cmd
```

It installs the lockfile dependencies, synchronizes the 98-product catalog/seed, runs v8.6 checks, generates Cloudflare binding types, applies remote D1 migrations, and runs the connected production deployment.

## CLI deployment

```bash
npm ci
npm run catalog:sync
npm run production:guard
npm run cloudflare:config:check
npm run v8.6:doctor
npm run cloudflare:types
npm run deploy:cloudflare:production
```

## Post-deploy checks

Verify these endpoints/pages:

```text
/api/health
/api/system/readiness
/api/system/supply-stack
/shop
/nearby
/products/<live-product-slug>
/admin/matching-engine
```

Then test buyer login/register, product gallery swiping, location matching, seller gallery upload, cart/checkout, farmer workspace and admin moderation.
