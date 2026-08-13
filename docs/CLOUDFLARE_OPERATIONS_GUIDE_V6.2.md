# Hariyo Mart Nepal v6.2 — Cloudflare Operations Guide

This is the self-deployment and day-two operations guide for the Next.js web Worker, private
services Worker and Expo mobile app. Run commands from the repository root with Node.js 22.13+.

## 1. Architecture and responsibility

| Component                  | Cloudflare product | Hariyo Mart responsibility                                                 |
| -------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `apps/web`                 | Workers + OpenNext | Website, dashboards, auth and same-origin `/api`                           |
| `HARIYO_DB`                | D1                 | Users, tenants, products, orders, CMS, categories, settings and audit rows |
| `HARIYO_MEDIA`             | R2                 | Product, farmer and CMS media objects                                      |
| `NEXT_INC_CACHE_R2_BUCKET` | R2                 | OpenNext incremental cache; keep separate from user uploads                |
| `HARIYO_KV`                | Workers KV         | Disposable cache, public configuration and feature reads                   |
| `HARIYO_EVENTS`            | Queues             | Durable asynchronous audit and marketplace events                          |
| `CHECKOUT_COORDINATOR`     | Durable Objects    | Per-checkout serialization and idempotent coordination                     |
| `RATE_LIMITER`             | Durable Objects    | Strongly coordinated API rate-limit state                                  |
| `apps/mobile`              | Expo / EAS         | Native buyer and farmer application using the public Worker API            |

Important data rule: D1 is authoritative for inventory, orders, identities and money. KV is
eventually consistent and must never be the system of record for those values. R2 stores objects;
the `media` D1 table stores their searchable metadata and ownership.

