import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps/web/migrations/0004_cloudflare_native_supply_saas.sql',
  'apps/web/migrations/0005_commerce_control_plane.sql',
  'apps/web/migrations/0006_farmer_os_growth.sql',
  'apps/web/migrations/0009_marketplace_experience_v860.sql',
  'apps/web/migrations/0011_demo_identity_repair_v870.sql',
  'apps/web/migrations/0012_demo_lab_saved_baskets_v900.sql',
  'apps/web/migrations/0013_nepal_origin_export_os_v1000.sql',
  'apps/web/server/cloudflare/supply-api.ts',
  'apps/web/server/cloudflare/farmer-os-api.ts',
  'apps/web/server/cloudflare/supply-stack.ts',
  'apps/web/server/cloudflare/commerce-api.ts',
  'apps/web/server/cloudflare/checkout.ts',
  'apps/web/components/SupplySaaSWorkbench.tsx',
  'apps/web/components/FarmerOSWorkbench.tsx',
  'apps/web/components/ProductGallery.tsx',
  'apps/web/components/ProductExperienceProvider.tsx',
  'apps/web/components/ProductActions.tsx',
  'apps/web/components/CompareTray.tsx',
  'apps/web/components/MobileCommerceNav.tsx',
  'apps/web/components/MarketplaceSearch.tsx',
  'apps/web/components/ProductReviews.tsx',
  'apps/web/app/compare/page.tsx',
  'apps/web/app/saved/page.tsx',
  'apps/web/components/ProductLocationFit.tsx',
  'apps/web/components/AdminMatchingCenter.tsx',
  'apps/web/lib/matching.ts',
  'apps/web/components/TraceabilityPublicView.tsx',
  'apps/web/components/CommerceControlPanel.tsx',
  'apps/web/components/TurnstileWidget.tsx',
  'apps/web/components/ThemeSwitcher.tsx',
  'apps/web/components/AuthPanel.tsx',
  'apps/web/components/DemoLaunchCenter.tsx',
  'apps/web/components/SavedBasketsClient.tsx',
  'apps/web/app/saved-baskets/page.tsx',
  'apps/web/components/CartProvider.tsx',
  'apps/web/components/ExportInquiryForm.tsx',
  'apps/web/app/export/page.tsx',
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
  'MISSING_THINGS_DONE_V8.6.md',
  'DEPLOY-HARIYO-V10.0.1.cmd',
  'RELEASE_NOTES_V10.0.1.md',
  'V10_0_1_VALIDATION.md',
  'FEATURE_CATALOG_V10.0.1.md',
  'UI_UX_SYSTEM_V10.0.1.md',
  'BUILD_FIX_V10.0.1.md',
  'MISSING_THINGS_DONE_V10.0.1.md',
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
for (const marker of ['ProductGallery', 'ProductCardGallery', 'slice(0, 8)', 'onTouchStart', 'ArrowRight', 'gallery-lightbox']) {
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
const hardeningMigration = fs.readFileSync('apps/web/migrations/0010_standalone_auth_runtime_v863.sql', 'utf8');
for (const marker of ['runtime_test_secrets','idx_sessions_user_expires']) {
  if (!hardeningMigration.includes(marker)) throw new Error(`V8.7.0 auth hardening migration missing ${marker}`);
}
const demoRepairMigration = fs.readFileSync('apps/web/migrations/0011_demo_identity_repair_v870.sql', 'utf8');
for (const marker of ['HariyoDemo', 'buyer@demo.hariyomart.local', "status = 'active'"]) {
  if (!demoRepairMigration.includes(marker)) throw new Error(`V8.7.0 demo identity repair missing ${marker}`);
}
const v900Migration = fs.readFileSync('apps/web/migrations/0012_demo_lab_saved_baskets_v900.sql', 'utf8');
for (const marker of ['saved_baskets', 'idx_saved_baskets_user_updated']) {
  if (!v900Migration.includes(marker)) throw new Error(`V10.0.1 migration missing ${marker}`);
}

const v100Migration = fs.readFileSync('apps/web/migrations/0013_nepal_origin_export_os_v1000.sql', 'utf8');
for (const marker of ['export_ready','export_inquiries','export_supplier_profiles','export_documents','idx_products_export_ready']) {
  if (!v100Migration.includes(marker)) throw new Error(`V10 export migration missing ${marker}`);
}

const cloudSeed = fs.readFileSync('apps/web/seed/cloudflare.sql', 'utf8');
const migrationSeed = fs.readFileSync('apps/web/migrations/seed.sql', 'utf8');
if (cloudSeed !== migrationSeed) throw new Error('V8.6 catalog seed files are out of sync');
if ((cloudSeed.match(/INSERT OR IGNORE INTO products/g) || []).length !== 420)
  throw new Error('V10.0.1 Cloudflare seed must contain exactly 420 catalog products');
if ((cloudSeed.match(/INSERT OR IGNORE INTO tenants/g) || []).length !== 28)
  throw new Error('V10.0.1 Cloudflare seed must contain exactly 28 sourcing tenants');
if ((cloudSeed.match(/INSERT OR IGNORE INTO export_supplier_profiles/g) || []).length !== 28)
  throw new Error('V10.0.1 Cloudflare seed must contain exactly 28 export supplier profiles');
if (!cloudSeed.includes(`('marketplace.release','"10.0.1"',1)`))
  throw new Error('V8.6 seed release marker is stale');

const demoSeed = fs.readFileSync('apps/web/seed/demo-accounts.sql', 'utf8');
for (const staleTenant of ['seed-tenant-bagmati','seed-tenant-koshi','seed-tenant-lumbini']) {
  if (demoSeed.includes(staleTenant)) throw new Error(`V10.0.1 demo seed still references removed tenant ${staleTenant}`);
}
for (const tenant of ['seed-tenant-kavre-hills','seed-tenant-ilam-highlands','seed-tenant-rupandehi-butwal']) {
  if (!demoSeed.includes(tenant)) throw new Error(`V10.0.1 demo seed missing current sourcing tenant ${tenant}`);
}

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
if (webConfig.services?.some((item) => item.binding === 'HARIYO_SERVICES'))
  throw new Error('Default web Worker must stay standalone; optional HARIYO_SERVICES cannot be hard-bound');
if (webConfig.keep_vars !== true) throw new Error('Default web Worker must preserve Dashboard vars with keep_vars=true');
for (const marker of ['HARIYO_DB','HARIYO_KV','HARIYO_MEDIA','NEXT_INC_CACHE_R2_BUCKET','HARIYO_EVENTS','AI']) {
  if (!JSON.stringify(webConfig).includes(`"${marker}"`)) throw new Error(`Web Wrangler missing ${marker}`);
}

const platform = fs.readFileSync('apps/web/server/cloudflare/platform.ts', 'utf8');
for (const marker of ['requireTenantAccess','tenant_members','verifyTurnstile','TURNSTILE_ENFORCEMENT_MODE','coordinateInventory','kvRateLimit','productionTestSessionSecret','standalone D1 coordination']) {
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
  'farmer-os/buyer-demands','farmer-os/buyer-demand-offers','farmer-os/traceability','farmer-os/recommendations','farmer-os/ai-assistant','export/inquiries',
  'rankMarketplaceProducts','images_json','Hariyo Match v3','matching:','standaloneCheckoutFallback','seed_required','DATABASE_SETUP_REQUIRED','isKnownDemoAccountEmail','getDemoAccountProfile','isSeededDemoIdentity','auth/demo-session','ensureDemoIdentity','demoRuntimeBootstrapReady',
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

const commerceApi = fs.readFileSync('apps/web/server/cloudflare/commerce-api.ts', 'utf8');
for (const marker of ['savedBasketsApi','deleteSavedBasketApi','saved_baskets'])
  if (!commerceApi.includes(marker)) throw new Error(`V10.0.1 saved basket API missing ${marker}`);
const demoLaunch = fs.readFileSync('apps/web/components/DemoLaunchCenter.tsx', 'utf8');
for (const marker of ['auth.demoLogin','demoRuntimeBootstrapReady','One-click role sessions'])
  if (!demoLaunch.includes(marker)) throw new Error(`V10.0.1 Demo Lab missing ${marker}`);
const authProviderV900 = fs.readFileSync('apps/web/components/AuthProvider.tsx', 'utf8');
if (!authProviderV900.includes('auth/demo-session')) throw new Error('V10.0.1 direct demo session client missing');
const savedBasketsUi = fs.readFileSync('apps/web/components/SavedBasketsClient.tsx', 'utf8');
for (const marker of ['commerce/saved-baskets','Load basket','getCatalogProduct'])
  if (!savedBasketsUi.includes(marker)) throw new Error(`V10.0.1 saved basket UI missing ${marker}`);

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
if (pkg.version !== '10.0.1') throw new Error(`Expected v10.0.1 package, got ${pkg.version}`);


const infoExperience = fs.readFileSync('apps/web/components/InfoPageExperience.tsx', 'utf8');
for (const marker of ['AboutSystemGraphic', 'ContactRoutingGraphic', 'info-story-shell', 'Common questions']) {
  if (!infoExperience.includes(marker)) throw new Error(`V8.9 public content experience missing ${marker}`);
}
const infoPage = fs.readFileSync('apps/web/app/info/[slug]/page.tsx', 'utf8');
for (const marker of ['InfoPageExperience', 'contact-form-layout', 'info-final-cta']) {
  if (!infoPage.includes(marker)) throw new Error(`V8.9 info page system missing ${marker}`);
}
const howPage = fs.readFileSync('apps/web/app/how-it-works/page.tsx', 'utf8');
for (const marker of ['how-system-graphic', 'how-step-grid', 'how-dual-journey', 'Trust checkpoints']) {
  if (!howPage.includes(marker)) throw new Error(`V8.9 how-it-works experience missing ${marker}`);
}

const productExperience = fs.readFileSync('apps/web/components/ProductExperienceProvider.tsx', 'utf8');
for (const marker of ['account/wishlist', 'toggleCompare', 'markViewed', 'Promise.allSettled']) {
  if (!productExperience.includes(marker)) throw new Error(`V8.8 product experience missing ${marker}`);
}
const productActions = fs.readFileSync('apps/web/components/ProductActions.tsx', 'utf8');
for (const marker of ['Save product', 'Compare product']) if (!productActions.includes(marker)) throw new Error(`V8.8 product actions missing ${marker}`);
const comparePage = fs.readFileSync('apps/web/app/compare/page.tsx', 'utf8');
for (const marker of ['Compare what matters', 'Add to basket', 'compare-facts']) if (!comparePage.includes(marker)) throw new Error(`V8.8 compare page missing ${marker}`);

for (const marker of ['getCatalogProduct', 'minimumOrder || 1']) {
  if (!comparePage.includes(marker)) throw new Error(`V10.0.1 compare build regression guard missing ${marker}`);
}
const marketplaceSearch = fs.readFileSync('apps/web/components/MarketplaceSearch.tsx', 'utf8');
for (const marker of ['productCatalog', 'categoryCatalog', 'type Product', 'market-search-trigger']) {
  if (!marketplaceSearch.includes(marker)) throw new Error(`V10.0.1 search build/mobile regression guard missing ${marker}`);
}

const catalogSource = fs.readFileSync('apps/web/lib/catalog.ts', 'utf8');
for (const marker of ['export const productCatalog', 'export const categoryCatalog', 'export function getCatalogProduct']) {
  if (!catalogSource.includes(marker)) throw new Error(`V10.0.1 catalog compatibility export missing ${marker}`);
}
if (!shop.includes(') : null}')) throw new Error('V10.0.1 ShopClient conditional rendering regression guard failed');
const catalogSync = fs.readFileSync('apps/web/scripts/sync-catalog.mjs', 'utf8');
for (const marker of ['export const productCatalog', 'export const categoryCatalog', 'export function getCatalogProduct']) {
  if (!catalogSync.includes(marker)) throw new Error(`V10.0.1 catalog generator would drop compatibility export ${marker}`);
}


const exportPage = fs.readFileSync('apps/web/app/export/page.tsx', 'utf8');
for (const marker of ['Nepal Origin Supply & Export Desk','ExportInquiryForm','exportReady']) {
  if (!exportPage.includes(marker)) throw new Error(`V10 export page missing ${marker}`);
}
const exportForm = fs.readFileSync('apps/web/components/ExportInquiryForm.tsx', 'utf8');
for (const marker of ['/export/inquiries','Global buyer RFQ','requiredDocuments']) {
  if (!exportForm.includes(marker)) throw new Error(`V10 export inquiry form missing ${marker}`);
}
const operationsV10 = fs.readFileSync('apps/web/server/cloudflare/operations.ts', 'utf8');
for (const marker of ['exportInquiries','adminExportInquiry','export_inquiries']) {
  if (!operationsV10.includes(marker)) throw new Error(`V10 export operations API missing ${marker}`);
}

const mobileTabs = fs.readFileSync('apps/mobile/app/(tabs)/_layout.tsx', 'utf8');
for (const marker of ['useMobileColors', 'name="sell" options={{ href: null }}', 'palette.accent']) {
  if (!mobileTabs.includes(marker)) throw new Error(`V10.0.1 native mobile navigation polish missing ${marker}`);
}
const cartDrawerV88 = fs.readFileSync('apps/web/components/CartDrawer.tsx', 'utf8');
for (const marker of ['cart-seller-group', 'Guest checkout', 'Review basket']) if (!cartDrawerV88.includes(marker)) throw new Error(`V8.8 cart UX missing ${marker}`);
const checkoutV88 = fs.readFileSync('apps/web/app/checkout/page.tsx', 'utf8');
for (const marker of ['Guest checkout is ready', 'checkout-progress', 'Choose a delivery date']) if (!checkoutV88.includes(marker)) throw new Error(`V8.8 checkout UX missing ${marker}`);

const css = fs.readFileSync('apps/web/app/globals.css', 'utf8');
for (const marker of [
  '--nav-text','--field-text','--footer-text','cross-theme contrast hardening',
  'newsletter-form input:-webkit-autofill','v8.2 commerce control plane','commerce-kpis',
  'Adaptive brand system',"data-theme-mode='system'",'demo-login-action','password-field','Commerce Experience System','mobile-commerce-nav','compare-tray','market-quick-filters','Hariyo Mart v10.0.1 — Nepal Origin Export OS production polish','market-search-trigger',
]) {
  if (!css.includes(marker)) throw new Error(`Theme/commerce UI hardening missing ${marker}`);
}
for (const marker of ['sessionResponsePayload','auth:login','accountPassword','An account already exists for this email']) {
  if (!api.includes(marker)) throw new Error(`Auth hardening missing ${marker}`);
}
const authPanel = fs.readFileSync('apps/web/components/AuthPanel.tsx', 'utf8');
for (const marker of ['startDemo', 'Use & sign in', 'password-reveal']) {
  if (!authPanel.includes(marker)) throw new Error(`V8.7.0 auth UX missing ${marker}`);
}
const demoAccounts = fs.readFileSync('apps/web/lib/demo-accounts.ts', 'utf8');
if (!demoAccounts.includes('isKnownDemoAccountEmail')) throw new Error('V8.7.0 known demo account guard missing');

console.log(`Hariyo Mart Nepal ${pkg.version} Cloudflare-native commerce doctor PASS`);
