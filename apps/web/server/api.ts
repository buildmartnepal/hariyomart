import { createHash, randomUUID } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { z } from 'zod';
import catalog from './data/catalog.json';
import { connectMongo, mongoConfigured, mongoState } from './db';
import { AuditLog, Farm, Order, Payment, Product, Tenant, User } from './models';
import { haversineKm, seedOrigins } from './geo';
import {
  clearAuthCookies,
  hashPassword,
  isMobileClient,
  issueTokens,
  refreshTokenFrom,
  requireAuth,
  requireTenant,
  revokeRefreshToken,
  rotateRefresh,
  setAuthCookies,
  verifyPassword,
  verifyRefresh,
} from './auth';
import { assertSafeMutationOrigin, body, clientIp, json, options, ApiError } from './http';
import { rateLimit, redisConfigured, redisHealth, redisMode } from './redis';
import { checkoutLineKey, deliveryFeeFor, money, validateQuantity } from './marketplace-domain';

const cloudinaryImage = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      return (
        url.protocol === 'https:' &&
        url.hostname === 'res.cloudinary.com' &&
        (!cloud || url.pathname.startsWith(`/${cloud}/`))
      );
    } catch {
      return false;
    }
  }, 'Product images must use the configured Cloudinary account');

const buyerRegistration = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().max(30).optional(),
  province: z.string().optional(),
  district: z.string().optional(),
});
const farmerRegistration = z.object({
  farmName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().min(7).max(30),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().min(2),
  ward: z.string().min(1),
  specialties: z.string().min(2).max(1000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
const adminBootstrap = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(12).max(200),
});
const productInput = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  category: z.string().min(2),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().optional(),
  unit: z.string().min(1),
  price: z.coerce.number().nonnegative().max(10_000_000),
  stock: z.coerce.number().nonnegative().max(10_000_000),
  minimumOrder: z.coerce.number().positive().max(1_000_000).optional(),
  organic: z.boolean().optional(),
  grade: z.string().optional(),
  harvestDate: z.coerce.date().optional(),
  harvestWindow: z.string().optional(),
  uniqueStory: z.string().max(2000).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  image: cloudinaryImage.optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  deliveryRadiusKm: z.coerce.number().min(1).max(1000).optional(),
  wholesale: z.boolean().optional(),
  subscription: z.boolean().optional(),
});
const orderLine = z
  .object({
    productId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    productSlug: z.string().min(2).max(100).optional(),
    quantity: z.coerce.number().positive().max(1_000_000),
  })
  .refine((x) => x.productId || x.productSlug, { message: 'productId or productSlug is required' });
const orderInput = z.object({
  lines: z
    .array(orderLine)
    .min(1)
    .max(50)
    .superRefine((lines, ctx) => {
      const keys = new Set<string>();
      lines.forEach((line, index) => {
        const key = checkoutLineKey(line);
        if (keys.has(key))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate product line',
            path: [index],
          });
        keys.add(key);
      });
    }),
  paymentMethod: z.enum(['cod', 'esewa', 'khalti', 'fonepay', 'card']),
  deliveryAddress: z.object({
    province: z.string().min(1),
    district: z.string().min(1),
    municipality: z.string().min(1),
    ward: z.string().min(1),
    street: z.string().min(1),
    phone: z.string().min(7),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
  guestCustomer: z
    .object({
      name: z.string().min(2),
      phone: z.string().min(7),
      email: z.string().email().optional(),
    })
    .optional(),
});
const profileInput = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  language: z.enum(['en', 'ne']).optional(),
  marketingOptIn: z.boolean().optional(),
});
const addressInput = z.object({
  label: z.string().max(50).default('Home'),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().min(2),
  ward: z.string().min(1),
  street: z.string().min(2),
  phone: z.string().min(7),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});
const fulfillmentStatus = z.object({
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

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'farm'
  );
}
function publicUser(user: any) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId ? String(user.tenantId) : undefined,
    isVerified: Boolean(user.isVerified),
  };
}
async function database() {
  if (!mongoConfigured())
    throw new ApiError(503, 'MongoDB is not configured. Add MONGODB_URI and redeploy.');
  await connectMongo();
}
async function audit(
  req: NextRequest,
  user: any,
  action: string,
  entityType?: string,
  entityId?: unknown,
  meta?: unknown,
) {
  try {
    await AuditLog.create({
      actorId: user?.sub,
      role: user?.role,
      tenantId: user?.tenantId,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      ip: clientIp(req),
      meta,
    });
  } catch {}
}
function withTokens(req: NextRequest, res: NextResponse, pair: any) {
  if (isMobileClient(req)) return res;
  return setAuthCookies(res, pair);
}
function authPayload(req: NextRequest, user: any, pair: any, extra: Record<string, unknown> = {}) {
  const base = { ...extra, user: publicUser(user) };
  return isMobileClient(req)
    ? { ...base, accessToken: pair.accessToken, refreshToken: pair.refreshToken }
    : base;
}
async function authThrottle(req: NextRequest, key: string, limit = 12) {
  const r = await rateLimit(`hm:auth:${key}:${clientIp(req)}`, limit, 60);
  if (!r.allowed) throw new ApiError(429, 'Too many authentication attempts. Try again shortly.');
}

