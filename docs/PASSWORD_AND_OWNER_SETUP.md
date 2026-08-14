# Hariyo Mart owner password setup

Hariyo Mart does not ship a plaintext default password. The owner email is
`greenmandux@gmail.com`; you create the password on your own deployment.

## Recommended: one-command production setup

```bash
npm ci
npm run release:check
npx wrangler login
npm run finish:cloudflare
```

When prompted, enter a new password twice. It must contain at least 14 characters, uppercase and
lowercase letters, a number and a symbol. The prompt is hidden, so the value does not appear on
screen or in shell history.

The finisher:

1. applies migrations and the operational seed;
2. deploys the services and public Workers;
3. creates missing JWT/bootstrap secrets;
4. creates the first owner only if no admin exists;
5. verifies the password through the real login API;
6. rotates the one-time bootstrap secret; and
7. checks health, products, service areas and owner readiness.

Sign in at `https://YOUR_DOMAIN/login` with `greenmandux@gmail.com` and the password you created.

## Change the password later

Open **Admin → Settings → Owner password & sessions**. Enter the current password and the new one
twice. A successful change revokes every existing session, including the current browser. Sign in
again with the new password.

## Bootstrap only

If the Worker is already deployed but has no owner, set `NEXT_PUBLIC_SITE_URL` and run:

```bash
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN npm run bootstrap:admin
```

Enter the one-time Cloudflare `ADMIN_BOOTSTRAP_KEY`, then the new password twice. Rotate the
bootstrap key afterward for defence in depth if this standalone path is used. The API permanently
refuses another bootstrap after the first admin exists.

## Local development

Local D1 seed identities are deliberately non-login records. To test an actual account, register a
buyer or farmer through the UI, or run the bootstrap script against an HTTPS preview deployment.
Never add a password to SQL, `.env`, `.dev.vars`, source control or screenshots.
