# Hariyo Mart v10.0.1 — Cloudflare Connected Deployment

Use the repository root as the Cloudflare Workers Builds root.

## Recommended Workers Builds settings

Build command:

```bash
npm run build:cloudflare:production
```

Deploy command:

```bash
npm run deploy:cloudflare:production
```

The production build first runs `v10:preflight`, which regenerates the 420-product catalog/seed and verifies the generated catalog compatibility contract before OpenNext starts.

The connected deploy then follows this order:

1. v10.0.1 release doctor.
2. Production safety guard.
3. Cloudflare configuration validation.
4. Optional private coordination Worker only when `ENABLE_HARIYO_SERVICES=1`.
5. Remote D1 migrations through `0013_nepal_origin_export_os_v1000.sql`.
6. Idempotent 420-product / 28-sourcing-tenant operational seed, plus demo identities only when Production Test Mode is explicitly enabled.
7. Reuse the connected OpenNext build artifact or build when missing.
8. Deploy the standalone `hariyo-mart-nepal` Worker.

The default public Worker does not hard-bind `HARIYO_SERVICES`, so it remains deployable even when the optional private Worker has not been created.

## Required private secrets

Set these in Cloudflare, not source control:

```bash
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

The public Turnstile site key should be managed in the Cloudflare Dashboard. `keep_vars=true` preserves Dashboard-managed vars during Wrangler deploys.

## Windows deployment

```text
DEPLOY-HARIYO-V10.0.1.cmd
```

## Post-deploy checks

Verify:

```text
/api/health
/api/system/readiness
/api/products?limit=2
/shop
/export
/nearby
/demo   (only when Production Test Mode is intentionally enabled)
```

Then test predictive search, Compare, Saved Baskets, Quick Reorder, product gallery, location matching, export RFQ, cart/checkout, farmer workspace and admin/export workflows.