async function registerBuyer(req: NextRequest) {
  await authThrottle(req, 'register', 10);
  await database();
  const parsed = buyerRegistration.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid registration data', parsed.error.flatten());
  const email = parsed.data.email.toLowerCase();
  if (await User.exists({ email })) throw new ApiError(409, 'Email already registered');
  const { password, ...rest } = parsed.data;
  const user = await User.create({
    ...rest,
    email,
    passwordHash: await hashPassword(password),
    role: 'customer',
  });
  const pair = await issueTokens(user);
  await audit(req, { sub: user.id, role: user.role }, 'buyer.register', 'User', user.id);
  const res = json(
    req,
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...authPayload(req, user, pair),
    },
    201,
  );
  return withTokens(req, res, pair);
}
async function registerFarmer(req: NextRequest) {
  await authThrottle(req, 'farmer-register', 8);
  await database();
  const parsed = farmerRegistration.safeParse(await body(req));
  if (!parsed.success)
    throw new ApiError(400, 'Invalid farmer registration', parsed.error.flatten());
  const p = parsed.data,
    email = p.email.toLowerCase();
  if (await User.exists({ email })) throw new ApiError(409, 'Email already registered');
  const slug = `${slugify(p.farmName)}-${Date.now().toString(36)}`;
  let tenant: any, user: any, farm: any;
  try {
    tenant = await Tenant.create({
      name: p.farmName,
      slug,
      ownerName: p.ownerName,
      phone: p.phone,
      type: 'farmer',
      status: 'pending',
      specialties: p.specialties
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      location: {
        province: p.province,
        district: p.district,
        municipality: p.municipality,
        ward: p.ward,
        geo: { type: 'Point', coordinates: [p.lng ?? 85.324, p.lat ?? 27.7172] },
      },
    });
    user = await User.create({
      name: p.ownerName,
      email,
      phone: p.phone,
      passwordHash: await hashPassword(p.password),
      role: 'farmer',
      tenantId: tenant._id,
      province: p.province,
      district: p.district,
      municipality: p.municipality,
      ward: p.ward,
      geo: { type: 'Point', coordinates: [p.lng ?? 85.324, p.lat ?? 27.7172] },
    });
    farm = await Farm.create({
      tenantId: tenant._id,
      ownerId: user._id,
      name: p.farmName,
      slug,
      productionTypes: tenant.specialties,
      location: {
        province: p.province,
        district: p.district,
        municipality: p.municipality,
        ward: p.ward,
        geo: { type: 'Point', coordinates: [p.lng ?? 85.324, p.lat ?? 27.7172] },
      },
    });
    tenant.ownerId = user._id;
    await tenant.save();
    const pair = await issueTokens(user);
    await audit(
      req,
      { sub: user.id, role: user.role, tenantId: tenant.id },
      'farmer.register',
      'Tenant',
      tenant.id,
    );
    const payload = authPayload(req, user, pair, {
      status: 'pending_verification',
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
      farm: { id: farm.id, name: farm.name },
    });
    const res = json(req, payload, 201);
    return withTokens(req, res, pair);
  } catch (err) {
    if (farm?._id) await Farm.deleteOne({ _id: farm._id }).catch(() => {});
    if (user?._id) await User.deleteOne({ _id: user._id }).catch(() => {});
    if (tenant?._id) await Tenant.deleteOne({ _id: tenant._id }).catch(() => {});
    throw err;
  }
}
async function login(req: NextRequest) {
  await authThrottle(req, 'login', 12);
  await database();
  const b = await body(req),
    email = String(b.email || '')
      .trim()
      .toLowerCase(),
    password = String(b.password || '');
  const user: any = await User.findOne({ email });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash)))
    throw new ApiError(401, 'Invalid credentials');
  user.lastLoginAt = new Date();
  await user.save();
  const pair = await issueTokens(user);
  await audit(
    req,
    { sub: user.id, role: user.role, tenantId: user.tenantId },
    'auth.login',
    'User',
    user.id,
  );
  const res = json(req, authPayload(req, user, pair));
  return withTokens(req, res, pair);
}
async function refresh(req: NextRequest) {
  await authThrottle(req, 'refresh', 40);
  await database();
  const b = await body(req),
    token = refreshTokenFrom(req, b);
  if (!token) throw new ApiError(401, 'Refresh token is required');
  let old: any;
  try {
    old = verifyRefresh(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  const user: any = await User.findById(old.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account is unavailable');
  const pair = await rotateRefresh(token, user);
  const res = json(
    req,
    isMobileClient(req)
      ? { accessToken: pair.accessToken, refreshToken: pair.refreshToken, user: publicUser(user) }
      : { user: publicUser(user) },
  );
  return withTokens(req, res, pair);
}
async function logout(req: NextRequest) {
  const b = await body(req);
  await revokeRefreshToken(refreshTokenFrom(req, b));
  const res = json(req, { ok: true });
  return clearAuthCookies(res);
}
async function me(req: NextRequest) {
  await database();
  const auth = requireAuth(req);
  const user: any = await User.findById(auth.sub).select('-passwordHash').lean();
  if (!user) throw new ApiError(404, 'User not found');
  let tenant: any = null,
    farm: any = null;
  if (user.tenantId)
    [tenant, farm] = await Promise.all([
      Tenant.findById(user.tenantId).lean(),
      Farm.findOne({ tenantId: user.tenantId }).lean(),
    ]);
  return json(req, { user: { ...user, id: String(user._id) }, tenant, farm, source: 'database' });
}
async function bootstrapAdmin(req: NextRequest) {
  await authThrottle(req, 'bootstrap', 5);
  const key = req.headers.get('x-bootstrap-key') || '';
  if (!process.env.ADMIN_BOOTSTRAP_KEY || key !== process.env.ADMIN_BOOTSTRAP_KEY)
    throw new ApiError(403, 'Admin bootstrap is disabled or key is invalid');
  await database();
  const parsed = adminBootstrap.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid admin data', parsed.error.flatten());
  if (await User.exists({ role: 'admin' }))
    throw new ApiError(409, 'An admin account already exists');
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash: await hashPassword(parsed.data.password),
    role: 'admin',
    isVerified: true,
  });
  const pair = await issueTokens(user);
  await audit(req, { sub: user.id, role: user.role }, 'admin.bootstrap', 'User', user.id);
  const res = json(req, authPayload(req, user, pair), 201);
  return withTokens(req, res, pair);
}

function productFilter(url: URL) {
  const filter: any = { isActive: true, status: 'active' };
  const q = url.searchParams.get('q'),
    category = url.searchParams.get('category'),
    province = url.searchParams.get('province'),
    since = url.searchParams.get('since');
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (province) filter.province = province;
  if (since) {
    const date = new Date(since);
    if (!Number.isNaN(date.getTime())) filter.updatedAt = { $gt: date };
  }
  return filter;
}
function boundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
async function listProducts(req: NextRequest) {
  const url = new URL(req.url),
    limit = boundedInt(url.searchParams.get('limit'), 24, 1, 100),
    page = boundedInt(url.searchParams.get('page'), 1, 1, 100_000);
  if (!mongoConfigured()) {
    const q = url.searchParams.get('q')?.toLowerCase(),
      category = url.searchParams.get('category'),
      province = url.searchParams.get('province');
    const filtered = (catalog.products as any[]).filter(
      (p) =>
        (!q || `${p.name} ${p.shortDescription}`.toLowerCase().includes(q)) &&
        (!category || p.category === category) &&
        (!province || p.province === province),
    );
    const data = filtered.slice((page - 1) * limit, page * limit);
    return json(req, {
      data,
      page,
      total: filtered.length,
      nextPage: page * limit < filtered.length ? page + 1 : null,
      serverTime: new Date().toISOString(),
      source: 'seed',
    });
  }
  await database();
  const filter = productFilter(url);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  const farmIds = [...new Set(products.map((p) => String(p.farmId || '')).filter(Boolean))];
  const farms: any[] = await Farm.find({ _id: { $in: farmIds } })
    .select('_id name slug verificationStatus serviceRadiusKm location.municipality')
    .lean();
  const fm = new Map(farms.map((f) => [String(f._id), f]));
  return json(req, {
    data: products.map((p) => {
      const f: any = fm.get(String(p.farmId || ''));
      return {
        ...p,
        farmName: f?.name,
        farmSlug: f?.slug,
        farmerVerified: f?.verificationStatus === 'verified',
        deliveryRadiusKm: Number(p.deliveryRadiusKm || f?.serviceRadiusKm || 35),
        municipality: p.municipality || f?.location?.municipality,
      };
    }),
    page,
    total,
    nextPage: page * limit < total ? page + 1 : null,
    serverTime: new Date().toISOString(),
    source: 'database',
  });
}
async function productBySlug(req: NextRequest, slug: string) {
  if (!mongoConfigured()) {
    const p = (catalog.products as any[]).find((x) => x.slug === slug);
    if (!p) throw new ApiError(404, 'Product not found');
    return json(req, p);
  }
  await database();
  const p: any = await Product.findOne({ slug, isActive: true, status: 'active' }).lean();
  if (!p) throw new ApiError(404, 'Product not found');
  const farm: any = p.farmId
    ? await Farm.findById(p.farmId)
        .select('name slug verificationStatus serviceRadiusKm location.municipality')
        .lean()
    : null;
  return json(req, {
    ...p,
    farmName: farm?.name,
    farmSlug: farm?.slug,
    farmerVerified: farm?.verificationStatus === 'verified',
    deliveryRadiusKm: Number(p.deliveryRadiusKm || farm?.serviceRadiusKm || 35),
  });
}
async function createProduct(req: NextRequest) {
  await database();
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin']));
  const raw = await body(req),
    parsed = productInput.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, 'Invalid product', parsed.error.flatten());
  const tenantId = auth.role === 'admin' ? raw.tenantId : auth.tenantId;
  if (!tenantId) throw new ApiError(400, 'A seller tenant is required');
  const farm: any = await Farm.findOne({ tenantId }).lean();
  if (!farm) throw new ApiError(409, 'Create the seller farm profile before publishing products');
  const slug = `${slugify(parsed.data.slug || parsed.data.name)}-${Date.now().toString(36)}`;
  const item = await Product.create({
    ...parsed.data,
    tenantId,
    farmId: farm._id,
    farmerId: auth.sub,
    slug,
    origin: { type: 'Point', coordinates: [parsed.data.lng, parsed.data.lat] },
    saleChannels: {
      retail: true,
      wholesale: !!parsed.data.wholesale,
      subscription: !!parsed.data.subscription,
    },
    status: 'pending_review',
    isActive: false,
  });
  await audit(req, auth, 'product.create', 'Product', item.id, { tenantId });
  return json(req, item, 201);
}
async function sellerProducts(req: NextRequest) {
  await database();
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin']));
  const filter = auth.role === 'admin' ? {} : { tenantId: auth.tenantId };
  return json(req, {
    data: await Product.find(filter).sort({ createdAt: -1 }).lean(),
    source: 'database',
  });
}
async function patchProduct(req: NextRequest, id: string) {
  await database();
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin'])),
    raw = await body(req),
    filter: any = { _id: id };
  if (auth.role !== 'admin') filter.tenantId = auth.tenantId;
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
  const patch: any = Object.fromEntries(Object.entries(raw).filter(([k]) => allowed.includes(k)));
  if (
    auth.role !== 'admin' &&
    patch.status &&
    !['draft', 'pending_review', 'paused', 'sold_out'].includes(String(patch.status))
  )
    delete patch.status;
  if (auth.role === 'admin' && patch.status === 'active') {
    const current: any = await Product.findById(id).select('tenantId').lean();
    if (!current) throw new ApiError(404, 'Product not found');
    const tenant: any = current.tenantId
      ? await Tenant.findById(current.tenantId).select('status').lean()
      : null;
    if (current.tenantId && tenant?.status !== 'verified')
      throw new ApiError(409, 'Verify the seller tenant before activating this product');
    patch.isActive = true;
  }
  if (['paused', 'rejected', 'sold_out'].includes(String(patch.status))) patch.isActive = false;
  if (Number(patch.stock) > 0 && patch.status === 'sold_out') {
    patch.status = 'pending_review';
    patch.isActive = false;
  }
  const item = await Product.findOneAndUpdate(filter, patch, {
    new: true,
    runValidators: true,
  }).lean();
  if (!item) throw new ApiError(404, 'Product not found in this tenant');
  await audit(req, auth, 'product.update', 'Product', id, { status: patch.status });
  return json(req, item);
}

