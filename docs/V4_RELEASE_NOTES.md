# Hariyo Mart Nepal v4.0 — Production Full-Stack Release

- Native Next.js `/api` backend for one-origin Vercel deployment.
- MongoDB Atlas persistence from Vercel Route Handlers.
- Redis or Upstash REST support for rate limits and refresh-session rotation.
- HttpOnly cookie authentication for web; SecureStore bearer authentication for Expo mobile.
- Refresh-token rotation/revocation and logout endpoint.
- Multi-tenant seller isolation preserved on all seller resources.
- Buyer profiles, saved addresses and wishlist persisted.
- Farmer onboarding, farm tenant, harvest inventory and approval lifecycle persisted.
- Atomic stock reservation for checkout with rollback on failure.
- Idempotency-key support for checkout.
- Payment records and provider-readiness endpoint.
- Audit logs for sensitive tenant/order/admin actions.
- Signed Cloudinary upload endpoint. The former unsigned-preset fallback was removed in v5.
- Non-destructive 84-product / 7-province database seed.
- Environment validator, secret generator and infrastructure readiness endpoint.
- Legacy `apps/api` retained for optional local/worker use; Vercel production uses `apps/web/app/api`.

- Security baseline updated to Next.js 15.5.21 Maintenance LTS and React 19.0.7 instead of the older vulnerable 15.2.4 / React 19.0.0 pins.
