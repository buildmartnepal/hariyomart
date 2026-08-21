# Missing Things Done — Hariyo Mart Nepal v8.8.0

## Product discovery
- Added predictive global marketplace search instead of a search icon that only linked to Shop.
- Added product and category suggestions, popular products and recent-search memory.
- Search query can open Shop with the query already applied.
- Added fast decision filters: verified seller, same-day local, organic, 4.8+ rating and price ceiling.
- Kept applied-filter visibility, clear-all, category/province/district/radius/stock filters and Best Match sorting.

## Product decision system
- Added Save on cards and product details.
- Signed-in Save uses the real D1 wishlist API; guest saves persist locally.
- Guest saves merge into the signed-in account automatically.
- Added Compare, limited to three products for useful side-by-side decisions.
- Added dedicated comparison page with price, origin, rating, seller, fulfillment, stock, organic and minimum-order comparison.
- Added persistent Recently Viewed history and recovery rail.
- Added full-screen image zoom/lightbox while retaining multi-photo thumbnails, arrows, keyboard controls and mobile swipe.
- Added seller verification, service-zone and same-day/scheduled decision context.
- Added structured product buying facts: origin, grade, harvest/batch context, unit, minimum order, seller and fulfillment.
- Added fixed mobile product purchase bar.
- Surfaced the existing product review backend: published reviews, rating summary, seller replies and moderated buyer review submission.

## Basket and checkout
- Rebuilt cart drawer around seller groups rather than one undifferentiated list.
- Added seller-level fulfillment context and subtotals.
- Retained stock-aware button quantity controls.
- Rebuilt full cart page with seller groups and sticky order summary.
- Made Guest Checkout a first-class action rather than hiding it behind account creation.
- Added checkout progress, required/optional labels and browser autofill hints.
- Reframed fulfillment around delivery date/time instead of vague speed language.
- Strengthened final total / Place Order CTA.

## Mobile and responsive UX
- Added fixed mobile commerce dock: Shop, Nearby, Saved, Account, Basket.
- Added fixed product buy bar on mobile.
- Improved native mobile Shop with Verified and Same-day filters.
- Native product quantity now respects minimum-order increments.
- Native product detail exposes seller verification, same-day/scheduled status and delivery zone.
- Increased touch-oriented layout consistency across product actions, filters and checkout.

## Product trust and retention
- Real account wishlist integration is now visible in storefront UX.
- Compare and recently viewed are persistent local-first utilities.
- Saved/Compare personal utility routes are no-indexed for SEO hygiene.
- Reviews remain moderated by the existing admin review workflow.
- Seller replies are visible on published reviews.

## UX system and accessibility
- Extended the v8.7 adaptive Auto Day/Night Hariyo brand system rather than adding page-specific colors.
- Added clear focus states to search/review/commerce controls.
- Added aria labels and pressed states to Save, Compare, gallery and rating controls.
- Added Escape-to-close and modal body lock for predictive search and full-screen gallery behavior.
- Preserved Light, Dark and Auto themes.

## Backend / data / Cloudflare retained
- 98-product synchronized catalog remains intact.
- Up to 8 R2-backed product photos remain intact.
- Hariyo Match v3 location/serviceability engine remains intact.
- D1/KV/R2/Queues/Workers AI and standalone Worker fallbacks remain intact.
- Production Test Mode self-healing demo login remains intact.
- Farmer OS, supply/procurement/inventory/traceability/analytics/admin workflows remain intact.
