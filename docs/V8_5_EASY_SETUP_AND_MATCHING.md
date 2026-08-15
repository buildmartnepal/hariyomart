# Hariyo Mart Nepal v8.5.0 — Easy Setup, Product Gallery & Hariyo Match v2

## Easy setup
On Windows, double-click/run `SETUP-HARIYO-V8.5.0.cmd`. For CLI use `npm run setup:env`.

The setup generator creates:
- `apps/web/.env.local` — public/build-time web values
- `apps/mobile/.env` — public Expo URLs
- `apps/web/.dev.vars` — private local Worker secrets
- `HARIYO-PRIVATE-SETUP.generated.txt` — private recovery/setup summary

Rerunning setup reuses existing JWT/bootstrap secrets by default so an innocent configuration edit does not invalidate live sessions. Intentional rotation is available with:

```bash
node scripts/setup-hariyo-env.mjs --rotate-secrets
```

Production secrets are pushed to Cloudflare with `npm run secrets:push`. Private values are never written into tracked `wrangler.jsonc`.

For CI/automation the wizard supports `--non-interactive` with:
- `HARIYO_SETUP_SITE`
- `HARIYO_SETUP_ADMIN_EMAIL`
- `HARIYO_SETUP_ADMIN_NAME`
- `HARIYO_SETUP_TURNSTILE_SITE_KEY`
- `HARIYO_SETUP_TURNSTILE_SECRET_KEY`

## Product galleries
Seller Product Studio supports a primary photo plus up to 8 R2-backed gallery photos. Buyer cards show a compact slider with text safely below the media. Product detail pages show a large gallery with arrows, count and thumbnail navigation. Existing single-image products remain compatible because `images_json` defaults to an empty array.

## Hariyo Match v2
The engine follows **hard constraints first, ranking second**.

Hard eligibility includes:
- live stock
- seller delivery radius
- buyer-selected radius
- explicit category/query filters
- organic/wholesale/subscription requirements
- maximum price when supplied

Eligible listings are then scored using:
- delivery distance and service fit
- harvest freshness
- stock depth
- product/seller rating
- verified seller/featured trust
- search and category intent
- organic/wholesale/subscription signals
- budget fit

The API returns `matchScore`, `matchReasons`, `distanceKm` and serviceability. Admin can test live behavior at `/admin/matching-engine`.

## Data migration
Apply D1 migrations before deploying the new code:

```bash
npm run cloudflare:db:remote
```

Migration `0008_product_gallery_matching_v85.sql` adds `products.images_json` plus matching indexes.
