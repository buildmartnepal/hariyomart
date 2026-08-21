# Cloudflare Workers Build Settings — v9.0.0

## Build command
```bash
npx @opennextjs/cloudflare build
```

## Deploy command
```bash
npm run deploy:cloudflare:production
```

The Hariyo deploy command applies production guard checks, D1 migrations through `0012`, operational seed refresh, demo seed refresh when Test Mode is enabled, then deploys the already-built OpenNext Worker.

## Test Mode
`NEXT_PUBLIC_DEMO_MODE=true` and `PRODUCTION_TEST_MODE=true` expose Demo Lab. One-click demo login no longer depends on remote demo seed having already run; the runtime endpoint self-bootstraps allow-listed test identities.

Before real customer launch set both flags to `false`, configure JWT secrets + Turnstile, and remove demo users with `npm run production:demo:remove`.
