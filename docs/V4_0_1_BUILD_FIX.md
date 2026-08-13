# Hariyo Mart Nepal v4.0.1 — Vercel build fix

## Fixed

- Fixed `LocationMarket.tsx` TypeScript error where a province slug fallback could be assigned to the `provinceName` display-name union.
- Live marketplace normalization now resolves `provinceName` only from the canonical province catalog and uses `Bagmati Province` as a safe fallback for malformed live records.
- No database schema or environment-variable migration is required.

## Deployment

Redeploy the project on Vercel after replacing the source with v4.0.1.