Official references: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/),
[KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/),
[Queue retries](https://developers.cloudflare.com/queues/configuration/batching-retries/), and
[Durable Object rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/).

## 2. Local setup

```bash
npm ci
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run catalog:sync
npm run cloudflare:db:local
npm run dev
```

Replace every example secret in `.dev.vars`. Do not commit `.dev.vars`, `.env`, API keys, bootstrap
keys or session secrets. The web product is at `http://localhost:3000`; its API is `/api`.

In another terminal:

```bash
EXPO_PUBLIC_WEB_URL=http://YOUR_LAN_IP:3000 \
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api \
npm run dev:mobile
```

Use the computer's LAN address for a physical device. Android Emulator commonly reaches the host
as `10.0.2.2`; iOS Simulator can normally use `localhost`.

## 3. One-time Cloudflare provisioning

Authenticate and confirm the account:

```bash
npx wrangler login
npx wrangler whoami
```

The checked-in JSONC files contain provisioned resource identifiers. To deploy into another
Cloudflare account, create replacements and update both Wrangler files before deployment:

```bash
npx wrangler d1 create hariyo-mart-production-apac
npx wrangler kv namespace create HARIYO_KV
npx wrangler r2 bucket create hariyo-mart-media
npx wrangler r2 bucket create hariyo-mart-opennext-cache
npx wrangler queues create hariyo-mart-events
npx wrangler queues create hariyo-mart-events-dlq
```

Copy the new D1 database ID and KV namespace ID into `apps/web/wrangler.jsonc`; copy the D1 ID into
`infra/cloudflare/services/wrangler.jsonc`. Bucket and queue names must match both configurations.
Run the included guard after editing:

```bash
npm run cloudflare:config:check
npm run cloudflare:types
```

Generated binding types should be committed whenever bindings change. The configurations use a
current compatibility date, `nodejs_compat`, structured observability and explicit bindings.

## 4. Secrets and first admin

Required public Worker secrets are `JWT_SECRET`, `JWT_REFRESH_SECRET` and
`ADMIN_BOOTSTRAP_KEY`. `npm run finish:cloudflare` creates missing values without rotating existing
ones. For manual management:

```bash
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put ADMIN_BOOTSTRAP_KEY --config apps/web/wrangler.jsonc
npx wrangler secret list --config apps/web/wrangler.jsonc
```

After the public Worker is live, create the owner through the secure prompt:

```bash
npm run bootstrap:admin
```

Defaults:

- email: `greenmandux@gmail.com`
- role: platform admin/owner
- password: requested interactively with terminal echo disabled

Never place the password in source, shell history, Wrangler vars or CI logs. Use a new unique
password if one was shared in a message. After the first owner exists, rotate or delete the
bootstrap secret:

```bash
npx wrangler secret put ADMIN_BOOTSTRAP_KEY --config apps/web/wrangler.jsonc
```

Cloudflare's secret guidance is at
[Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## 5. D1 migrations, seed and recovery

Migrations are ordered SQL files in `apps/web/migrations`. `0003_control_plane.sql` adds categories
and CMS pages. The generated catalog seed is idempotent.

```bash
# Preview local behavior first
npm run cloudflare:db:local

# Apply production migrations and catalog seed
npm run cloudflare:db:remote
```

Create a pre-release export for an additional portable checkpoint:

```bash
npx wrangler d1 export HARIYO_DB --remote --config apps/web/wrangler.jsonc \
  --output=hariyo-pre-release.sql
```

Cloudflare D1 Time Travel can restore a database to a prior point within the available retention
window. Record the bookmark and deployment timestamp before a risky migration; follow the current
[D1 Time Travel guide](https://developers.cloudflare.com/d1/reference/time-travel/) for restoration.
Do not edit or delete an already-applied migration. Add a new forward migration instead.

## 6. R2 media operations

`HARIYO_MEDIA` is for seller/product/CMS uploads. `NEXT_INC_CACHE_R2_BUCKET` is only for OpenNext.
R2 buckets are private unless you explicitly expose them. The API validates authentication,
tenant ownership, MIME family and object metadata before creating upload/read access.

Recommended production controls:

1. Keep the media bucket private and serve reads through authenticated Worker routes or short-lived
   presigned URLs.
2. Restrict browser CORS to the real web origin and only the required methods and headers.
3. Use a custom domain for deliberate public assets; never enable a broad public development URL
   for private seller documents.
4. Configure lifecycle cleanup for abandoned temporary uploads and incomplete multipart uploads.
5. Keep object keys tenant-scoped and random; never trust a filename as an authorization boundary.

Example restrictive browser CORS policy (replace the origin):

```json
[
  {
    "AllowedOrigins": ["https://YOUR_DOMAIN"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-meta-*"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Presigned URLs must be treated as bearer credentials, use the smallest possible operation scope and
short expiry, and use the S3 API domain. See the current
[R2 presigned URL guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

The admin Media screen shows D1 metadata. If an object is removed manually, also reconcile its
metadata row through a controlled admin operation; do not let the index drift silently.

## 7. KV usage and invalidation

Appropriate KV keys include public settings, feature flags, computed category menus and anonymous
catalog cache entries. Every cached value should include a schema version and bounded TTL, for
example `v2:catalog:province:koshi`. A mutation must update D1 first, then invalidate or overwrite
the related KV key. Readers must tolerate a miss or stale value and fall back to D1.

Do not store inventory reservations, checkout state, roles, session revocation, order transitions or
settlement balances only in KV. KV changes can take time to become visible in other locations; that
tradeoff is intentional for high-read global caching.

## 8. Queues and Durable Objects

The services Worker consumes `hariyo-mart-events` in batches of up to 10 with five retries. Failed
messages move to `hariyo-mart-events-dlq`. Queue handlers must be idempotent because a message can be
delivered more than once. Include an event ID, type, actor, tenant and timestamp in every payload;
use the audit table's unique event identity to make reprocessing safe.

Inspect and redrive the dead-letter queue only after fixing the consumer cause. Cloudflare explains
the pattern in [Dead Letter Queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/).

Durable Objects coordinate checkout and rate limiting because they provide a single strongly
consistent point for each object ID. Keep their state small, use SQLite-backed classes, and do not
route every unrelated request through one global object. Inventory and final order records still
belong in D1.

## 9. Deploy web and services

The assisted production command applies migrations, deploys the private Worker first, installs
missing secrets, discovers the public URL, rebuilds and performs live API checks:

```bash
npm run release:check
npm run finish:cloudflare
npm run bootstrap:admin
```

For a controlled manual rollout:

```bash
npm run cloudflare:db:remote
npm run deploy:cloudflare:services
npm run deploy:cloudflare:web
```

Verify `/api/health`, `/api/products`, location search, registration/login, guest cash-on-delivery
checkout, farmer inventory update and the admin categories/pages/media/audit screens. Review Worker
logs and D1 writes before promoting a custom domain.

## 10. Build and release mobile apps

Set production API values before building:

```bash
export EXPO_PUBLIC_WEB_URL=https://YOUR_DOMAIN
export EXPO_PUBLIC_API_URL=https://YOUR_DOMAIN/api
npm run build:mobile
```

For store binaries, install and authenticate EAS CLI, create your own EAS project, then use its
guided build flow:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

Before submission, provide final app icons/splash assets, privacy and support URLs, store listings,
screenshots, signing credentials and Apple/Google developer accounts. Test location denial, offline
API fallback, SecureStore login persistence, checkout, seller mode and automatic dark appearance on
real devices.

## 11. Admin operating model

- Products: approve/reject listings, stock and sale state.
- Categories: create, reorder, activate and manage SEO descriptions.
- Pages: draft/publish structured CMS pages without a code deploy.
- Media: inspect tenant-scoped R2 object metadata.
- Audit: investigate actor, tenant, action and target history.
- Orders: move through allowed transitions and record fulfillment evidence.
- Settlements: review seller totals; connect payouts only after legal and provider onboarding.
- Support: triage requests and preserve a complete audit trail.

Use least privilege. Create separate staff accounts instead of sharing the owner login. Review admins,
sessions, audit events, DLQ depth, error rate, R2 growth and D1 size on a recurring schedule.

## 12. Rollback and incident checklist

1. Stop the triggering action (disable a feature or remove a compromised session/key).
2. Record deployment IDs, timestamps, logs, affected tenants and D1 bookmark/export.
3. Roll back Worker code to the last known-good deployment.
4. Restore data with a forward repair migration or D1 Time Travel when justified.
5. Reconcile R2 metadata/object mismatches and replay only safe, idempotent DLQ events.
6. Rotate affected secrets and revoke sessions.
7. Verify buyer, farmer and admin stories before reopening the feature.
8. Write an incident note and add a regression test.

Cloudflare's current Worker recommendations—including binding use, no mutable request state, proper
promise handling, observability and secret storage—are summarized in the official
[Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