async function nearby(req: NextRequest) {
  const url = new URL(req.url),
    lat = Number(url.searchParams.get('lat')),
    lng = Number(url.searchParams.get('lng')),
    radiusKm = Math.min(Math.max(Number(url.searchParams.get('radiusKm') || 150), 1), 1000),
    category = url.searchParams.get('category') || 'all',
    limit = Math.min(Number(url.searchParams.get('limit') || 40), 100);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw new ApiError(400, 'lat and lng are required');
  if (!mongoConfigured()) {
    const data = (catalog.products as any[])
      .filter((p) => category === 'all' || p.category === category)
      .map((p) => {
        const o = seedOrigins[p.province] || seedOrigins.bagmati;
        return {
          ...p,
          farmName: o.farm,
          originName: o.name,
          lat: o.lat,
          lng: o.lng,
          distanceKm: Number(haversineKm(lat, lng, o.lat, o.lng).toFixed(1)),
        };
      })
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    return json(req, { data, center: { lat, lng }, radiusKm, source: 'seed' });
  }
  await database();
  const filter: any = {
    isActive: true,
    status: 'active',
    origin: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  };
  if (category !== 'all') filter.category = category;
  const products: any[] = await Product.find(filter)
      .limit(limit * 2)
      .lean(),
    farmIds = [...new Set(products.map((p) => String(p.farmId || '')).filter(Boolean))],
    farmDocs: any[] = await Farm.find({ _id: { $in: farmIds } })
      .select('_id name slug verificationStatus serviceRadiusKm')
      .lean(),
    farmMap = new Map(farmDocs.map((f) => [String(f._id), f]));
  const data = products
    .map((p) => {
      const distance =
          p.origin?.coordinates?.length === 2
            ? Number(
                haversineKm(lat, lng, p.origin.coordinates[1], p.origin.coordinates[0]).toFixed(1),
              )
            : null,
        farm: any = farmMap.get(String(p.farmId || '')),
        serviceRadius = Math.min(
          Number(p.deliveryRadiusKm || 1000),
          Number(farm?.serviceRadiusKm || 1000),
        );
      return {
        ...p,
        farmName: farm?.name || 'Hariyo farmer',
        farmSlug: farm?.slug,
        farmerVerified: farm?.verificationStatus === 'verified',
        distanceKm: distance,
        serviceRadiusKm: serviceRadius,
      };
    })
    .filter((p) => p.distanceKm == null || p.distanceKm <= p.serviceRadiusKm)
    .slice(0, limit);
  return json(req, { data, center: { lat, lng }, radiusKm, source: 'database' });
}
async function farms(req: NextRequest) {
  const url = new URL(req.url),
    lat = Number(url.searchParams.get('lat')),
    lng = Number(url.searchParams.get('lng')),
    radiusKm = Math.min(Math.max(Number(url.searchParams.get('radiusKm') || 150), 1), 1000);
  if (!mongoConfigured()) {
    const data = Object.entries(seedOrigins)
      .map(([province, o]) => ({
        province,
        name: o.farm,
        locationName: o.name,
        lat: o.lat,
        lng: o.lng,
        distanceKm:
          Number.isFinite(lat) && Number.isFinite(lng)
            ? Number(haversineKm(lat, lng, o.lat, o.lng).toFixed(1))
            : null,
        verificationStatus: 'verified',
      }))
      .filter((x: any) => x.distanceKm == null || x.distanceKm <= radiusKm);
    return json(req, { data, source: 'seed' });
  }
  await database();
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const rows: any[] = await Farm.find({
      'location.geo': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
      verificationStatus: 'verified',
    })
      .limit(50)
      .lean();
    return json(req, {
      data: rows.map((f) => {
        const c = f.location?.geo?.coordinates;
        return {
          ...f,
          distanceKm:
            Array.isArray(c) && c.length === 2
              ? Number(haversineKm(lat, lng, c[1], c[0]).toFixed(1))
              : null,
        };
      }),
      source: 'database',
    });
  }
  return json(req, {
    data: await Farm.find({ verificationStatus: 'verified' })
      .sort({ rating: -1, createdAt: -1 })
      .limit(100)
      .lean(),
    source: 'database',
  });
}
async function farmBySlug(req: NextRequest, slug: string) {
  await database();
  const farm: any = await Farm.findOne({ slug, verificationStatus: 'verified' }).lean();
  if (!farm) throw new ApiError(404, 'Farm not found');
  const [tenant, products] = await Promise.all([
    Tenant.findById(farm.tenantId).select('ownerName specialties delivery status branding').lean(),
    Product.find({ farmId: farm._id, isActive: true, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);
  return json(req, {
    farm: {
      ...farm,
      ownerName: (tenant as any)?.ownerName,
      specialties: (tenant as any)?.specialties || farm.productionTypes,
      delivery: (tenant as any)?.delivery,
      branding: (tenant as any)?.branding,
    },
    products,
    source: 'database',
  });
}
async function deliveryQuote(req: NextRequest) {
  const b = await body(req),
    values = [b.buyerLat, b.buyerLng, b.sellerLat, b.sellerLng].map(Number);
  if (values.some((v) => !Number.isFinite(v)))
    throw new ApiError(400, 'Buyer and seller coordinates are required');
  const distance = Number(haversineKm(values[0], values[1], values[2], values[3]).toFixed(1)),
    serviceable = distance <= 300,
    subtotal = Number(b.subtotal || 0),
    fee = !serviceable
      ? null
      : Number(
          (subtotal >= 3000
            ? Math.max(0, distance - 15) * 7
            : 120 + Math.max(0, distance - 10) * 8
          ).toFixed(0),
        );
  return json(req, {
    distanceKm: distance,
    serviceable,
    fee,
    estimatedHours: distance <= 20 ? '2–6' : distance <= 80 ? '12–24' : '24–72',
    recommendedMethod:
      distance <= 35 ? 'local_delivery' : distance <= 300 ? 'intercity' : 'unavailable',
  });
}

function feeFor(distance: number | null, subtotal: number) {
  const fee = deliveryFeeFor(distance, subtotal);
  if (fee == null)
    throw new ApiError(
      409,
      'A seller in this cart is outside the supported delivery range. Choose a nearer seller or pickup option.',
    );
  return fee;
}
async function createMarketplaceOrder(
  req: NextRequest,
  payload: z.infer<typeof orderInput>,
  customerId?: string,
) {
  const ids = payload.lines.flatMap((l) => (l.productId ? [l.productId] : [])),
    slugs = payload.lines.flatMap((l) => (l.productSlug ? [l.productSlug] : [])),
    products: any[] = await Product.find({
      isActive: true,
      status: 'active',
      $or: [...ids.map((_id) => ({ _id })), ...slugs.map((slug) => ({ slug }))],
    }).lean();
  if (products.length !== payload.lines.length)
    throw new ApiError(409, 'One or more products are unavailable');

  const tenantIds = [
    ...new Set(products.map((product) => String(product.tenantId || '')).filter(Boolean)),
  ];
  const tenants: any[] = tenantIds.length
    ? await Tenant.find({ _id: { $in: tenantIds } })
        .select('_id commissionRate')
        .lean()
    : [];
  const commissionByTenant = new Map(
    tenants.map((tenant) => [String(tenant._id), Number(tenant.commissionRate ?? 6)]),
  );

  const quantityFor = (p: any) =>
      payload.lines.find(
        (l) =>
          (l.productId && l.productId === String(p._id)) ||
          (l.productSlug && l.productSlug === p.slug),
      )?.quantity || 1,
    rich = products.map((x) => {
      const quantity = quantityFor(x);
      const quantityError = validateQuantity(x, quantity);
      if (quantityError) throw new ApiError(409, quantityError);
      return {
        line: {
          productId: x._id,
          tenantId: x.tenantId,
          farmId: x.farmId,
          name: x.name,
          quantity,
          unit: x.unit,
          unitPrice: x.price,
          lineTotal: money(x.price * quantity),
        },
        origin: x.origin?.coordinates,
        deliveryRadiusKm: Number(x.deliveryRadiusKm || 150),
        commissionRate: commissionByTenant.get(String(x.tenantId || '')) ?? 6,
      };
    }),
    groups = new Map<string, typeof rich>();
  for (const item of rich) {
    const key = `${String(item.line.tenantId || 'platform')}:${String(item.line.farmId || 'default')}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const fulfillments = [...groups.values()].map((items) => {
      const sellerLines = items.map((x) => x.line),
        sellerSubtotal = sellerLines.reduce((a, l) => a + l.lineTotal, 0),
        o = items[0].origin,
        sellerRadius = Math.min(...items.map((x) => Math.max(1, Number(x.deliveryRadiusKm || 35)))),
        distance =
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
        throw new ApiError(
          409,
          `Seller ${sellerLines[0].name} delivers within ${sellerRadius} km; this address is ${distance} km away.`,
        );
      const deliveryFee = feeFor(distance, sellerSubtotal),
        commissionRate = Number(items[0].commissionRate || 0),
        commissionAmount = money(sellerSubtotal * (commissionRate / 100));
      return {
        tenantId: sellerLines[0].tenantId,
        farmId: sellerLines[0].farmId,
        lines: sellerLines,
        subtotal: sellerSubtotal,
        deliveryFee,
        total: money(sellerSubtotal + deliveryFee),
        commissionAmount,
        farmerNet: money(sellerSubtotal - commissionAmount),
        sellerOrigin: Array.isArray(o) ? { lat: o[1], lng: o[0] } : undefined,
        distanceKm: distance,
        fulfillmentMethod: distance != null && distance > 35 ? 'intercity' : 'local_delivery',
        timeline: [{ status: 'pending', at: new Date(), note: 'Seller order received' }],
      };
    }),
    lines = rich.map((x) => x.line),
    subtotal = lines.reduce((a, l) => a + l.lineTotal, 0),
    deliveryFee = fulfillments.reduce((a, f) => a + f.deliveryFee, 0),
    rawCheckoutKey = req.headers.get('x-idempotency-key')?.trim() || undefined;
  if (rawCheckoutKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(rawCheckoutKey))
    throw new ApiError(400, 'Invalid idempotency key');
  const checkoutScope = customerId
      ? `user:${customerId}`
      : `guest:${payload.guestCustomer?.phone?.trim() || 'unknown'}`,
    checkoutKey = rawCheckoutKey
      ? createHash('sha256').update(`${checkoutScope}:${rawCheckoutKey}`).digest('hex')
      : undefined;
  if (checkoutKey) {
    const existing = await Order.findOne({ checkoutKey }).lean();
    if (existing) return existing;
  }

  const orderDocument = {
    checkoutKey,
    customerId,
    guestCustomer: payload.guestCustomer,
    lines,
    fulfillments,
    subtotal: money(subtotal),
    deliveryFee: money(deliveryFee),
    total: money(subtotal + deliveryFee),
    paymentMethod: payload.paymentMethod,
    deliveryAddress: payload.deliveryAddress,
    orderNumber: `HMN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
    timeline: [{ status: 'pending', at: new Date(), note: 'Multi-seller order received' }],
  };

  const session = await mongoose.startSession();
  try {
    let order: any;
    await session.withTransaction(
      async () => {
        if (checkoutKey) {
          const existing = await Order.findOne({ checkoutKey }).session(session);
          if (existing) {
            order = existing;
            return;
          }
        }

        for (const line of lines) {
          const reserved = await Product.updateOne(
            {
              _id: line.productId,
              stock: { $gte: line.quantity },
              isActive: true,
              status: 'active',
            },
            { $inc: { stock: -line.quantity } },
            { session },
          );
          if (reserved.modifiedCount !== 1)
            throw new ApiError(409, `Insufficient stock for ${line.name}`);
          await Product.updateOne(
            { _id: line.productId, stock: 0 },
            { $set: { status: 'sold_out', isActive: false } },
            { session },
          );
        }

        [order] = await Order.create([orderDocument], { session });
        await Payment.create(
          [
            {
              orderId: order._id,
              provider: payload.paymentMethod,
              amount: order.total,
              status: 'created',
              idempotencyKey: checkoutKey ? `pay:${checkoutKey}` : undefined,
            },
          ],
          { session },
        );
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
      },
    );
    if (!order) throw new ApiError(500, 'Order transaction completed without an order');
    return order;
  } catch (error: any) {
    if (checkoutKey && error?.code === 11000) {
      const existing = await Order.findOne({ checkoutKey }).lean();
      if (existing) return existing;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
async function placeOrder(req: NextRequest, guest = false) {
  await database();
  const parsed = orderInput.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid order', parsed.error.flatten());
  if (guest && !parsed.data.guestCustomer)
    throw new ApiError(400, 'Guest customer details are required');
  if (parsed.data.paymentMethod !== 'cod')
    throw new ApiError(
      503,
      'Online payment is not active yet. Choose cash on delivery until a verified payment adapter is configured.',
    );
  const auth = guest ? null : requireAuth(req),
    order: any = await createMarketplaceOrder(req, parsed.data, auth?.sub);
  await audit(req, auth || { role: 'guest' }, 'order.create', 'Order', order._id, {
    paymentMethod: parsed.data.paymentMethod,
  });
  return json(req, order, 201);
}
async function myOrders(req: NextRequest) {
  await database();
  const auth = requireAuth(req);
  return json(req, await Order.find({ customerId: auth.sub }).sort({ createdAt: -1 }).lean());
}
async function trackGuestOrder(req: NextRequest) {
  await authThrottle(req, 'order-track', 30);
  await database();
  const url = new URL(req.url),
    orderNumber = String(url.searchParams.get('orderNumber') || '')
      .trim()
      .toUpperCase(),
    phone = String(url.searchParams.get('phone') || '').trim();
  if (!/^HMN-[A-Z0-9-]{8,40}$/.test(orderNumber) || phone.length < 7)
    throw new ApiError(400, 'A valid order number and mobile number are required');
  const order: any = await Order.findOne({ orderNumber, 'guestCustomer.phone': phone })
    .select(
      'orderNumber status paymentStatus paymentMethod total createdAt fulfillments.status fulfillments.total fulfillments.timeline',
    )
    .lean();
  if (!order) throw new ApiError(404, 'Order not found');
  return json(req, { order });
}
async function cancelMyOrder(req: NextRequest, orderId: string) {
  await database();
  const auth = requireAuth(req, ['customer', 'admin']);
  const session = await mongoose.startSession();
  try {
    let cancelled: any;
    await session.withTransaction(async () => {
      const filter: any = { _id: orderId };
      if (auth.role !== 'admin') filter.customerId = auth.sub;
      const order: any = await Order.findOne(filter).session(session);
      if (!order) throw new ApiError(404, 'Order not found');
      const canCancel =
        order.status === 'pending' &&
        order.fulfillments.every((fulfillment: any) => fulfillment.status === 'pending');
      if (!canCancel)
        throw new ApiError(
          409,
          'This order is already being fulfilled and cannot be cancelled online',
        );

      for (const line of order.lines) {
        await Product.updateOne(
          { _id: line.productId },
          { $inc: { stock: line.quantity }, $set: { status: 'active', isActive: true } },
          { session },
        );
      }
      order.status = 'cancelled';
      for (const fulfillment of order.fulfillments) {
        fulfillment.status = 'cancelled';
        fulfillment.timeline.push({
          status: 'cancelled',
          at: new Date(),
          note: 'Cancelled before seller acceptance',
        });
      }
      order.timeline.push({
        status: 'cancelled',
        at: new Date(),
        note: 'Cancelled before seller acceptance',
      });
      await order.save({ session });
      await Payment.updateMany(
        { orderId: order._id, status: { $in: ['created', 'requires_action'] } },
        { status: 'failed' },
        { session },
      );
      cancelled = order;
    });
    await audit(req, auth, 'order.cancel', 'Order', orderId);
    return json(req, cancelled);
  } finally {
    await session.endSession();
  }
}
async function sellerOrders(req: NextRequest) {
  await database();
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin'])),
    filter = auth.role === 'admin' ? {} : { 'fulfillments.tenantId': auth.tenantId };
  return json(req, await Order.find(filter).sort({ createdAt: -1 }).lean());
}
async function updateFulfillment(req: NextRequest, orderId: string, fulfillmentId: string) {
  await database();
  const auth = requireAuth(req, ['farmer', 'vendor', 'admin']),
    parsed = fulfillmentStatus.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid fulfillment status');
  const order: any = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  const f = order.fulfillments.id(fulfillmentId);
  if (!f) throw new ApiError(404, 'Fulfillment not found');
  if (auth.role !== 'admin' && String(f.tenantId) !== String(auth.tenantId))
    throw new ApiError(403, 'This fulfillment belongs to another seller tenant');
  f.status = parsed.data.status;
  f.timeline.push({
    status: parsed.data.status,
    at: new Date(),
    note: parsed.data.note || `Status changed to ${parsed.data.status}`,
  });
  if (parsed.data.status === 'delivered' && f.payoutStatus === 'not_due')
    f.payoutStatus = 'pending';
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
    note: `Seller fulfillment ${parsed.data.status}`,
  });
  await order.save();
  await audit(req, auth, 'fulfillment.status', 'Order', orderId, {
    fulfillmentId,
    status: parsed.data.status,
  });
  return json(req, order);
}
async function updatePayout(req: NextRequest, orderId: string, fulfillmentId: string) {
  await database();
  const auth = requireAuth(req, ['admin']),
    b = await body(req),
    order: any = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  const f = order.fulfillments.id(fulfillmentId);
  if (!f) throw new ApiError(404, 'Fulfillment not found');
  f.payoutStatus = b.status === 'held' ? 'held' : 'paid';
  await order.save();
  await audit(req, auth, 'payout.update', 'Order', orderId, {
    fulfillmentId,
    status: f.payoutStatus,
  });
  return json(req, {
    orderId,
    fulfillmentId,
    payoutStatus: f.payoutStatus,
    farmerNet: f.farmerNet,
  });
}

async function tenantMine(req: NextRequest) {
  await database();
  const auth = requireTenant(requireAuth(req)),
    tenant = await Tenant.findById(auth.tenantId).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  return json(req, { tenant, farms: await Farm.find({ tenantId: (tenant as any)._id }).lean() });
}
async function tenantList(req: NextRequest) {
  await database();
  requireAuth(req, ['admin']);
  return json(req, { data: await Tenant.find({}).sort({ createdAt: -1 }).lean() });
}
async function verifyTenant(req: NextRequest, id: string) {
  await database();
  const auth = requireAuth(req, ['admin']),
    b = await body(req),
    status = b.status === 'rejected' ? 'suspended' : 'verified',
    tenant: any = await Tenant.findByIdAndUpdate(
      id,
      { status, verifiedAt: status === 'verified' ? new Date() : undefined },
      { new: true },
    ).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  await Farm.updateMany(
    { tenantId: tenant._id },
    { verificationStatus: status === 'verified' ? 'verified' : 'rejected' },
  );
  await audit(req, auth, 'tenant.verify', 'Tenant', id, { status });
  return json(req, tenant);
}
async function patchTenant(req: NextRequest, id: string) {
  await database();
  const auth = requireTenant(requireAuth(req)),
    b = await body(req);
  if (auth.role !== 'admin' && String(auth.tenantId) !== id)
    throw new ApiError(403, 'Tenant scope mismatch');
  const allowed = ['name', 'branding', 'delivery', 'specialties', 'payoutStatus'],
    patch = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k))),
    tenant = await Tenant.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  if ((patch as any).delivery?.radiusKm)
    await Farm.updateMany(
      { tenantId: id },
      { serviceRadiusKm: Number((patch as any).delivery.radiusKm) },
    );
  await audit(req, auth, 'tenant.update', 'Tenant', id);
  return json(req, tenant);
}

async function accountMe(req: NextRequest) {
  await database();
  const auth = requireAuth(req);
  if (req.method === 'GET') {
    const user = await User.findById(auth.sub).select('-passwordHash').lean();
    if (!user) throw new ApiError(404, 'User not found');
    return json(req, { profile: user, source: 'database' });
  }
  const parsed = profileInput.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid profile', parsed.error.flatten());
  const user = await User.findByIdAndUpdate(auth.sub, parsed.data, {
    new: true,
    runValidators: true,
  })
    .select('-passwordHash')
    .lean();
  if (!user) throw new ApiError(404, 'User not found');
  await audit(req, auth, 'account.update', 'User', auth.sub);
  return json(req, user);
}
async function addAddress(req: NextRequest) {
  await database();
  const auth = requireAuth(req),
    parsed = addressInput.safeParse(await body(req));
  if (!parsed.success) throw new ApiError(400, 'Invalid address', parsed.error.flatten());
  const user: any = await User.findById(auth.sub);
  if (!user) throw new ApiError(404, 'User not found');
  if (parsed.data.isDefault) for (const a of user.addresses) a.isDefault = false;
  user.addresses.push({
    ...parsed.data,
    geo:
      parsed.data.lat != null && parsed.data.lng != null
        ? { lat: parsed.data.lat, lng: parsed.data.lng }
        : undefined,
  });
  await user.save();
  return json(req, user.addresses, 201);
}
async function deleteAddress(req: NextRequest, id: string) {
  await database();
  const auth = requireAuth(req),
    user: any = await User.findById(auth.sub);
  if (!user) throw new ApiError(404, 'User not found');
  user.addresses.pull({ _id: id });
  await user.save();
  return json(req, user.addresses);
}
async function wishlist(req: NextRequest, slug: string, remove = false) {
  await database();
  const auth = requireAuth(req),
    user: any = await User.findById(auth.sub);
  if (!user) throw new ApiError(404, 'User not found');
  if (remove) user.wishlist = user.wishlist.filter((x: string) => x !== slug);
  else if (!user.wishlist.includes(slug)) user.wishlist.push(slug);
  await user.save();
  return json(req, { wishlist: user.wishlist });
}

function sellerFulfillment(order: any, tenantId: string) {
  return (order.fulfillments || []).find((f: any) => String(f.tenantId) === tenantId);
}
async function dashboard(req: NextRequest, kind: string) {
  await database();
  if (kind === 'buyer') {
    const auth = requireAuth(req, ['customer', 'admin']),
      [user, orders] = await Promise.all([
        User.findById(auth.sub).select('-passwordHash').lean(),
        Order.find({ customerId: auth.sub }).sort({ createdAt: -1 }).limit(100).lean(),
      ]);
    if (!user) throw new ApiError(404, 'User not found');
    return json(req, {
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
  }
  if (kind === 'admin') {
    requireAuth(req, ['admin']);
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
        .reduce((a: number, o: any) => a + Number(o.total || 0), 0),
      payoutLiability = orders
        .flatMap((o: any) => o.fulfillments || [])
        .filter((f: any) => f.payoutStatus === 'pending')
        .reduce((a: number, f: any) => a + Number(f.farmerNet || 0), 0);
    return json(req, {
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
  }
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin'])),
    tenantId = String(auth.tenantId || ''),
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    filter = auth.role === 'admin' ? {} : { tenantId: auth.tenantId },
    orderFilter = auth.role === 'admin' ? {} : { 'fulfillments.tenantId': auth.tenantId },
    [tenant, farm, products, orders] = await Promise.all([
      auth.tenantId ? Tenant.findById(auth.tenantId).lean() : null,
      auth.tenantId ? Farm.findOne({ tenantId: auth.tenantId }).lean() : null,
      Product.find(filter).sort({ updatedAt: -1 }).limit(500).lean(),
      Order.find(orderFilter).sort({ createdAt: -1 }).limit(250).lean(),
    ]),
    relevant = orders
      .map((o: any) => ({
        order: o,
        fulfillment:
          auth.role === 'admin' ? (o.fulfillments || [])[0] : sellerFulfillment(o, tenantId),
      }))
      .filter((x: any) => x.fulfillment),
    sales7d = relevant
      .filter(
        (x: any) => new Date(x.order.createdAt) >= since && x.fulfillment.status !== 'cancelled',
      )
      .reduce((a: number, x: any) => a + Number(x.fulfillment.total || 0), 0),
    openOrders = relevant.filter(
      (x: any) => !['delivered', 'cancelled'].includes(x.fulfillment.status),
    ).length,
    pendingPayout = relevant
      .filter((x: any) => x.fulfillment.payoutStatus === 'pending')
      .reduce((a: number, x: any) => a + Number(x.fulfillment.farmerNet || 0), 0),
    customers = new Set(
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
    ),
    liveProducts = products.filter((p: any) => p.status === 'active' && p.isActive).length,
    stockUnits = products
      .filter((p: any) => p.status !== 'rejected')
      .reduce((a: number, p: any) => a + Number(p.stock || 0), 0),
    lowStock = products
      .filter((p: any) => Number(p.stock || 0) <= 10 && p.status !== 'rejected')
      .slice(0, 8)
      .map((p: any) => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        status: p.status,
        slug: p.slug,
      })),
    recentOrders = relevant.slice(0, 8).map((x: any) => ({
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
  return json(req, {
    tenant,
    farm,
    metrics: {
      sales7d,
      openOrders,
      liveProducts,
      stockUnits,
      pendingPayout,
      customers: customers.size,
    },
    recentOrders,
    lowStock,
    source: 'database',
  });
}

async function uploadSignature(req: NextRequest) {
  const auth = requireTenant(requireAuth(req, ['farmer', 'vendor', 'admin']));
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey = process.env.CLOUDINARY_API_KEY,
    secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !secret)
    throw new ApiError(503, 'Signed Cloudinary upload is not configured');
  const timestamp = Math.floor(Date.now() / 1000),
    folder = `hariyo-mart/tenants/${auth.tenantId || 'admin'}`,
    publicId = `harvest-${randomUUID()}`,
    uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET,
    signedParams = {
      folder,
      public_id: publicId,
      timestamp,
      ...(uploadPreset ? { upload_preset: uploadPreset } : {}),
    },
    signature = cloudinary.utils.api_sign_request(signedParams, secret);
  return json(req, {
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId,
    uploadPreset,
    signature,
  });
}
async function providers(req: NextRequest) {
  return json(req, {
    providers: {
      cod: { configured: true, operational: true },
      esewa: {
        configured: Boolean(process.env.ESEWA_MERCHANT_CODE && process.env.ESEWA_SECRET_KEY),
        operational: false,
        status: 'adapter_pending_verification',
      },
      khalti: {
        configured: Boolean(process.env.KHALTI_SECRET_KEY),
        operational: false,
        status: 'adapter_pending_verification',
      },
      fonepay: {
        configured: Boolean(process.env.FONEPAY_MERCHANT_CODE),
        operational: false,
        status: 'adapter_pending_verification',
      },
    },
  });
}
async function readiness(req: NextRequest) {
  let mongo = 'not_configured';
  if (mongoConfigured()) {
    try {
      await connectMongo();
      mongo = mongoState();
    } catch {
      mongo = 'error';
    }
  }
  const redis = await redisHealth();
  const required = {
    MONGODB_URI: mongoConfigured(),
    REDIS: redisConfigured(),
    JWT_SECRET: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32),
    JWT_REFRESH_SECRET: Boolean(
      process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 32,
    ),
  };
  const optional = {
    ADMIN_BOOTSTRAP_KEY: Boolean(
      process.env.ADMIN_BOOTSTRAP_KEY && process.env.ADMIN_BOOTSTRAP_KEY.length >= 24,
    ),
  };
  return json(req, {
    service: 'hariyo-mart-next-api',
    status:
      required.MONGODB_URI &&
      required.REDIS &&
      required.JWT_SECRET &&
      required.JWT_REFRESH_SECRET &&
      mongo === 'connected' &&
      redis.status === 'connected'
        ? 'ready'
        : 'degraded',
    database: mongo,
    redis: { ...redis, mode: redisMode() },
    required,
    optional,
    payments: {
      esewa: Boolean(process.env.ESEWA_MERCHANT_CODE && process.env.ESEWA_SECRET_KEY),
      khalti: Boolean(process.env.KHALTI_SECRET_KEY),
      fonepay: Boolean(process.env.FONEPAY_MERCHANT_CODE),
    },
    cloudinary: {
      public: Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
      signed: Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    },
    timestamp: new Date().toISOString(),
  });
}

export async function dispatchApi(req: NextRequest, segments: string[]) {
  if (req.method === 'OPTIONS') return options(req);
  const route = segments.join('/'),
    method = req.method.toUpperCase();
  try {
    assertSafeMutationOrigin(req);
    const rl = await rateLimit(`hm:api:${clientIp(req)}`, 180, 60);
    if (!rl.allowed) throw new ApiError(429, 'Too many requests');
    if (route === 'health' && method === 'GET') return readiness(req);
    if (route === 'system/readiness' && method === 'GET') return readiness(req);
    if (route === 'auth/register' && method === 'POST') return registerBuyer(req);
    if (route === 'auth/register-farmer' && method === 'POST') return registerFarmer(req);
    if (route === 'auth/login' && method === 'POST') return login(req);
    if (route === 'auth/refresh' && method === 'POST') return refresh(req);
    if (route === 'auth/logout' && method === 'POST') return logout(req);
    if (route === 'auth/me' && method === 'GET') return me(req);
    if (route === 'auth/bootstrap-admin' && method === 'POST') return bootstrapAdmin(req);
    if (route === 'products' && method === 'GET') return listProducts(req);
    if (route === 'products' && method === 'POST') return createProduct(req);
    if (route === 'products/seller/mine' && method === 'GET') return sellerProducts(req);
    if (segments[0] === 'products' && segments.length === 2 && method === 'GET')
      return productBySlug(req, segments[1]);
    if (segments[0] === 'products' && segments.length === 2 && method === 'PATCH')
      return patchProduct(req, segments[1]);
    if (route === 'marketplace/nearby' && method === 'GET') return nearby(req);
    if (route === 'marketplace/farms' && method === 'GET') return farms(req);
    if (segments[0] === 'marketplace' && segments[1] === 'farms' && segments[2] && method === 'GET')
      return farmBySlug(req, segments[2]);
    if (route === 'marketplace/delivery-quote' && method === 'POST') return deliveryQuote(req);
    if (route === 'orders' && method === 'POST') return placeOrder(req, false);
    if (route === 'orders/guest' && method === 'POST') return placeOrder(req, true);
    if (route === 'orders/mine' && method === 'GET') return myOrders(req);
    if (route === 'orders/track' && method === 'GET') return trackGuestOrder(req);
    if (route === 'orders/seller' && method === 'GET') return sellerOrders(req);
    if (segments[0] === 'orders' && segments[1] && segments[2] === 'cancel' && method === 'POST')
      return cancelMyOrder(req, segments[1]);
    if (
      segments[0] === 'orders' &&
      segments[2] === 'fulfillments' &&
      segments[4] === 'status' &&
      method === 'PATCH'
    )
      return updateFulfillment(req, segments[1], segments[3]);
    if (
      segments[0] === 'orders' &&
      segments[2] === 'fulfillments' &&
      segments[4] === 'payout' &&
      method === 'PATCH'
    )
      return updatePayout(req, segments[1], segments[3]);
    if (route === 'tenants/mine' && method === 'GET') return tenantMine(req);
    if (route === 'tenants' && method === 'GET') return tenantList(req);
    if (segments[0] === 'tenants' && segments[2] === 'verify' && method === 'PATCH')
      return verifyTenant(req, segments[1]);
    if (segments[0] === 'tenants' && segments.length === 2 && method === 'PATCH')
      return patchTenant(req, segments[1]);
    if (route === 'account/me' && (method === 'GET' || method === 'PATCH')) return accountMe(req);
    if (route === 'account/addresses' && method === 'POST') return addAddress(req);
    if (
      segments[0] === 'account' &&
      segments[1] === 'addresses' &&
      segments[2] &&
      method === 'DELETE'
    )
      return deleteAddress(req, segments[2]);
    if (
      segments[0] === 'account' &&
      segments[1] === 'wishlist' &&
      segments[2] &&
      (method === 'PUT' || method === 'DELETE')
    )
      return wishlist(req, segments[2], method === 'DELETE');
    if (
      segments[0] === 'dashboard' &&
      ['farmer', 'admin', 'buyer'].includes(segments[1] || '') &&
      method === 'GET'
    )
      return dashboard(req, segments[1]);
    if (route === 'locations/provinces' && method === 'GET') return json(req, catalog.provinces);
    if (
      segments[0] === 'locations' &&
      segments[1] === 'provinces' &&
      segments[2] &&
      segments[3] === 'products' &&
      method === 'GET'
    )
      return json(
        req,
        (catalog.products as any[]).filter((p) => p.province === segments[2]),
      );
    if (route === 'uploads/signature' && method === 'POST') return uploadSignature(req);
    if (route === 'payments/providers' && method === 'GET') return providers(req);
    throw new ApiError(404, 'Route not found');
  } catch (err: any) {
    const status = Number(err?.status || (err?.code === 11000 ? 409 : 500));
    const payload: any = { error: err?.message || 'Unexpected server error' };
    if (err?.details) payload.details = err.details;
    if (process.env.NODE_ENV !== 'production' && status >= 500)
      payload.debug = String(err?.stack || err);
    return json(req, payload, status);
  }
}
