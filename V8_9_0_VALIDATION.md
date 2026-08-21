# Hariyo Mart Nepal v8.9.0 — Validation Report

## Passed

- Production guard: PASS.
- Cloudflare configuration validator: PASS.
- v8.9 commerce/public-content doctor: PASS.
- Catalogue validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated routes.
- Cloudflare compatibility smoke check: PASS.
- Authored TypeScript/TSX parse scan: PASS — 151 files, 0 syntax diagnostics.
- Fresh SQLite-compatible D1 migration execution: PASS — 11 numbered migrations.
- Fresh seed: PASS — 80 application tables, 98 products, 23 categories, 7 tenant workspaces, 14 demo users.
- Release marker: `8.9.0`.
- Operational + demo seed rerun: PASS; core entity counts unchanged.
- Default Wrangler deployment remains standalone and does not hard-bind the optional private services Worker.
- Dashboard-managed Turnstile variable preservation remains enabled with `keep_vars=true`.

## Dependency-backed build note

This packaging environment does not include the repository `node_modules` tree. The clean Cloudflare builder should perform the final `npm clean-install`, Next.js typecheck and OpenNext build. No dependency tree is included in the release ZIP.
