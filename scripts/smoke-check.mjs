import fs from 'node:fs';

const must = [
  'apps/web/app/api/route.ts',
  'apps/web/app/api/[...path]/route.ts',
  'apps/web/server/cloudflare/api.ts',
  'apps/web/server/cloudflare/platform.ts',
  'apps/web/server/cloudflare/checkout.ts',
  'apps/web/migrations/0001_hariyo_platform.sql',
  'apps/web/migrations/0002_operations_content.sql',
  'apps/web/migrations/0003_control_plane.sql',
  'apps/web/migrations/0004_cloudflare_native_supply_saas.sql',
  'apps/web/server/cloudflare/supply-api.ts',
  'apps/web/server/cloudflare/supply-stack.ts',
  'apps/web/components/TurnstileWidget.tsx',
  'apps/web/seed/cloudflare.sql',
  'apps/web/wrangler.jsonc',
  'apps/web/open-next.config.ts',
  'infra/cloudflare/services/src/index.ts',
  'infra/cloudflare/services/wrangler.jsonc',
  'apps/web/server/data/catalog.json',
  'apps/web/components/AuthProvider.tsx',
  'apps/web/components/LocationMarket.tsx',
  'apps/web/components/LocationProvider.tsx',
  'apps/web/components/OperationsManager.tsx',
  'apps/web/components/HarvestPublisher.tsx',
  'apps/web/components/OrderTracker.tsx',
  'apps/web/app/campaigns/page.tsx',
  'apps/web/public/campaigns/trusted-marketplace.webp',
  'apps/mobile/assets/campaigns/sell-from-home.jpg',
  'apps/web/app/track/page.tsx',
  'apps/web/app/global-error.tsx',
  'apps/mobile/context/AuthContext.tsx',
  'apps/mobile/eas.json',
  '.github/workflows/ci.yml',
  'package-lock.json',
  '.env.production.example',
  'docs/CLOUDFLARE_PRODUCTION_V6.md',
  'docs/CLOUDFLARE_OPERATIONS_GUIDE_V6.4.md',
  'docs/PASSWORD_AND_OWNER_SETUP.md',
];
const missing = must.filter((x) => !fs.existsSync(x));
if (missing.length) {
  console.error('Missing Cloudflare v6 production files:', missing);
  process.exit(1);
}
for (const asset of must.filter((path) => /\.(webp|jpg|png)$/.test(path))) {
  if (fs.statSync(asset).size < 1024)
    throw new Error(`Campaign asset is empty or invalid: ${asset}`);
}

const api = fs.readFileSync('apps/web/server/cloudflare/api.ts', 'utf8');
for (const route of [
  'auth/register',
  'auth/register-farmer',
  'auth/login',
  'auth/refresh',
  'auth/logout',
  'auth/me',
  'auth/bootstrap-admin',
  'account/password',
  'marketplace/nearby',
  'marketplace/delivery-quote',
  'orders/guest',
  'orders/track',
  "segments[2] === 'cancel'",
  "route === 'uploads'",
  "segments[0] === 'media'",
  'system/readiness',
  'content/newsletter',
  'locations/service-areas',
  'admin/operations',
  'admin/content/posts',
  'admin/promotions',
  'admin/support',
  'inventory/events',
]) {
  if (!api.includes(route)) throw new Error(`Next API dispatcher missing ${route}`);
}
if (
  !api.includes("['farmer', 'admin', 'buyer'].includes") ||
  !api.includes("segments[0] === 'dashboard'")
) {
  throw new Error('Role dashboard dispatcher incomplete');
}
if (!api.includes("enabled: false, note: 'Merchant onboarding required'")) {
  throw new Error(
    'Online payment adapters must not be reported operational without verification adapters',
  );
}
const auth = fs.readFileSync('apps/web/server/cloudflare/platform.ts', 'utf8');
for (const marker of ['httpOnly', 'sameSite', 'jti', 'issueSession', 'rotateSession']) {
  if (!auth.toLowerCase().includes(marker.toLowerCase()))
    throw new Error(`Web auth missing ${marker}`);
}

