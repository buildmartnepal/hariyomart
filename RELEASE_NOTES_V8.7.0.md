# Hariyo Mart Nepal v8.7.0 — Adaptive Brand + Self-Healing Demo Login

## Fixed

- Production Test Mode demo login no longer depends on the stored bcrypt hash being current. Only exact known demo emails plus the published shared test password can use the test-mode bypass.
- If an older deployment contains a stale demo hash, the first valid test login repairs the hash in D1 automatically.
- Migration `0011_demo_identity_repair_v870.sql` refreshes all 14 known test identities on upgrade.
- Demo seed upserts now reactivate and refresh credentials instead of preserving stale rows.
- Auth client error parsing now handles non-JSON server responses instead of turning them into misleading client parse errors.

## UX / brand upgrade

- Demo role cards are one-click **Use & sign in** actions.
- Added show/hide password control.
- Auto theme now has a real adaptive Hariyo brand system: Day = lime/emerald; Night = mint/forest.
- Manual Light/Dark modes remain stable.
- Header, CTA, forms, focus states, auth cards, product cards and mobile spacing/touch targets were refined.
- Theme state updates live when the OS color scheme changes.

## Production safety

- Real user/admin authentication still requires normal password verification and Turnstile policy.
- The demo shortcut only exists while `APP_ENV=production`, `PRODUCTION_TEST_MODE=true`, the email is one of the known demo identities, and the password exactly matches the published test credential.
- Disable `NEXT_PUBLIC_DEMO_MODE` and `PRODUCTION_TEST_MODE` and remove demo users before accepting real customer data.
