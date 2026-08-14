import {
  DurableObject,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers';
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

const inventoryInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reserve'),
    productId: z.string().min(1).max(120),
    reservationId: z.string().min(8).max(200),
    quantity: z.number().positive().max(10_000_000),
    tenantId: z.string().min(1).max(120).optional(),
    ttlSeconds: z.number().int().min(30).max(3600).optional(),
  }),
  z.object({
    action: z.literal('commit'),
    productId: z.string().min(1).max(120),
    reservationId: z.string().min(8).max(200),
    actorId: z.string().max(120).optional(),
    referenceType: z.string().max(80).optional(),
    referenceId: z.string().max(160).optional(),
  }),
  z.object({
    action: z.literal('release'),
    productId: z.string().min(1).max(120),
    reservationId: z.string().min(8).max(200),
  }),
  z.object({
    action: z.literal('restore'),
    productId: z.string().min(1).max(120),
    reservationId: z.string().min(8).max(200),
    actorId: z.string().max(120).optional(),
    referenceType: z.string().max(80).optional(),
    referenceId: z.string().max(160).optional(),
  }),
  z.object({
    action: z.literal('set'),
    productId: z.string().min(1).max(120),
    stock: z.number().min(0).max(10_000_000),
    actorId: z.string().max(120).optional(),
    reason: z.string().min(2).max(500),
  }),
  z.object({
    action: z.literal('adjust'),
    productId: z.string().min(1).max(120),
    quantityChange: z.number().min(-10_000_000).max(10_000_000),
    actorId: z.string().max(120).optional(),
    reason: z.string().min(2).max(500),
    eventType: z.enum(['harvest', 'adjustment', 'return', 'spoilage']),
    operationId: z.string().min(8).max(200).optional(),
  }),
]);

const sequenceInput = z.object({
  tenantId: z.string().min(1).max(120),
  key: z.string().min(1).max(80),
  prefix: z.string().max(24).optional(),
});

const realtimePublishInput = z.object({
  tenantId: z.string().min(1).max(120),
  event: z.record(z.unknown()),
});

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

