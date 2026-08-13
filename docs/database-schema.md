# Database Schema — Location Marketplace v2

## Tenant

`name, slug, ownerId, ownerName, phone, type, status, plan, branding, location.geo, delivery, specialties, commissionRate, payoutStatus, verifiedAt`

Purpose: top-level multi-tenant seller boundary.

## User

Customer, farmer/vendor and admin identities. Farmer users carry `tenantId` and optional address/location data. Passwords are stored as bcrypt hashes.

## Farm

`tenantId, ownerId, name, slug, story, productionTypes, certifications, location.geo, serviceRadiusKm, pickup, sameDay, verificationStatus, rating`

Index: `location.geo` is `2dsphere`.

## Product / Harvest

`tenantId, farmId, farmerId, slug, name, category, province, district, municipality, origin, unit, price, oldPrice, stock, minimumOrder, priceTiers, organic, grade, harvestDate, harvestWindow, uniqueStory, image(s), saleChannels, deliveryRadiusKm, status, isActive`

Indexes: product origin `2dsphere`; tenant/status; text search.

## Order

One buyer-facing order can contain products from many tenants. It stores:

- buyer or guest customer
- immutable order lines
- buyer delivery address + optional coordinates
- subtotal, seller delivery fees and total
- payment method/status
- order status/timeline
- an array of seller fulfillments

## Fulfillment

Each order fulfillment contains a single seller tenant’s lines, `tenantId`, `farmId`, seller subtotal, delivery fee, commission, farmer net, seller origin, distance, fulfillment method/status, payout status and seller timeline.

This prevents one farmer from changing another farmer’s fulfillment while preserving one checkout for the buyer.
