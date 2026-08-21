import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps/web/migrations/0004_cloudflare_native_supply_saas.sql',
  'apps/web/migrations/0005_commerce_control_plane.sql',
  'apps/web/migrations/0006_farmer_os_growth.sql',
  'apps/web/migrations/0009_marketplace_experience_v860.sql',
  'apps/web/server/cloudflare/supply-api.ts',
  'apps/web/server/cloudflare/farmer-os-api.ts',
  'apps/web/server/cloudflare/supply-stack.ts',
  'apps/web/server/cloudflare/commerce-api.ts',
  'apps/web/server/cloudflare/checkout.ts',
  'apps/web/components/SupplySaaSWorkbench.tsx',
  'apps/web/components/FarmerOSWorkbench.tsx',
  'apps/web/components/ProductGallery.tsx',
  'apps/web/components/ProductLocationFit.tsx',
  'apps/web/components/AdminMatchingCenter.tsx',
  'apps/web/lib/matching.ts',
  'apps/web/components/TraceabilityPublicView.tsx',
  'apps/web/components/CommerceControlPanel.tsx',
  'apps/web/components/TurnstileWidget.tsx',
  'apps/web/components/CartProvider.tsx',
  'infra/cloudflare/services/src/index.ts',
  'infra/cloudflare/services/wrangler.jsonc',
  'apps/web/wrangler.jsonc',
  'docs/CLOUDFLARE_NATIVE_V8_COMPLETE_GUIDE.md',
  'docs/V8_SYSTEM_ARCHITECTURE.md',
  'docs/V8_2_CLOUDFLARE_PRODUCTION_GUIDE.md',
  'docs/V8_2_IMPLEMENTATION_STATUS.md',
  'RELEASE_NOTES_V8.3.md',
  'RELEASE_NOTES_V8.6.md',
  'scripts/cloudflare-connected-deploy.mjs',
  'DEPLOY-HARIYO-V8.6.1.cmd',
  'MISSING_THINGS_DONE_V8.6.md',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error(`V8.3 required files missing: ${missing.join(', ')}`);

const supplyMigration = fs.readFileSync('apps/web/migrations/0004_cloudflare_native_supply_saas.sql', 'utf8');
for (const table of [
  'tenant_members','suppliers','warehouses','harvest_plans','produce_lots','quality_checks',
  'purchase_orders','goods_receipts','price_lists','sales_orders','delivery_routes',
  'payments_v8','settlements','produce_subscriptions','integration_outbox','auth_security_events',
]) {
  if (!supplyMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`))
    throw new Error(`V8 supply migration missing ${table}`);
}

const commerceMigration = fs.readFileSync('apps/web/migrations/0005_commerce_control_plane.sql', 'utf8');
for (const table of [
  'shopping_carts','shopping_cart_items','coupon_codes','coupon_redemptions','coupon_user_counters',
  'delivery_slots','return_requests','return_items','product_price_history','inventory_alert_rules','commerce_events',
]) {
  if (!commerceMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`))
    throw new Error(`V8.3 commerce migration missing ${table}`);
}
for (const marker of ['discount_npr','delivery_slot_id','redemption_count'])
  if (!commerceMigration.includes(marker)) throw new Error(`V8.3 commerce migration missing ${marker}`);

const farmerOsMigration = fs.readFileSync('apps/web/migrations/0006_farmer_os_growth.sql', 'utf8');
for (const table of ['crop_cycles','farm_expenses','buyer_demands','buyer_demand_offers','lot_traceability_events','lot_traceability_links','tenant_usage_daily','farmer_recommendations']) {
  if (!farmerOsMigration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`V8.4 Farmer OS migration missing ${table}`);
}

const marketplaceMigration = fs.readFileSync('apps/web/migrations/0009_marketplace_experience_v860.sql', 'utf8');
for (const marker of ['images_json', 'idx_products_market_match', 'idx_products_delivery_geo']) {
  if (!marketplaceMigration.includes(marker)) throw new Error(`V8.6 marketplace migration missing ${marker}`);
}

