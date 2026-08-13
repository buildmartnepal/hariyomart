# Hariyo Mart Nepal v5 production runbook

This runbook is for an operator deploying the web marketplace, API and mobile app. Passing the repository release gate proves the software builds; it does not create or fund third-party cloud accounts.

## 1. Required services

| Service          | Purpose                                                | Production requirement                                                 |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Vercel           | Next.js web and API                                    | Repository root as project root; Node 22                               |
| MongoDB Atlas    | Marketplace data and atomic stock reservations         | Dedicated database user, TLS URI, backups and replica-set transactions |
| Redis or Upstash | Refresh-session revocation and distributed rate limits | TLS connection and an eviction policy suitable for short-lived keys    |
| Cloudinary       | Farmer/product images                                  | Server API key/secret; signed uploads only                             |
| Expo EAS         | Android/iOS builds                                     | Production API/web public variables and store credentials              |

Cash on delivery is the launch payment method. Do not advertise eSewa, Khalti or Fonepay as live until the operator has merchant approval and the application has server-side initiation, signed callback verification, reconciliation and refund handling for that provider.

## 2. Provision and configure

1. Create a MongoDB Atlas production cluster in a region appropriate for Nepal traffic. Create a least-privilege app user and restrict network access to the deployment environment.
2. Create Redis/Upstash and Cloudinary accounts. Configure a Cloudinary upload preset only if your media policy needs one; uploads still receive a server signature.
3. Copy every key from `.env.production.example` into Vercel Production environment variables. Replace all placeholders and generate unique JWT secrets with `npm --workspace apps/web run secrets:generate`.
4. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` and `CORS_ORIGIN` to the final HTTPS origin. Multiple explicitly trusted origins can be comma-separated in `CORS_ORIGIN`.
5. Import the GitHub repository in Vercel with the repository root selected. `vercel.json` installs with `npm ci`, builds the web workspace and points Vercel at `apps/web/.next`.

Preview deployments should use a separate database, Redis namespace and Cloudinary folder/account. Never point untrusted pull requests at production credentials.

## 3. Database and first data

Run the non-destructive seed once against the production database:

```bash
npm run db:seed
```

The application models create the required indexes. Confirm indexes exist for product status/province/category/update time, geospatial farms, order number, buyer/tenant order queries, user email/phone and audit timestamps. Atlas must support transactions; standalone MongoDB is not sufficient for checkout stock reservation.

Create the first administrator once through the protected bootstrap endpoint using `ADMIN_BOOTSTRAP_KEY`, verify login, then rotate or remove the bootstrap key from Vercel. Never reuse that value as a JWT secret.

## 4. Pre-launch verification

Run locally or in CI:

```bash
npm ci
npm run release:check
npm run audit:prod
```

After a preview deployment, verify:

1. `/api/health` responds and `/api/system/readiness` reports MongoDB plus the configured Redis provider as ready.
2. A buyer can register, sign in, add products, place a COD order and track it with order number plus phone.
3. Two simultaneous orders cannot reserve more stock than exists.
4. A farmer can register, publish a product with a signed Cloudinary image and cannot edit another seller's product.
5. An admin can suspend a seller and audit the action.
6. Refresh-session rotation, logout and rate limits work across separate server instances.
7. The site is usable at 360 px and 1440 px widths, has no browser console errors and returns correct error/404 pages.

Use test customers and inventory. Delete or clearly label test orders before launch.

## 5. Mobile release

Set `EXPO_PUBLIC_API_URL=https://YOUR_DOMAIN/api` and `EXPO_PUBLIC_WEB_URL=https://YOUR_DOMAIN` in the EAS production environment. Then run:

```bash
npm --workspace apps/mobile run typecheck
npm --workspace apps/mobile run export
cd apps/mobile && eas build --platform all --profile production
```

Use unique Play Console/App Store credentials owned by the business. Complete store privacy, data-safety, location-permission and support disclosures before submission.

## 6. Operations

- Monitor Vercel function errors/latency, Atlas connections/slow queries/storage, Redis errors/evictions and Cloudinary usage.
- Alert on readiness failures, elevated HTTP 5xx, failed logins, order-creation failures and unusual rate-limit volume.
- Enable Atlas point-in-time backups and test a restore to a non-production cluster at least quarterly.
- Rotate database, Redis, Cloudinary and JWT credentials on staff changes or suspected exposure.
- Retain audit logs according to the business/legal policy and minimize personal data exports.
- Before a high-volume campaign, load-test product listing, login and checkout using non-production services and representative multi-seller carts.

## 7. Rollback

Promote the previous known-good Vercel deployment, pause seller publishing if data behavior is uncertain, and keep order intake disabled if stock integrity cannot be guaranteed. Application releases should remain backward compatible with the current database schema. Restore data only after determining whether the incident is code-only or data corruption; a deployment rollback does not undo writes.
