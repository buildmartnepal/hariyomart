# Hariyo Mart Nepal v8.8.0 — Handoff

## Release intent
v8.8.0 is the commerce-experience upgrade on top of v8.7 authentication, adaptive branding and standalone Cloudflare reliability. It focuses on product discovery, product decisions, trust, retention, basket/checkout conversion and mobile commerce while preserving Farmer OS and admin/supply functionality.

## Key new code
- `apps/web/components/ProductExperienceProvider.tsx`
- `apps/web/components/ProductActions.tsx`
- `apps/web/components/CompareTray.tsx`
- `apps/web/components/MarketplaceSearch.tsx`
- `apps/web/components/ProductReviews.tsx`
- `apps/web/components/RecentlyViewedRail.tsx`
- `apps/web/components/MobileCommerceNav.tsx`
- `apps/web/components/MobileProductBar.tsx`
- `apps/web/app/compare/page.tsx`
- `apps/web/app/saved/page.tsx`

## Deployment
Cloudflare Build command:

```bash
npx @opennextjs/cloudflare build
```

Recommended deploy command:

```bash
npm run deploy:cloudflare:production
```

For a full clean CI verification before deployment:

```bash
npm ci
npm run catalog:sync
npm run v8.8:doctor
npm run production:guard
npm run typecheck
npm run test
npm run build:cloudflare
npm run deploy:cloudflare:production
```

## Production Test Mode
When test mode is intentionally enabled:

```text
NEXT_PUBLIC_DEMO_MODE=true
PRODUCTION_TEST_MODE=true
```

Shared demo password: `HariyoDemo@2026`.

Before real customer cutover, configure real Worker secrets, disable both test flags, remove demo identities and redeploy.

## Validation status
See `V8_8_0_VALIDATION.md`. Source/database/release checks pass. The packaging environment could not complete a fresh npm registry install, so dependency-backed TypeScript/Vitest/OpenNext checks must be run by the connected Cloudflare/Git Linux builder before cutover.
