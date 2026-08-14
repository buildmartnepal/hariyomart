import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiJson,
  audit,
  cloudflareEnv,
  CloudflareApiError,
  parseJson,
  requestBody,
  requireAuth,
  requireTenantAccess,
  type TenantMemberRole,
} from './platform';

const managerRoles: TenantMemberRole[] = ['owner', 'admin', 'manager'];
const salesRoles: TenantMemberRole[] = [...managerRoles, 'sales', 'accounting'];
const inventoryRoles: TenantMemberRole[] = [...managerRoles, 'inventory', 'procurement'];

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new CloudflareApiError(400, 'Invalid commerce operation', result.error.flatten());
  return result.data;
}

type CartProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  province: string;
  district: string;
  unit: string;
  price: number;
  old_price: number | null;
  stock: number;
  minimum_order: number;
  organic: number;
  featured: number;
  short_description: string | null;
  description: string | null;
  benefits: string | null;
  image_key: string | null;
  image_url: string | null;
  rating: number;
};

function cartProduct(row: CartProductRow) {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    province: row.province,
    provinceName: row.province,
    district: row.district,
    emoji: '🌿',
    unit: row.unit,
    price: Number(row.price || 0),
    oldPrice: Number(row.old_price || row.price || 0),
    rating: Number(row.rating || 0),
    stock: Number(row.stock || 0),
    organic: Boolean(row.organic),
    featured: Boolean(row.featured),
    shortDescription: row.short_description || '',
    description: row.description || '',
    benefits: parseJson<string[]>(row.benefits, []),
    image: row.image_key
      ? `/api/media/${row.image_key}`
      : row.image_url || '/products/vegetables.svg',
    minimumOrder: Number(row.minimum_order || 1),
  };
}

const cartInput = z.object({
  lines: z
    .array(
      z.object({
        productSlug: z.string().min(2).max(120),
        quantity: z.coerce.number().positive().max(1_000_000),
      }),
    )
    .max(60),
});

