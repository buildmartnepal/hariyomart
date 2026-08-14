import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import {
  checkoutCore,
  type CheckoutPayload,
} from '../../../../apps/web/server/cloudflare/checkout';

type Env = CloudflareServicesEnv;

const checkoutPayloadInput = z.object({
  lines: z
    .array(
      z.object({
        productSlug: z.string().min(2).max(120),
        quantity: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(50),
  paymentMethod: z.enum(['cod', 'esewa', 'khalti', 'fonepay', 'card']),
  deliveryAddress: z.object({
    province: z.string().min(1).max(100),
    district: z.string().min(1).max(100),
    municipality: z.string().min(1).max(100),
    ward: z.string().min(1).max(20),
    street: z.string().min(1).max(240),
    phone: z.string().min(7).max(30),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  guestCustomer: z
    .object({
      name: z.string().min(2).max(100),
      phone: z.string().min(7).max(30),
      email: z.string().email().optional(),
    })
    .optional(),
  buyerId: z.string().min(1).max(100).optional(),
  idempotencyKey: z.string().min(8).max(200),
}) satisfies z.ZodType<CheckoutPayload>;

const rateLimitInput = z.object({
  key: z.string().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100_000).optional(),
  windowSeconds: z.number().int().min(1).max(86_400).optional(),
});

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

export class CheckoutCoordinator extends DurableObject<Env> {
  async fetch(request: Request) {
    try {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      const parsed = checkoutPayloadInput.safeParse(await request.json());
      if (!parsed.success) return reply({ error: 'Invalid checkout payload' }, 400);
      return reply(await checkoutCore(this.env, parsed.data));
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : 'Checkout failed' }, 400);
    }
  }
}

export class RateLimiter extends DurableObject<Env> {
  async fetch(request: Request) {
    const parsed = rateLimitInput.safeParse(await request.json());
    if (!parsed.success) return reply({ error: 'Invalid rate-limit payload' }, 400);
    const input = parsed.data;
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
      const parsed = checkoutPayloadInput.safeParse(await request.clone().json());
      if (!parsed.success) return reply({ error: 'Invalid checkout payload' }, 400);
      const checkoutKey = request.headers.get('x-checkout-coordination-key');
      if (!checkoutKey || !/^[a-f0-9]{64}$/.test(checkoutKey))
        return reply({ error: 'Missing checkout coordination key' }, 400);
      const stub = env.CHECKOUT_COORDINATOR.getByName(checkoutKey);
      return stub.fetch(request);
    }
    if (url.pathname === '/rate-limit') {
      const parsed = rateLimitInput.safeParse(await request.clone().json());
      if (!parsed.success) return reply({ error: 'Invalid rate-limit payload' }, 400);
      const input = parsed.data;
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
