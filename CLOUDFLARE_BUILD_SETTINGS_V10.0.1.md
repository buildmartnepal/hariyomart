# Cloudflare Workers Builds — Hariyo Mart v10.0.1

## Recommended build command

```bash
npm run build:cloudflare:production
```

This runs the v10 preflight (catalog/seed regeneration + doctor + guards + validation) and then OpenNext Cloudflare build.

If the Cloudflare project must keep the raw OpenNext command, the checked-in v10.0.1 source is build-safe and you may use:

```bash
npx @opennextjs/cloudflare build
```

## Recommended deploy command

```bash
npm run deploy:cloudflare:production
```

The deploy workflow validates the release, applies remote D1 migrations, idempotently seeds operational/test data when enabled, reuses the connected build artifact when present and deploys the standalone public Worker.

## Required Cloudflare secrets
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURNSTILE_SECRET_KEY`

The public Turnstile site key should remain Dashboard-managed; `keep_vars=true` preserves Dashboard variables.