export async function cartApi(req: NextRequest) {
  const user = await requireAuth(req);
  const env = cloudflareEnv();
  let cart = await env.HARIYO_DB.prepare('SELECT id FROM shopping_carts WHERE user_id=?')
    .bind(user.id)
    .first<{ id: string }>();

  if (req.method === 'GET') {
    if (!cart) return apiJson({ lines: [], synced: true });
    const result = await env.HARIYO_DB.prepare(
      `SELECT p.id,p.slug,p.name,p.category,p.province,p.district,p.unit,p.price,p.old_price,p.stock,
              p.minimum_order,p.organic,p.featured,p.short_description,p.description,p.benefits,
              p.image_key,p.image_url,p.rating,ci.quantity
       FROM shopping_cart_items ci
       JOIN products p ON p.id=ci.product_id
       JOIN tenants t ON t.id=p.tenant_id
       WHERE ci.cart_id=? AND p.status='active' AND t.status='verified'
       ORDER BY ci.updated_at DESC`,
    )
      .bind(cart.id)
      .all<CartProductRow & { quantity: number }>();
    return apiJson({
      lines: (result.results || []).map((row) => ({
        product: cartProduct(row),
        quantity: Math.min(Number(row.quantity), Number(row.stock)),
      })),
      synced: true,
    });
  }

  if (req.method !== 'PUT') throw new CloudflareApiError(405, 'Method not allowed');
  const input = parse(cartInput, await requestBody(req));
  const unique = new Map<string, number>();
  for (const line of input.lines) unique.set(line.productSlug, line.quantity);
  const slugs = [...unique.keys()];

  if (!cart) {
    cart = { id: crypto.randomUUID() };
    await env.HARIYO_DB.prepare(
      'INSERT INTO shopping_carts (id,user_id,updated_at) VALUES (?,?,?)',
    )
      .bind(cart.id, user.id, new Date().toISOString())
      .run();
  }

  if (!slugs.length) {
    await env.HARIYO_DB.batch([
      env.HARIYO_DB.prepare('DELETE FROM shopping_cart_items WHERE cart_id=?').bind(cart.id),
      env.HARIYO_DB.prepare('UPDATE shopping_carts SET updated_at=? WHERE id=?').bind(
        new Date().toISOString(),
        cart.id,
      ),
    ]);
    return apiJson({ ok: true, lines: 0 });
  }

  const placeholders = slugs.map(() => '?').join(',');
  const products = await env.HARIYO_DB.prepare(
    `SELECT p.id,p.slug,p.stock,p.minimum_order FROM products p
     JOIN tenants t ON t.id=p.tenant_id
     WHERE p.status='active' AND t.status='verified' AND p.slug IN (${placeholders})`,
  )
    .bind(...slugs)
    .all<{ id: string; slug: string; stock: number; minimum_order: number }>();
  const bySlug = new Map((products.results || []).map((row) => [row.slug, row]));
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    env.HARIYO_DB.prepare('DELETE FROM shopping_cart_items WHERE cart_id=?').bind(cart.id),
  ];
  for (const [slug, requested] of unique) {
    const product = bySlug.get(slug);
    if (!product) continue;
    const minimum = Math.max(0.01, Number(product.minimum_order || 1));
    if (Number(product.stock) < minimum) continue;
    const quantity = Math.min(Number(product.stock), Math.max(minimum, requested));
    statements.push(
      env.HARIYO_DB.prepare(
        `INSERT INTO shopping_cart_items (id,cart_id,product_id,quantity,added_at,updated_at)
         VALUES (?,?,?,?,?,?)`,
      ).bind(crypto.randomUUID(), cart.id, product.id, quantity, now, now),
    );
  }
  statements.push(
    env.HARIYO_DB.prepare('UPDATE shopping_carts SET updated_at=? WHERE id=?').bind(now, cart.id),
  );
  await env.HARIYO_DB.batch(statements);
  await audit(req, user, 'commerce.cart_synced', 'shopping_cart', cart.id, {
    requestedLines: input.lines.length,
    acceptedLines: statements.length - 2,
  });
  return apiJson({ ok: true, lines: statements.length - 2 });
}

const couponValidationInput = z.object({
  code: z.string().trim().min(2).max(60),
  subtotal: z.coerce.number().nonnegative().max(100_000_000),
  tenantId: z.string().min(1).max(120).optional(),
});

export async function validateCouponApi(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req).catch(() => null);
  const input = parse(couponValidationInput, await requestBody(req));
  const coupon = await env.HARIYO_DB.prepare(
    `SELECT * FROM coupon_codes
     WHERE code=? COLLATE NOCASE AND active=1
       AND (starts_at IS NULL OR starts_at<=datetime('now'))
       AND (ends_at IS NULL OR ends_at>=datetime('now'))`,
  )
    .bind(input.code)
    .first<Record<string, unknown>>();
  if (!coupon) throw new CloudflareApiError(404, 'Coupon is not active');
  if (coupon.tenant_id && coupon.tenant_id !== input.tenantId)
    throw new CloudflareApiError(400, 'Coupon does not apply to this seller');
  if (input.subtotal < Number(coupon.minimum_subtotal || 0))
    throw new CloudflareApiError(
      400,
      `Minimum subtotal is NPR ${Number(coupon.minimum_subtotal || 0).toLocaleString()}`,
    );
  if (coupon.max_redemptions) {
    const used = await env.HARIYO_DB.prepare(
      'SELECT COUNT(*) count FROM coupon_redemptions WHERE coupon_id=?',
    )
      .bind(coupon.id)
      .first<{ count: number }>();
    if (Number(used?.count || 0) >= Number(coupon.max_redemptions))
      throw new CloudflareApiError(409, 'Coupon redemption limit has been reached');
  }
  if (user && Number(coupon.max_redemptions_per_user || 0) > 0) {
    const used = await env.HARIYO_DB.prepare(
      'SELECT COUNT(*) count FROM coupon_redemptions WHERE coupon_id=? AND user_id=?',
    )
      .bind(coupon.id, user.id)
      .first<{ count: number }>();
    if (Number(used?.count || 0) >= Number(coupon.max_redemptions_per_user))
      throw new CloudflareApiError(409, 'You have already used this coupon');
  }
  const raw =
    coupon.discount_type === 'percent'
      ? (input.subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);
  const capped = coupon.maximum_discount
    ? Math.min(raw, Number(coupon.maximum_discount))
    : raw;
  const discountNpr = Math.max(0, Math.min(input.subtotal, Math.round(capped * 100) / 100));
  return apiJson({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    name: coupon.name,
    discountNpr,
    discountedSubtotal: Math.max(0, Math.round((input.subtotal - discountNpr) * 100) / 100),
  });
}

