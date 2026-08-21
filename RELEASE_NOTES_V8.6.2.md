# Hariyo Mart Nepal v8.6.2 — Standalone Cloudflare Deploy Fix

## Fixed from the August 21 deployment log

- The Next.js 16.3 / OpenNext 1.20.2 production build already passed TypeScript and generated all 144 pages.
- Removed the hard `HARIYO_SERVICES -> hariyo-mart-services` binding from the default public Worker configuration. The web runtime already has D1/KV/Queue fallbacks, so the private coordination Worker is optional.
- Added `keep_vars: true` so Cloudflare Dashboard variables are preserved instead of being overwritten by repository placeholders.
- Removed the committed `NEXT_PUBLIC_TURNSTILE_SITE_KEY` placeholder from `wrangler.jsonc`; the real public key remains Dashboard-managed.
- Kept `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `TURNSTILE_SECRET_KEY` as required secrets. Wrangler deployments preserve existing secrets.
- Production Test Mode and the scoped buyer test login remain available.
- Updated production guard/config doctor so a future release cannot accidentally reintroduce the missing-service deployment failure.

## Default deploy

Cloudflare Workers Builds may continue using:

```bash
npx @opennextjs/cloudflare build
npx @opennextjs/cloudflare deploy
```

The default deploy no longer requires `hariyo-mart-services`.

## Optional advanced coordination

The private services implementation remains under `infra/cloudflare/services`. Deploy it separately when Durable Objects / Workflows / stronger coordination are desired:

```bash
npm run cloudflare:bootstrap:services
```

Only enable a web service binding after Cloudflare confirms `hariyo-mart-services` exists.
