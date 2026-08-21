# Hariyo Mart Nepal v8.9.0 — Public Story, Trust & Content Experience

v8.9.0 builds on the v8.8 commerce system and upgrades the public-facing information layer so About, Contact, How It Works and every supporting guide/policy page are no longer plain text destinations.

## What changed

- New reusable `InfoPageExperience` system for all public guide pages.
- About page now includes a marketplace system diagram showing Seller → Location → Stock → Route → Order → Payout around the Hariyo marketplace core.
- Contact page now includes a support-routing graphic and safer support guidance.
- Contact form now asks for support type, optional order/reference, priority and clearer issue context while preserving the existing D1 ticket API.
- How It Works expanded from six basic cards into an eight-stage operating journey from seller setup to review/payout.
- Separate buyer and seller journey panels explain what each role does next.
- New trust-checkpoint grid clarifies seller, product, delivery-fit, account, order and feedback controls.
- Every public information page receives a visual story panel, campaign/brand artwork, three key facts, three decision cards, FAQ module and stronger next-step CTA.
- Public content now connects more deliberately to Shop, Nearby, Seller onboarding, Track Order, buyer workspaces and Support.
- Mobile layouts added for all new diagrams, metric strips, FAQ panels and CTAs.
- About, Contact and other public company/help destinations are easier to reach from mobile navigation/footer.
- Adaptive light/dark/auto tokens from v8.7 continue to style all new components.
- Existing v8.8 commerce features—wishlist, compare, recently viewed, reviews, seller-grouped cart, checkout, Hariyo Match v3, mobile commerce and Farmer OS—remain intact.

## Release identity

- Root/web/API/mobile version: 8.9.0
- Cloudflare `RELEASE_VERSION`: 8.9.0
- D1 public release marker: 8.9.0
- Default deployment remains standalone; `HARIYO_SERVICES` is optional.
