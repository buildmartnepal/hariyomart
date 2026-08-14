type CheckoutProduct = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  unit: string;
  price: number;
  stock: number;
  minimum_order: number;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  commission_rate: number;
};

type CouponRow = {
  id: string;
  tenant_id: string | null;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  minimum_subtotal: number;
  maximum_discount: number | null;
  max_redemptions: number | null;
  max_redemptions_per_user: number;
};

type DeliverySlotRow = {
  id: string;
  tenant_id: string | null;
  fee_override_npr: number | null;
};

export type CheckoutPayload = {
  lines: Array<{ productSlug: string; quantity: number }>;
  paymentMethod: 'cod' | 'esewa' | 'khalti' | 'fonepay' | 'card';
  deliveryAddress: {
    province: string;
    district: string;
    municipality: string;
    ward: string;
    street: string;
    phone: string;
    lat?: number;
    lng?: number;
  };
  guestCustomer?: { name: string; phone: string; email?: string };
  buyerId?: string;
  couponCode?: string;
  deliverySlotId?: string;
  idempotencyKey: string;
};

type InventoryReservationInput = {
  productId: string;
  reservationId: string;
  quantity: number;
  tenantId?: string;
  ttlSeconds?: number;
};
type InventoryCoordinatorStub = {
  reserve(input: InventoryReservationInput): Promise<unknown>;
  commit(input: {
    productId: string;
    reservationId: string;
    actorId?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<unknown>;
  release(input: { reservationId: string }): Promise<unknown>;
  restore(input: {
    productId: string;
    reservationId: string;
    actorId?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<unknown>;
};
type InventoryCoordinatorNamespace = { getByName(name: string): InventoryCoordinatorStub };
type CheckoutEnv = {
  HARIYO_DB: D1Database;
  HARIYO_EVENTS?: Queue;
  INVENTORY_COORDINATOR?: InventoryCoordinatorNamespace;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const changes = (result: D1Result) => Number((result.meta as { changes?: number } | undefined)?.changes || 0);

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deliveryFeeFor(distance: number | null, subtotal: number) {
  if (distance == null) return subtotal >= 2500 ? 0 : 150;
  if (distance > 300) return null;
  if (subtotal >= 3000 && distance <= 35) return 0;
  if (distance <= 15) return 90;
  if (distance <= 35) return 150;
  if (distance <= 80) return 250;
  return 450;
}

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `HMN-${date}-${suffix}`;
}

async function existingOrder(db: D1Database, key: string) {
  return db
    .prepare(
      `SELECT order_number AS orderNumber,total,subtotal,delivery_fee AS deliveryFee,
              COALESCE(discount_npr,0) AS discountNpr
       FROM orders WHERE idempotency_key=?`,
    )
    .bind(key)
    .first<{
      orderNumber: string;
      total: number;
      subtotal: number;
      deliveryFee: number;
      discountNpr: number;
    }>();
}

async function reserveCoupon(
  db: D1Database,
  code: string | undefined,
  buyerId: string | undefined,
  grouped: Map<string, Array<{ product: CheckoutProduct; quantity: number }>>,
  sellerSubtotals: Map<string, number>,
  subtotal: number,
) {
  if (!code?.trim()) return null;
  const coupon = await db
    .prepare(
      `SELECT id,tenant_id,code,discount_type,discount_value,minimum_subtotal,maximum_discount,
              max_redemptions,max_redemptions_per_user
       FROM coupon_codes
       WHERE code=? COLLATE NOCASE AND active=1
         AND (starts_at IS NULL OR starts_at<=datetime('now'))
         AND (ends_at IS NULL OR ends_at>=datetime('now'))`,
    )
    .bind(code.trim())
    .first<CouponRow>();
  if (!coupon) throw new Error('Coupon is not active');
  if (coupon.tenant_id && (!grouped.has(coupon.tenant_id) || grouped.size !== 1))
    throw new Error('This seller coupon can only be used on an order from that seller');
  const eligibleSubtotal = coupon.tenant_id
    ? Number(sellerSubtotals.get(coupon.tenant_id) || 0)
    : subtotal;
  if (eligibleSubtotal < Number(coupon.minimum_subtotal || 0))
    throw new Error(`Coupon requires a minimum subtotal of NPR ${coupon.minimum_subtotal || 0}`);

  const globalReservation = await db
    .prepare(
      `UPDATE coupon_codes
       SET redemption_count=redemption_count+1,updated_at=datetime('now')
       WHERE id=? AND active=1
         AND (max_redemptions IS NULL OR redemption_count<max_redemptions)`,
    )
    .bind(coupon.id)
    .run();
  if (!changes(globalReservation)) throw new Error('Coupon redemption limit has been reached');

  let userReserved = false;
  const perUser = Number(coupon.max_redemptions_per_user || 0);
  if (buyerId && perUser > 0) {
    const userReservation = await db
      .prepare(
        `INSERT INTO coupon_user_counters (coupon_id,user_id,redemption_count,updated_at)
         VALUES (?,?,1,datetime('now'))
         ON CONFLICT(coupon_id,user_id) DO UPDATE SET
           redemption_count=coupon_user_counters.redemption_count+1,
           updated_at=datetime('now')
         WHERE coupon_user_counters.redemption_count<?`,
      )
      .bind(coupon.id, buyerId, perUser)
      .run();
    if (!changes(userReservation)) {
      await db
        .prepare(
          'UPDATE coupon_codes SET redemption_count=MAX(redemption_count-1,0) WHERE id=?',
        )
        .bind(coupon.id)
        .run();
      throw new Error('You have already reached the usage limit for this coupon');
    }
    userReserved = true;
  }

  const raw =
    coupon.discount_type === 'percent'
      ? (eligibleSubtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);
  const capped = coupon.maximum_discount
    ? Math.min(raw, Number(coupon.maximum_discount))
    : raw;
  return {
    coupon,
    userReserved,
    discountNpr: money(Math.max(0, Math.min(eligibleSubtotal, capped))),
  };
}

async function releaseCoupon(
  db: D1Database,
  reservation: Awaited<ReturnType<typeof reserveCoupon>>,
  buyerId?: string,
) {
  if (!reservation) return;
  const statements = [
    db
      .prepare('UPDATE coupon_codes SET redemption_count=MAX(redemption_count-1,0) WHERE id=?')
      .bind(reservation.coupon.id),
  ];
  if (buyerId && reservation.userReserved) {
    statements.push(
      db
        .prepare(
          `UPDATE coupon_user_counters
           SET redemption_count=MAX(redemption_count-1,0),updated_at=datetime('now')
           WHERE coupon_id=? AND user_id=?`,
        )
        .bind(reservation.coupon.id, buyerId),
    );
  }
  await db.batch(statements);
}

async function reserveDeliverySlot(
  db: D1Database,
  slotId: string | undefined,
  grouped: Map<string, Array<{ product: CheckoutProduct; quantity: number }>>,
) {
  if (!slotId) return null;
  const slot = await db
    .prepare(
      `SELECT id,tenant_id,fee_override_npr FROM delivery_slots
       WHERE id=? AND active=1 AND slot_date>=date('now')
         AND (cutoff_at IS NULL OR cutoff_at>datetime('now'))`,
    )
    .bind(slotId)
    .first<DeliverySlotRow>();
  if (!slot) throw new Error('Delivery slot is no longer available');
  if (slot.tenant_id && (grouped.size !== 1 || !grouped.has(slot.tenant_id)))
    throw new Error('The selected delivery slot does not apply to this seller mix');
  const reservation = await db
    .prepare(
      `UPDATE delivery_slots SET reserved_orders=reserved_orders+1,updated_at=datetime('now')
       WHERE id=? AND active=1 AND reserved_orders<capacity_orders
         AND (cutoff_at IS NULL OR cutoff_at>datetime('now'))`,
    )
    .bind(slot.id)
    .run();
  if (!changes(reservation)) throw new Error('The selected delivery slot has just filled up');
  return slot;
}

async function releaseDeliverySlot(db: D1Database, slot: DeliverySlotRow | null) {
  if (!slot) return;
  await db
    .prepare(
      `UPDATE delivery_slots
       SET reserved_orders=CASE WHEN reserved_orders>0 THEN reserved_orders-1 ELSE 0 END,
           updated_at=datetime('now')
       WHERE id=?`,
    )
    .bind(slot.id)
    .run();
}

export async function checkoutCore(env: CheckoutEnv, payload: CheckoutPayload) {
  const previous = await existingOrder(env.HARIYO_DB, payload.idempotencyKey);
  if (previous) return { ...previous, idempotent: true };

  const slugs = payload.lines.map((line) => line.productSlug);
  const placeholders = slugs.map(() => '?').join(',');
  const products = await env.HARIYO_DB.prepare(
    `SELECT p.id,p.tenant_id,p.name,p.slug,p.unit,p.price,p.stock,p.minimum_order,p.lat,p.lng,p.delivery_radius_km,t.commission_rate
     FROM products p JOIN tenants t ON t.id=p.tenant_id
     WHERE p.status='active' AND t.status='verified' AND p.slug IN (${placeholders})`,
  )
    .bind(...slugs)
    .all<CheckoutProduct>();
  const bySlug = new Map((products.results || []).map((product) => [product.slug, product]));
  if (bySlug.size !== new Set(slugs).size) throw new Error('One or more products are unavailable');

  const grouped = new Map<string, Array<{ product: CheckoutProduct; quantity: number }>>();
  for (const line of payload.lines) {
    const product = bySlug.get(line.productSlug)!;
    if (!Number.isFinite(line.quantity) || line.quantity < Number(product.minimum_order || 1))
      throw new Error(`${product.name} has a minimum order of ${product.minimum_order || 1}`);
    if (line.quantity > product.stock)
      throw new Error(`Only ${product.stock} ${product.unit} of ${product.name} is available`);
    grouped.set(product.tenant_id, [
      ...(grouped.get(product.tenant_id) || []),
      { product, quantity: line.quantity },
    ]);
  }

  const orderId = crypto.randomUUID();
  const coordinatedReservations = payload.lines.map((line) => ({
    product: bySlug.get(line.productSlug)!,
    quantity: line.quantity,
    reservationId: `checkout:${orderId}:${bySlug.get(line.productSlug)!.id}`,
  }));
  const committedReservations: typeof coordinatedReservations = [];
  const number = orderNumber();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const fulfillmentResults: Array<{ id: string; tenantId: string; total: number }> = [];
  const sellerSubtotals = new Map<string, number>();
  let subtotal = 0;
  let deliveryFee = 0;

  for (const [tenantId, lines] of grouped) {
    const fulfillmentId = crypto.randomUUID();
    const sellerSubtotal = money(
      lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0),
    );
    sellerSubtotals.set(tenantId, sellerSubtotal);
    const origin = lines[0].product;
    const distance =
      Number.isFinite(payload.deliveryAddress.lat) && Number.isFinite(payload.deliveryAddress.lng)
        ? money(
            distanceKm(
              Number(origin.lat),
              Number(origin.lng),
              Number(payload.deliveryAddress.lat),
              Number(payload.deliveryAddress.lng),
            ),
          )
        : null;
    if (distance != null && distance > Number(origin.delivery_radius_km || 35))
      throw new Error(`${origin.name}'s seller does not deliver to this location yet`);
    const sellerDelivery = deliveryFeeFor(distance, sellerSubtotal);
    if (sellerDelivery == null) throw new Error('A seller is outside the national delivery limit');
    const commission = money(sellerSubtotal * Number(origin.commission_rate || 0.08));
    const sellerTotal = money(sellerSubtotal + sellerDelivery);
    subtotal += sellerSubtotal;
    deliveryFee += sellerDelivery;
    fulfillmentResults.push({ id: fulfillmentId, tenantId, total: sellerTotal });
    statements.push(
      env.HARIYO_DB.prepare(
        `INSERT INTO fulfillments (id,order_id,tenant_id,status,subtotal,delivery_fee,commission_amount,farmer_net,payout_status,distance_km,timeline,created_at,updated_at)
         VALUES (?,?,?,'pending',?,?,?,?, 'pending',?,?,?,?)`,
      ).bind(
        fulfillmentId,
        orderId,
        tenantId,
        sellerSubtotal,
        sellerDelivery,
        commission,
        money(sellerSubtotal - commission),
        distance,
        JSON.stringify([{ status: 'pending', at: now, note: 'Order received' }]),
        now,
        now,
      ),
    );
    for (const line of lines) {
      const lineTotal = money(Number(line.product.price) * line.quantity);
      statements.push(
        env.HARIYO_DB.prepare(
          `INSERT INTO order_items (id,order_id,fulfillment_id,product_id,tenant_id,product_name,product_slug,unit,unit_price,quantity,line_total)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          crypto.randomUUID(),
          orderId,
          fulfillmentId,
          line.product.id,
          tenantId,
          line.product.name,
          line.product.slug,
          line.product.unit,
          line.product.price,
          line.quantity,
          lineTotal,
        ),
      );
      if (!env.INVENTORY_COORDINATOR) {
        statements.push(
          env.HARIYO_DB.prepare(
            `UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?`,
          ).bind(line.quantity, now, line.product.id, line.quantity),
        );
      }
    }
  }

  subtotal = money(subtotal);
  deliveryFee = money(deliveryFee);
  let couponReservation: Awaited<ReturnType<typeof reserveCoupon>> = null;
  let deliverySlot: DeliverySlotRow | null = null;
  try {
    couponReservation = await reserveCoupon(
      env.HARIYO_DB,
      payload.couponCode,
      payload.buyerId,
      grouped,
      sellerSubtotals,
      subtotal,
    );
    deliverySlot = await reserveDeliverySlot(env.HARIYO_DB, payload.deliverySlotId, grouped);
  } catch (error) {
    await releaseCoupon(env.HARIYO_DB, couponReservation, payload.buyerId).catch(() => undefined);
    throw error;
  }

  if (deliverySlot?.fee_override_npr != null) deliveryFee = money(Number(deliverySlot.fee_override_npr));
  const discountNpr = couponReservation?.discountNpr || 0;
  const total = money(Math.max(0, subtotal + deliveryFee - discountNpr));
  statements.unshift(
    env.HARIYO_DB.prepare(
      `INSERT INTO orders
        (id,order_number,buyer_id,guest_customer,delivery_address,payment_method,payment_status,status,
         subtotal,delivery_fee,discount_npr,total,coupon_id,delivery_slot_id,idempotency_key,created_at,updated_at)
       VALUES (?,?,?,?,?,?,'pending','placed',?,?,?,?,?,?,?,?,?)`,
    ).bind(
      orderId,
      number,
      payload.buyerId || null,
      payload.guestCustomer ? JSON.stringify(payload.guestCustomer) : null,
      JSON.stringify(payload.deliveryAddress),
      payload.paymentMethod,
      subtotal,
      deliveryFee,
      discountNpr,
      total,
      couponReservation?.coupon.id || null,
      deliverySlot?.id || null,
      payload.idempotencyKey,
      now,
      now,
    ),
  );
  if (couponReservation) {
    statements.push(
      env.HARIYO_DB.prepare(
        `INSERT INTO coupon_redemptions (id,coupon_id,user_id,order_id,discount_npr,redeemed_at)
         VALUES (?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(),
        couponReservation.coupon.id,
        payload.buyerId || null,
        orderId,
        discountNpr,
        now,
      ),
    );
  }

  const rollbackInventory = async () => {
    if (!env.INVENTORY_COORDINATOR || !committedReservations.length) return;
    await Promise.allSettled(
      committedReservations.map((reservation) =>
        env.INVENTORY_COORDINATOR!.getByName(reservation.product.id).restore({
          productId: reservation.product.id,
          reservationId: reservation.reservationId,
          referenceType: 'checkout_rollback',
          referenceId: orderId,
        }),
      ),
    );
  };
  const rollbackCommerce = async () => {
    await Promise.allSettled([
      releaseCoupon(env.HARIYO_DB, couponReservation, payload.buyerId),
      releaseDeliverySlot(env.HARIYO_DB, deliverySlot),
    ]);
  };

  if (env.INVENTORY_COORDINATOR) {
    try {
      for (const reservation of coordinatedReservations) {
        await env.INVENTORY_COORDINATOR.getByName(reservation.product.id).reserve({
          productId: reservation.product.id,
          reservationId: reservation.reservationId,
          quantity: reservation.quantity,
          tenantId: reservation.product.tenant_id,
          ttlSeconds: 180,
        });
      }
      for (const reservation of coordinatedReservations) {
        await env.INVENTORY_COORDINATOR.getByName(reservation.product.id).commit({
          productId: reservation.product.id,
          reservationId: reservation.reservationId,
          referenceType: 'order',
          referenceId: orderId,
        });
        committedReservations.push(reservation);
      }
    } catch (error) {
      const committedIds = new Set(committedReservations.map((item) => item.reservationId));
      await Promise.allSettled(
        coordinatedReservations.map((reservation) =>
          committedIds.has(reservation.reservationId)
            ? env.INVENTORY_COORDINATOR!.getByName(reservation.product.id).restore({
                productId: reservation.product.id,
                reservationId: reservation.reservationId,
                referenceType: 'checkout_rollback',
                referenceId: orderId,
              })
            : env.INVENTORY_COORDINATOR!.getByName(reservation.product.id).release({
                reservationId: reservation.reservationId,
              }),
        ),
      );
      await rollbackCommerce();
      throw error;
    }
  }

  try {
    await env.HARIYO_DB.batch(statements);
  } catch (error) {
    await rollbackInventory();
    await rollbackCommerce();
    const raced = await existingOrder(env.HARIYO_DB, payload.idempotencyKey);
    if (raced) return { ...raced, idempotent: true };
    throw error;
  }

  const event = {
    type: 'order.created',
    orderId,
    orderNumber: number,
    tenantIds: [...grouped.keys()],
    total,
    discountNpr,
    deliverySlotId: deliverySlot?.id || null,
    at: now,
  };
  try {
    await env.HARIYO_EVENTS?.send(event);
  } catch (error) {
    await env.HARIYO_DB.prepare(
      `INSERT OR IGNORE INTO integration_outbox
        (id,topic,aggregate_type,aggregate_id,payload_json,status,idempotency_key,last_error,created_at)
       VALUES (?,'order.created','order',?,?,'pending',?,?,?)`,
    )
      .bind(
        crypto.randomUUID(),
        orderId,
        JSON.stringify(event),
        `order.created:${orderId}`,
        error instanceof Error ? error.message.slice(0, 1000) : 'Queue send failed',
        now,
      )
      .run()
      .catch(() => undefined);
  }
  return {
    id: orderId,
    orderNumber: number,
    subtotal,
    deliveryFee,
    discountNpr,
    total,
    couponCode: couponReservation?.coupon.code || null,
    deliverySlotId: deliverySlot?.id || null,
    status: 'placed',
    fulfillments: fulfillmentResults,
  };
}
