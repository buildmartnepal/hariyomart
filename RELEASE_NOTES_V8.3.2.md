# Hariyo Mart Nepal v8.3.2 — Cloudflare Deploy Hotfix

This release fixes the production deployment failure that occurred after a successful OpenNext build.

## Fixed

- Align web Worker source name with Cloudflare connected project: `hariyo-mart-nepal`.
- Align `WORKER_SELF_REFERENCE` with the deployed web Worker name.
- Preserve `HARIYO_SERVICES -> hariyo-mart-services` and add a one-time bootstrap path so the target Worker exists before web deploy.
- Ensure the main event queue and dead-letter queue exist before the private Worker is deployed.
- Keep v8.3.1 Workflow serializable type fixes intact.
- Make production site URL validation custom-domain friendly.

## Deploy order

1. `npm run cloudflare:bootstrap:services`
2. Retry/deploy `hariyo-mart-nepal`
3. Configure JWT/refresh/Turnstile secrets and real Turnstile site key.
