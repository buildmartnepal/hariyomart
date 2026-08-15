# Hariyo Mart Nepal v8.4.0 — Access, Admin & Mobile upgrade

## What changed

- Admin `/admin/users` is now a real access-control center.
- Admins can create customer, farmer, vendor and additional admin identities.
- Farmer/vendor identities must be assigned to a seller tenant.
- New accounts receive a cryptographically generated temporary password shown once.
- Password reset revokes active sessions and marks the account for mandatory password change.
- Web and mobile workspaces now show an inline password-change gate whenever a temporary password is active.
- Accounts can be suspended or reactivated.
- Login records last access after migration 0007 is applied.
- Admin sidebar is vertically scrollable on desktop and horizontally scrollable on mobile.
- Menu labels remain on one line.
- Final theme overrides remove light/dark workspace contrast conflicts.
- `/admin/security-center`, `/admin/system-health`, and `/admin/mobile-apps` expose real platform controls/readiness.
- Expo mobile app gets a role-aware `/workspace` command center for buyer/farmer/admin users.

## Required production database step

Before opening `/admin/users`, apply migrations:

```bash
npm run cloudflare:db:remote
```

This applies `0007_access_control_v84.sql`. Existing login remains backward-safe during the rollout, but new access-control screens intentionally require the migration.

## Admin creation

The first admin still uses the one-time bootstrap flow:

```bash
npm run bootstrap:admin
```

After an admin exists, create every other user from `/admin/users`. The platform never reveals an existing password; it can only issue a new temporary password.

## Optional CLI provisioning

```bash
npm run users:provision
```

The script signs in to the deployed site as an existing admin and can create additional admin, farmer, vendor/cooperative and customer accounts with one-time temporary passwords.

## Mobile

Set `EXPO_PUBLIC_API_URL=https://YOUR-WORKER.workers.dev/api` and build the Expo app normally. Mobile authentication uses access/refresh tokens stored in SecureStore.