export async function deliverySlotsApi(req: NextRequest) {
  const env = cloudflareEnv();
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  const from = req.nextUrl.searchParams.get('from') || new Date().toISOString().slice(0, 10);
  const bindings: unknown[] = [from];
  let tenantClause = 'AND tenant_id IS NULL';
  if (tenantId) {
    tenantClause = 'AND (tenant_id=? OR tenant_id IS NULL)';
    bindings.push(tenantId);
  }
  const result = await env.HARIYO_DB.prepare(
    `SELECT id,tenant_id,zone_name,slot_date,starts_at,ends_at,capacity_orders,reserved_orders,cutoff_at,fee_override_npr
     FROM delivery_slots
     WHERE active=1 AND slot_date>=? ${tenantClause}
       AND reserved_orders<capacity_orders
       AND (cutoff_at IS NULL OR cutoff_at>datetime('now'))
     ORDER BY slot_date,starts_at LIMIT 100`,
  )
    .bind(...bindings)
    .all();
  return apiJson({ data: result.results || [] });
}

const returnInput = z.object({
  orderId: z.string().min(1).max(120),
  tenantId: z.string().min(1).max(120).optional(),
  reason: z.string().min(3).max(200),
  note: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1).max(120),
        quantity: z.coerce.number().positive(),
        condition: z.enum([
          'unknown',
          'unopened',
          'damaged',
          'spoiled',
          'wrong_item',
          'quality_issue',
        ]),
      }),
    )
    .min(1)
    .max(100),
});

function rmaNumber() {
  return `RMA-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID()
    .replaceAll('-', '')
    .slice(0, 7)
    .toUpperCase()}`;
}

