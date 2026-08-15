# Hariyo Mart v8.3.2 — Cloudflare deploy fix

## What failed

The OpenNext/Next.js build completed. Deployment failed because the web Worker declared a service binding to `hariyo-mart-services`, but that Worker did not yet exist in the Cloudflare account. The connected Cloudflare Worker is `hariyo-mart-nepal`, while the previous repo config used `hariyomart`.

## Source changes in v8.3.2

- `apps/web/wrangler.jsonc` name is now `hariyo-mart-nepal`.
- `WORKER_SELF_REFERENCE` now targets `hariyo-mart-nepal`.
- `HARIYO_SERVICES` remains `hariyo-mart-services` because it is the real private coordination Worker.
- Added an idempotent-ish one-time bootstrap script for the two Queues and private services Worker.
- Added `npm run deploy:cloudflare:first` for local/manual first deployment in the correct dependency order.
- Production config checks no longer hard-code a specific site hostname, allowing a Workers.dev URL or custom domain, but require HTTPS.

## Immediate one-time fix on Windows

From the repository root:

```cmd
npm install
npm run cloudflare:bootstrap:services
```

Or double-click/run:

```cmd
BOOTSTRAP-CLOUDFLARE-SERVICES.cmd
```

This ensures `hariyo-mart-events`, `hariyo-mart-events-dlq`, generates Worker types, typechecks the services Worker, and deploys `hariyo-mart-services`.

After it succeeds, retry the existing Cloudflare connected build for `hariyo-mart-nepal`.

## Recommended Cloudflare monorepo setup

Cloudflare service-bound Workers are independent Workers. Configure two Workers against the same Git repository:

### A. Private service Worker

Worker name: `hariyo-mart-services`

Root directory: repository root

Build command:

```text
npm run typecheck:services
```

Deploy command:

```text
npx wrangler deploy --config infra/cloudflare/services/wrangler.jsonc
```

### B. Web Worker

Worker name: `hariyo-mart-nepal`

Root directory: repository root (or apps/web if the connected build is configured there and finds the monorepo)

Build command:

```text
npx @opennextjs/cloudflare build
```

Deploy command:

```text
npx @opennextjs/cloudflare deploy
```

The services Worker must deploy successfully before the web Worker on the initial rollout.

## Required web secrets

The deployment log also warned that these were unavailable to the OpenNext deployment environment:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURNSTILE_SECRET_KEY`

Set them in Cloudflare for the `hariyo-mart-nepal` Worker/build environment. Do not commit them to Git.

The repository still contains a placeholder `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; replace it with the real public Turnstile site key before enabling Turnstile enforcement in production.
