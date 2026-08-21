# Cloudflare Workers Builds — Hariyo Mart v8.6.3

## Build command
```bash
npx @opennextjs/cloudflare build
```

## Deploy command
```bash
npm run deploy:cloudflare:production
```

Do not use the raw OpenNext deploy command for the Production Test Mode rollout if you expect the database to be fully seeded. The repository deploy command runs the production guard, validates bindings, applies all D1 migrations, executes the idempotent operational seed, seeds test identities when Production Test Mode is enabled, reuses the OpenNext build artifact, and then deploys the Worker.

## Test password
`HariyoDemo@2026`

## Promotion to real production
Set real JWT and Turnstile secrets, remove demo users, disable both demo/test flags, rebuild and redeploy.
