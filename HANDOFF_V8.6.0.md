# Hariyo Mart Nepal v8.6.3 — Marketplace Experience Handoff

This repository is the deploy-ready v8.6.3 marketplace release.

## Included
- Web + mobile source code
- Multi-photo product gallery and seller photo workflow
- Hariyo Match v3 location-aware matching
- Product descriptions, delivery-zone and nearby UX
- D1 migrations including 0009 marketplace experience
- R2/D1/KV/Queues/Workers AI integration configuration
- Cloudflare production guards and deployment scripts
- Release notes, validation reports, infrastructure docs and demo assets

## Clean package policy
The archive intentionally excludes `node_modules`, `.next`, `.open-next`, `.wrangler`, Git metadata and local secret env files. Use `npm ci` to install the exact dependency tree from `package-lock.json`.

## Production flow
```bash
npm ci
npm run catalog:sync
npm run cloudflare:types
npm run typecheck
npm run test
npm run build:cloudflare
npm run deploy:cloudflare:production
```

Configure real Cloudflare secrets and Turnstile values before public launch.


## v8.6.3 standalone auth hardening

Production login, checkout, inventory and tenant sequencing no longer require the optional `hariyo-mart-services` Worker. KV/D1 fallbacks keep the public Worker operational. Run `npm run prepare:cloudflare:test` before the first Production Test Mode deployment, or use `npm run deploy:cloudflare:production`, which applies migrations and idempotent seed data automatically.
