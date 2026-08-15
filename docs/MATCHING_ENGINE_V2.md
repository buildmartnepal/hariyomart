# Hariyo Match v2

Hariyo Match v2 is the explainable discovery engine used by the web shop, Nearby marketplace, API, and mobile fallback ranking.

## Hard eligibility
A listing must be in stock, inside the seller's delivery radius, inside the buyer-selected radius, and satisfy explicit category/query/organic/wholesale/subscription/price filters.

## Ranking signals
Eligible products are scored on a 0–100 scale using:
- delivery distance and service fit
- live stock depth
- harvest/freshness signal
- seller/product rating
- verified seller and featured trust signals
- category/search intent
- organic/wholesale/subscription quality signals
- budget fit when a maximum price is supplied

The API returns both `matchScore` and short `matchReasons` so ranking is explainable rather than opaque.

## Design philosophy
Hard constraints first, ranking second. A high score never overrides an impossible delivery zone or an out-of-stock listing.

## Next evolution
The deterministic engine is intentionally safe to operate before ML. Future versions can add consented first-party affinity signals such as repeat purchases, saved products, preferred categories, delivery success, and seller reliability while keeping hard serviceability constraints dominant.