export async function returnsApi(req: NextRequest) {
  const user = await requireAuth(req);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      `SELECT r.*,o.order_number FROM return_requests r
       JOIN orders o ON o.id=r.order_id
       WHERE r.buyer_id=? ORDER BY r.requested_at DESC LIMIT 200`,
    )
      .bind(user.id)
      .all();
    return apiJson({ data: result.results || [] });
  }
  const input = parse(returnInput, await requestBody(req));
  const order = await env.HARIYO_DB.prepare(
    'SELECT id,order_number,buyer_id,status,created_at FROM orders WHERE id=?',
  )
    .bind(input.orderId)
    .first<{ id: string; order_number: string; buyer_id: string | null; status: string; created_at: string }>();
  if (!order || (order.buyer_id !== user.id && user.role !== 'admin'))
    throw new CloudflareApiError(404, 'Order not found');
  if (!['delivered', 'partially_fulfilled', 'confirmed'].includes(order.status))
    throw new CloudflareApiError(409, 'This order is not eligible for a return request yet');

  const itemIds = [...new Set(input.items.map((item) => item.orderItemId))];
  const placeholders = itemIds.map(() => '?').join(',');
  const purchased = await env.HARIYO_DB.prepare(
    `SELECT id,tenant_id,quantity FROM order_items WHERE order_id=? AND id IN (${placeholders})`,
  )
    .bind(order.id, ...itemIds)
    .all<{ id: string; tenant_id: string; quantity: number }>();
  const purchasedMap = new Map((purchased.results || []).map((item) => [item.id, item]));
  if (purchasedMap.size !== itemIds.length)
    throw new CloudflareApiError(400, 'Return contains an item that is not part of this order');
  for (const item of input.items) {
    const original = purchasedMap.get(item.orderItemId)!;
    if (item.quantity > Number(original.quantity))
      throw new CloudflareApiError(400, 'Return quantity exceeds the purchased quantity');
    if (input.tenantId && original.tenant_id !== input.tenantId)
      throw new CloudflareApiError(400, 'Return items must belong to the selected seller');
  }
  const tenantIds = [...new Set((purchased.results || []).map((item) => item.tenant_id))];
  if (tenantIds.length !== 1 && !input.tenantId)
    throw new CloudflareApiError(400, 'Create one return request per seller fulfillment');
  const tenantId = input.tenantId || tenantIds[0];
  const id = crypto.randomUUID();
  const rma = rmaNumber();
  const statements: D1PreparedStatement[] = [
    env.HARIYO_DB.prepare(
      `INSERT INTO return_requests (id,rma_number,order_id,buyer_id,tenant_id,reason,note,status,requested_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'requested',?,?)`,
    ).bind(
      id,
      rma,
      order.id,
      user.id,
      tenantId,
      input.reason,
      input.note || null,
      new Date().toISOString(),
      new Date().toISOString(),
    ),
    ...input.items.map((item) =>
      env.HARIYO_DB.prepare(
        `INSERT INTO return_items (id,return_id,order_item_id,quantity,condition)
         VALUES (?,?,?,?,?)`,
      ).bind(crypto.randomUUID(), id, item.orderItemId, item.quantity, item.condition),
    ),
  ];
  await env.HARIYO_DB.batch(statements);
  await audit(req, user, 'commerce.return_requested', 'return_request', id, { rma, tenantId });
  return apiJson({ id, rmaNumber: rma, status: 'requested' }, 201);
}

export async function tenantReturnsApi(req: NextRequest) {
  const access = await requireTenantAccess(req, salesRoles);
  const env = cloudflareEnv();
  const result = await env.HARIYO_DB.prepare(
    `SELECT r.*,o.order_number,u.name buyer_name,u.phone buyer_phone,
      (SELECT COUNT(*) FROM return_items i WHERE i.return_id=r.id) item_count
     FROM return_requests r
     JOIN orders o ON o.id=r.order_id
     LEFT JOIN users u ON u.id=r.buyer_id
     WHERE r.tenant_id=? ORDER BY r.requested_at DESC LIMIT 500`,
  )
    .bind(access.tenantId)
    .all();
  return apiJson({ data: result.results || [] });
}

const returnStatusInput = z.object({
  status: z.enum(['approved', 'rejected', 'received', 'refunded', 'replaced', 'closed']),
  resolution: z.enum(['refund', 'replacement', 'credit', 'reject']).optional(),
});

export async function updateReturnApi(req: NextRequest, returnId: string) {
  const access = await requireTenantAccess(req, salesRoles);
  const env = cloudflareEnv();
  const input = parse(returnStatusInput, await requestBody(req));
  const row = await env.HARIYO_DB.prepare(
    'SELECT id FROM return_requests WHERE id=? AND tenant_id=?',
  )
    .bind(returnId, access.tenantId)
    .first();
  if (!row) throw new CloudflareApiError(404, 'Return request not found in this tenant');
  const now = new Date().toISOString();
  const closed = ['refunded', 'replaced', 'closed', 'rejected'].includes(input.status) ? now : null;
  await env.HARIYO_DB.prepare(
    `UPDATE return_requests SET status=?,resolution=COALESCE(?,resolution),reviewed_at=COALESCE(reviewed_at,?),
       closed_at=COALESCE(?,closed_at),updated_at=? WHERE id=? AND tenant_id=?`,
  )
    .bind(input.status, input.resolution || null, now, closed, now, returnId, access.tenantId)
    .run();
  await audit(req, access.user, 'commerce.return_status_changed', 'return_request', returnId, input);
  return apiJson({ ok: true, status: input.status });
}

