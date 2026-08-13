import { Router } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { allowRoles, requireAuth, type AuthRequest } from '../middleware/auth.js';
import { haversineKm } from '../services/geo.js';
export const ordersRouter = Router();
const lineSchema = z
  .object({
    productId: z.string().optional(),
    productSlug: z.string().optional(),
    quantity: z.number().int().positive(),
  })
  .refine((x) => x.productId || x.productSlug, { message: 'productId or productSlug is required' });
const orderSchema = z.object({
  lines: z.array(lineSchema).min(1),
  paymentMethod: z.enum(['cod', 'esewa', 'khalti', 'fonepay', 'card']),
  deliveryAddress: z.object({
    province: z.string(),
    district: z.string(),
    municipality: z.string(),
    ward: z.string(),
    street: z.string(),
    phone: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  guestCustomer: z
    .object({
      name: z.string().min(2),
      phone: z.string().min(7),
      email: z.string().email().optional(),
    })
    .optional(),
});
function feeFor(distance: number | null, subtotal: number) {
  if (distance == null) return subtotal >= 2500 ? 0 : 150;
  if (distance > 300)
    throw Object.assign(
      new Error(
        'A seller in this cart is outside the supported delivery range. Choose a nearer seller or pickup option.',
      ),
      { status: 409 },
    );
  if (subtotal >= 3000 && distance <= 35) return 0;
  if (distance <= 15) return 90;
  if (distance <= 35) return 150;
  if (distance <= 80) return 250;
  return 450;
}
async function createMarketplaceOrder(payload: z.infer<typeof orderSchema>, customerId?: string) {
  const ids = payload.lines.flatMap((l) => (l.productId ? [l.productId] : [])),
    slugs = payload.lines.flatMap((l) => (l.productSlug ? [l.productSlug] : []));
  const products = await Product.find({
    isActive: true,
    status: 'active',
    $or: [...ids.map((_id) => ({ _id })), ...slugs.map((slug) => ({ slug }))],
  }).lean();
  if (products.length !== payload.lines.length)
    throw Object.assign(new Error('One or more products are unavailable'), { status: 409 });
  const quantityFor = (p: any) =>
    payload.lines.find(
      (l) =>
        (l.productId && l.productId === String(p._id)) ||
        (l.productSlug && l.productSlug === p.slug),
    )?.quantity || 1;
  const richLines = products.map((x: any) => {
    const quantity = quantityFor(x);
    return {
      line: {
        productId: x._id,
        tenantId: x.tenantId,
        farmId: x.farmId,
        name: x.name,
        quantity,
        unit: x.unit,
        unitPrice: x.price,
        lineTotal: x.price * quantity,
      },
      origin: x.origin?.coordinates,
      deliveryRadiusKm: Number(x.deliveryRadiusKm || 150),
    };
  });
  const groups = new Map<string, typeof richLines>();
  for (const item of richLines) {
    const key = `${String(item.line.tenantId || 'platform')}:${String(item.line.farmId || 'default-farm')}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const fulfillments = [...groups.values()].map((items) => {
    const sellerLines = items.map((x) => x.line),
      sellerSubtotal = sellerLines.reduce((a, l) => a + l.lineTotal, 0),
      o = items[0].origin;
    const sellerRadius = Math.min(
      ...items.map((x) => Math.max(1, Number(x.deliveryRadiusKm || 35))),
    );
    const distance =
      payload.deliveryAddress.lat != null &&
      payload.deliveryAddress.lng != null &&
      Array.isArray(o) &&
      o.length === 2
        ? Number(
            haversineKm(
              payload.deliveryAddress.lat,
              payload.deliveryAddress.lng,
              o[1],
              o[0],
            ).toFixed(1),
          )
        : null;
    if (distance != null && distance > sellerRadius)
      throw Object.assign(
        new Error(
          `Seller ${sellerLines[0].name} delivers within ${sellerRadius} km; this address is ${distance} km away.`,
        ),
        { status: 409 },
      );
    const deliveryFee = feeFor(distance, sellerSubtotal),
      commissionAmount = Math.round(sellerSubtotal * 0.06);
    return {
      tenantId: sellerLines[0].tenantId,
      farmId: sellerLines[0].farmId,
      lines: sellerLines,
      subtotal: sellerSubtotal,
      deliveryFee,
      total: sellerSubtotal + deliveryFee,
      commissionAmount,
      farmerNet: sellerSubtotal - commissionAmount,
      sellerOrigin: Array.isArray(o) ? { lat: o[1], lng: o[0] } : undefined,
      distanceKm: distance,
      fulfillmentMethod: distance != null && distance > 35 ? 'intercity' : 'local_delivery',
      timeline: [{ status: 'pending', at: new Date(), note: 'Seller order received' }],
    };
  });
  const lines = richLines.map((x) => x.line),
    subtotal = lines.reduce((a, l) => a + l.lineTotal, 0),
    deliveryFee = fulfillments.reduce((a, f) => a + f.deliveryFee, 0);
  const reserved: typeof lines = [];
  try {
    for (const line of lines) {
      const r = await Product.updateOne(
        { _id: line.productId, stock: { $gte: line.quantity }, isActive: true, status: 'active' },
        { $inc: { stock: -line.quantity } },
      );
      if (r.modifiedCount !== 1)
        throw Object.assign(new Error(`Insufficient stock for ${line.name}`), { status: 409 });
      await Product.updateOne(
        { _id: line.productId, stock: 0 },
        { $set: { status: 'sold_out', isActive: false } },
      );
      reserved.push(line);
    }
    const order = await Order.create({
      customerId,
      guestCustomer: payload.guestCustomer,
      lines,
      fulfillments,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod: payload.paymentMethod,
      deliveryAddress: payload.deliveryAddress,
      orderNumber: `HMN-${Date.now()}`,
      timeline: [{ status: 'pending', at: new Date(), note: 'Multi-seller order received' }],
    });
    return order;
  } catch (err) {
    for (const line of reserved)
      await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } }).catch(
        () => {},
      );
    throw err;
  }
}
ordersRouter.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  const p = orderSchema.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: 'Invalid order', details: p.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to store orders' });
  try {
    return res.status(201).json(await createMarketplaceOrder(p.data, req.user?.sub));
  } catch (e) {
    next(e);
  }
});
ordersRouter.post('/guest', async (req, res, next) => {
  const p = orderSchema.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: 'Invalid guest order', details: p.error.flatten() });
  if (!p.data.guestCustomer)
    return res.status(400).json({ error: 'Guest customer details are required' });
  if (!process.env.MONGODB_URI)
    return res.status(202).json({
      status: 'demo_accepted',
      message: 'Connect MongoDB to persist orders.',
      orderNumber: `HMN-DEMO-${Date.now()}`,
    });
  try {
    return res.status(201).json(await createMarketplaceOrder(p.data));
  } catch (e) {
    next(e);
  }
});
ordersRouter.get('/mine', requireAuth, async (req: AuthRequest, res) =>
  res.json(
    process.env.MONGODB_URI
      ? await Order.find({ customerId: req.user?.sub }).sort({ createdAt: -1 }).lean()
      : [],
  ),
);
ordersRouter.get('/seller', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user?.tenantId && req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Seller tenant required' });
  if (!process.env.MONGODB_URI) return res.json([]);
  const filter = req.user.role === 'admin' ? {} : { 'fulfillments.tenantId': req.user.tenantId };
  return res.json(await Order.find(filter).sort({ createdAt: -1 }).lean());
});
const statusSchema = z.object({
  status: z.enum([
    'accepted',
    'picking',
    'packed',
    'out_for_delivery',
    'ready_for_pickup',
    'delivered',
    'cancelled',
  ]),
  note: z.string().max(500).optional(),
});
ordersRouter.patch(
  '/:orderId/fulfillments/:fulfillmentId/status',
  requireAuth,
  allowRoles('farmer', 'vendor', 'admin'),
  async (req: AuthRequest, res) => {
    const p = statusSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid fulfillment status' });
    if (!process.env.MONGODB_URI)
      return res.status(503).json({ error: 'Connect MongoDB to update orders' });
    const order: any = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const f = order.fulfillments.id(req.params.fulfillmentId);
    if (!f) return res.status(404).json({ error: 'Fulfillment not found' });
    if (req.user?.role !== 'admin' && String(f.tenantId) !== String(req.user?.tenantId))
      return res.status(403).json({ error: 'This fulfillment belongs to another seller tenant' });
    f.status = p.data.status;
    f.timeline.push({
      status: p.data.status,
      at: new Date(),
      note: p.data.note || `Status changed to ${p.data.status}`,
    });
    if (p.data.status === 'delivered' && f.payoutStatus === 'not_due') f.payoutStatus = 'pending';
    const states = order.fulfillments.map((x: any) => x.status);
    order.status = states.every((x: string) => x === 'delivered')
      ? 'fulfilled'
      : states.every((x: string) => x === 'cancelled')
        ? 'cancelled'
        : states.some((x: string) => x === 'delivered')
          ? 'partially_fulfilled'
          : 'confirmed';
    order.timeline.push({
      status: order.status,
      at: new Date(),
      note: `Seller fulfillment ${p.data.status}`,
    });
    await order.save();
    return res.json(order);
  },
);
ordersRouter.patch(
  '/:orderId/fulfillments/:fulfillmentId/payout',
  requireAuth,
  allowRoles('admin'),
  async (req, res) => {
    if (!process.env.MONGODB_URI)
      return res.status(503).json({ error: 'Connect MongoDB to manage payouts' });
    const order: any = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const f = order.fulfillments.id(req.params.fulfillmentId);
    if (!f) return res.status(404).json({ error: 'Fulfillment not found' });
    f.payoutStatus = req.body.status === 'held' ? 'held' : 'paid';
    await order.save();
    return res.json({
      orderId: order.id,
      fulfillmentId: f.id,
      payoutStatus: f.payoutStatus,
      farmerNet: f.farmerNet,
    });
  },
);
