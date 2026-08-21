# Hariyo Mart Nepal v10.0.1 — Production Build & Deploy Fix

Release date: 2026-08-21

v10.0.1 turns the v10 Nepal Origin Export OS WIP branch into a reproducible production release candidate. It fixes every Turbopack error reported by Cloudflare, repairs the fresh-database v10 seed foreign key, and prevents catalog regeneration from reintroducing the missing-export regression.

## Build fixes

- Restored the widened catalog compatibility API: `productCatalog`, `categoryCatalog`, `provinceCatalog`, and `getCatalogProduct()`.
- Fixed the malformed conditional JSX in `ShopClient.tsx`.
- Fixed `apps/web/scripts/sync-catalog.mjs` so regeneration preserves the compatibility API permanently.
- Added v10 regression checks to the release doctor for catalog exports and the Shop JSX branch.
- Added `v10:preflight` and `build:cloudflare:production` scripts.

## Production data fixes

- Fixed the `LOCAL10` promotion foreign key from the removed v9 tenant `seed-tenant-bagmati` to the valid v10 sourcing tenant `seed-tenant-kavre-hills`.
- Fresh v10 database now seeds 420 products, 23 categories, 28 sourcing tenants, 190 export-ready listings, 28 export supplier profiles and 3 promotions.
- Operational seed is idempotent when rerun.

## Nepal Origin Export OS retained

- 420 Nepal-origin city/wholesale/export SKUs across 210 product families.
- 28 sourcing clusters across all 7 provinces.
- Export inquiry/RFQ workflow, export supplier profiles and export document records.
- Product origin, municipality, altitude, season, processing, shelf-life, storage, trade pack, export MOQ, lead time, destination markets and compliance-note fields.
- Existing marketplace, Hariyo Match, multi-photo products, buyer commerce, Farmer OS, admin, Demo Lab and mobile app systems remain intact.

## Brand system

The v10 semantic palette is defined in `apps/web/app/globals.css` around Hariyo Forest, Nepal Leaf, Fresh Lime, Marigold Gold, Rhododendron, Himalayan Sky, Earth, Snow Mist, Warm Cream and Night Pine. Auto Day/Auto Night map onto the same token system.
