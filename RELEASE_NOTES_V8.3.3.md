# Hariyo Mart Nepal v8.3.3 — Standalone Cloudflare Deploy Fix

## Root cause fixed

The Next.js/OpenNext build was already healthy. Cloudflare deployment failed because the public Worker declared a Service Binding to `hariyo-mart-services` before that private Worker existed. Cloudflare rejects the caller Worker in that situation.

## v8.3.3 changes

- Removes the hard `HARIYO_SERVICES` binding from the default `hariyo-mart-nepal` Worker configuration.
- Keeps `WORKER_SELF_REFERENCE` for OpenNext.
- Makes the private services Worker an optional advanced topology rather than a first-deploy dependency.
- Adds production D1 fallbacks for inventory coordination.
- Adds production D1 fixed-window rate limiting for auth/API protection.
- Uses the existing D1 checkout core when the optional coordination Worker is absent or unavailable.
- Adds D1-backed tenant numbering when the optional sequence service is absent.
- Adds migration `0006_standalone_web_runtime.sql` for rate-limit state.
- Changes default Cloudflare deploy scripts to deploy the web Worker independently.
- Keeps the services Worker source in the repository for later Durable Object/Workflow upgrades.

## Connected Cloudflare deploy

Build command:

```text
npx @opennextjs/cloudflare build
```

Deploy command:

```text
npx @opennextjs/cloudflare deploy
```

The public Worker no longer requires `hariyo-mart-services` to exist.

## After first successful deploy

Apply remote migrations and set secrets:

```text
npm run cloudflare:db:remote
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
```

Also configure a real Turnstile site/secret pair before public launch. Never commit secret values.
