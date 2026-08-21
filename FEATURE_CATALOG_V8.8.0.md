# Hariyo Mart Nepal v8.8.0 — Feature Catalog

## Public marketplace
- Location-aware marketplace across Nepal provinces and districts
- Hariyo Match v3 distance/service-zone ranking
- Predictive marketplace search with product/category suggestions and recent searches
- Search, category, province, district, radius and stock filtering
- Quick filters: same-day, verified seller, organic, 4.8+ rating, price ceiling
- Applied-filter chips and clear-all
- Best Match, nearest, freshness, rating and price sorting
- Compact/roomy product grid modes
- Live inventory refresh from the same-origin API
- Category and province discovery pages
- Farmer/store directory and public farmer profiles
- Product SEO metadata, sitemap and Product structured data
- Personal Saved/Compare utility pages are intentionally no-indexed

## Product system
- Up to 8 product photos per listing
- Card photo carousel
- Product-detail photo gallery with thumbnails, arrows, keyboard controls and swipe
- Full-screen product image zoom/lightbox
- Price, old price and savings display
- Organic / featured / location / match badges
- Seller name and verification status
- Distance and service-radius awareness
- Stock and low-stock status
- Minimum-order display and quantity increments
- Product description, benefits, story, origin, grade and harvest window
- Wholesale/subscription indicators where available
- Seller storefront link
- Save / wishlist
- Guest saved-product persistence
- Signed-in D1 wishlist synchronization
- Guest-to-account wishlist merge
- Compare up to 3 products
- Dedicated comparison page
- Recently viewed product memory
- Recently viewed recovery rail
- Mobile fixed purchase bar
- Published buyer reviews and rating summary
- Seller replies displayed on published reviews
- Buyer review submission with admin moderation

## Cart and checkout
- Persistent browser cart
- Signed-in Cloudflare cart synchronization
- Multi-seller basket grouping
- Seller-level subtotal and fulfillment context
- Stock-aware quantity buttons
- Product removal
- Full cart page and quick basket drawer
- Guest-first checkout
- Address and geolocation capture
- Delivery date / time slot selection
- Slot capacity awareness
- Coupon validation
- Cash on delivery
- Idempotent guest order creation
- Seller-split fulfillment and settlement architecture
- Order confirmation and tracking route

## Buyer account
- Login / registration
- Saved products
- Orders
- Addresses
- Rewards and profile metrics
- Returns
- Nearby and business-demand workspace sections
- Cross-device cart synchronization when signed in

## Farmer / vendor platform
- Farmer Studio tenant workspace
- Harvest listing and product management
- Multi-photo seller product publishing through R2
- Delivery radius and fulfillment settings
- Orders, customers and payouts
- Farmer OS overview
- Farm planning / crop cycles
- Expenses and profitability
- Buyer demand and offers
- Lot traceability
- AI/recommendation workspace
- Procurement, warehouses, suppliers and inventory workflows
- Price lists, delivery routes, subscriptions and reports

## Admin platform
- Marketplace overview
- Farmer onboarding / verification
- Tenant and membership management
- Product/category/content moderation
- Hariyo Match v3 administration
- Commerce control center
- Promotions and coupons
- Delivery zones / slots
- Returns and support
- Reviews
- Media
- Analytics
- Audit log
- Settings
- Supply-platform administration

## Cloudflare platform
- Next.js 16 + OpenNext Worker
- D1 primary relational data
- R2 product/media storage and OpenNext cache
- KV config/cache/rate-limit fallback
- Queue producer
- Workers AI binding
- Optional advanced services Worker
- Optional Durable Objects / workflows / realtime coordination
- Standalone web deployment when private services Worker is absent
- Source maps and observability
- Production guard, config validator and release doctor
- D1 migration + idempotent seed preparation
- Production Test Mode with scoped demo identities

## UX / accessibility
- Light, Dark and Auto system themes
- Adaptive Auto Day / Auto Night Hariyo brand palette
- 44px+ form controls / touch-oriented actions
- Keyboard gallery controls
- Accessible labels and pressed/selected states
- Mobile filter drawer and quick-filter rail
- Fixed mobile commerce dock
- Responsive seller-grouped basket and checkout
- Required/optional checkout labels and autofill hints

## Complete authenticated workspace map

### Buyer account sections
1. Overview
2. Orders
3. Nearby
4. Business demand
5. Addresses
6. Wishlist
7. Subscriptions
8. Wallet
9. Rewards
10. Reviews
11. Returns
12. Settings