async function recordInventoryEvent(
  env: Env,
  input: {
    productId: string;
    tenantId: string;
    quantityChange: number;
    stockAfter: number;
    actorId?: string;
    eventType: 'sale' | 'return' | 'harvest' | 'adjustment' | 'spoilage';
    reason: string;
    referenceType?: string;
    referenceId?: string;
  },
) {
  await env.HARIYO_DB.prepare(
    `INSERT INTO inventory_events
      (id,product_id,tenant_id,actor_id,event_type,quantity_change,stock_after,reason,reference_type,reference_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      crypto.randomUUID(),
      input.productId,
      input.tenantId,
      input.actorId || null,
      input.eventType,
      input.quantityChange,
      input.stockAfter,
      input.reason,
      input.referenceType || null,
      input.referenceId || null,
      new Date().toISOString(),
    )
    .run();
}

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

type ReservationRow = {
  reservation_id: string;
  quantity: number;
  tenant_id: string;
  status: 'active' | 'committed' | 'released' | 'rolled_back';
  expires_at: number;
};

/**
 * One InventoryCoordinator instance is addressed by product ID.
 * That makes a product the coordination atom and serializes reserve/commit/restore
 * operations for that product without creating one global inventory bottleneck.
 */
export class InventoryCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS reservations (
          reservation_id TEXT PRIMARY KEY,
          quantity REAL NOT NULL,
          tenant_id TEXT NOT NULL,
          status TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS reservations_status_expiry
          ON reservations(status, expires_at);
        CREATE TABLE IF NOT EXISTS inventory_operations (
          operation_id TEXT PRIMARY KEY,
          quantity_change REAL NOT NULL,
          stock_after REAL NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS inventory_operations_created
          ON inventory_operations(created_at);
      `);
    });
  }

  private cleanup(now = Date.now()) {
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET status='released',updated_at=? WHERE status='active' AND expires_at<=?",
      now,
      now,
    );
    this.ctx.storage.sql.exec(
      'DELETE FROM inventory_operations WHERE created_at<?',
      now - 90 * 24 * 60 * 60 * 1000,
    );
  }

  async reserve(input: {
    productId: string;
    reservationId: string;
    quantity: number;
    tenantId?: string;
    ttlSeconds?: number;
  }) {
    this.cleanup();
    const existing = this.ctx.storage.sql
      .exec<ReservationRow>('SELECT * FROM reservations WHERE reservation_id=?', input.reservationId)
      .toArray()[0];
    if (existing) {
      if (existing.status === 'active' || existing.status === 'committed')
        return { ok: true, idempotent: true, status: existing.status, quantity: existing.quantity };
      throw new Error('Reservation ID has already been released');
    }

    const product = await this.env.HARIYO_DB.prepare(
      'SELECT id,tenant_id,stock FROM products WHERE id=? AND status IN (\'active\',\'paused\',\'pending_review\')',
    )
      .bind(input.productId)
      .first<{ id: string; tenant_id: string; stock: number }>();
    if (!product) throw new Error('Product not found');
    if (input.tenantId && input.tenantId !== product.tenant_id) throw new Error('Tenant mismatch');

    const row = this.ctx.storage.sql
      .exec<{ reserved: number }>(
        "SELECT COALESCE(SUM(quantity),0) AS reserved FROM reservations WHERE status='active' AND expires_at>?",
        Date.now(),
      )
      .one();
    const reserved = Number(row.reserved || 0);
    const available = Number(product.stock) - reserved;
    if (input.quantity > available)
      throw new Error(`Only ${Math.max(0, available)} units are currently available`);

    const now = Date.now();
    const expiresAt = now + Math.max(30, input.ttlSeconds || 180) * 1000;
    this.ctx.storage.sql.exec(
      `INSERT INTO reservations
       (reservation_id,quantity,tenant_id,status,expires_at,created_at,updated_at)
       VALUES (?,?,?,'active',?,?,?)`,
      input.reservationId,
      input.quantity,
      product.tenant_id,
      expiresAt,
      now,
      now,
    );
    return { ok: true, availableBefore: available, reserved: input.quantity, expiresAt };
  }

  async commit(input: {
    productId: string;
    reservationId: string;
    actorId?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    this.cleanup();
    const reservation = this.ctx.storage.sql
      .exec<ReservationRow>('SELECT * FROM reservations WHERE reservation_id=?', input.reservationId)
      .toArray()[0];
    if (!reservation) throw new Error('Inventory reservation not found');
    if (reservation.status === 'committed') return { ok: true, idempotent: true };
    if (reservation.status !== 'active') throw new Error('Inventory reservation is no longer active');

    const nowIso = new Date().toISOString();
    const result = await this.env.HARIYO_DB.prepare(
      'UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND tenant_id=? AND stock>=?',
    )
      .bind(
        reservation.quantity,
        nowIso,
        input.productId,
        reservation.tenant_id,
        reservation.quantity,
      )
      .run();
    if (Number(result.meta?.changes || 0) !== 1)
      throw new Error('Inventory changed before checkout could commit; retry the order');

    const product = await this.env.HARIYO_DB.prepare('SELECT stock FROM products WHERE id=?')
      .bind(input.productId)
      .first<{ stock: number }>();
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET status='committed',updated_at=? WHERE reservation_id=?",
      Date.now(),
      input.reservationId,
    );
    await recordInventoryEvent(this.env, {
      productId: input.productId,
      tenantId: reservation.tenant_id,
      quantityChange: -reservation.quantity,
      stockAfter: Number(product?.stock || 0),
      actorId: input.actorId,
      eventType: 'sale',
      reason: 'Committed Cloudflare Durable Object stock reservation',
      referenceType: input.referenceType || 'checkout',
      referenceId: input.referenceId || input.reservationId,
    });
    return { ok: true, stockAfter: Number(product?.stock || 0), quantity: reservation.quantity };
  }

  async release(input: { reservationId: string }) {
    const reservation = this.ctx.storage.sql
      .exec<ReservationRow>('SELECT * FROM reservations WHERE reservation_id=?', input.reservationId)
      .toArray()[0];
    if (!reservation || reservation.status === 'released') return { ok: true, idempotent: true };
    if (reservation.status === 'committed') throw new Error('Committed stock must be restored, not released');
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET status='released',updated_at=? WHERE reservation_id=?",
      Date.now(),
      input.reservationId,
    );
    return { ok: true };
  }

  async restore(input: {
    productId: string;
    reservationId: string;
    actorId?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    const reservation = this.ctx.storage.sql
      .exec<ReservationRow>('SELECT * FROM reservations WHERE reservation_id=?', input.reservationId)
      .toArray()[0];
    if (!reservation) return { ok: true, idempotent: true };
    if (reservation.status === 'rolled_back') return { ok: true, idempotent: true };
    if (reservation.status !== 'committed') return this.release({ reservationId: input.reservationId });

    const nowIso = new Date().toISOString();
    await this.env.HARIYO_DB.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?')
      .bind(reservation.quantity, nowIso, input.productId)
      .run();
    const product = await this.env.HARIYO_DB.prepare('SELECT stock FROM products WHERE id=?')
      .bind(input.productId)
      .first<{ stock: number }>();
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET status='rolled_back',updated_at=? WHERE reservation_id=?",
      Date.now(),
      input.reservationId,
    );
    await recordInventoryEvent(this.env, {
      productId: input.productId,
      tenantId: reservation.tenant_id,
      quantityChange: reservation.quantity,
      stockAfter: Number(product?.stock || 0),
      actorId: input.actorId,
      eventType: 'return',
      reason: 'Restored stock after failed or cancelled coordinated operation',
      referenceType: input.referenceType || 'reservation_rollback',
      referenceId: input.referenceId || input.reservationId,
    });
    return { ok: true, stockAfter: Number(product?.stock || 0) };
  }

  async setStock(input: {
    productId: string;
    stock: number;
    actorId?: string;
    reason: string;
  }) {
    this.cleanup();
    const product = await this.env.HARIYO_DB.prepare('SELECT tenant_id,stock FROM products WHERE id=?')
      .bind(input.productId)
      .first<{ tenant_id: string; stock: number }>();
    if (!product) throw new Error('Product not found');
    const active = this.ctx.storage.sql
      .exec<{ reserved: number }>(
        "SELECT COALESCE(SUM(quantity),0) AS reserved FROM reservations WHERE status='active' AND expires_at>?",
        Date.now(),
      )
      .one();
    if (input.stock < Number(active.reserved || 0))
      throw new Error('Stock cannot be set below active reservations');
    const quantityChange = input.stock - Number(product.stock);
    await this.env.HARIYO_DB.prepare('UPDATE products SET stock=?,updated_at=? WHERE id=?')
      .bind(input.stock, new Date().toISOString(), input.productId)
      .run();
    if (quantityChange !== 0) {
      await recordInventoryEvent(this.env, {
        productId: input.productId,
        tenantId: product.tenant_id,
        quantityChange,
        stockAfter: input.stock,
        actorId: input.actorId,
        eventType: 'adjustment',
        reason: input.reason,
      });
    }
    return { ok: true, stockAfter: input.stock, reserved: Number(active.reserved || 0) };
  }

  async adjust(input: {
    productId: string;
    quantityChange: number;
    actorId?: string;
    reason: string;
    eventType: 'harvest' | 'adjustment' | 'return' | 'spoilage';
    operationId?: string;
  }) {
    this.cleanup();
    if (input.operationId) {
      const previous = this.ctx.storage.sql
        .exec<{ stock_after: number }>('SELECT stock_after FROM inventory_operations WHERE operation_id=?', input.operationId)
        .toArray()[0];
      if (previous) return { ok: true, idempotent: true, stockAfter: Number(previous.stock_after) };
    }
    const product = await this.env.HARIYO_DB.prepare('SELECT tenant_id,stock FROM products WHERE id=?')
      .bind(input.productId)
      .first<{ tenant_id: string; stock: number }>();
    if (!product) throw new Error('Product not found');
    const active = this.ctx.storage.sql
      .exec<{ reserved: number }>(
        "SELECT COALESCE(SUM(quantity),0) AS reserved FROM reservations WHERE status='active' AND expires_at>?",
        Date.now(),
      )
      .one();
    const stockAfter = Number(product.stock) + input.quantityChange;
    if (stockAfter < Number(active.reserved || 0))
      throw new Error('Adjustment would reduce stock below active reservations');
    if (stockAfter < 0) throw new Error('Adjustment would make stock negative');
    await this.env.HARIYO_DB.prepare('UPDATE products SET stock=?,updated_at=? WHERE id=?')
      .bind(stockAfter, new Date().toISOString(), input.productId)
      .run();
    await recordInventoryEvent(this.env, {
      productId: input.productId,
      tenantId: product.tenant_id,
      quantityChange: input.quantityChange,
      stockAfter,
      actorId: input.actorId,
      eventType: input.eventType,
      reason: input.reason,
      referenceType: input.operationId ? 'idempotent_adjustment' : undefined,
      referenceId: input.operationId,
    });
    if (input.operationId) {
      this.ctx.storage.sql.exec(
        'INSERT INTO inventory_operations(operation_id,quantity_change,stock_after,created_at) VALUES (?,?,?,?)',
        input.operationId,
        input.quantityChange,
        stockAfter,
        Date.now(),
      );
    }
    return { ok: true, stockAfter, reserved: Number(active.reserved || 0) };
  }
}

