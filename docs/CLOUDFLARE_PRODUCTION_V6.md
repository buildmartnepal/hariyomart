# Hariyo Mart Nepal v6 — Cloudflare Production Runbook

## Production topology

| Layer                            | Cloudflare product   | Binding / resource                     |
| -------------------------------- | -------------------- | -------------------------------------- |
| Next.js storefront + API         | Workers via OpenNext | `hariyo-mart-nepal`                    |
| Marketplace relational data      | D1                   | `HARIYO_DB`                            |
| Product photos                   | R2                   | `HARIYO_MEDIA`                         |
| Next.js incremental cache        | R2                   | `NEXT_INC_CACHE_R2_BUCKET`             |
| Low-write cache/config           | Workers KV           | `HARIYO_KV`                            |
| Serialized checkout + throttling | Durable Objects      | `CHECKOUT_COORDINATOR`, `RATE_LIMITER` |
| Audit/event processing           | Queues               | `HARIYO_EVENTS`                        |
| Private coordination/consumer    | Workers              | `hariyo-mart-services`                 |

The services Worker has no `workers.dev` route. The web Worker reaches it only through a Cloudflare service binding. Checkout requests are serialized by one Durable Object for launch correctness; shard by province or seller group when sustained traffic requires it.

## 1. Authenticate and provision once

```bash
npm ci
npx wrangler login
npx wrangler d1 create hariyo-mart-production
npx wrangler kv namespace create HARIYO_KV
npx wrangler r2 bucket create hariyo-mart-media
npx wrangler r2 bucket create hariyo-mart-opennext-cache
npx wrangler queues create hariyo-mart-events
npx wrangler queues create hariyo-mart-events-dlq
```

R2 may ask you to enable an R2 subscription in the dashboard. Cloudflare still applies the free monthly included usage; no application code change is needed.

Copy the D1 database UUID, KV namespace ID and final Workers/custom-domain URL into environment variables, then render both Wrangler configs:

```bash
export CLOUDFLARE_D1_DATABASE_ID="YOUR_D1_UUID"
export CLOUDFLARE_KV_NAMESPACE_ID="YOUR_KV_ID"
export NEXT_PUBLIC_SITE_URL="https://hariyo-mart-nepal.YOUR_SUBDOMAIN.workers.dev"
node scripts/configure-cloudflare.mjs
npm run cloudflare:types
npm run cloudflare:config:check
```

Do not commit a config containing account-specific IDs if the repository will be public. GitHub Actions renders them from repository secrets during each deploy.

## 2. Add Worker secrets

Generate three independent random values of at least 32 characters. Store them on the public web Worker:

```bash
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put ADMIN_BOOTSTRAP_KEY --config apps/web/wrangler.jsonc
```

Never place secret values in `wrangler.jsonc`, `.env.production.example`, mobile public environment variables or git.

## 3. Create schema and starter marketplace

```bash
npm run cloudflare:db:remote
```

This applies the versioned D1 migration and idempotently loads seven verified province seller tenants plus 84 starter products. Re-running the seed does not overwrite live rows.

## 4. Verify and deploy

```bash
npm run release:check
npm run deploy:cloudflare:services
npm run deploy:cloudflare:web
```

For the first deployment, the source release also provides one resumable command. It deploys the
services Worker first, resolves the account's real `workers.dev` hostname, installs only missing
production secrets, rebuilds the public Worker with that hostname and verifies the live API:

```bash
npm run finish:cloudflare
```

The command prints a newly generated admin bootstrap key only when that secret did not already
exist. Save it in a password manager; it is never written to the repository.

Deploy services first so the public Worker's service binding can resolve. Then verify:

```bash
curl https://YOUR_WORKERS_DEV_HOST/api/health
curl "https://YOUR_WORKERS_DEV_HOST/api/products?limit=2"
```

Health is production-ready only when every required binding and both JWT secrets report `true`.

## 5. Bootstrap the first admin

Call this only once, over HTTPS, and do not retain the bootstrap key in shell history:

```bash
curl -X POST https://YOUR_WORKERS_DEV_HOST/api/auth/bootstrap-admin \
  -H "content-type: application/json" \
  -H "x-bootstrap-key: YOUR_ADMIN_BOOTSTRAP_KEY" \
  --data '{"name":"Hariyo Admin","email":"admin@example.com","password":"A-unique-strong-password"}'
```

After the account exists, rotate or delete `ADMIN_BOOTSTRAP_KEY` from the Worker.

## 6. GitHub production environment

The included `.github/workflows/cloudflare-deploy.yml` verifies and deploys `main`. Create a protected GitHub environment named `production` and add:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_KV_NAMESPACE_ID`

Add `NEXT_PUBLIC_SITE_URL` as a GitHub production environment variable (not a secret). Use the final HTTPS Workers or custom-domain URL.

Limit the Cloudflare API token to the minimum Workers, D1, KV, R2 and Queues permissions for this account. The JWT/admin secrets remain Cloudflare Worker secrets and are not needed by the build job.

## 7. Domain, mobile and rollback

Attach a custom domain in Cloudflare Workers & Pages, then update `NEXT_PUBLIC_SITE_URL` in `apps/web/wrangler.jsonc` and the Expo production variables. Build Expo with the final HTTPS API URL.

Cloudflare keeps Worker deployment versions. Roll back both Workers as a pair, starting with `hariyo-mart-services`. D1 migrations are forward-only: add a corrective migration instead of editing an already-applied file. Enable D1 Time Travel/restore procedures and R2 lifecycle rules appropriate to your operating policy.

## Launch boundaries

- Cash on delivery is the only active payment method.
- eSewa, Khalti and Fonepay require live merchant approval, signed webhooks, idempotent reconciliation, refund handling and certification before enablement.
- Free tiers are appropriate for launch and validation, not a promise of unlimited nationwide volume. Monitor Workers requests, D1 rows/read-write usage, Durable Object requests/storage, Queue operations and R2 storage/operations.
- Before handling real customers, complete legal terms, privacy/returns policies, food-safety operations, seller KYC, incident response, backups, accessibility testing and an external security review.
