# API Reference — Hariyo Mart Nepal v2

Base path: `/api`

## Public marketplace

- `GET /products` — active products; filters `q`, `category`, `province`, `limit`, `page`.
- `GET /products/:slug` — public active product.
- `GET /marketplace/nearby?lat=&lng=&radiusKm=&category=&limit=` — nearest active harvests, enriched with distance and farmer name; filters products outside seller service radius.
- `GET /marketplace/farms?lat=&lng=&radiusKm=` — verified nearby farms.
- `POST /marketplace/delivery-quote` — buyer/seller coordinate quote.
- `POST /orders/guest` — one multi-seller guest checkout.

## Authentication

- `POST /auth/register` — customer account.
- `POST /auth/register-farmer` — creates farmer tenant, seller user and farm.
- `POST /auth/login` — JWT access + refresh tokens.
- `POST /auth/refresh` — new access token from refresh token.

## Farmer / vendor

Bearer JWT required.

- `GET /tenants/mine`
- `PATCH /tenants/:id`
- `GET /products/seller/mine`
- `POST /products` — creates tenant-scoped harvest in `pending_review`.
- `PATCH /products/:id`
- `GET /orders/seller`
- `PATCH /orders/:orderId/fulfillments/:fulfillmentId/status`

## Buyer account

- `POST /orders`
- `GET /orders/mine`

## Admin

- `GET /tenants`
- `PATCH /tenants/:id/verify`
- `PATCH /products/:id` with moderation status
- `PATCH /orders/:orderId/fulfillments/:fulfillmentId/payout`

## Health

`GET /api/health` reports server state and capability flags.
