# Hariyo Mart Nepal v8.4.2 Validation

## Passed

- Farmer OS + auth/password gate targeted strict TypeScript check: PASS
- D1 monthly usage reducer strict TypeScript check: PASS
- 127 TS/TSX source files syntax-transpiled: PASS, 0 errors
- Fresh D1/SQLite migrations 0001–0008: PASS
- Fresh seed after migrations: PASS
- Security columns (`status`, `must_change_password`, `last_login_at`, `password_changed_at`): PASS
- Seeded SVG product image placeholders: 0
- v8.4.2 architecture doctor: PASS
- Catalog validation: 98 products / 23 categories / 7 provinces / 190 estimated routes
- Compatibility smoke check: PASS
- Cloudflare production config structure: PASS with Turnstile placeholder warning explicitly allowed

## Not reproducible in this sandbox

The packaging environment has no npm registry access and its cache is missing `typescript-5.9.3.tgz`, so `npm ci` and the full dependency-backed `next build` / OpenNext build could not be rerun here. Cloudflare CI has registry access and should be used for the final production build verification.
