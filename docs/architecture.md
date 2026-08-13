# Hariyo Mart Nepal v2 Architecture

## Product model

Hariyo Mart is a location-first marketplace plus a farmer SaaS. A **tenant** represents a farmer, cooperative, producer, collection hub or vendor. Tenant data is not mixed at seller-workspace level: products and order fulfillments carry `tenantId`, and seller routes compare the authenticated JWT tenant with the resource tenant.

## Main flow

```text
Farmer mobile/web
  -> register farmer
  -> Tenant + User + Farm
  -> verification
  -> publish harvest (pending_review)
  -> admin approval
  -> active geo-indexed product

Buyer web/mobile
  -> current location / city preset
  -> GET /marketplace/nearby
  -> MongoDB $near + seller service-radius filter
  -> add products from one or more farmers
  -> checkout
  -> one Order
       -> Fulfillment A (Tenant A)
       -> Fulfillment B (Tenant B)
  -> each seller only manages its own fulfillment
  -> platform marks payout after delivery
```

## Web

Next.js App Router renders public SEO pages, catalog/product/farmer storefronts and dashboard routes. `LocationMarket` uses browser geolocation and calls the live API when `NEXT_PUBLIC_API_URL` is configured. The static catalog remains a resilient zero-database preview.

## API

Express 5 runs authentication, tenants, products, marketplace discovery, location data and orders. MongoDB GeoJSON points are indexed with `2dsphere` on product origin and farm location.

## Mobile

Expo Router ships a buyer experience and Farmer Studio in one codebase. Location permission is used for nearby discovery, checkout delivery coordinates and farmer-origin publishing. Seller access tokens are stored through Expo SecureStore.

## Isolation boundaries

- JWT contains `sub`, `role`, and optional `tenantId`.
- Farmer/vendor product mutations are restricted to authenticated tenant.
- Seller order access matches `fulfillments.tenantId`.
- Seller fulfillment mutations reject cross-tenant access.
- Admin routes intentionally bypass tenant scope only where platform moderation is required.

## Production integrations

Object storage/CDN, payment capture, refunds, OTP, notifications, courier integrations, KYC document verification, tax invoices and monitoring are external integrations and need deployment credentials/policies.
