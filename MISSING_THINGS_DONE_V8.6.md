# Hariyo Mart Nepal v8.6.0 — Missing Things Closed

This release closes the main marketplace-experience gaps identified after v8.4.4.

## Completed

1. Multiple product photos: schema, API, seller upload, product-card slider, detail gallery and mobile paging.
2. Product descriptions: live description fallback, story section, benefits, origin, inventory and fulfilment context.
3. Location matching: delivery-radius eligibility, distance calculation, product location-fit panel and Nearby alternatives.
4. Intelligent ranking: Hariyo Match v3 with explainable score/reasons rather than raw distance-only ordering.
5. Buyer filtering: text query, category, organic, wholesale and subscription intent.
6. Seller trust: verified-farmer and rating signals are included in ranking and product presentation.
7. Mobile marketplace UX: gallery paging/counter, live product refresh, Match score and responsive controls.
8. Seller media UX: authenticated multi-file R2 gallery upload, preview and remove controls; max 8 images, max 8 MB each.
9. Admin tooling: Matching Center for testing ranking from an operations/admin view.
10. Production safety: v8.4.4 Cloudflare service-first deploy sequence and demo isolation preserved.
11. Release validation: v8.6 doctor now checks migration, gallery components, matching engine, API markers and production configuration.

## Production inputs still required from the account owner

- Replace the placeholder Cloudflare Turnstile public site key and ensure `TURNSTILE_SECRET_KEY`, `JWT_SECRET` and `JWT_REFRESH_SECRET` exist as Worker secrets.
- Apply D1 migration `0009` to the production database before serving gallery writes.
- Existing live products with only one real photo need additional seller photos uploaded; the code does not fabricate misleading product imagery.
