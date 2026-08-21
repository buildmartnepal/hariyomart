# Hariyo Mart Nepal v9.0.0 Validation

## Completed
- Authored TS/TSX parse: PASS — 154 files, 0 syntax errors.
- Fresh SQLite/D1-compatible migration chain 0001–0012: PASS.
- Idempotent operational + demo seeds executed twice: PASS — 81 tables, 98 products, 7 operational tenants, 14 demo users, 12 demo memberships.
- Runtime Demo Lab simulation: PASS — dedicated verified Enterprise demo tenant, active owner membership, 3 runtime demo products.
- Saved Basket write simulation: PASS.
- Full operational seed: PASS — 98 products, 7 tenant workspaces.
- Demo identity seed: PASS — 14 demo accounts.
- Saved basket schema: PASS.
- Release marker: `9.0.0`.

## Runtime regression guards
- Demo Lab route and client present.
- Direct `/api/auth/demo-session` route present.
- Runtime demo identity bootstrap present.
- Dedicated demo sandbox tenant bootstrap present.
- Saved basket API and UI present.
- Quick Reorder present in web buyer history and native mobile order history.

## Cloudflare build
Use the connected Linux build environment for the final dependency-backed Next/OpenNext build:

```bash
npm clean-install --progress=false
npx @opennextjs/cloudflare build
```

Deploy with:

```bash
npm run deploy:cloudflare:production
```
