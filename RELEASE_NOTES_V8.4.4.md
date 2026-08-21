# Hariyo Mart Nepal v8.4.4 — Cloudflare One-Command Production Deployment

## Deployment reliability

- Adds a self-checking connected deployment orchestrator.
- Deploys the private `hariyo-mart-services` Worker before the public OpenNext Worker.
- Verifies the private Worker has a Cloudflare deployment before allowing the web deploy to continue.
- Fixes queue-existence detection so the dead-letter queue name cannot be mistaken for the main queue.
- Reuses a Workers Builds `.open-next` artifact when present and builds automatically when running the deployment locally.
- Keeps `wrangler.jsonc` as the source of truth and preserves required-secret declarations for JWT and Turnstile secrets.

## Production safety retained from v8.4.3

- Demo fallback stays disabled under `APP_ENV=production`.
- Live D1/API failure no longer silently substitutes sample inventory.
- `/demo` stays unavailable in production.
- Runtime public configuration supports Cloudflare vars.
- The web Worker keeps its internal `HARIYO_SERVICES` service binding.

## Recommended Cloudflare settings

```text
Build command:  npm run build:cloudflare
Deploy command: npm run deploy:cloudflare:connected
```

Before launch, set `JWT_SECRET`, `JWT_REFRESH_SECRET`, `TURNSTILE_SECRET_KEY`, replace the public Turnstile site key placeholder, remove any previously seeded demo users, and run `npm run production:guard`.
