import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, timingSafeEqual } from 'node:crypto';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Farm } from '../models/Farm.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
export const authRouter = Router();

function safeSecretEqual(actual: string, expected?: string) {
  if (!expected) return false;
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}
const register = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
});
const farmerRegister = z.object({
  farmName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).max(30),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().min(2),
  ward: z.string().min(1),
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
function issueTokens(user: { id: string; role: string; tenantId?: unknown }) {
  const payload = {
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId ? String(user.tenantId) : undefined,
  };
  return {
    accessToken: jwt.sign(payload, process.env.JWT_SECRET || 'development-secret', {
      expiresIn: '15m',
    }),
    refreshToken: jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'development-refresh', {
      expiresIn: '30d',
    }),
  };
}
authRouter.post('/register', async (req, res) => {
  const parsed = register.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: 'Invalid registration data', details: parsed.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to enable account creation' });
  const exists = await User.findOne({ email: parsed.data.email });
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const { password, ...data } = parsed.data;
  const user = await User.create({
    ...data,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'customer',
  });
  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...issueTokens(user),
  });
});
authRouter.post('/register-farmer', async (req, res) => {
  const p = farmerRegister.safeParse(req.body);
  if (!p.success)
    return res
      .status(400)
      .json({ error: 'Invalid farmer registration', details: p.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(202).json({
      status: 'demo_accepted',
      message: 'Farmer registration is valid. Connect MongoDB to create the tenant.',
      demoTenant: `${slugify(p.data.farmName)}-demo`,
    });
  const exists = await User.findOne({ email: p.data.email });
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const slug = `${slugify(p.data.farmName)}-${Date.now().toString(36)}`;
  let tenant: any;
  try {
    tenant = await Tenant.create({
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
        province: p.data.province,
        district: p.data.district,
        municipality: p.data.municipality,
        ward: p.data.ward,
        geo: { type: 'Point', coordinates: [p.data.lng ?? 85.324, p.data.lat ?? 27.7172] },
      },
    });
    const user = await User.create({
      name: p.data.ownerName,
      email: p.data.email,
      phone: p.data.phone,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      role: 'farmer',
      tenantId: tenant._id,
      province: p.data.province,
      district: p.data.district,
      municipality: p.data.municipality,
      ward: p.data.ward,
      geo: { type: 'Point', coordinates: [p.data.lng ?? 85.324, p.data.lat ?? 27.7172] },
    });
    const farm = await Farm.create({
      tenantId: tenant._id,
      ownerId: user._id,
      name: p.data.farmName,
      slug,
      productionTypes: tenant.specialties,
      location: {
        province: p.data.province,
        district: p.data.district,
        municipality: p.data.municipality,
        ward: p.data.ward,
        geo: { type: 'Point', coordinates: [p.data.lng ?? 85.324, p.data.lat ?? 27.7172] },
      },
    });
    tenant.ownerId = user._id;
    await tenant.save();
    return res.status(201).json({
      status: 'pending_verification',
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
      farm: { id: farm.id, name: farm.name },
      user: { id: user.id, name: user.name, role: user.role, tenantId: tenant.id },
      ...issueTokens(user),
    });
  } catch (err) {
    if (tenant?._id) await Tenant.deleteOne({ _id: tenant._id }).catch(() => {});
    throw err;
  }
});

authRouter.post('/refresh', (req, res) => {
  const token = String(req.body?.refreshToken || '');
  if (!token) return res.status(400).json({ error: 'Refresh token is required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'development-refresh') as {
      sub: string;
      role: string;
      tenantId?: string;
    };
    const accessToken = jwt.sign(
      { sub: payload.sub, role: payload.role, tenantId: payload.tenantId },
      process.env.JWT_SECRET || 'development-secret',
      { expiresIn: '15m' },
    );
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});
authRouter.post('/login', async (req, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to enable login' });
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  user.lastLoginAt = new Date();
  await user.save();
  res.json({
    ...issueTokens(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI)
    return res.json({
      user: { id: req.user?.sub, role: req.user?.role, tenantId: req.user?.tenantId },
      source: 'token',
    });
  const user: any = await User.findById(req.user?.sub).select('-passwordHash').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  let tenant: any = null,
    farm: any = null;
  if (user.tenantId) {
    [tenant, farm] = await Promise.all([
      Tenant.findById(user.tenantId).lean(),
      Farm.findOne({ tenantId: user.tenantId }).lean(),
    ]);
  }
  return res.json({ user, tenant, farm, source: 'database' });
});
const adminBootstrap = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(12),
});
authRouter.post('/bootstrap-admin', async (req, res) => {
  const key = String(req.headers['x-bootstrap-key'] || '');
  if (!safeSecretEqual(key, process.env.ADMIN_BOOTSTRAP_KEY))
    return res.status(403).json({ error: 'Admin bootstrap is disabled or key is invalid' });
  if (!process.env.MONGODB_URI) return res.status(503).json({ error: 'Connect MongoDB first' });
  const p = adminBootstrap.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: 'Invalid admin data', details: p.error.flatten() });
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) return res.status(409).json({ error: 'An admin account already exists' });
  const user = await User.create({
    name: p.data.name,
    email: p.data.email,
    passwordHash: await bcrypt.hash(p.data.password, 12),
    role: 'admin',
    isVerified: true,
  });
  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...issueTokens(user),
  });
});
