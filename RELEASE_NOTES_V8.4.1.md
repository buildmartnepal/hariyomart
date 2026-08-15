# Hariyo Mart Nepal v8.4.1 — Real Photos + Complete Demo Accounts

## Product photography

- Replaced all built-in SVG product placeholders with real photographic seed images.
- Added Next.js remote image allowlist and CSP support for `images.unsplash.com`.
- Added D1 migration `0007_real_product_photos_v841.sql` to upgrade existing placeholder seed products without touching genuine farmer uploads.
- Synchronized the 98-product catalogs and Cloudflare seed data.

## Demo access

- Added 14 role-based demo identities with one shared demo password.
- Covers global customer/farmer/vendor/admin roles and all tenant member roles: owner, admin, manager, procurement, inventory, sales, delivery, accounting, farmer and viewer.
- Added role cards to login when demo mode is enabled.
- Added `/demo` directory page.
- Added local/remote demo seed and removal commands.
- Demo mode remains disabled by default in production to avoid publishing a known admin credential on a real site.

## Demo password

`HariyoDemo@2026`

See `DEMO-ACCOUNTS.md` for the full account matrix and safe staging instructions.
