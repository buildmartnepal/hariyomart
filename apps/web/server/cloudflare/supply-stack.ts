import { apiJson, cloudflareEnv } from './platform';

async function probeV8Schema() {
  const env = cloudflareEnv();
  try {
    await env.HARIYO_DB.batch([
      env.HARIYO_DB.prepare('SELECT code FROM plan_catalog LIMIT 1'),
      env.HARIYO_DB.prepare('SELECT tenant_id FROM tenant_members LIMIT 1'),
      env.HARIYO_DB.prepare('SELECT id FROM produce_lots LIMIT 1'),
      env.HARIYO_DB.prepare('SELECT id FROM purchase_orders LIMIT 1'),
      env.HARIYO_DB.prepare('SELECT id FROM delivery_routes LIMIT 1'),
      env.HARIYO_DB.prepare('SELECT id FROM integration_outbox LIMIT 1'),
    ]);
    return {
      schemaReady: true,
      detail: 'Cloudflare D1 v8 produce-SaaS tables are available.',
    };
  } catch {
    return {
      schemaReady: false,
      detail: 'Cloudflare D1 is connected; apply migration 0004_cloudflare_native_supply_saas.sql.',
    };
  }
}

async function probeServices() {
  const env = cloudflareEnv();
  if (!env.HARIYO_SERVICES) {
    return {
      configured: false,
      inventoryCoordinator: false,
      workflows: false,
      detail: 'Deploy hariyo-mart-services and bind HARIYO_SERVICES.',
    };
  }
  try {
    const response = await env.HARIYO_SERVICES.fetch('https://hariyo-services/health', {
      method: 'GET',
    });
    return {
      configured: true,
      inventoryCoordinator: response.ok,
      workflows: true,
      detail: response.ok
        ? 'Durable Object coordination, Queues and Workflow service is reachable.'
        : 'Service binding exists but the v8 service Worker should be redeployed.',
    };
  } catch {
    return {
      configured: true,
      inventoryCoordinator: false,
      workflows: false,
      detail: 'Service binding exists but the service Worker could not be reached.',
    };
  }
}

export async function supplyStackStatus() {
  const env = cloudflareEnv();
  const [d1, services] = await Promise.all([probeV8Schema(), probeServices()]);
  return apiJson({
    service: 'hariyo-mart-cloudflare-native-produce-saas',
    version: '8.0.0',
    mode: 'cloudflare-native',
    sourceOfTruth: 'cloudflare-d1-with-durable-object-coordination',
    d1,
    auth: {
      provider: 'cloudflare-workers-d1-sessions',
      turnstileConfigured: Boolean(env.TURNSTILE_SECRET_KEY),
      detail: env.TURNSTILE_SECRET_KEY
        ? 'Workers auth, D1 refresh sessions and Turnstile server validation are available.'
        : 'Workers auth and D1 sessions are active; add TURNSTILE_SECRET_KEY before public launch.',
    },
    cloudflare: {
      workers: true,
      d1: Boolean(env.HARIYO_DB),
      r2: Boolean(env.HARIYO_MEDIA),
      kv: Boolean(env.HARIYO_KV),
      queues: Boolean(env.HARIYO_EVENTS),
      durableObjects: Boolean(env.HARIYO_SERVICES),
      workflows: services.workflows,
      inventoryCoordinator: services.inventoryCoordinator,
    },
    services,
    externalDataPlatformDependencies: [],
    timestamp: new Date().toISOString(),
  });
}
