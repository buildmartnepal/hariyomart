# Cloudflare Workers Builds — Hariyo Mart v8.7.0

## Build command

```bash
npx @opennextjs/cloudflare build
```

## Recommended deploy command

```bash
npm run deploy:cloudflare:production
```

The recommended deploy command runs the production guard, validates Wrangler configuration, applies every remote D1 migration through `0011_demo_identity_repair_v870.sql`, refreshes the idempotent operational seed, refreshes Production Test Mode identities when enabled, reuses/builds OpenNext, and deploys the standalone web Worker.

## Production Test Mode

Keep these values only while verifying the deployment:

```text
NEXT_PUBLIC_DEMO_MODE=true
PRODUCTION_TEST_MODE=true
```

Shared test password: `HariyoDemo@2026`.

The login page supports one-click role sign-in. `/api/system/readiness` exposes `required.DEMO_LOGIN` and `productionGuard.demoCredentialReady`.

## Real production cutover

1. Configure strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `TURNSTILE_SECRET_KEY` Worker secrets.
2. Keep the real public Turnstile site key in the Cloudflare Dashboard; `keep_vars=true` preserves it.
3. Set `NEXT_PUBLIC_DEMO_MODE=false` and `PRODUCTION_TEST_MODE=false`.
4. Run `npm run production:demo:remove`.
5. Redeploy and verify `/api/system/readiness` reports `ready`.
