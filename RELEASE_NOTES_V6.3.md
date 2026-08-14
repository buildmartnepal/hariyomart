# Hariyo Mart Nepal v6.3

- Integrated seven unique supplied Hariyo premium graphics; duplicate source uploads were omitted.
- Added responsive campaign hero, campaign pathways, Campaign Studio, seller creative and premium
  sign-in branding with optimized WebP output.
- Added the supplied campaign to the Expo buyer home and seller onboarding screens with compressed
  native JPEG assets.
- Added strong first-owner bootstrap confirmation and real login verification.
- Added authenticated password change with current-password verification and global session revoke.
- Made `finish:cloudflare` require first-owner setup and automatically rotate the bootstrap key.
- Expanded idempotent D1 data from catalog-only to end-to-end operations: orders, fulfilments,
  inventory, reviews, promotions, support, CMS, blog, subscribers, notifications and audit history.
- Added readiness visibility for owner setup and seeded data counts.
- Preserved secure defaults: no plaintext admin password and no login-capable seed identities.
- Validated against Cloudflare's current Worker guidance: generated binding types, current
  compatibility dates, `nodejs_compat`, secrets outside source, service bindings, observability and
  product-set keyed Durable Object checkout coordination.
