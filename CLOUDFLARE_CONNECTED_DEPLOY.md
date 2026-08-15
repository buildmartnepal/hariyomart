# Hariyo Mart v8.4.3 — Cloudflare Connected Deployment

Use the repository root as the Cloudflare build root.

## Build command

```bash
npm run build:cloudflare
```

## Deploy command

```bash
npm run deploy:cloudflare:connected
```

The deploy command is intentionally ordered this way:

1. Verify Cloudflare authentication.
2. Ensure `hariyo-mart-events` and its dead-letter queue exist.
3. Generate/check Worker binding types.
4. Deploy `hariyo-mart-services` first.
5. Deploy the already-built OpenNext web Worker `hariyo-mart-nepal`.

This prevents Cloudflare error `10143` where `HARIYO_SERVICES` references a Worker that has not yet been deployed.

## Required production secrets

Set these on `hariyo-mart-nepal`:

```bash
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

Replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc` with the public Turnstile site key.

## Demo cleanup

Production runtime forces demo UI/fallback off when `APP_ENV=production`. If demo users were previously seeded into D1, remove them once:

```bash
npm run production:demo:remove
```

Then verify:

```bash
npm run production:guard
```

The marketplace now fails visibly when live inventory is unavailable instead of silently substituting bundled sample products.
