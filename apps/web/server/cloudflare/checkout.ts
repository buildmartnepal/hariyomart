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
  commit(input: { productId: string; reservationId: string; actorId?: string; referenceType?: string; referenceId?: string }): Promise<unknown>;
  release(input: { reservationId: string }): Promise<unknown>;
  restore(input: { productId: string; reservationId: string; actorId?: string; referenceType?: string; referenceId?: string }): Promise<unknown>;
};
type InventoryCoordinatorNamespace = { getByName(name: string): InventoryCoordinatorStub };
type CheckoutEnv = {
  HARIYO_DB: D1Database;
  HARIYO_EVENTS?: Queue;
  INVENTORY_COORDINATOR?: InventoryCoordinatorNamespace;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

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
    .prepare('SELECT order_number AS orderNumber, total FROM orders WHERE idempotency_key = ?')
    .bind(key)
    .first<{ orderNumber: string; total: number }>();
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
  let subtotal = 0;
  let deliveryFee = 0;

  for (const [tenantId, lines] of grouped) {
    const fulfillmentId = crypto.randomUUID();
    const sellerSubtotal = money(
      lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0),
    );
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
            `UPDATE products SET stock=stock-?, updated_at=? WHERE id=? AND stock>=?`,
          ).bind(line.quantity, now, line.product.id, line.quantity),
        );
      }
    }
  }

  subtotal = money(subtotal);
  deliveryFee = money(deliveryFee);
  const total = money(subtotal + deliveryFee);
  statements.unshift(
    env.HARIYO_DB.prepare(
      `INSERT INTO orders (id,order_number,buyer_id,guest_customer,delivery_address,payment_method,payment_status,status,subtotal,delivery_fee,total,idempotency_key,created_at,updated_at)
       VALUES (?,?,?,?,?,?,'pending','placed',?,?,?,?,?,?)`,
    ).bind(
      orderId,
      number,
      payload.buyerId || null,
      payload.guestCustomer ? JSON.stringify(payload.guestCustomer) : null,
      JSON.stringify(payload.deliveryAddress),
      payload.paymentMethod,
      subtotal,
      deliveryFee,
      total,
      payload.idempotencyKey,
      now,
      now,
    ),
  );

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
      throw error;
    }
  }

  try {
    await env.HARIYO_DB.batch(statements);
  } catch (error) {
    const raced = await existingOrder(env.HARIYO_DB, payload.idempotencyKey);
    if (raced) return { ...raced, idempotent: true };
    if (env.INVENTORY_COORDINATOR && committedReservations.length) {
      await Promise.allSettled(
        committedReservations.map((reservation) =>
          env.INVENTORY_COORDINATOR!.getByName(reservation.product.id).restore({
            productId: reservation.product.id,
            reservationId: reservation.reservationId,
            referenceType: 'order_insert_rollback',
            referenceId: orderId,
          }),
        ),
      );
    }
    throw error;
  }

  await env.HARIYO_EVENTS?.send({
    type: 'order.created',
    orderId,
    orderNumber: number,
    tenantIds: [...grouped.keys()],
    total,
    at: now,
  });
  return {
    id: orderId,
    orderNumber: number,
    subtotal,
    deliveryFee,
    total,
    status: 'placed',
    fulfillments: fulfillmentResults,
  };
}