### Farmer / vendor workspace sections
1. Overview
2. Business Center
3. Farm planning
4. Profitability
5. Buyer demand
6. Traceability
7. AI advisor
8. List harvest
9. Products
10. Orders
11. Commerce control
12. Inventory
13. Delivery zone
14. Customers
15. Payments
16. Payouts
17. Certifications
18. Team
19. Store profile
20. Supply planning
21. Procurement
22. Lots & quality
23. Warehouses
24. Pricing
25. Wholesale
26. Delivery routes
27. Subscriptions
28. Reports
29. Team access

### Admin workspace sections
1. Overview
2. Farmer onboarding
3. Tenants
4. Users
5. Matching engine
6. Products
7. Categories
8. Pages
9. Media
10. Orders
11. Commerce control
12. Inventory
13. Settlements
14. Delivery zones
15. Warehouses
16. Payments
17. Content
18. Promotions
19. Reviews
20. Support
21. Analytics
22. Audit log
23. SaaS tenants
24. Plans & billing
25. Supply network
26. Platform events
27. Data platform
28. Settings

## Public route and content system
- Homepage / landing experience
- Marketplace Shop
- Nearby marketplace
- Product detail pages
- Saved-products utility
- Product comparison utility
- Cart
- Checkout
- Campaigns
- Province discovery pages
- Category discovery pages
- Farmer directory
- Farmer storefront/profile pages
- Sell-on-Hariyo onboarding
- How it works
- Blog index and article pages
- CMS-driven info pages
- Order tracking
- Public lot/QR traceability page
- Login, registration and demo/test entry
- Web app manifest, robots and sitemap

## Commerce data and operational behaviors
- Product catalog and seller-owned product records
- Product status/review lifecycle
- Live inventory quantity
- Inventory events and audit behavior
- Product price history
- Multi-seller order items and fulfillments
- Delivery slot selection/capacity
- Service areas and seller delivery radii
- Coupon/promotion validation
- Returns/RMA workflow
- Seller payout/settlement status
- Customer addresses
- User wishlist
- Cross-device authenticated cart sync
- Guest cart persistence
- Seller-level order/fulfillment context
- Review moderation and seller replies
- Support ticket creation and admin support queue
- Newsletter/content API

## Seller product publishing details
- Product name and category
- Primary photo and gallery photos
- R2 media upload
- Price / old price
- Unit
- Stock quantity
- Organic flag
- Featured/review lifecycle support
- Short and long description
- Benefits
- Grade / quality context
- Harvest window
- Minimum order
- Wholesale availability
- Subscription availability
- Seller delivery radius
- Pickup/same-day fulfillment settings at tenant level
- Live listing review/resubmission workflow

## Location and matching intelligence
- Browser/geolocation-aware buyer location
- Preset Nepal market locations
- Province/district awareness
- Seller latitude/longitude
- Haversine-style distance calculation
- Seller service-radius hard constraint
- Buyer search radius constraint
- Stock/serviceability exclusion
- Hariyo Match v3 score
- Explainable reasons such as proximity, freshness, verification and rating
- Best Match sorting
- Nearest sorting
- Same-day local filtering
- Verified-seller filtering
- Nearby discovery page
- Admin matching simulator

## Security and production controls
- Role-aware authentication/session handling
- Scoped Production Test Mode demo identities
- Self-healing stale demo identity hash only for allow-listed demo accounts
- Normal account password verification remains separate
- Cloudflare Turnstile integration path
- Dashboard-managed public Turnstile key preservation through `keep_vars=true`
- JWT access/refresh secret support
- KV-backed standalone auth rate-limit fallback
- D1 standalone fallbacks when optional coordination Worker is absent
- Production guard
- Cloudflare config validator
- Release doctor
- Request IDs/actionable API errors for setup failures
- Audit log infrastructure
- Demo-data removal workflow for production cutover

## Performance / platform design
- Next.js App Router
- Static/SSG public content where appropriate
- Dynamic product/API routes where live data is required
- OpenNext Cloudflare Worker bundle
- R2 incremental cache
- Responsive Next Image usage for marketplace media
- Live marketplace inventory refresh with abort/visibility handling
- Local-first Save/Compare/Recent state for immediate interaction
- Account synchronization for persisted wishlist/cart behaviors
- Optional advanced private Worker rather than a hard deployment dependency
