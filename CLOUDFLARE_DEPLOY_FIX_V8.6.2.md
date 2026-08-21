# Cloudflare deployment fix — v8.6.2

The v8.6.1 build completed successfully but deployment failed with Cloudflare error 10143 because the caller Worker declared a service binding to a target Worker that did not exist. v8.6.2 makes the public Worker standalone by default.

The Cloudflare Dashboard should hold the real `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the private secrets. `keep_vars=true` preserves Dashboard-managed plain variables, while Wrangler preserves encrypted secrets across normal deployments.

### Required Cloudflare secrets
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURNSTILE_SECRET_KEY`

### Production test login
- Email: `buyer@demo.hariyomart.local`
- Password: `HariyoDemo@2026`

This identity is intentionally scoped to test-buyer behavior and only works while `PRODUCTION_TEST_MODE=true`.
