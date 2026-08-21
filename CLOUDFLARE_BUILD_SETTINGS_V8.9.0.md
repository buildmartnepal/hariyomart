# Cloudflare Workers Builds — v8.9.0

## Build command

```bash
npx @opennextjs/cloudflare build
```

## Deploy command

```bash
npm run deploy:cloudflare:production
```

The Hariyo deploy command is preferred because it preserves the project production guard, Cloudflare configuration checks, D1 migration/seed preparation and standalone deployment safeguards.

## Required encrypted secrets

Configure these in Cloudflare, not in source:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURNSTILE_SECRET_KEY`

The public Turnstile site key is expected to remain Dashboard-managed and is preserved by `keep_vars=true`.
