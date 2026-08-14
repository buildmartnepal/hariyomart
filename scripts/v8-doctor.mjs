import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps/web/migrations/0004_cloudflare_native_supply_saas.sql',
  'apps/web/server/cloudflare/supply-api.ts',
  'apps/web/server/cloudflare/supply-stack.ts',
  'apps/web/components/SupplySaaSWorkbench.tsx',
  'apps/web/components/TurnstileWidget.tsx',
  'infra/cloudflare/services/src/index.ts',
  'infra/cloudflare/services/wrangler.jsonc',
  'docs/CLOUDFLARE_NATIVE_V8_COMPLETE_GUIDE.md',
  'docs/V8_SYSTEM_ARCHITECTURE.md',
  'docs/V8_IMPLEMENTATION_STATUS.md',
  'RELEASE_NOTES_V8.md',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) throw new Error(`V8 required files missing: ${missing.join(', ')}`);

const migration = fs.readFileSync(required[0], 'utf8');
for (const table of [
  'tenant_members','suppliers','warehouses','harvest_plans','produce_lots','quality_checks',
  'purchase_orders','goods_receipts','price_lists','sales_orders','delivery_routes',
  'payments_v8','settlements','produce_subscriptions','integration_outbox','auth_security_events',
]) {
  if (!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`))
    throw new Error(`V8 migration missing ${table}`);
}

const service = fs.readFileSync('infra/cloudflare/services/src/index.ts', 'utf8');
for (const marker of [
  'InventoryCoordinator','TenantSequence','TenantRealtimeHub','OrderFulfillmentWorkflow',
  'SubscriptionGenerationWorkflow','inventory_operations','order.cancelled.inventory_restore',
  'HARIYO_ANALYTICS.writeDataPoint','async scheduled','async queue',
]) {
  if (!service.includes(marker)) throw new Error(`Cloudflare service missing ${marker}`);
}

const config = fs.readFileSync('infra/cloudflare/services/wrangler.jsonc', 'utf8');
for (const marker of ['INVENTORY_COORDINATOR','TENANT_REALTIME','analytics_engine_datasets','workflows','dead_letter_queue']) {
  if (!config.includes(marker)) throw new Error(`Services config missing ${marker}`);
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
]) {
  if (!api.includes(marker)) throw new Error(`V8 API dispatcher missing ${marker}`);
}

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
if (pkg.version !== '8.0.0') throw new Error(`Expected package version 8.0.0, got ${pkg.version}`);

console.log('Hariyo Mart Nepal v8 Cloudflare-native doctor PASS');
