# Hariyo Mart Nepal v8.5.0 — Smart Merchandising & Matching

## Added
- Guided environment/setup workflow for Windows and CLI, with generated JWT/bootstrap secrets, web/mobile env files, safe secret reuse on reruns, and explicit `--rotate-secrets` when rotation is intentional.
- One-command Wrangler secret push helper; private secrets never go into tracked `wrangler.jsonc`.
- Up to 8 Cloudflare R2 product gallery images per product.
- Product-card image slider with buyer content below the media, arrows/dots and match badges.
- Large product detail gallery with arrows, thumbnails and image count.
- Farmer Product Studio and harvest publishing support for multi-photo upload/remove/reorder-ready data.
- Hariyo Match v2 explainable ranking: seller delivery radius, buyer radius, freshness, stock, rating, seller trust, search/category intent, quality signals and budget.
- Best Match sorting on the marketplace and match badges/reasons in Nearby discovery.
- Admin → Matching Engine simulator for live location/filter diagnostics.
- Mobile product gallery and mobile smart-match visibility.
- D1 migration `0008_product_gallery_matching_v85.sql` for product gallery data and matching indexes.
- Matching regression tests and architecture documentation.

## Production order
1. `npm install`
2. Run `SETUP-HARIYO-V8.5.0.cmd` or `npm run setup:env`
3. Add real Cloudflare Turnstile site + secret keys
4. `npm run secrets:push`
5. `npm run cloudflare:db:remote`
6. `npm run deploy:cloudflare`
7. Bootstrap the first admin only if one does not already exist

Do not commit generated `.env`, `.dev.vars` or `HARIYO-PRIVATE-SETUP.generated.txt` files.
