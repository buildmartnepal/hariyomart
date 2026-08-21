# Hariyo Mart Nepal v10.0.1 — Production Handoff

v10.0.1 is the production build/deploy correction for the Nepal Origin Export OS branch.

## Main repaired failures
1. JSX parse failure in ShopClient.
2. Missing catalog compatibility exports used by MarketplaceSearch, Compare, Saved Baskets and WorkspaceLive.
3. Catalog generator regression that would remove the exports again after a sync.
4. Fresh-database foreign key failure caused by `LOCAL10` referencing a removed v9 tenant.
5. Stale version/release guards replaced by v10.0.1 release markers.

## Deployment
Use Cloudflare Workers Builds with `npm run build:cloudflare:production` and `npm run deploy:cloudflare:production`.

Do not store private secret values in source. Keep Dashboard-managed public vars and Wrangler secrets in Cloudflare.
