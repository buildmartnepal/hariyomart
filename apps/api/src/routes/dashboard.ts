import { Router } from 'express';
import { allowRoles, requireAuth, requireTenant, type AuthRequest } from '../middleware/auth.js';
import { Tenant } from '../models/Tenant.js';
import { Farm } from '../models/Farm.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';

export const dashboardRouter = Router();

const demoFarmer = {
  tenant: {
    name: 'Kathmandu Valley Farm',
    status: 'verified',
    delivery: { radiusKm: 35, pickup: true, localDelivery: true },
  },
  farm: { name: 'Kathmandu Valley Farm', verificationStatus: 'verified', rating: 4.9 },
  metrics: {
    sales7d: 18420,
    openOrders: 14,
    liveProducts: 8,
    stockUnits: 126,
    pendingPayout: 12760,
    customers: 37,
  },
  recentOrders: [
    {
      orderNumber: 'HMN-DEMO-1842',
      status: 'pending',
      buyer: 'Kapan household',
      amount: 1840,
      fulfillmentStatus: 'pending',
    },
    {
      orderNumber: 'HMN-DEMO-1837',
      status: 'confirmed',
      buyer: 'Boudha household',
      amount: 2260,
      fulfillmentStatus: 'packed',
    },
  ],
  lowStock: [
    { name: 'Akabare chilli', stock: 8, unit: 'kg' },
    { name: 'Fresh Saag', stock: 12, unit: 'kg' },
  ],
  source: 'demo',
};

function sellerFulfillment(order: any, tenantId: string) {
  return (order.fulfillments || []).find((f: any) => String(f.tenantId) === tenantId);
}

dashboardRouter.get(
  '/farmer',
  requireAuth,
  requireTenant,
  allowRoles('farmer', 'vendor', 'admin'),
  async (req: AuthRequest, res) => {
    if (!process.env.MONGODB_URI) return res.json(demoFarmer);
    const tenantId = String(req.user?.tenantId || '');
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filter = req.user?.role === 'admin' ? {} : { tenantId: req.user?.tenantId };
    const orderFilter =
      req.user?.role === 'admin' ? {} : { 'fulfillments.tenantId': req.user?.tenantId };
    const [tenant, farm, products, orders] = await Promise.all([
      req.user?.tenantId ? Tenant.findById(req.user.tenantId).lean() : null,
      req.user?.tenantId ? Farm.findOne({ tenantId: req.user.tenantId }).lean() : null,
      Product.find(filter).sort({ updatedAt: -1 }).limit(500).lean(),
      Order.find(orderFilter).sort({ createdAt: -1 }).limit(250).lean(),
    ]);
    const relevant = orders
      .map((o: any) => ({
        order: o,
        fulfillment:
          req.user?.role === 'admin' ? (o.fulfillments || [])[0] : sellerFulfillment(o, tenantId),
      }))
      .filter((x: any) => x.fulfillment);
    const sales7d = relevant
      .filter(
        (x: any) => new Date(x.order.createdAt) >= since && x.fulfillment.status !== 'cancelled',
      )
      .reduce((a: number, x: any) => a + Number(x.fulfillment.total || 0), 0);
    const openOrders = relevant.filter(
      (x: any) => !['delivered', 'cancelled'].includes(x.fulfillment.status),
    ).length;
    const pendingPayout = relevant
      .filter((x: any) => x.fulfillment.payoutStatus === 'pending')
      .reduce((a: number, x: any) => a + Number(x.fulfillment.farmerNet || 0), 0);
    const customerKeys = new Set(
      relevant
        .map((x: any) =>
          String(
            x.order.customerId ||
              x.order.guestCustomer?.phone ||
              x.order.guestCustomer?.email ||
              '',
          ),
        )
        .filter(Boolean),
    );
    const liveProducts = products.filter((p: any) => p.status === 'active' && p.isActive).length;
    const stockUnits = products
      .filter((p: any) => p.status !== 'rejected')
      .reduce((a: number, p: any) => a + Number(p.stock || 0), 0);
    const lowStock = products
      .filter((p: any) => Number(p.stock || 0) <= 10 && p.status !== 'rejected')
      .slice(0, 8)
      .map((p: any) => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        status: p.status,
        slug: p.slug,
      }));
    const recentOrders = relevant.slice(0, 8).map((x: any) => ({
      id: x.order._id,
      fulfillmentId: x.fulfillment._id,
      orderNumber: x.order.orderNumber,
      status: x.order.status,
      buyer: x.order.guestCustomer?.name || 'Registered buyer',
      amount: x.fulfillment.total,
      fulfillmentStatus: x.fulfillment.status,
      payoutStatus: x.fulfillment.payoutStatus,
      createdAt: x.order.createdAt,
    }));
    return res.json({
      tenant,
      farm,
      metrics: {
        sales7d,
        openOrders,
        liveProducts,
        stockUnits,
        pendingPayout,
        customers: customerKeys.size,
      },
      recentOrders,
      lowStock,
      source: 'database',
    });
  },
);

