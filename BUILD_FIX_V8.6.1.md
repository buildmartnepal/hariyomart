# Hariyo Mart Nepal v8.6.1 — Cloudflare Build + Production Test Fix

## Cloudflare build errors fixed

The 2026-08-21 Cloudflare/OpenNext build compiled successfully but failed during Next.js TypeScript validation. v8.6.1 fixes every reported error at the type boundary instead of disabling strict checks.

1. `components/AuthPanel.tsx` — typed `response.json()` as `Promise<DemoConfig>` before the promise callback.
2. `components/LiveProductGrid.tsx` — typed the live API payload and stopped casting the readonly catalog to mutable `Product[]`.
3. `components/LocationMarket.tsx` — API product galleries now accept readonly image arrays and the nearby API response is typed as `ApiProduct[]`.
4. `components/PublicConfigProvider.tsx` — runtime JSON is typed as `Partial<PublicRuntimeConfig>` and safely merged with defaults.
5. `server/cloudflare/api.ts` — D1 `ProductRow` fields used by the public mapper are explicitly typed and normalized to strings/numbers before Hariyo Match v3.
6. `server/cloudflare/api.ts` — production demo comparison now uses string normalization, avoiding literal-type comparison TS2367.

## Production Test Mode

The release includes an explicit production smoke-test identity without exposing or reusing the real production administrator.

- Email: `buyer@demo.hariyomart.local`
- Password: `HariyoDemo@2026`
- `NEXT_PUBLIC_DEMO_MODE=true`
- `PRODUCTION_TEST_MODE=true`

The scoped buyer is auto-provisioned in D1 on first successful login. It can be used to verify production login immediately after deployment. Only this scoped test identity can bypass Turnstile in Production Test Mode, so a deployment can be smoke-tested before the real Turnstile widget keys are installed. All real user/admin logins continue to use the configured Turnstile policy.

To disable test mode after verification, set both flags to `false`, rebuild and redeploy. Demo identities can be removed with `npm run demo:remove:remote`.

## Validation performed in packaging environment

- Production guard: PASS
- Cloudflare configuration checker: PASS (Turnstile placeholder remains a warning)
- v8.6 doctor: PASS
- Catalog validation: 98 products, 23 categories, 7 provinces
- Compatibility smoke test: PASS
- Fresh SQLite/D1-compatible migrations: 10 migrations, 79 tables
- Fresh production catalog seed: 98 products
- `products.images_json`: present
- TS/TSX parser: 142 files, 0 syntax errors

A full `npm ci` + semantic `tsc` + OpenNext build could not be repeated inside the packaging container because its npm registry install stalled. The fixes directly correspond to the exact seven TypeScript errors from the successful Cloudflare dependency installation/build log. Re-run the same Cloudflare build command to verify the semantic build in the connected Linux environment.
