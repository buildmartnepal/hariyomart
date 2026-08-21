# Hariyo Mart Nepal v8.8.0 — Commerce Experience System

v8.8.0 turns the v8.7 marketplace foundation into a more complete buyer decision and conversion system while preserving the Cloudflare-native runtime, Farmer OS, multi-seller commerce, D1/R2/KV architecture, production-test login hardening and 98-product seeded marketplace.

## Buyer experience

- Predictive global marketplace search now suggests products and categories, remembers recent searches, and can hand a query directly into Shop filtering.

- Real Save controls on product cards and details; authenticated saves use the existing D1 wishlist API and guest saves persist locally.
- Guest saved products merge into the account wishlist after sign-in.
- Up to three products can be compared side-by-side by price, origin, rating, seller, fulfillment, organic status, stock and minimum order.
- Recently viewed products persist locally and appear as a horizontal recovery rail.
- Product image gallery adds a full-screen zoom/lightbox while keeping thumbnails, arrows, keyboard controls and swipe behavior.
- Product detail adds a decision strip, structured buying facts, seller/service-zone information and a fixed mobile purchase bar.
- The existing review backend is now surfaced on product pages with published buyer feedback, seller replies, rating summary and moderated buyer submissions.
- Shop adds quick filters for same-day local, verified sellers, organic, 4.8+ rating and price ceilings while keeping applied-filter visibility.

## Basket and checkout

- Basket drawer and cart page group products by seller.
- Quantity controls remain button-based and stock aware.
- Guest checkout is explicitly presented as the default low-friction route.
- Checkout labels required and optional fields, adds browser autofill hints, a progress indicator, clearer delivery-date language and a stronger order summary.
- Existing coupon, slot capacity, seller split, D1 idempotency and COD payment behavior remain intact.

## Mobile

- Fixed bottom marketplace dock: Shop, Nearby, Saved, Account and Basket.
- Product pages add a fixed mobile buy bar.
- Native mobile product detail respects minimum-order increments and shows seller verification, same-day availability and delivery zone.
- Native mobile Shop gains Verified and Same-day quick filters.

## Seller/admin platform retained

Farmer Studio, harvest publishing, Farmer OS, buyer demand, traceability, supply SaaS, tenant control, inventory, procurement, delivery, returns, promotions, content management, audit, analytics, matching administration, test identities and standalone Cloudflare deployment remain available.
