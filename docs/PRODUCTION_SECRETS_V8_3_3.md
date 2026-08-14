# Production secrets — v8.3.3

The v8.3.3 deployment no longer fails if `hariyo-mart-services` is missing. Authentication secrets are still intentionally not stored in source control.

## Required for login/session issuance

Set strong, independent values:

```text
npx wrangler secret put JWT_SECRET --config apps/web/wrangler.jsonc
npx wrangler secret put JWT_REFRESH_SECRET --config apps/web/wrangler.jsonc
```

Generate a strong value on Windows/Node if needed:

```text
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Run it separately for each secret.

## Turnstile

The source package intentionally keeps the public site key placeholder because the real site key belongs to your Cloudflare Turnstile widget, not source control.

1. Create/select the Hariyo Mart Turnstile widget in Cloudflare.
2. Put the public site key into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/wrangler.jsonc` (or your connected build environment).
3. Store the private key with:

```text
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/web/wrangler.jsonc
```

Until Turnstile is configured, v8.3.3 continues to use D1-backed API/auth rate limiting rather than failing deployment.
