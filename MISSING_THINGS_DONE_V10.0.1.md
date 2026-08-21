# Missing Things Done — v10.0.1

- Fixed all 11 Turbopack errors shown in the supplied Cloudflare log at their two root causes.
- Made the catalog build contract reproducible after catalog regeneration.
- Repaired operational v10 seed FK topology.
- Repaired demo seed FK topology.
- Bumped active web/API/mobile/runtime release markers to 10.0.1.
- Added v10 preflight and production build command.
- Added v10 release doctor checks for 420 products, 28 sourcing tenants, 28 supplier profiles, migration 0013, export routes and catalog generator compatibility.
- Added named v10 Hariyo semantic palette and export/trade status colors.
- Validated 420-product catalog and ~512 generated routes.
- Validated fresh migration + operational seed x2 + demo seed x2 with foreign keys enabled.
- Preserved standalone Cloudflare deployment without mandatory private service Worker.
- Preserved Dashboard-managed Turnstile public key via `keep_vars=true`.
