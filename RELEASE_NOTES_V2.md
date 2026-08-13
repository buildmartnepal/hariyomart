# Hariyo Mart Nepal v2.0 — Location Marketplace + Farmer SaaS

## Major upgrade

Hariyo Mart Nepal is now designed as one national marketplace made of many independent farmer stores. Buyers discover products by location and serviceability; farmers own isolated tenant inventory and fulfillment.

## New buyer capabilities

- GPS/location-first product matching.
- Radius filtering and nearest-farm ranking.
- Live API inventory on web and mobile, with seed fallback.
- Dynamic farmer-published product pages.
- Dynamic verified farmer storefronts.
- Multi-seller cart and one-checkout experience.
- Seller-by-seller service-radius enforcement.
- Stock reservation at order creation.

## New farmer capabilities

- Farmer account + tenant + farm onboarding.
- Farm coordinates and delivery radius.
- Web harvest publisher.
- Mobile Farmer Studio registration, sign-in and harvest publishing.
- Separate inventory and seller orders.
- Moderation lifecycle before products become public.
- Tenant-specific fulfillment updates and payout records.

## New platform controls

- Admin farmer verification endpoint.
- Product approval rejects activation for unverified seller tenants.
- Multi-seller order fulfillment grouped by tenant + farm.
- Platform commission and farmer net tracked per fulfillment.
- Nearby-farm and nearby-product geospatial API.

## Validation performed in this environment

- 84 unique seeded products validated.
- 70 TypeScript/TSX files passed TypeScript syntax transpilation.
- v2 marketplace route wiring smoke check passed.
- JSON parsing passed.
- OpenAPI YAML parsing passed.
- Web stylesheet brace validation passed.
- Full `npm install` / framework production build could not be completed because package installation timed out in the sandbox; this is not reported as a successful production build.
