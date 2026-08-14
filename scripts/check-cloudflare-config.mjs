import fs from 'node:fs';

const webPath = 'apps/web/wrangler.jsonc';
const servicesPath = 'infra/cloudflare/services/wrangler.jsonc';
const parse = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const web = parse(webPath);
const services = parse(servicesPath);
const fail = (message) => {
  throw new Error(message);
};
const bindingNames = (items = []) => new Set(items.map((item) => item.binding));

if (web.name !== 'hariyo-mart-nepal') fail(`${webPath} Worker name must match the connected Cloudflare Worker: hariyo-mart-nepal`);
if (web.main !== '.open-next/worker.js') fail(`${webPath} must use the OpenNext Worker entrypoint`);
if (web.compatibility_date !== '2026-08-14') fail(`${webPath} compatibility_date must be 2026-08-14 for this release`);
for (const flag of ['nodejs_compat', 'global_fetch_strictly_public']) {
  if (!web.compatibility_flags?.includes(flag)) fail(`${webPath} is missing compatibility flag ${flag}`);
}
if (web.assets?.directory !== '.open-next/assets' || web.assets?.binding !== 'ASSETS')
  fail(`${webPath} OpenNext assets binding is incomplete`);
if (web.upload_source_maps !== true) fail(`${webPath} must upload source maps in production`);
if (!web.observability?.enabled) fail(`${webPath} observability must be enabled`);

const vars = web.vars || {};
if (vars.APP_ENV !== 'production' || vars.DATA_PLATFORM !== 'cloudflare-native')
  fail(`${webPath} must declare the Cloudflare-native production platform`);
if (vars.RELEASE_VERSION !== '8.3.2') fail(`${webPath} RELEASE_VERSION must be 8.3.2`);
if (!vars.NEXT_PUBLIC_SITE_URL || !URL.canParse(vars.NEXT_PUBLIC_SITE_URL) || new URL(vars.NEXT_PUBLIC_SITE_URL).protocol !== 'https:')
  fail(`${webPath} NEXT_PUBLIC_SITE_URL must be a valid production HTTPS URL`);
if (vars.NEXT_PUBLIC_API_URL !== '/api') fail(`${webPath} API URL must remain same-origin (/api)`);
if (vars.SESSION_COOKIE_NAME !== 'hariyo_session') fail(`${webPath} session cookie name changed unexpectedly`);
if (vars.TURNSTILE_ENFORCEMENT_MODE !== 'web') fail(`${webPath} Turnstile must be web-enforced in production`);

const disallowedVarKeys = Object.keys(vars).filter(
  (key) => /(password|private|secret|access[_-]?token|refresh[_-]?token|api[_-]?token)/i.test(key),
);
if (disallowedVarKeys.length) fail(`Sensitive-looking values must not be stored in vars: ${disallowedVarKeys.join(', ')}`);

const requiredSecrets = new Set(web.secrets?.required || []);
for (const secret of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'TURNSTILE_SECRET_KEY']) {
  if (!requiredSecrets.has(secret)) fail(`${webPath} secrets.required is missing ${secret}`);
}

const webD1 = web.d1_databases?.find((item) => item.binding === 'HARIYO_DB');
const servicesD1 = services.d1_databases?.find((item) => item.binding === 'HARIYO_DB');
if (!webD1 || !/^[0-9a-f-]{36}$/i.test(webD1.database_id || '') || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(webD1.database_id || ''))
  fail(`${webPath} does not contain a provisioned HARIYO_DB database ID`);
if (!servicesD1 || servicesD1.database_id !== webD1.database_id)
  fail('The web and services Workers must bind the same production D1 database');

const kv = web.kv_namespaces?.find((item) => item.binding === 'HARIYO_KV');
if (!kv || !/^[0-9a-f]{32}$/i.test(kv.id || '') || /^0{32}$/.test(kv.id || ''))
  fail(`${webPath} does not contain a provisioned HARIYO_KV namespace ID`);

const r2 = bindingNames(web.r2_buckets);
for (const name of ['HARIYO_MEDIA', 'NEXT_INC_CACHE_R2_BUCKET'])
  if (!r2.has(name)) fail(`${webPath} is missing R2 binding ${name}`);
const queueProducers = bindingNames(web.queues?.producers);
if (!queueProducers.has('HARIYO_EVENTS')) fail(`${webPath} is missing HARIYO_EVENTS queue producer`);

const servicesBindings = new Map((web.services || []).map((item) => [item.binding, item.service]));
if (servicesBindings.get('WORKER_SELF_REFERENCE') !== web.name)
  fail('WORKER_SELF_REFERENCE.service must exactly match the web Worker name');
if (servicesBindings.get('HARIYO_SERVICES') !== 'hariyo-mart-services')
  fail(`${webPath} must bind the internal hariyo-mart-services Worker`);

if (services.name !== 'hariyo-mart-services') fail(`${servicesPath} Worker name changed unexpectedly`);
if (services.upload_source_maps !== true || !services.observability?.enabled)
  fail(`${servicesPath} must enable source maps and observability`);
const durableBindings = new Set((services.durable_objects?.bindings || []).map((item) => item.name));
for (const name of ['CHECKOUT_COORDINATOR', 'RATE_LIMITER', 'INVENTORY_COORDINATOR', 'TENANT_SEQUENCE', 'TENANT_REALTIME'])
  if (!durableBindings.has(name)) fail(`${servicesPath} is missing Durable Object binding ${name}`);
const serviceQueueProducers = bindingNames(services.queues?.producers);
if (!serviceQueueProducers.has('HARIYO_EVENTS')) fail(`${servicesPath} is missing the event queue producer`);
const consumer = services.queues?.consumers?.find((item) => item.queue === 'hariyo-mart-events');
if (!consumer?.dead_letter_queue) fail(`${servicesPath} event consumer must have a dead-letter queue`);
const workflowBindings = bindingNames(services.workflows);
for (const name of ['ORDER_FULFILLMENT_WORKFLOW', 'SUBSCRIPTION_GENERATION_WORKFLOW'])
  if (!workflowBindings.has(name)) fail(`${servicesPath} is missing Workflow binding ${name}`);
const subscriptionWorkflow = services.workflows?.find((item) => item.binding === 'SUBSCRIPTION_GENERATION_WORKFLOW');
if (!subscriptionWorkflow?.schedules?.length)
  fail(`${servicesPath} subscription workflow must have a recurring schedule`);

const siteKey = String(vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');
if (!siteKey || /REPLACE_WITH|PLACEHOLDER/i.test(siteKey)) {
  const message = 'NEXT_PUBLIC_TURNSTILE_SITE_KEY is still a placeholder. Replace it before production deploy.';
  if (process.env.ALLOW_TURNSTILE_PLACEHOLDER === '1') console.warn(`WARNING: ${message}`);
  else fail(message);
}

console.log('Cloudflare v8.3.2 production configuration PASS');
