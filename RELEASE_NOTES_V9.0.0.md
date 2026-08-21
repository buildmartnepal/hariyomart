# Hariyo Mart Nepal v9.0.0 — Demo Lab + Repeat Commerce

## Release focus
v9.0.0 makes Production Test Mode reliable even when a deployment uses raw OpenNext deploy and skips the optional demo seed command. It also adds repeat-purchase features across web and mobile.

## Demo reliability
- New `/api/auth/demo-session` endpoint available only when `APP_ENV=production`, `PRODUCTION_TEST_MODE=true`, and `NEXT_PUBLIC_DEMO_MODE=true`.
- One-click demo launch no longer depends on a password hash already existing in D1.
- Manual `HariyoDemo@2026` sign-in for allow-listed demo accounts uses the same runtime bootstrap path.
- Runtime creates/repairs the selected test user, activates it, refreshes its shared password hash, creates a dedicated verified demo tenant for seller roles, grants the expected tenant membership, activates Enterprise demo entitlements, and creates three test products.
- Demo access stays limited to the explicit allow-list in `apps/web/lib/demo-accounts.ts`.
- Demo Lab exposes live readiness checks and all role launch cards.
- Mobile Account can detect Demo Mode from `/api/demo-config` and launch Buyer, Farmer, or Admin sessions directly.

## New buyer features
- Saved Baskets persisted in D1 (`saved_baskets`).
- Save the current cart from the basket drawer.
- `/saved-baskets` account utility page for restoring or deleting reusable baskets.
- Quick Reorder from buyer order history on web.
- Quick Reorder from order history in the native mobile app.
- Mobile cart now respects product minimum-order steps.

## UX upgrades
- New Demo Lab visual system with readiness cards, system checks, one-click roles and mobile layout.
- Demo Lab shortcut added to desktop and mobile navigation when Test Mode is available.
- Saved Basket page and basket-drawer actions use the same adaptive Hariyo design tokens.
- Buyer order history shows order-line chips and a direct reorder action.

## Data
- Migration `0012_demo_lab_saved_baskets_v900.sql`.
- Fresh validation database: 81 application tables, 98 products, 7 operational tenants, 14 seeded demo identities.
