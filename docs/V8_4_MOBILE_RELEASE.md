# Hariyo Mart v8.4 mobile release

The Expo app uses the same production identity, D1 data and API as the web marketplace.

## Environment

Set the deployed Worker API before building:

```text
EXPO_PUBLIC_API_URL=https://YOUR-HARIYO-WORKER.workers.dev/api
```

## Role experiences

- Buyer: orders, rewards, saved items, nearby farms and marketplace shortcuts.
- Farmer/vendor: Farmer Studio metrics, seller tools, inventory/sales visibility and secure password-change flow.
- Admin: marketplace control KPIs, account/security entry point and shared platform status.

Temporary passwords issued by `/admin/users` work on mobile too, but the mobile profile requires the user to replace that temporary password before normal authenticated API use.

Use the normal Expo/EAS workflow for Android/iOS builds. Do not put JWT secrets or Turnstile secret keys in the mobile app; those remain server-side Cloudflare secrets.
