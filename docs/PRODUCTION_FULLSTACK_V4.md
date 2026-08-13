# Hariyo Mart Nepal v4.0 — Full-Stack Production Setup

Production web URL: `https://hariyomart.vercel.app`

## 1. Production architecture

Hariyo Mart v4 pins the web runtime to **Next.js 15.5.21 Maintenance LTS + React 19.0.7** for the current patched 15.x security line.

Hariyo Mart v4 uses one public origin for the website and API:

- Next.js website: `https://hariyomart.vercel.app`
- Next.js Route Handler API: `https://hariyomart.vercel.app/api/*`
- MongoDB Atlas: permanent marketplace database
- Redis / Upstash: refresh-session revocation and distributed API/auth rate limiting
- Expo mobile app: calls the same `/api` endpoints with bearer tokens held in SecureStore
- Cloudinary: farmer/product images; signed upload is preferred
- eSewa / Khalti / Fonepay: provider adapters remain disabled until live merchant credentials are entered

`apps/api` remains in the repository as a legacy/optional standalone Express service. **Vercel production does not need to run it on port 4000.** The production API is now inside `apps/web/app/api`.

## 2. Create MongoDB Atlas

Recommended easiest path: in Vercel Marketplace install **MongoDB Atlas** and attach it to the Hariyo Mart project. It can inject `MONGODB_URI` automatically. If creating Atlas manually:

1. Create an Atlas project and cluster.
2. Create a dedicated database user for Hariyo Mart; do not use your personal Atlas account password in the URI.
3. Use database name `hariyo_mart`.
4. Copy the `mongodb+srv://...` connection string into `MONGODB_URI`.
5. Vercel Functions use dynamic egress IPs. The Vercel/Atlas native integration handles the Atlas network access configuration; when configured manually, follow Atlas guidance for Vercel connectivity and protect access with strong DB credentials.
6. Never commit the real URI to Git.

The app opens and reuses a cached Mongoose connection per warm Vercel function instance and caps the connection pool.

## 3. Create Redis

Two production formats are supported.

### Option A — your original `REDIS_URL`

```env
REDIS_URL=rediss://default:PASSWORD@HOST:6379
```

### Option B — Upstash REST credentials

```env
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

If both are present, the app prefers Upstash REST. Redis is used for distributed rate limits and refresh-token session records; MongoDB remains the permanent business database.

## 4. Generate authentication secrets

From the repo:

```bash
npm --workspace apps/web run secrets:generate
```

Copy the three generated values into Vercel Production environment variables:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_BOOTSTRAP_KEY`

`ADMIN_BOOTSTRAP_KEY` is needed only until the first super-admin is created. It is intentionally **not** part of the permanent readiness requirement; remove or rotate it after bootstrap.

Do not use the sample `CHANGE_THIS...` values. Keep each JWT secret at least 32 characters.

### Authentication behavior

**Web:** access and refresh JWTs are stored as `HttpOnly`, `Secure`, `SameSite=Lax` cookies in production. Browser JavaScript does not need to persist the refresh token.

**Mobile:** the same login/refresh endpoints return access + rotating refresh tokens when the client sends `X-Client-Platform: mobile`. The Expo app stores them in `expo-secure-store`.

**Refresh rotation:** a refresh JWT contains a unique `jti`. Redis records active refresh sessions. Refresh rotates the `jti`; logout revokes it. Access tokens expire after 15 minutes; refresh tokens after 30 days.

**Roles:** `customer`, `farmer`, `vendor`, `delivery`, `province_admin`, `admin`. Seller resources are filtered by `tenantId` unless the authenticated role is `admin`.

## 5. Vercel project configuration

Import the Git repository into Vercel and set:

- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Install Command:** default (`npm install`) is fine
- **Build Command:** `npm run build`
- **Output Directory:** leave automatic for Next.js

The Next API Route Handler is Node.js runtime and runs at `/api/[...path]` with a 20-second function limit configured in code.

### Production Vercel variables

Set these in Project → Settings → Environment Variables → Production:

