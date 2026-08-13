# Hariyo Mart Nepal v3.0 — Full Marketplace + SaaS + Mobile Core

## Major upgrade

v3 turns the v2 location marketplace into an authenticated operational platform. The web seller/admin/buyer workspaces now read and mutate API data instead of being presentation-only dashboards.

## Website

- Premium public marketplace, Nearby location matching, province/category/product/farmer SEO pages.
- Unified sign-in for customer, farmer/vendor and admin roles.
- Buyer registration and role-aware workspace routing.
- Responsive mobile navigation with account state.
- Multi-seller cart and location checkout.
- Optional Cloudinary direct crop-photo upload for farmer harvests.

## Farmer SaaS

- Farmer registration creates User + Tenant + Farm.
- Every newly published harvest is now attached to the seller's real `farmId` and tenant.
- Seller inventory, moderation states, low-stock view and product controls.
- Seller order queue with fulfillment status transitions.
- 7-day sales, open orders, live inventory, unique buyers and payout metrics.
- Tenant-specific store and delivery-radius settings.
- Commission / farmer-net / payout ledger.
- Certification, team and customer modules retained in the product architecture.

## Admin SaaS

- Admin-only operational dashboard.
- Farmer/tenant verification queue.
- Product approval and rejection queue.
- Marketplace order oversight.
- GMV and pending payout liability metrics.
- One-time protected admin bootstrap endpoint.
- Product activation is blocked until the owning seller tenant is verified.

## Buyer account

- Buyer profile and role session.
- Order history.
- Saved delivery addresses.
- Wishlist API.
- Reward/wallet-ready profile fields.
- Account language and notification preferences.

## Mobile app

- Buyer Home, Nearby, Shop, Cart, Checkout and Account tabs.
- Mobile buyer sign-in/registration with SecureStore tokens.
- Mobile order history.
- Farmer Studio registration/sign-in and live seller metrics.
- Farmer harvest publishing from current device location.
- COD / eSewa / Khalti / Fonepay order-method selection; live gateway authorization still requires merchant credentials.

## Backend hardening

- Role + tenant middleware remains the authorization boundary.
- `/api/auth/me`, token refresh and one-time admin bootstrap.
- `/api/dashboard/farmer`, `/api/dashboard/admin`, `/api/dashboard/buyer`.
- `/api/account/*` profile/address/wishlist endpoints.
- Sold-out products are automatically removed from active discovery when stock reaches zero during reservation.
- Geospatial service-radius checkout remains enforced seller-by-seller.

## External credentials still required for production

MongoDB Atlas (or compatible MongoDB), strong JWT secrets, production web/API URLs, Cloudinary (optional farmer photo uploads), and merchant credentials for eSewa/Khalti/Fonepay. SMS/OTP, push notifications and App Store / Play Store signing can be added without changing the core tenancy model.
