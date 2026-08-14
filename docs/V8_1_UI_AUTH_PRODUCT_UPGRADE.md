# Hariyo Mart v8.1 UI, Authentication and Product-Commerce Upgrade

## Theme contract

The UI now uses semantic navigation, field, footer, status and action tokens rather than assuming white text or white backgrounds. The footer intentionally remains a dark brand surface in both themes, while its newsletter field is intentionally light with dark field text and a green/dark action button. Header/mobile navigation uses theme-aware surfaces and text. Browser autofill is explicitly styled to prevent invisible autofilled values.

When adding a new component, prefer `var(--ink)`, `var(--muted)`, `var(--surface)`, `var(--surface-raised)`, `var(--field-bg)`, `var(--field-text)`, `var(--nav-text)` and `var(--line)` instead of hard-coded foreground colors unless the component is deliberately a fixed dark/light artwork surface.

## Seller product lifecycle

1. Seller creates a harvest/product from `/farmer/list-harvest`.
2. Product is inserted in D1 as `pending_review` and linked to the active tenant.
3. Product images are uploaded to R2 under a tenant-scoped object path.
4. Admin verifies the seller tenant and approves appropriate products.
5. Active products appear publicly in Marketplace/product detail/location discovery.
6. Seller can update operational fields in `/farmer/products`.
7. Buyer-facing content changes on an active product return the listing to `pending_review`; sellers cannot self-activate.
8. Stock changes are serialized against active reservations by the InventoryCoordinator Durable Object.
9. Sellers can pause and later resubmit products; admins can approve/reject/archive through the platform permission boundary.

## Browser authentication

- Password is bcrypt-hashed server-side.
- Login creates a short-lived access token and a D1-backed refresh session.
- Browser receives access/refresh only in HttpOnly cookies.
- Mobile receives explicit tokens only when `X-Client-Platform: mobile` is set.
- Refresh rotates the refresh session.
- Logout revokes the refresh session and deletes cookies.
- Web Turnstile is server-validated; production also validates expected hostname/action.
- Registration/login/refresh use dedicated Durable Object rate-limit scopes.

## Tenant authorization

A user may be a member of multiple tenants. The active tenant is stored on the user and can be switched only to a tenant with an active membership (platform admins are the exception). Product reads/writes, supply operations and seller media uploads resolve the active tenant and enforce permitted tenant roles against D1 at request time.

## Product editor fields

The current seller editor supports name, canonical category, canonical province, district, municipality, unit, price, available stock, minimum order, grade, harvest date, freshness note, short buyer description, farm story, full buyer details, delivery radius, organic, wholesale, subscription and R2 product-photo replacement.

For lot-level produce operations, use the v8 supply modules for SKUs/variants, lots, best-before, warehouse/bin, quality, purchase orders, wholesale price lists and route fulfillment rather than overloading the storefront product record.

## Deployment verification

Run:

```bash
npm ci
npm run v8.1:doctor
node scripts/syntax-check.mjs
npm run validate
npm run smoke
npm run cloudflare:types
npm run typecheck
npm run build:cloudflare
```

Before remote migration, export the current D1 database. Deploy the services Worker before the web Worker so inventory coordination and auth rate limiting are available when production traffic reaches the new version.
