import { DurableObject } from 'cloudflare:workers';
import {
  checkoutCore,
  type CheckoutPayload,
} from '../../../../apps/web/server/cloudflare/checkout';

type Env = CloudflareServicesEnv;

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

export class CheckoutCoordinator extends DurableObject<Env> {
  async fetch(request: Request) {
    try {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      return reply(await checkoutCore(this.env, (await request.json()) as CheckoutPayload));
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : 'Checkout failed' }, 400);
    }
  }
}

export class RateLimiter extends DurableObject<Env> {
  async fetch(request: Request) {
    const input = (await request.json()) as { limit?: number; windowSeconds?: number };
    const now = Date.now();
    const windowMs = Math.max(1, Number(input.windowSeconds || 60)) * 1000;
    const stored = (await this.ctx.storage.get<{ count: number; resetsAt: number }>('counter')) || {
      count: 0,
      resetsAt: now + windowMs,
    };
    const counter = stored.resetsAt <= now ? { count: 0, resetsAt: now + windowMs } : stored;
    counter.count += 1;
    await this.ctx.storage.put('counter', counter);
    const limit = Math.max(1, Number(input.limit || 180));
    return reply({
      allowed: counter.count <= limit,
      remaining: Math.max(0, limit - counter.count),
      resetsAt: new Date(counter.resetsAt).toISOString(),
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    if (url.pathname === '/checkout') {
      const stub = env.CHECKOUT_COORDINATOR.getByName('global-checkout');
      return stub.fetch(request);
    }
    if (url.pathname === '/rate-limit') {
      const input = (await request.clone().json()) as { key?: string };
      const keyBytes = new TextEncoder().encode(String(input.key || 'anonymous'));
      const digest = await crypto.subtle.digest('SHA-256', keyBytes);
      const key = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      return env.RATE_LIMITER.getByName(key).fetch(request);
    }
    return reply({ error: 'Route not found' }, 404);
  },

  async queue(batch: MessageBatch<unknown>, env: Env) {
    for (const message of batch.messages) {
      const event = (message.body || {}) as Record<string, unknown>;
      try {
        await env.HARIYO_DB.prepare(
          `INSERT INTO audit_logs (id,actor_id,tenant_id,action,entity_type,entity_id,meta,created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
          .bind(
            crypto.randomUUID(),
            typeof event.actorId === 'string' ? event.actorId : null,
            typeof event.tenantId === 'string' ? event.tenantId : null,
            String(event.type || 'platform.event'),
            typeof event.entityType === 'string' ? event.entityType : 'event',
            typeof event.entityId === 'string'
              ? event.entityId
              : typeof event.orderId === 'string'
                ? event.orderId
                : null,
            JSON.stringify(event),
            typeof event.at === 'string' ? event.at : new Date().toISOString(),
          )
          .run();
        message.ack();
      } catch {
        message.retry({ delaySeconds: 30 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
