import fs from 'node:fs';

const configPath = 'apps/web/wrangler.jsonc';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const vars = config.vars || {};
const services = new Map((config.services || []).map((item) => [item.binding, item.service]));
const failures = [];
const warnings = [];

if (vars.RELEASE_VERSION !== '8.6.1') failures.push('RELEASE_VERSION must be 8.6.1.');
if (!fs.existsSync('apps/web/migrations/0009_marketplace_experience_v860.sql'))
  failures.push('v8.6 marketplace migration 0009 is missing.');

if (vars.APP_ENV !== 'production') failures.push('APP_ENV must be production.');
const productionTestMode = String(vars.PRODUCTION_TEST_MODE) === 'true';
const demoRequested = String(vars.NEXT_PUBLIC_DEMO_MODE) === 'true';
if (demoRequested && !productionTestMode) failures.push('NEXT_PUBLIC_DEMO_MODE may be true in production only when PRODUCTION_TEST_MODE=true.');
if (services.get('WORKER_SELF_REFERENCE') !== config.name)
  failures.push('WORKER_SELF_REFERENCE must point to the web Worker itself.');
if (services.get('HARIYO_SERVICES') !== 'hariyo-mart-services')
  failures.push('HARIYO_SERVICES must point to hariyo-mart-services.');
if (!config.d1_databases?.some((item) => item.binding === 'HARIYO_DB')) failures.push('HARIYO_DB binding is missing.');
if (!config.r2_buckets?.some((item) => item.binding === 'HARIYO_MEDIA')) failures.push('HARIYO_MEDIA binding is missing.');
if (!config.kv_namespaces?.some((item) => item.binding === 'HARIYO_KV')) failures.push('HARIYO_KV binding is missing.');

const siteKey = String(vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');
if (!siteKey || /REPLACE_WITH|PLACEHOLDER/i.test(siteKey))
  warnings.push('Turnstile site key is still a placeholder; login/register protection will not be complete.');

if (failures.length) {
  console.error('Hariyo Mart production guard FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Hariyo Mart production guard PASS');
warnings.forEach((item) => console.warn(`WARNING: ${item}`));
console.log(productionTestMode ? 'Production Test Mode is explicitly enabled with a scoped test buyer identity.' : 'Demo fallback is disabled in production.');
console.log('The private services Worker binding is intact.');
