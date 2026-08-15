# Hariyo Mart Nepal v8.4.3 — Production Guard + Cloudflare Deploy Fix

## Fixed

- Prevents production from silently replacing failed live D1/API inventory with the bundled sample catalogue.
- Resolves server-side relative `/api` fetches to the absolute production site URL, preventing false fallback on product and farmer pages.
- Keeps the real `HARIYO_SERVICES -> hariyo-mart-services` architecture and adds a connected-deploy command that deploys the private Worker first.
- Moves demo-mode and Turnstile public configuration to a runtime endpoint, so Cloudflare runtime vars work even when `NEXT_PUBLIC_*` variables were not present during `next build`.
- Hides `/demo` completely in production and prevents demo credentials from being bundled into the normal login component.
- Enables Cloudflare Turnstile origins in the Content Security Policy.
- Corrects live farmer API field mapping for location, verification and delivery settings.

## Production behavior

- `APP_ENV=production` always disables the bundled demo fallback.
- If live marketplace APIs fail, users see a truthful unavailable/empty state instead of fake inventory.
- Home, category and province product grids load live `/api/products` data.
- Product and farmer detail routes are no longer pre-generated from the sample catalogue.
- `/api/system/readiness` now reports Turnstile readiness and whether demo users remain in D1.

## Cloudflare connected build

Use the repository root.

```bash
npm run build:cloudflare
npm run deploy:cloudflare:connected
```

The deploy command bootstraps queues/types and deploys `hariyo-mart-services` before `hariyo-mart-nepal`.

## Before public launch

1. Replace `REPLACE_WITH_TURNSTILE_SITE_KEY` with the real Turnstile site key.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET` and `TURNSTILE_SECRET_KEY` as Worker secrets.
3. Run `npm run production:demo:remove` if demo accounts were previously seeded.
4. Run `npm run production:guard`.
