# Hariyo Mart Nepal v8.4.2 — TypeScript Build Fix

This hotfix addresses the strict TypeScript failures reported by Cloudflare/OpenNext during the v8.4.1 production build while preserving Farmer OS, real product photography, demo accounts, and the newer account-security/password-change gate.

## Fixed

- `FarmerOSWorkbench.tsx`
  - added typed action-section props so `onSubmit={(x) => ...}` parameters are contextually typed instead of implicit `any`;
  - made recommendation action-link rendering React-safe by converting `unknown` to a string before JSX branching.
- `AuthProvider.tsx`
  - added `status`, `mustChangePassword`, and `lastLoginAt` to `HariyoUser`.
- `PasswordChangeGate.tsx`
  - retained and wired the account-security gate into the dashboard workspace.
- `supply-api.ts`
  - made the monthly usage aggregation `reduce<number>(...)` so the accumulator is numeric instead of `unknown`.
- Account security
  - added migration `0008_access_control_v842.sql` for user status, temporary-password, last-login, and password-change metadata;
  - password changes clear the temporary-password flag, with a backward-compatible fallback if migration rollout is incomplete.
- Release metadata bumped to `8.4.2`.

## Verification performed

- strict targeted `tsc` check for `FarmerOSWorkbench.tsx`, `AuthProvider.tsx`, and `PasswordChangeGate.tsx`: PASS;
- numeric D1 aggregation strict TypeScript check: PASS;
- TypeScript/TSX syntax transpile across 127 source files: PASS, 0 syntax errors;
- fresh SQLite execution of migrations `0001` through `0008` plus seed: PASS;
- account-security columns present after migration: PASS;
- seeded SVG product-image placeholders after migrations: 0;
- `npm run v8.4.2:doctor`: PASS;
- `npm run validate`: PASS (98 catalog products, 23 categories, 7 provinces, 190 estimated public routes);
- `npm run smoke`: PASS;
- Cloudflare config check: PASS when the known Turnstile placeholder warning is explicitly allowed.

## Dependency-backed build note

A clean `npm ci` could not be completed in the packaging sandbox because the npm registry is unavailable and the local npm cache does not contain `typescript-5.9.3.tgz`. Therefore the final `next build` / OpenNext dependency-backed build must still be run in Cloudflare CI or on a machine with registry access. The exact eight TypeScript errors from the supplied Cloudflare log have been fixed at source.

## Production reminder

Replace `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and configure the private `TURNSTILE_SECRET_KEY`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` before public production launch.