const alertRuleInput = z.object({
  productId: z.string().min(1).max(120).optional(),
  ruleType: z.enum(['low_stock', 'out_of_stock', 'expiry', 'overstock']),
  thresholdValue: z.coerce.number().nonnegative().optional(),
  thresholdDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export async function inventoryAlertRulesApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? inventoryRoles : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      `SELECT r.*,p.name product_name,p.slug product_slug FROM inventory_alert_rules r
       LEFT JOIN products p ON p.id=r.product_id
       WHERE r.tenant_id=? ORDER BY r.active DESC,r.rule_type,p.name LIMIT 500`,
    )
      .bind(access.tenantId)
      .all();
    return apiJson({ data: result.results || [] });
  }
  const input = parse(alertRuleInput, await requestBody(req));
  if (input.productId) {
    const product = await env.HARIYO_DB.prepare('SELECT id FROM products WHERE id=? AND tenant_id=?')
      .bind(input.productId, access.tenantId)
      .first();
    if (!product) throw new CloudflareApiError(404, 'Product not found in tenant');
  }
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(
    `INSERT INTO inventory_alert_rules
      (id,tenant_id,product_id,rule_type,threshold_value,threshold_days,created_by)
     VALUES (?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      access.tenantId,
      input.productId || null,
      input.ruleType,
      input.thresholdValue ?? null,
      input.thresholdDays ?? null,
      access.user.id,
    )
    .run();
  await audit(req, access.user, 'commerce.inventory_alert_created', 'inventory_alert_rule', id);
  return apiJson({ id }, 201);
}

export async function commerceSummaryApi(req: NextRequest) {
  const access = await requireTenantAccess(req);
  const env = cloudflareEnv();
  const [orders, returns, coupons, lowStock, expiringLots] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(
      `SELECT COUNT(DISTINCT o.id) orders,COALESCE(SUM(oi.line_total),0) gross
       FROM order_items oi JOIN orders o ON o.id=oi.order_id
       WHERE oi.tenant_id=? AND o.created_at>=datetime('now','-30 days') AND o.status!='cancelled'`,
    ).bind(access.tenantId),
    env.HARIYO_DB.prepare(
      `SELECT COUNT(*) count FROM return_requests WHERE tenant_id=? AND status NOT IN ('rejected','refunded','replaced','closed')`,
    ).bind(access.tenantId),
    env.HARIYO_DB.prepare(
      `SELECT COUNT(*) count FROM coupon_codes WHERE (tenant_id=? OR tenant_id IS NULL) AND active=1`,
    ).bind(access.tenantId),
    env.HARIYO_DB.prepare(
      `SELECT COUNT(*) count FROM products WHERE tenant_id=? AND status='active' AND stock<=10`,
    ).bind(access.tenantId),
    env.HARIYO_DB.prepare(
      `SELECT COUNT(*) count FROM produce_lots WHERE tenant_id=? AND status='available'
       AND best_before_date IS NOT NULL AND date(best_before_date)<=date('now','+3 days')`,
    ).bind(access.tenantId),
  ]);
  const first = (result: { results?: unknown[] }) =>
    (result.results?.[0] || {}) as Record<string, unknown>;
  return apiJson({
    tenantId: access.tenantId,
    last30Days: {
      orders: Number(first(orders).orders || 0),
      grossNpr: Number(first(orders).gross || 0),
    },
    openReturns: Number(first(returns).count || 0),
    activeCoupons: Number(first(coupons).count || 0),
    lowStockProducts: Number(first(lowStock).count || 0),
    expiringLots: Number(first(expiringLots).count || 0),
  });
}
