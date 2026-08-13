# Hariyo Mart Nepal — Location Marketplace v2

## Marketplace rules

1. Farmer creates a tenant/store and attaches a farm location.
2. Admin verifies the farmer/farm identity before trusted public operation.
3. Farmer lists a unique harvest with current stock, price, origin, freshness and delivery radius.
4. Product enters moderation as `pending_review`.
5. Approved products become geo-searchable.
6. Buyer shares location or chooses a nearby city.
7. Marketplace ranks active products by physical distance.
8. A product is suppressed when the buyer is outside the seller’s own service radius.
9. Buyer can combine several farmers in one cart.
10. Checkout splits the order into seller fulfillments and reserves stock.
11. Each farmer updates only their fulfillment.
12. Commission and farmer net are recorded per seller fulfillment for payout reconciliation.

## Suggested production phases

- Phase 1: COD, verified farmers, district/local delivery, manual payout.
- Phase 2: eSewa/Khalti/Fonepay, KYC uploads, courier APIs, push/SMS notifications, image CDN.
- Phase 3: wholesale RFQ, subscription produce boxes, collection hubs, route batching, farm analytics and demand forecasting.
- Phase 4: multilingual Nepali UI, farmer voice-assisted listing, buyer personalization, cooperative procurement and export-ready traceability.
