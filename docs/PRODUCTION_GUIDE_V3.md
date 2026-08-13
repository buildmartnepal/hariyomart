# Hariyo Mart Nepal v3 Production Guide

## Recommended deployment shape

1. **Web marketplace / SaaS UI** — Vercel, root directory `apps/web`.
2. **API** — deploy `apps/api` as a persistent Node service using Docker on Railway, Render, Fly.io, a VM, or another Node container host.
3. **Database** — MongoDB Atlas with 2dsphere index support.
4. **Mobile** — Expo EAS builds for Android/iOS. Use the deployed API and web URLs, never localhost on physical devices.
5. **Media** — signed Cloudinary uploads for farmer crop photos. Restrict the optional server-side preset to image types, size limits and the Hariyo folder.

## Required production environment

### Web

- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
- `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`
- Optional `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- Optional server-only `CLOUDINARY_UPLOAD_PRESET`

### API

- `PORT=4000`
- `MONGODB_URI=<production MongoDB URI>`
- `JWT_SECRET=<long random secret>`
- `JWT_REFRESH_SECRET=<different long random secret>`
- `CORS_ORIGIN=https://yourdomain.com`
- `ADMIN_BOOTSTRAP_KEY=<temporary long one-time secret>`

### Mobile

- `EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api`
- `EXPO_PUBLIC_WEB_URL=https://yourdomain.com`

## First production admin

1. Deploy the database and API with `ADMIN_BOOTSTRAP_KEY` configured.
2. POST once to `/api/auth/bootstrap-admin` with header `x-bootstrap-key` and a secure admin name/email/password.
3. Confirm the admin can sign in at `/login` and open `/admin/overview`.
4. Rotate or remove `ADMIN_BOOTSTRAP_KEY` immediately after the first admin exists.

## Seed / launch sequence

1. Configure production MongoDB.
2. Run `npm --workspace apps/api run seed` only if you want the sample 7-cooperative / 84-product catalogue in the production database.
3. Create the first admin.
4. Register a real farmer, verify the tenant in Admin, publish a real harvest, approve the product, and test Nearby discovery from a serviceable buyer coordinate.
5. Place one COD order and exercise seller status changes through delivered.
6. Confirm the seller payout changes to pending after delivery.
7. Only then onboard real sellers in volume.

## Payment launch

The data model already supports `cod`, `esewa`, `khalti`, `fonepay`, and `card`, but real online authorization must be added with merchant credentials and provider callbacks/webhooks. Do not mark online orders paid from the client. Payment verification must happen server-side before changing `paymentStatus`.

## Security checklist

- Use production-only JWT secrets and rotate them deliberately.
- HTTPS only.
- Restrict CORS to actual Hariyo domains.
- Rate limits are enabled; tune them from observed traffic.
- Keep tenant-scoped writes behind `requireAuth` + `requireTenant`.
- Never allow a farmer to activate their own listing; admin moderation is enforced.
- Back up MongoDB and test restore procedures.
- Use Cloudinary upload restrictions and moderation for seller images.
- Add audit logging before delegating high-risk admin actions to a larger operations team.

## Mobile release

- Create EAS project credentials.
- Replace placeholder icon/splash assets with final Hariyo brand assets.
- Configure privacy disclosures for location permission and account data.
- Build internal Android/iOS test versions first.
- Verify actual device geolocation, network URLs, checkout and seller publishing before store submission.