const matching = fs.readFileSync('apps/web/lib/matching.ts', 'utf8');
for (const marker of ['rankMarketplaceProducts', 'distance', 'freshness', 'verified seller']) {
  if (!matching.toLowerCase().includes(marker.toLowerCase())) throw new Error(`V8.6 matching engine missing ${marker}`);
}
const gallery = fs.readFileSync('apps/web/components/ProductGallery.tsx', 'utf8');
for (const marker of ['ProductGallery', 'ProductCardGallery', 'slice(0, 8)', 'onTouchStart', 'ArrowRight']) {
  if (!gallery.includes(marker)) throw new Error(`V8.6 product gallery missing ${marker}`);
}
const shop = fs.readFileSync('apps/web/components/ShopClient.tsx', 'utf8');
for (const marker of ['scoreMarketplaceProduct', "useState('best-match')", 'matchReasons']) {
  if (!shop.includes(marker)) throw new Error(`V8.6 shop matching missing ${marker}`);
}
const adminMatching = fs.readFileSync('apps/web/components/AdminMatchingCenter.tsx', 'utf8');
for (const marker of ['Hariyo Match v3', 'radiusKm: radius']) {
  if (!adminMatching.includes(marker)) throw new Error(`V8.6 admin matching missing ${marker}`);
}
const cloudSeed = fs.readFileSync('apps/web/seed/cloudflare.sql', 'utf8');
const migrationSeed = fs.readFileSync('apps/web/migrations/seed.sql', 'utf8');
if (cloudSeed !== migrationSeed) throw new Error('V8.6 catalog seed files are out of sync');
if ((cloudSeed.match(/INSERT OR IGNORE INTO products/g) || []).length !== 98)
  throw new Error('V8.6 Cloudflare seed must contain exactly 98 catalog products');
if (!cloudSeed.includes(`('marketplace.release','"8.6.1"',1)`))
  throw new Error('V8.6 seed release marker is stale');

const service = fs.readFileSync('infra/cloudflare/services/src/index.ts', 'utf8');
for (const marker of [
  'InventoryCoordinator','TenantSequence','TenantRealtimeHub','OrderFulfillmentWorkflow',
  'SubscriptionGenerationWorkflow','inventory_operations','order.cancelled.inventory_restore',
  'HARIYO_ANALYTICS.writeDataPoint','async scheduled','async queue',
]) {
  if (!service.includes(marker)) throw new Error(`Cloudflare service missing ${marker}`);
}

const serviceConfig = fs.readFileSync('infra/cloudflare/services/wrangler.jsonc', 'utf8');
for (const marker of ['INVENTORY_COORDINATOR','TENANT_REALTIME','analytics_engine_datasets','workflows','dead_letter_queue','schedules']) {
  if (!serviceConfig.includes(marker)) throw new Error(`Services config missing ${marker}`);
}

const webConfig = JSON.parse(fs.readFileSync('apps/web/wrangler.jsonc', 'utf8'));
if (webConfig.name !== 'hariyo-mart-nepal') throw new Error('V8.6 web Worker must match the connected Cloudflare Worker: hariyo-mart-nepal');
if (webConfig.services?.find((item) => item.binding === 'WORKER_SELF_REFERENCE')?.service !== webConfig.name)
  throw new Error('WORKER_SELF_REFERENCE does not match Worker name');
for (const marker of ['HARIYO_DB','HARIYO_KV','HARIYO_MEDIA','NEXT_INC_CACHE_R2_BUCKET','HARIYO_EVENTS','HARIYO_SERVICES','AI']) {
  if (!JSON.stringify(webConfig).includes(`"${marker}"`)) throw new Error(`Web Wrangler missing ${marker}`);
}

const platform = fs.readFileSync('apps/web/server/cloudflare/platform.ts', 'utf8');
for (const marker of ['requireTenantAccess','tenant_members','verifyTurnstile','TURNSTILE_ENFORCEMENT_MODE','coordinateInventory']) {
  if (!platform.includes(marker)) throw new Error(`Platform security missing ${marker}`);
}

