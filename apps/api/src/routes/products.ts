import { Router } from 'express';
import { z } from 'zod';
import catalog from '../data/catalog.json' with { type: 'json' };
import { Product } from '../models/Product.js';
import { Farm } from '../models/Farm.js';
import { Tenant } from '../models/Tenant.js';
import { allowRoles, requireAuth, requireTenant, type AuthRequest } from '../middleware/auth.js';
export const productsRouter = Router();
const productInput = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  category: z.string().min(2),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().optional(),
  unit: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().nonnegative(),
  minimumOrder: z.number().positive().optional(),
  organic: z.boolean().optional(),
  grade: z.string().optional(),
  harvestDate: z.coerce.date().optional(),
  harvestWindow: z.string().optional(),
  uniqueStory: z.string().max(2000).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  image: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  deliveryRadiusKm: z.number().min(1).max(1000).optional(),
  wholesale: z.boolean().optional(),
  subscription: z.boolean().optional(),
});
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
productsRouter.get(
  '/seller/mine',
  requireAuth,
  requireTenant,
  allowRoles('farmer', 'vendor', 'admin'),
  async (req: AuthRequest, res) => {
    if (!process.env.MONGODB_URI) return res.json({ data: [], source: 'seed' });
    const filter = req.user?.role === 'admin' ? {} : { tenantId: req.user?.tenantId };
    return res.json({ data: await Product.find(filter).sort({ createdAt: -1 }).lean() });
  },
);
productsRouter.get('/', async (req, res) => {
  const { q, category, province, limit = '24', page = '1' } = req.query as Record<string, string>;
  const filter: any = { isActive: true, status: 'active' };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (province) filter.province = province;
  try {
    if (process.env.MONGODB_URI) {
      const products = await Product.find(filter)
        .limit(Math.min(Number(limit), 100))
        .skip((Number(page) - 1) * Number(limit))
        .lean();
      const farmIds = [
        ...new Set(products.map((p: any) => String(p.farmId || '')).filter(Boolean)),
      ];
      const farmDocs = await Farm.find({ _id: { $in: farmIds } })
        .select('_id name slug verificationStatus serviceRadiusKm location.municipality')
        .lean();
      const fm = new Map(farmDocs.map((f: any) => [String(f._id), f]));
      const data = products.map((p: any) => {
        const f: any = fm.get(String(p.farmId || ''));
        return {
          ...p,
          farmName: f?.name,
          farmSlug: f?.slug,
          farmerVerified: f?.verificationStatus === 'verified',
          deliveryRadiusKm: Number(p.deliveryRadiusKm || f?.serviceRadiusKm || 35),
          municipality: p.municipality || f?.location?.municipality,
        };
      });
      return res.json({ data, page: Number(page), source: 'database' });
    }
    const data = (catalog.products as any[])
      .filter(
        (p) =>
          (!q || `${p.name} ${p.shortDescription}`.toLowerCase().includes(q.toLowerCase())) &&
          (!category || p.category === category) &&
          (!province || p.province === province),
      )
      .slice(0, Number(limit));
    return res.json({ data, page: 1, source: 'seed' });
  } catch {
    return res.status(500).json({ error: 'Unable to fetch products' });
  }
});
productsRouter.post(
  '/',
  requireAuth,
  requireTenant,
  allowRoles('farmer', 'vendor', 'admin'),
  async (req: AuthRequest, res) => {
    const p = productInput.safeParse(req.body);
    if (!p.success)
      return res.status(400).json({ error: 'Invalid product', details: p.error.flatten() });
    if (!process.env.MONGODB_URI)
      return res.status(503).json({ error: 'Connect MongoDB to publish seller products' });
    const tenantId = req.user?.role === 'admin' ? req.body.tenantId : req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'A seller tenant is required' });
    const farm: any = await Farm.findOne({ tenantId }).lean();
    if (!farm)
      return res
        .status(409)
        .json({ error: 'Create the seller farm profile before publishing products' });
    const slug = `${slugify(p.data.slug || p.data.name)}-${Date.now().toString(36)}`;
    const item = await Product.create({
      ...p.data,
      tenantId,
      farmId: farm._id,
      farmerId: req.user?.sub,
      slug,
      origin: { type: 'Point', coordinates: [p.data.lng, p.data.lat] },
      saleChannels: {
        retail: true,
        wholesale: !!p.data.wholesale,
        subscription: !!p.data.subscription,
      },
      status: 'pending_review',
      isActive: false,
    });
    return res.status(201).json(item);
  },
);
productsRouter.patch(
  '/:id',
  requireAuth,
  requireTenant,
  allowRoles('farmer', 'vendor', 'admin'),
  async (req: AuthRequest, res) => {
    if (!process.env.MONGODB_URI)
      return res.status(503).json({ error: 'Connect MongoDB to update products' });
    const filter: any = { _id: req.params.id };
    if (req.user?.role !== 'admin') filter.tenantId = req.user?.tenantId;
    const allowed = [
      'name',
      'category',
      'province',
      'district',
      'municipality',
      'unit',
      'price',
      'stock',
      'minimumOrder',
      'organic',
      'grade',
      'harvestDate',
      'harvestWindow',
      'uniqueStory',
      'shortDescription',
      'description',
      'image',
      'deliveryRadiusKm',
      'pickupAvailable',
      'status',
    ];
    const patch: any = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );
    if (
      req.user?.role !== 'admin' &&
      patch.status &&
      !['draft', 'pending_review', 'paused', 'sold_out'].includes(String(patch.status))
    )
      delete patch.status;
    if (req.user?.role === 'admin' && patch.status === 'active') {
      const current: any = await Product.findById(req.params.id).select('tenantId').lean();
      if (!current) return res.status(404).json({ error: 'Product not found' });
      const tenant: any = current.tenantId
        ? await Tenant.findById(current.tenantId).select('status').lean()
        : null;
      if (current.tenantId && tenant?.status !== 'verified')
        return res
          .status(409)
          .json({ error: 'Verify the seller tenant before activating this product' });
      patch.isActive = true;
    }
    if (req.user?.role === 'admin' && ['paused', 'rejected'].includes(patch.status))
      patch.isActive = false;
    const item = await Product.findOneAndUpdate(filter, patch, {
      new: true,
      runValidators: true,
    }).lean();
    return item
      ? res.json(item)
      : res.status(404).json({ error: 'Product not found in this tenant' });
  },
);
productsRouter.get('/:slug', async (req, res) => {
  if (process.env.MONGODB_URI) {
    const p: any = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
      status: 'active',
    }).lean();
    if (!p) return res.status(404).json({ error: 'Product not found' });
    const f: any = p.farmId
      ? await Farm.findById(p.farmId)
          .select('name slug verificationStatus serviceRadiusKm location.municipality')
          .lean()
      : null;
    return res.json({
      ...p,
      farmName: f?.name,
      farmSlug: f?.slug,
      farmerVerified: f?.verificationStatus === 'verified',
      deliveryRadiusKm: Number(p.deliveryRadiusKm || f?.serviceRadiusKm || 35),
      municipality: p.municipality || f?.location?.municipality,
    });
  }
  const p = (catalog.products as any[]).find((x) => x.slug === req.params.slug);
  return p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
});