export class TenantSequence extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS sequences (
          sequence_key TEXT PRIMARY KEY,
          next_value INTEGER NOT NULL
        );
      `);
    });
  }

  next(input: { key: string; prefix?: string }) {
    const existing = this.ctx.storage.sql
      .exec<{ next_value: number }>('SELECT next_value FROM sequences WHERE sequence_key=?', input.key)
      .toArray()[0];
    const value = Number(existing?.next_value || 1);
    this.ctx.storage.sql.exec(
      `INSERT INTO sequences(sequence_key,next_value) VALUES (?,?)
       ON CONFLICT(sequence_key) DO UPDATE SET next_value=excluded.next_value`,
      input.key,
      value + 1,
    );
    const prefix = input.prefix ? `${input.prefix}-` : '';
    return { value, formatted: `${prefix}${String(value).padStart(6, '0')}` };
  }
}

export class TenantRealtimeHub extends DurableObject<Env> {
  async fetch(request: Request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return reply({ error: 'WebSocket upgrade required' }, 426);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ connectedAt: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  publish(event: Record<string, unknown>) {
    const payload = JSON.stringify({ ...event, emittedAt: new Date().toISOString() });
    let delivered = 0;
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
        delivered += 1;
      } catch {
        try {
          socket.close(1011, 'Delivery failed');
        } catch {}
      }
    }
    return { delivered };
  }

  webSocketMessage(_socket: WebSocket, message: ArrayBuffer | string) {
    if (typeof message === 'string' && message === 'ping') _socket.send('pong');
  }
}

type OrderWorkflowParams = {
  orderId: string;
  orderNumber: string;
  tenantIds: string[];
  total: number;
};

export class OrderFulfillmentWorkflow extends WorkflowEntrypoint<Env, OrderWorkflowParams> {
  async run(event: WorkflowEvent<OrderWorkflowParams>, step: WorkflowStep) {
    const order = await step.do('load-order', async () => {
      return this.env.HARIYO_DB.prepare(
        'SELECT id,order_number,status,payment_status,total,created_at FROM orders WHERE id=?',
      )
        .bind(event.payload.orderId)
        .first<Record<string, unknown>>();
    });
    if (!order) return { skipped: true, reason: 'order-not-found' };

    await step.do('create-fulfillment-outbox-events', async () => {
      const now = new Date().toISOString();
      const statements = event.payload.tenantIds.map((tenantId) =>
        this.env.HARIYO_DB.prepare(
          `INSERT OR IGNORE INTO integration_outbox
           (id,tenant_id,topic,aggregate_type,aggregate_id,payload_json,status,idempotency_key,available_at,created_at)
           VALUES (?,?,?,?,?,?,'pending',?,?,?)`,
        ).bind(
          crypto.randomUUID(),
          tenantId,
          'order.fulfillment.requested',
          'order',
          event.payload.orderId,
          JSON.stringify(event.payload),
          `fulfillment:${event.payload.orderId}:${tenantId}`,
          now,
          now,
        ),
      );
      if (statements.length) await this.env.HARIYO_DB.batch(statements);
      return { events: statements.length };
    });

    await step.do('publish-tenant-realtime', async () => {
      const results = [];
      for (const tenantId of event.payload.tenantIds) {
        results.push(
          await this.env.TENANT_REALTIME.getByName(tenantId).publish({
            type: 'order.created',
            ...event.payload,
          }),
        );
      }
      return results;
    });

    return { ok: true, orderId: event.payload.orderId };
  }
}

function advanceSubscriptionDate(value: string, cadence: 'weekly' | 'biweekly' | 'monthly') {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (cadence === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  else if (cadence === 'biweekly') date.setUTCDate(date.getUTCDate() + 14);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export class SubscriptionGenerationWorkflow extends WorkflowEntrypoint<Env, Record<string, never>> {
  async run(_event: WorkflowEvent<Record<string, never>>, step: WorkflowStep) {
    const due = await step.do('load-due-subscriptions', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = await this.env.HARIYO_DB.prepare(
        `SELECT id,tenant_id,customer_id,buyer_user_id,name,cadence,next_delivery_date,preferences_json,delivery_address_json
         FROM produce_subscriptions
         WHERE status='active' AND next_delivery_date IS NOT NULL AND next_delivery_date<=?
         ORDER BY next_delivery_date LIMIT 500`,
      )
        .bind(today)
        .all<Record<string, unknown>>();
      return result.results || [];
    });

    const generated = await step.do('generate-subscription-sales-orders', async () => {
      let count = 0;
      for (const subscription of due) {
        const subscriptionId = String(subscription.id);
        const tenantId = String(subscription.tenant_id);
        const deliveryDate = String(subscription.next_delivery_date);
        const cadence = String(subscription.cadence) as 'weekly' | 'biweekly' | 'monthly';
        const existing = await this.env.HARIYO_DB.prepare(
          'SELECT sales_order_id FROM subscription_runs WHERE subscription_id=? AND delivery_date=?',
        )
          .bind(subscriptionId, deliveryDate)
          .first<{ sales_order_id: string | null }>();
        if (existing) continue;

        const itemResult = await this.env.HARIYO_DB.prepare(
          `SELECT i.id,i.product_id,i.variant_id,i.quantity,i.unit,p.price,p.name
           FROM produce_subscription_items i JOIN products p ON p.id=i.product_id
           WHERE i.subscription_id=? AND i.tenant_id=? AND p.tenant_id=? AND p.status!='archived'`,
        )
          .bind(subscriptionId, tenantId, tenantId)
          .all<{ product_id: string; variant_id: string | null; quantity: number; unit: string; price: number; name: string }>();
        const items = itemResult.results || [];
        if (!items.length) {
          await this.env.HARIYO_DB.prepare(
            `INSERT OR IGNORE INTO subscription_runs (id,tenant_id,subscription_id,delivery_date,status) VALUES (?,?,?,?,'skipped')`,
          ).bind(crypto.randomUUID(), tenantId, subscriptionId, deliveryDate).run();
          continue;
        }

        const sequence = await this.env.TENANT_SEQUENCE.getByName(tenantId).next({
          key: 'subscription_sales_order',
          prefix: 'SUB',
        });
        const salesOrderId = crypto.randomUUID();
        const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
        const now = new Date().toISOString();
        const statements = [
          this.env.HARIYO_DB.prepare(
            `INSERT INTO sales_orders
             (id,tenant_id,sales_order_number,customer_id,status,order_date,requested_delivery_date,subtotal_npr,total_npr,notes,created_at,updated_at)
             VALUES (?,?,?,?,'confirmed',?,?,?,?,?,?,?)`,
          ).bind(
            salesOrderId,
            tenantId,
            sequence.formatted,
            subscription.customer_id ? String(subscription.customer_id) : null,
            now.slice(0, 10),
            deliveryDate,
            subtotal,
            subtotal,
            `Generated from produce subscription ${subscriptionId}`,
            now,
            now,
          ),
          ...items.map((item) =>
            this.env.HARIYO_DB.prepare(
              `INSERT INTO sales_order_items
               (id,sales_order_id,tenant_id,product_id,variant_id,ordered_quantity,unit,unit_price,line_total)
               VALUES (?,?,?,?,?,?,?,?,?)`,
            ).bind(
              crypto.randomUUID(), salesOrderId, tenantId, item.product_id, item.variant_id || null,
              Number(item.quantity), item.unit, Number(item.price), Number(item.quantity) * Number(item.price),
            ),
          ),
          this.env.HARIYO_DB.prepare(
            `INSERT INTO subscription_runs (id,tenant_id,subscription_id,delivery_date,sales_order_id,status) VALUES (?,?,?,?,?,'generated')`,
          ).bind(crypto.randomUUID(), tenantId, subscriptionId, deliveryDate, salesOrderId),
          this.env.HARIYO_DB.prepare(
            'UPDATE produce_subscriptions SET next_delivery_date=?,updated_at=? WHERE id=? AND tenant_id=?',
          ).bind(advanceSubscriptionDate(deliveryDate, cadence), now, subscriptionId, tenantId),
          this.env.HARIYO_DB.prepare(
            `INSERT OR IGNORE INTO integration_outbox
             (id,tenant_id,topic,aggregate_type,aggregate_id,payload_json,status,idempotency_key,available_at,created_at)
             VALUES (?,?,?,?,?,?,'pending',?,?,?)`,
          ).bind(
            crypto.randomUUID(), tenantId, 'subscription.sales_order.generated', 'sales_order', salesOrderId,
            JSON.stringify({ subscriptionId, salesOrderId, salesOrderNumber: sequence.formatted, deliveryDate, total: subtotal }),
            `subscription:${subscriptionId}:${deliveryDate}`, now, now,
          ),
        ];
        await this.env.HARIYO_DB.batch(statements);
        await this.env.TENANT_REALTIME.getByName(tenantId).publish({
          type: 'subscription.sales_order.generated',
          subscriptionId,
          salesOrderId,
          salesOrderNumber: sequence.formatted,
          deliveryDate,
          total: subtotal,
        });
        count += 1;
      }
      return count;
    });
    return { ok: true, due: due.length, generated };
  }
}

async function inventoryRoute(request: Request, env: Env) {
  const parsed = inventoryInput.safeParse(await request.json());
  if (!parsed.success) return reply({ error: 'Invalid inventory operation' }, 400);
  const input = parsed.data;
  const stub = env.INVENTORY_COORDINATOR.getByName(input.productId);
  try {
    if (input.action === 'reserve') return reply(await stub.reserve(input));
    if (input.action === 'commit') return reply(await stub.commit(input));
    if (input.action === 'release') return reply(await stub.release(input));
    if (input.action === 'restore') return reply(await stub.restore(input));
    if (input.action === 'set') return reply(await stub.setStock(input));
    return reply(await stub.adjust(input));
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Inventory operation failed' }, 409);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return reply({
        ok: true,
        stack: 'cloudflare-native',
        capabilities: ['checkout-coordination','inventory-coordination','tenant-sequences','realtime-websockets','queues','workflows','analytics-engine'],
      });
    }
    if (url.pathname === '/realtime/connect' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const tenantId = url.searchParams.get('tenantId');
      if (!tenantId) return reply({ error: 'tenantId is required' }, 400);
      return env.TENANT_REALTIME.getByName(tenantId).fetch(request);
    }
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

    if (url.pathname === '/checkout') {
      const parsed = checkoutPayloadInput.safeParse(await request.clone().json());
      if (!parsed.success) return reply({ error: 'Invalid checkout payload' }, 400);
      const checkoutKey = request.headers.get('x-checkout-coordination-key');
      if (!checkoutKey || !/^[a-f0-9]{64}$/.test(checkoutKey))
        return reply({ error: 'Missing checkout coordination key' }, 400);
      return env.CHECKOUT_COORDINATOR.getByName(checkoutKey).fetch(request);
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

    if (url.pathname === '/inventory') return inventoryRoute(request, env);

    if (url.pathname === '/sequence') {
      const parsed = sequenceInput.safeParse(await request.json());
      if (!parsed.success) return reply({ error: 'Invalid sequence request' }, 400);
      return reply(
        env.TENANT_SEQUENCE.getByName(parsed.data.tenantId).next({
          key: parsed.data.key,
          prefix: parsed.data.prefix,
        }),
      );
    }

    if (url.pathname === '/realtime/publish') {
      const parsed = realtimePublishInput.safeParse(await request.json());
      if (!parsed.success) return reply({ error: 'Invalid realtime event' }, 400);
      return reply(await env.TENANT_REALTIME.getByName(parsed.data.tenantId).publish(parsed.data.event));
    }

    if (url.pathname === '/workflow/order') {
      const parsed = z
        .object({
          orderId: z.string().min(1),
          orderNumber: z.string().min(1),
          tenantIds: z.array(z.string().min(1)).min(1),
          total: z.number().nonnegative(),
        })
        .safeParse(await request.json());
      if (!parsed.success) return reply({ error: 'Invalid order workflow payload' }, 400);
      const instance = await env.ORDER_FULFILLMENT_WORKFLOW.create({
        id: `order-${parsed.data.orderId}`,
        params: parsed.data,
      });
      return reply({ instanceId: instance.id, status: await instance.status() }, 202);
    }

    return reply({ error: 'Route not found' }, 404);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const pending = await env.HARIYO_DB.prepare(
        `SELECT id,tenant_id,topic,aggregate_type,aggregate_id,payload_json,idempotency_key,attempt_count
         FROM integration_outbox
         WHERE status IN ('pending','failed') AND available_at<=datetime('now') AND attempt_count<10
         ORDER BY created_at LIMIT 100`,
      ).all<Record<string, unknown>>();
      for (const row of pending.results || []) {
        const id = String(row.id);
        try {
          await env.HARIYO_DB.prepare(
            "UPDATE integration_outbox SET status='processing',attempt_count=attempt_count+1,last_error=NULL WHERE id=?",
          ).bind(id).run();
          const payload = (() => {
            try { return JSON.parse(String(row.payload_json || '{}')) as Record<string, unknown>; }
            catch { return {}; }
          })();
          await env.HARIYO_EVENTS.send({
            type: String(row.topic),
            outboxId: id,
            tenantId: row.tenant_id || undefined,
            entityType: row.aggregate_type || undefined,
            entityId: row.aggregate_id || undefined,
            idempotencyKey: row.idempotency_key || undefined,
            ...payload,
            at: new Date().toISOString(),
          });
          await env.HARIYO_DB.prepare(
            "UPDATE integration_outbox SET status='delivered',delivered_at=?,last_error=NULL WHERE id=?",
          ).bind(new Date().toISOString(), id).run();
        } catch (error) {
          await env.HARIYO_DB.prepare(
            `UPDATE integration_outbox SET status=CASE WHEN attempt_count>=10 THEN 'dead_letter' ELSE 'failed' END,
             last_error=?,available_at=datetime('now','+5 minutes') WHERE id=?`,
          ).bind(error instanceof Error ? error.message.slice(0, 1000) : 'Unknown outbox error', id).run();
        }
      }
    })());
  },

  async queue(batch: MessageBatch<unknown>, env: Env) {
    for (const message of batch.messages) {
      const event = (message.body || {}) as Record<string, unknown>;
      try {
        const now = typeof event.at === 'string' ? event.at : new Date().toISOString();
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
            now,
          )
          .run();

        if (event.type === 'order.created' && typeof event.orderId === 'string') {
          const tenantIds = Array.isArray(event.tenantIds)
            ? event.tenantIds.filter((value): value is string => typeof value === 'string')
            : [];
          try {
            await env.ORDER_FULFILLMENT_WORKFLOW.create({
              id: `order-${event.orderId}`,
              params: {
                orderId: event.orderId,
                orderNumber: String(event.orderNumber || event.orderId),
                tenantIds,
                total: Number(event.total || 0),
              },
            });
          } catch (error) {
            if (!(error instanceof Error) || !/already|exists|used/i.test(error.message)) throw error;
          }
        }

        if (event.type === 'order.cancelled.inventory_restore' && typeof event.orderId === 'string') {
          const items = Array.isArray(event.items) ? event.items : [];
          for (const value of items) {
            if (!value || typeof value !== 'object') continue;
            const item = value as Record<string, unknown>;
            const productId = typeof item.product_id === 'string' ? item.product_id : '';
            const quantity = Number(item.quantity || 0);
            if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
            await env.INVENTORY_COORDINATOR.getByName(productId).adjust({
              productId,
              quantityChange: quantity,
              actorId: typeof event.actorId === 'string' ? event.actorId : undefined,
              eventType: 'return',
              reason: `Order ${String(event.orderNumber || event.orderId)} cancelled`,
              operationId: `cancel:${event.orderId}:${productId}`,
            });
          }
        }

        env.HARIYO_ANALYTICS.writeDataPoint({
          indexes: [typeof event.tenantId === 'string' ? event.tenantId : 'platform'],
          blobs: [String(event.type || 'platform.event'), String(event.entityType || 'event')],
          doubles: [Number(event.total || 0)],
        });
        message.ack();
      } catch {
        message.retry({ delaySeconds: 30 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
