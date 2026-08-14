# Hariyo Mart Nepal v8.1.0 — Theme, Auth & Product Commerce Hardening

## UI / UX

- Fixed dark-mode desktop navigation and mobile-menu contrast with semantic navigation tokens.
- Added a dedicated on-dark brand logo and correct light/dark logo switching.
- Fixed light-mode footer newsletter field/button contrast and browser autofill contrast.
- Reworked secondary button defaults so light cards never inherit white-on-white styling while dark marketing surfaces keep intentional light outline CTAs.
- Hardened auth-page, buyer-card, mini-app preview, workspace/sidebar, product-editor and form contrast in both themes.
- Added responsive product-photo editing and live-product links in the seller product studio.

## Product selling

- Seller product workspace is now a real product-management studio instead of a read-only listing table.
- Sellers can edit product name, category, province, district, municipality, unit, price, stock, minimum order, grade, harvest date, freshness note, short description, farm story, full details, delivery radius, organic/wholesale/subscription flags and R2-hosted product photos.
- Categories and provinces use the canonical catalog rather than free-form values.
- Live buyer-facing content changes automatically return a seller listing to review; price/stock operations keep the existing lifecycle policy.
- Product pause/re-submit workflows and public live-product links are included.
- Stock editing uses the Cloudflare InventoryCoordinator service, preserving active reservation safety.

## Authentication and tenant security

- Browser auth JSON no longer exposes access/refresh tokens; browser tokens remain HttpOnly-cookie-only.
- Mobile keeps explicit token responses for SecureStore/device use.
- Added scoped auth rate-limit buckets for buyer registration, farmer registration, login and refresh.
- Production auth fails closed when the authentication rate-limit service is unavailable.
- Turnstile Siteverify now has a bounded request timeout and production hostname validation in addition to action validation.
- New registrations require 10+ characters with upper/lowercase and a number; admin password policy remains stronger.
- Existing-account registration returns a clear 409 response after security verification.
- Multi-tenant R2 product-photo upload now validates tenant membership/role rather than trusting only the global user role.
- Tenant switcher always selects a valid visible tenant and surfaces switching errors.

## Documentation and release hygiene

- Replaced the stale v7 Supabase README with the current Cloudflare-native v8.1 architecture and deployment flow.
- Updated workspace package versions and package-lock workspace versions to 8.1.0.
- Readiness/API version markers now report 8.1.0.
- Extended the architecture doctor with v8.1 theme/auth hardening markers.
