# Hariyo Mart Nepal v8.9.1 — Validation Report

## Passed

- Production guard: PASS.
- Cloudflare production configuration: PASS.
- Cloudflare-native commerce doctor: PASS.
- Content/catalog validator: PASS — 98 products, 23 categories, 7 provinces, ~190 generated routes.
- Cloudflare compatibility smoke check: PASS.
- Authored TypeScript/TSX syntax parse: PASS.
- Targeted strict TypeScript regression compile: PASS for widened catalog lookup, optional `minimumOrder`, and predictive-search image fallback.
- Fresh SQLite/D1-compatible execution: all numbered migrations plus seed completed.
- Seed rerun is safe/idempotent for the main catalog/test data path.
- Fresh data contains 98 products, 23 categories and 7 tenant workspaces.
- `platform_settings.marketplace.release` = `8.9.1`.

## Cloudflare error specifically fixed

v8.9.0 failed strict TypeScript after successful Next.js compilation because Compare read `minimumOrder` from a generated literal union and MarketplaceSearch could narrow its image fallback to `never`. v8.9.1 routes those interfaces through widened `Product` / `Category` views while retaining strict TypeScript.

## Environment limitation

A clean `npm ci` in this packaging container did not finish before the execution timeout. Therefore this report does not claim a fresh local dependency-backed OpenNext build. The user-provided Cloudflare environment has already demonstrated successful dependency installation and Next/OpenNext compilation up to strict TypeScript; the two reported strict TypeScript failures are the exact regression cases covered by this release.
