import fs from 'node:fs';

const configPath = 'apps/web/wrangler.jsonc';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const vars = config.vars || {};
const services = new Map((config.services || []).map((item) => [item.binding, item.service]));
const failures = [];
const warnings = [];

if (vars.RELEASE_VERSION !== '8.9.0') failures.push('RELEASE_VERSION must be 8.9.0.');
if (!fs.existsSync('apps/web/migrations/0010_standalone_auth_runtime_v863.sql'))
  failures.push('v8.6.3 standalone auth migration 0010 is missing.');
if (!fs.existsSync('apps/web/migrations/0011_demo_identity_repair_v870.sql'))
  failures.push('v8.9.0 demo identity repair migration 0011 is missing.');

if (vars.APP_ENV !== 'production') failures.push('APP_ENV must be production.');
const productionTestMode = String(vars.PRODUCTION_TEST_MODE) === 'true';
const demoRequested = String(vars.NEXT_PUBLIC_DEMO_MODE) === 'true';
if (demoRequested && !productionTestMode) failures.push('NEXT_PUBLIC_DEMO_MODE may be true in production only when PRODUCTION_TEST_MODE=true.');
if (services.get('WORKER_SELF_REFERENCE') !== config.name)
  failures.push('WORKER_SELF_REFERENCE must point to the web Worker itself.');
if (services.has('HARIYO_SERVICES'))
  failures.push('Default production web config must not hard-bind HARIYO_SERVICES; deploy the optional services Worker separately before enabling that binding.');
if (!config.d1_databases?.some((item) => item.binding === 'HARIYO_DB')) failures.push('HARIYO_DB binding is missing.');
if (!config.r2_buckets?.some((item) => item.binding === 'HARIYO_MEDIA')) failures.push('HARIYO_MEDIA binding is missing.');
if (!config.kv_namespaces?.some((item) => item.binding === 'HARIYO_KV')) failures.push('HARIYO_KV binding is missing.');

if (config.keep_vars !== true) failures.push('keep_vars must be true so Dashboard-managed production variables are preserved.');
if ('NEXT_PUBLIC_TURNSTILE_SITE_KEY' in vars)
  failures.push('NEXT_PUBLIC_TURNSTILE_SITE_KEY must be Dashboard-managed, not hardcoded in wrangler vars.');
warnings.push('Turnstile site key is expected from the Cloudflare Dashboard and is preserved by keep_vars=true.');

if (failures.length) {
  console.error('Hariyo Mart production guard FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Hariyo Mart production guard PASS');
warnings.forEach((item) => console.warn(`WARNING: ${item}`));
console.log(productionTestMode ? 'Production Test Mode is explicitly enabled with explicit test identities.' : 'Demo fallback is disabled in production.');
console.log('Standalone web deployment is enabled; HARIYO_SERVICES remains optional until its target Worker exists.');
