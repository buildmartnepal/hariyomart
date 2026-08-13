import { Router } from 'express';
import { z } from 'zod';
import { Tenant } from '../models/Tenant.js';
import { Farm } from '../models/Farm.js';
import { allowRoles, requireAuth, requireTenant, type AuthRequest } from '../middleware/auth.js';
export const tenantsRouter = Router();
const onboarding = z.object({
  farmName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(100),
  phone: z.string().min(7).max(30),
  district: z.string().min(2).max(80),
  municipality: z.string().min(2).max(100),
  ward: z.string().min(1).max(20),
  specialties: z.string().min(2).max(1000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'farm'
  );
}
tenantsRouter.post('/onboard-farmer', async (req, res) => {
  const p = onboarding.safeParse(req.body);
  if (!p.success)
    return res
      .status(400)
      .json({ error: 'Invalid farmer onboarding data', details: p.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(202).json({
      status: 'demo_accepted',
      message: 'Connect MongoDB to persist farmer onboarding.',
      application: {
        ...p.data,
        specialties: p.data.specialties
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      },
    });
  const slug = `${slugify(p.data.farmName)}-${Date.now().toString(36)}`;
  const tenant = await Tenant.create({
    name: p.data.farmName,
    slug,
    ownerName: p.data.ownerName,
    phone: p.data.phone,
    type: 'farmer',
    status: 'pending',
    specialties: p.data.specialties
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    location: {
      district: p.data.district,
      municipality: p.data.municipality,
      ward: p.data.ward,
      geo: { type: 'Point', coordinates: [p.data.lng ?? 85.324, p.data.lat ?? 27.7172] },
    },
  });
  const farm = await Farm.create({
    tenantId: tenant._id,
    name: p.data.farmName,
    slug,
    productionTypes: tenant.specialties,
    location: {
      district: p.data.district,
      municipality: p.data.municipality,
      ward: p.data.ward,
      geo: { type: 'Point', coordinates: [p.data.lng ?? 85.324, p.data.lat ?? 27.7172] },
    },
  });
  return res.status(201).json({
    status: 'pending_verification',
    tenantId: tenant.id,
    farmId: farm.id,
    slug: tenant.slug,
  });
});
tenantsRouter.get('/mine', requireAuth, requireTenant, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI) return res.json({ tenant: null, source: 'seed' });
  const tenant: any = await Tenant.findById(req.user?.tenantId).lean();
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const farms = await Farm.find({ tenantId: tenant._id }).lean();
  return res.json({ tenant, farms });
});
tenantsRouter.get('/', requireAuth, allowRoles('admin'), async (_req, res) => {
  if (!process.env.MONGODB_URI) return res.json({ data: [], source: 'seed' });
  return res.json({ data: await Tenant.find({}).sort({ createdAt: -1 }).lean() });
});
tenantsRouter.patch('/:id/verify', requireAuth, allowRoles('admin'), async (req, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to manage tenants' });
  const status = req.body.status === 'rejected' ? 'suspended' : 'verified';
  const tenant: any = await Tenant.findByIdAndUpdate(
    req.params.id,
    { status, verifiedAt: status === 'verified' ? new Date() : undefined },
    { new: true },
  ).lean();
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  await Farm.updateMany(
    { tenantId: tenant._id },
    { verificationStatus: status === 'verified' ? 'verified' : 'rejected' },
  );
  return res.json(tenant);
});
tenantsRouter.patch('/:id', requireAuth, requireTenant, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to manage tenants' });
  if (req.user?.role !== 'admin' && String(req.user?.tenantId) !== req.params.id)
    return res.status(403).json({ error: 'Tenant scope mismatch' });
  const allowed = ['name', 'branding', 'delivery', 'specialties', 'payoutStatus'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  }).lean();
  return tenant ? res.json(tenant) : res.status(404).json({ error: 'Tenant not found' });
});
