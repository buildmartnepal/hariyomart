# Hariyo Mart Nepal v8.9.1 — Cloudflare Build Fix + Unified Mobile UX

## Why this release exists

Cloudflare Workers Builds successfully compiled the v8.9.0 Next.js application, then strict TypeScript failed on two commerce UI boundaries:

1. `app/compare/page.tsx` accessed optional `minimumOrder` directly on the literal `as const` catalog union.
2. `components/MarketplaceSearch.tsx` used a fallback expression where TypeScript could narrow the generated literal product to `never`.

v8.9.1 fixes both at the catalog boundary rather than weakening TypeScript.

## Build-safety changes

- Added widened `Product`, `Category` and `Province` catalog views.
- Added `getCatalogProduct(slug): Product | undefined` for build-safe commerce lookup.
- Compare now uses the widened product contract; `minimumOrder` remains optional and safely defaults to 1.
- Predictive search now consumes `productCatalog` / `categoryCatalog` and a typed `Product` image helper.
- Added v8 doctor regression guards for both fixes.
- Kept strict TypeScript configuration intact; no `ignoreBuildErrors`, broad `any`, or unsafe `unknown as` workaround was introduced.

## Website UI/UX upgrades

- Sticky translucent header with stronger hierarchy and less visual noise.
- Global marketplace search is now available on mobile header, not desktop-only.
- Improved focus rings, keyboard states and reduced-motion support.
- More consistent product-card heights, two-line title clamping, clearer stock section and stronger Add action.
- Improved hover behavior only on pointer devices so touch interfaces do not inherit desktop effects.
- Predictive search has clearer grouping, stronger search field, better result scanning and true mobile full-screen sheet behavior.
- Compare has clearer fact alignment on desktop and compact stacked comparison cards on phones.
- Mobile menu receives larger touch targets, controlled scrolling and safe-area padding.
- Mobile commerce dock and product buy bar are safe-area aware.
- Auto/Light/Dark theme tokens retain the Hariyo emerald/lime identity with improved contrast and shadows.

## Native mobile app upgrades

- Unified day/night palette with the website: emerald + lime in daylight, mint + deep forest at night.
- Primary bottom navigation reduced from six crowded destinations to five: Home, Nearby, Shop, Cart, Account.
- Sell remains available from the Home and seller/account flows rather than occupying permanent primary navigation space.
- Safer automatic StatusBar/header colors.
- Screen containers use automatic content insets, keyboard-aware touch behavior and hidden vertical scrollbars.
- Product cards use improved radius/density and consistent brand tokens.
- Home adds a compact trust strip for verified sellers, location matching and order support.
- Fixed a dark-mode contrast problem in the Home “Sell fresh” action.

## Preserved systems

All v8.9 public-content features and v8.8 commerce/Farmer OS systems remain: 98-product marketplace, galleries, location matching, save/wishlist, compare, recently viewed, reviews, seller replies, seller-grouped basket, guest checkout, buyer/farmer/admin workspaces, D1/R2/KV/Queues/Workers AI, standalone Cloudflare deployment and Production Test Mode.