```env
NEXT_PUBLIC_API_URL=https://hariyomart.vercel.app/api
NEXT_PUBLIC_SITE_URL=https://hariyomart.vercel.app
MONGODB_URI=YOUR_REAL_ATLAS_URI
REDIS_URL=YOUR_REAL_REDIS_URL
JWT_SECRET=YOUR_GENERATED_SECRET
JWT_REFRESH_SECRET=YOUR_GENERATED_REFRESH_SECRET
ADMIN_BOOTSTRAP_KEY=YOUR_GENERATED_BOOTSTRAP_SECRET
CORS_ORIGIN=https://hariyomart.vercel.app
ESEWA_MERCHANT_CODE=
ESEWA_SECRET_KEY=
KHALTI_SECRET_KEY=
FONEPAY_MERCHANT_CODE=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do not put MongoDB, Redis, JWT, payment or Cloudinary API secrets in `NEXT_PUBLIC_*` variables.

`PORT=4000` is only for the legacy standalone Express API and is not needed by the Vercel Next.js deployment. Vercel/Next manages the HTTP listener. `NODE_ENV=production` is also normally supplied by the platform and does not need to be manually managed.

After changing any Vercel variable, redeploy; environment changes do not alter old immutable deployments.

## 6. Pull Vercel variables for local development

Inside `apps/web` after linking the project:

```bash
vercel link
vercel env pull .env.local --environment=development
npm run env:check
npm run dev
```

For a local production-like run, use a non-production/development Atlas database and Redis instance whenever possible.

## 7. Seed the marketplace database

The v4 seed is **non-destructive**. It upserts the 7 cooperative/demo supply networks and 84 catalogue products without deleting users, orders or seller-created products.

Inside `apps/web`:

```bash
npm run db:seed
```

Run it once after MongoDB is configured. It can be rerun safely to refresh the built-in catalogue records.

## 8. Create the first super-admin

Deploy first, then call the bootstrap route exactly once.

PowerShell example:

```powershell
$headers = @{
  "Content-Type" = "application/json"
  "X-Bootstrap-Key" = "YOUR_ADMIN_BOOTSTRAP_KEY"
}
$body = @{
  name = "Hariyo Mart Admin"
  email = "admin@yourdomain.com"
  password = "USE-A-STRONG-UNIQUE-PASSWORD"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://hariyomart.vercel.app/api/auth/bootstrap-admin" -Headers $headers -Body $body
```

After the first admin exists:

1. remove `ADMIN_BOOTSTRAP_KEY` from Production, or rotate it to a value you do not use;
2. redeploy;
3. sign in normally at `/login`.

The API also refuses to bootstrap another admin once an admin already exists.

## 9. Cloudinary farmer images

### Preferred production configuration — signed direct uploads

Set:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
```

Authenticated farmers request `/api/uploads/signature`. The server creates the upload signature; the API secret never reaches browser or mobile JavaScript. The browser then sends the file directly to Cloudinary.

### Optional server-side upload preset

```env
CLOUDINARY_UPLOAD_PRESET=YOUR_LOCKED_DOWN_SIGNED_PRESET
```

Keep the preset restricted by file type/size/folder in Cloudinary. Signed uploads are preferred for production.

## 10. Expo mobile production variables

Do not rely on Vercel to configure the native app. Set these in Expo/EAS production:

```env
EXPO_PUBLIC_API_URL=https://hariyomart.vercel.app/api
EXPO_PUBLIC_WEB_URL=https://hariyomart.vercel.app
```

Example:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://hariyomart.vercel.app/api --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_WEB_URL --value https://hariyomart.vercel.app --environment production --visibility plaintext
```

These variables are public/inlined into the app bundle. Never put JWT secrets, payment secrets, MongoDB credentials, Redis credentials or Cloudinary API secrets under `EXPO_PUBLIC_*`.

## 11. Payments

COD is operational without external credentials. The platform stores a payment record with each order.

Online providers are intentionally reported as **configured but not operational** until a verified server-side adapter is enabled. Entering a credential alone does not mark a provider live:

- `ESEWA_MERCHANT_CODE` + `ESEWA_SECRET_KEY`
- `KHALTI_SECRET_KEY`
- `FONEPAY_MERCHANT_CODE`

Check configuration at:

```text
GET /api/payments/providers
```

Do not mark an online order as paid based only on a browser/mobile redirect. This v4 core keeps eSewa/Khalti/Fonepay `operational: false` until their provider-specific server initiation and verification/callback code is deliberately enabled. Server verification must be the action that updates `paymentStatus`.

## 12. Production health checks

Public API identity:

```text
GET https://hariyomart.vercel.app/api
```

Infrastructure readiness:

```text
GET https://hariyomart.vercel.app/api/health
GET https://hariyomart.vercel.app/api/system/readiness
```

The readiness response exposes booleans/status only, never secret values. Before launch expect:

- `database: connected`
- Redis `status: connected`
- `JWT_SECRET: true`
- `JWT_REFRESH_SECRET: true`
- public site/API URLs correct

Local environment validation:

```bash
npm run env:check
```

## 13. Recommended production/preview separation

Do not let Vercel Preview branches use the production database by default. Create separate Preview MongoDB/Redis resources or at minimum a separate database name. Keep Production credentials scoped only to Production.

## 14. Full business lifecycle now persisted

MongoDB collections cover:

- users / buyer profiles / addresses / wishlist
- tenants
- farms
- products / harvest inventory
- multi-seller orders
- seller fulfillments
- payout state
- payment attempts/state
- audit logs

Seller writes and reads are tenant-scoped. Marketplace reads expose only active products and verified public farms. Admin verification is required before a farmer listing can be activated.

## 15. Launch checklist

1. MongoDB connected.
2. Redis connected.
3. Strong JWT secrets generated.
4. Production Vercel variables entered.
5. Deploy/redeploy.
6. `GET /api/health` shows ready.
7. Run non-destructive seed.
8. Bootstrap first admin.
9. Remove/rotate bootstrap key.
10. Register a real farmer and verify it from Admin.
11. Farmer publishes harvest → Admin approves → product appears Nearby.
12. Buyer creates account, adds address and places COD test order.
13. Farmer accepts → picking → packed → delivered.
14. Admin confirms payout state.
15. Configure Cloudinary signed upload.
16. Add online payment credentials only after merchant approval/testing.
17. Configure Expo/EAS public production URLs and build the mobile apps.