const browserAuth = fs.readFileSync('apps/web/components/AuthProvider.tsx', 'utf8');
if (/localStorage\.setItem\([^\n]*(access|refresh|token)/i.test(browserAuth)) {
  throw new Error('Browser auth still writes auth tokens to localStorage');
}
if (
  !browserAuth.includes("credentials:'include'") &&
  !browserAuth.includes("credentials: 'include'") &&
  !browserAuth.includes('credentials:"include"')
) {
  throw new Error('Browser auth is not using cookie credentials');
}

const mobileAuth = fs.readFileSync('apps/mobile/context/AuthContext.tsx', 'utf8');
if (
  !mobileAuth.includes('SecureStore') ||
  !mobileAuth.toLowerCase().includes('x-client-platform')
) {
  throw new Error('Mobile auth is not using SecureStore + mobile API mode');
}

const next = fs.readFileSync('apps/web/next.config.mjs', 'utf8');
if (!next.includes('initOpenNextCloudflareForDev'))
  throw new Error('OpenNext local Cloudflare bindings are not initialized');

const uploadUi = fs.readFileSync('apps/web/components/HarvestPublisher.tsx', 'utf8');
if (uploadUi.includes('unsigned') || uploadUi.includes('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')) {
  throw new Error('Farmer upload UI must not offer an unsigned Cloudinary fallback');
}

if (!auth.includes('assertSafeRequest') || !auth.includes('1_000_000')) {
  throw new Error('API mutation origin and JSON body protections are incomplete');
}

const env = fs.readFileSync('.env.production.example', 'utf8');
for (const key of [
  'JWT_SECRET=',
  'JWT_REFRESH_SECRET=',
  'ADMIN_BOOTSTRAP_KEY=',
  'TURNSTILE_SECRET_KEY=',
  'NEXT_PUBLIC_SITE_URL=https://hariyo-mart-nepal.nishrutesh.workers.dev',
]) {
  if (!env.includes(key)) throw new Error(`Production env template missing ${key}`);
}
for (const forbidden of ['CLOUDFLARE_API_TOKEN=', 'CLOUDFLARE_ACCOUNT_ID=', 'CLOUDFLARE_D1_DATABASE_ID=', 'CLOUDFLARE_KV_NAMESPACE_ID=']) {
  if (env.includes(forbidden)) throw new Error(`Production app env must not carry Cloudflare deployment/provisioning field ${forbidden}`);
}

const catalog = JSON.parse(fs.readFileSync('apps/web/server/data/catalog.json', 'utf8'));
if (!Array.isArray(catalog.products) || catalog.products.length !== 98) {
  throw new Error(`Expected 98 catalog products, got ${catalog.products?.length}`);
}
if (!Array.isArray(catalog.categories) || catalog.categories.length !== 23) {
  throw new Error(`Expected 23 catalog categories, got ${catalog.categories?.length}`);
}

const service = fs.readFileSync('infra/cloudflare/services/src/index.ts', 'utf8');
for (const marker of ['CheckoutCoordinator', 'RateLimiter', 'InventoryCoordinator', 'TenantRealtimeHub', 'OrderFulfillmentWorkflow', 'checkoutCore', 'async queue', 'async scheduled']) {
  if (!service.includes(marker)) throw new Error(`Cloudflare service worker missing ${marker}`);
}
const checkout = fs.readFileSync('apps/web/server/cloudflare/checkout.ts', 'utf8');
if (!checkout.includes('HARIYO_DB.batch') || !checkout.includes('idempotency_key')) {
  throw new Error('D1 checkout must use atomic batches and idempotency');
}

const operations = fs.readFileSync('apps/web/server/cloudflare/operations.ts', 'utf8');
for (const marker of [
  'newsletterSubscribe',
  'adminBlog',
  'adminServiceAreas',
  'adminPromotions',
  'adminSupport',
  'adminReviews',
  'inventoryEvents',
  'adminCategories',
  'adminPages',
  'adminMedia',
  'adminAudit',
]) {
  if (!operations.includes(marker)) throw new Error(`Operations API missing ${marker}`);
}

const finishDeploy = fs.readFileSync('scripts/finish-cloudflare-deploy.mjs', 'utf8');
if (!finishDeploy.includes("['run', 'cloudflare:db:remote']")) {
  throw new Error('One-command deployment must apply remote D1 migrations');
}
if (
  !finishDeploy.includes("['run', 'bootstrap:admin']") ||
  !finishDeploy.includes('adminConfigured')
) {
  throw new Error('One-command deployment must enforce secure first-owner setup');
}

const seed = fs.readFileSync('apps/web/seed/cloudflare.sql', 'utf8');
for (const marker of [
  'seed-order-001',
  'seed-inventory-koshi',
  'seed-review-1',
  'seed-ticket-1',
  'seed-blog-seasonal',
]) {
  if (!seed.includes(marker)) throw new Error(`Operational seed missing ${marker}`);
}
if (!seed.includes('!seed-account-login-disabled!')) {
  throw new Error('Operational seed identities must remain login-disabled');
}

console.log('Hariyo Mart Nepal v8 Cloudflare-native compatibility smoke check PASS');