const api = fs.readFileSync('apps/web/server/cloudflare/api.ts', 'utf8');
for (const marker of [
  'supply/overview','supply/suppliers','supply/warehouses','supply/harvest-plans','supply/lots',
  'supply/quality','supply/purchase-orders','supply/price-lists','supply/delivery-routes',
  'supply/subscriptions','supply/team','supply/reports','supply/platform/tenants',
  'tenants/memberships','tenants/switch','order.cancelled.inventory_restore',
  'commerce/cart','commerce/coupons/validate','commerce/delivery-slots','commerce/returns',
  'commerce/summary','commerce/inventory-alerts','product_price_history',
  'farmer-os/overview','farmer-os/crop-cycles','farmer-os/expenses','farmer-os/profitability',
  'farmer-os/buyer-demands','farmer-os/buyer-demand-offers','farmer-os/traceability','farmer-os/recommendations','farmer-os/ai-assistant',
  'rankMarketplaceProducts','images_json','Hariyo Match v3','matching:',
]) {
  if (!api.includes(marker)) throw new Error(`V8.3 API dispatcher missing ${marker}`);
}

const commerce = fs.readFileSync('apps/web/server/cloudflare/checkout.ts', 'utf8');
for (const marker of [
  'reserveCoupon','reserveDeliverySlot','coupon_user_counters','coupon_redemptions','discount_npr',
  'delivery_slot_id','rollbackCommerce','integration_outbox','order.created',
]) {
  if (!commerce.includes(marker)) throw new Error(`V8.3 checkout missing ${marker}`);
}

const cart = fs.readFileSync('apps/web/components/CartProvider.tsx', 'utf8');
for (const marker of ['commerce/cart','cloudSynced','mergeCart','localStorage'])
  if (!cart.includes(marker)) throw new Error(`V8.3 cart synchronization missing ${marker}`);
const control = fs.readFileSync('apps/web/components/CommerceControlPanel.tsx', 'utf8');
for (const marker of ['commerce/summary','commerce/tenant/returns','commerce/inventory-alerts','commerce/returns'])
  if (!control.includes(marker)) throw new Error(`V8.3 commerce control UI missing ${marker}`);
const checkoutPage = fs.readFileSync('apps/web/app/checkout/page.tsx', 'utf8');
for (const marker of ['commerce/delivery-slots','commerce/coupons/validate','couponCode','deliverySlotId'])
  if (!checkoutPage.includes(marker)) throw new Error(`V8.3 checkout UI missing ${marker}`);

const runtimeDirs = ['apps', 'infra', 'scripts'];
const ignored = new Set(['v8-doctor.mjs']);
const supabaseHits = [];
function walk(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules','.next','.open-next','dist','build'].includes(entry.name)) continue;
      walk(full);
    } else if (!ignored.has(entry.name) && /\.(ts|tsx|js|mjs|json|jsonc|sql|env|example)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/supabase/i.test(text)) supabaseHits.push(full);
    }
  }
}
for (const root of runtimeDirs) if (fs.existsSync(root)) walk(root);
if (supabaseHits.length) throw new Error(`Supabase runtime references remain: ${supabaseHits.join(', ')}`);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '8.6.1') throw new Error(`Expected v8.6.1 package, got ${pkg.version}`);

const css = fs.readFileSync('apps/web/app/globals.css', 'utf8');
for (const marker of [
  '--nav-text','--field-text','--footer-text','cross-theme contrast hardening',
  'newsletter-form input:-webkit-autofill','v8.2 commerce control plane','commerce-kpis',
]) {
  if (!css.includes(marker)) throw new Error(`Theme/commerce UI hardening missing ${marker}`);
}
for (const marker of ['sessionResponsePayload','auth:login','accountPassword','An account already exists for this email']) {
  if (!api.includes(marker)) throw new Error(`Auth hardening missing ${marker}`);
}

console.log(`Hariyo Mart Nepal ${pkg.version} Cloudflare-native commerce doctor PASS`);
