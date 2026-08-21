# Cloudflare Workers Builds — v8.9.1

## Build command

```bash
npx @opennextjs/cloudflare build
```

## Deploy command

```bash
npm run deploy:cloudflare:production
```

Use the Hariyo deployment script rather than only raw OpenNext deploy because it retains production guards, D1 preparation/seed behavior and standalone deployment safeguards.

## Required production secrets

Keep real values in Cloudflare secrets/dashboard rather than source control:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURNSTILE_SECRET_KEY`

The Dashboard-managed public Turnstile site key remains preserved by the Wrangler configuration strategy already used by the project.

## Expected v8.9.1 build sequence

Dependency install → Next.js compilation → strict TypeScript → static generation → OpenNext bundle → Hariyo production guard/migrations/seed → Worker deployment.