dashboardRouter.get('/admin', requireAuth, allowRoles('admin'), async (_req, res) => {
  if (!process.env.MONGODB_URI)
    return res.json({
      metrics: {
        tenants: 1284,
        pendingFarmers: 28,
        liveProducts: 842,
        orders: 3924,
        gmv: 4260000,
        payoutLiability: 384000,
      },
      pendingTenants: [],
      pendingProducts: [],
      recentOrders: [],
      source: 'demo',
    });
  const [
    tenants,
    pendingFarmers,
    liveProducts,
    ordersCount,
    users,
    pendingTenants,
    pendingProducts,
    orders,
  ] = await Promise.all([
    Tenant.countDocuments({}),
    Tenant.countDocuments({ status: 'pending' }),
    Product.countDocuments({ status: 'active', isActive: true }),
    Order.countDocuments({}),
    User.countDocuments({}),
    Tenant.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(8).lean(),
    Product.find({ status: 'pending_review' }).sort({ createdAt: -1 }).limit(8).lean(),
    Order.find({}).sort({ createdAt: -1 }).limit(250).lean(),
  ]);
  const gmv = orders
    .filter((o: any) => o.status !== 'cancelled')
    .reduce((a: number, o: any) => a + Number(o.total || 0), 0);
  const payoutLiability = orders
    .flatMap((o: any) => o.fulfillments || [])
    .filter((f: any) => f.payoutStatus === 'pending')
    .reduce((a: number, f: any) => a + Number(f.farmerNet || 0), 0);
  return res.json({
    metrics: {
      tenants,
      pendingFarmers,
      liveProducts,
      orders: ordersCount,
      users,
      gmv,
      payoutLiability,
    },
    pendingTenants,
    pendingProducts,
    recentOrders: orders.slice(0, 8),
    source: 'database',
  });
});

dashboardRouter.get(
  '/buyer',
  requireAuth,
  allowRoles('customer', 'admin'),
  async (req: AuthRequest, res) => {
    if (!process.env.MONGODB_URI)
      return res.json({
        profile: { name: 'Hariyo Buyer', rewardPoints: 420, walletBalance: 0, wishlist: [] },
        metrics: { orders: 5, delivered: 4, rewardPoints: 420, wishlist: 3 },
        orders: [],
        source: 'demo',
      });
    const [user, orders] = await Promise.all([
      User.findById(req.user?.sub).select('-passwordHash').lean(),
      Order.find({ customerId: req.user?.sub }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      profile: user,
      metrics: {
        orders: orders.length,
        delivered: orders.filter((o: any) => o.status === 'fulfilled').length,
        rewardPoints: Number((user as any).rewardPoints || 0),
        wishlist: Array.isArray((user as any).wishlist) ? (user as any).wishlist.length : 0,
      },
      orders: orders.slice(0, 12),
      source: 'database',
    });
  },
);
