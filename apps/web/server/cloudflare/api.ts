import type { NextRequest } from 'next/server';
import { z } from 'zod';
import catalog from '../data/catalog.json';
import { checkoutCore, type CheckoutPayload } from './checkout';
import {
  apiJson,
  apiOptions,
  assertSafeRequest,
  attachSessionCookies,
  audit,
  clearSessionCookies,
  cloudflareEnv,
  CloudflareApiError,
  currentAuth,
  enforceRateLimit,
  hashPassword,
  issueSession,
  parseJson,
  publicUser,
  refreshFromRequest,
  requestBody,
  requireAuth,
  safeSecretEqual,
  revokeSession,
  rotateSession,
  slugify,
  verifyPassword,
  type CloudflareUserRow,
} from './platform';
import {
  adminAudit,
  adminBlog,
  adminCategories,
  adminMedia,
  adminOperations,
  adminPages,
  adminPromotions,
  adminReviews,
  adminServiceAreas,
  adminSettings,
  adminSupport,
  createSupportTicket,
  inventoryEvents,
  newsletterSubscribe,
  productReviews,
  publicBlog,
  publicCategories,
  publicPage,
  publicServiceAreas,
} from './operations';

const buyerRegistration = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().max(30).optional(),
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
  ward: z.string().min(1).max(20),
  specialties: z.string().min(2).max(1000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
const loginInput = z.object({ email: z.string().email(), password: z.string().min(1) });
const productInput = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(100).optional(),
  category: z.string().min(2).max(80),
  province: z.string().min(2).max(80),
  district: z.string().min(2).max(100),
  municipality: z.string().max(100).optional(),
  unit: z.string().min(1).max(40),
  price: z.coerce.number().nonnegative().max(10_000_000),
  stock: z.coerce.number().nonnegative().max(10_000_000),
  minimumOrder: z.coerce.number().positive().max(1_000_000).default(1),
  organic: z.boolean().optional(),
  grade: z.string().max(100).optional(),
  harvestDate: z.string().max(40).optional(),
  harvestWindow: z.string().max(200).optional(),
  uniqueStory: z.string().max(2000).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  image: z
    .string()
    .max(500)
    .refine((value) => value.startsWith('/api/media/') || value.startsWith('/products/'))
    .optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  deliveryRadiusKm: z.coerce.number().min(1).max(1000).default(35),
  wholesale: z.boolean().optional(),
  subscription: z.boolean().optional(),
});
const orderInput = z.object({
  lines: z
    .array(
      z.object({
        productSlug: z.string().min(2).max(120),
        quantity: z.coerce.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(50)
    .superRefine((lines, context) => {
      const found = new Set<string>();
      lines.forEach((line, index) => {
        if (found.has(line.productSlug))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate product line',
            path: [index],
          });
        found.add(line.productSlug);
      });
    }),
  paymentMethod: z.enum(['cod', 'esewa', 'khalti', 'fonepay', 'card']),
  deliveryAddress: z.object({
    province: z.string().min(1).max(100),
    district: z.string().min(1).max(100),
    municipality: z.string().min(1).max(100),
    ward: z.string().min(1).max(20),
    street: z.string().min(1).max(240),
    phone: z.string().min(7).max(30),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
  guestCustomer: z
    .object({
      name: z.string().min(2).max(100),
      phone: z.string().min(7).max(30),
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

type ProductRow = Record<string, unknown> & {
  id: string;
  tenant_id: string;
  slug: string;
  image_url?: string | null;
  image_key?: string | null;
  benefits?: string;
  organic?: number;
  featured?: number;
  wholesale?: number;
  subscription?: number;
  farm_name?: string;
  farm_slug?: string;
  tenant_status?: string;
};

type TenantRow = Record<string, unknown> & {
  id: string;
  slug: string;
  name: string;
  owner_name: string;
  specialties: string;
  pickup_enabled: number;
  same_day_enabled: number;
};

const provinces = new Map(catalog.provinces.map((province) => [province.slug, province.name]));

function validation<T>(schema: z.ZodSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new CloudflareApiError(400, 'Validation failed', parsed.error.flatten());
  return parsed.data;
}

function productPublic(row: ProductRow) {
  const category = String(row.category || 'vegetables');
  return {
    _id: row.id,
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    name: row.name,
    category,
    province: row.province,
    provinceName: provinces.get(String(row.province)) || row.province,
    district: row.district,
    municipality: row.municipality,
    unit: row.unit,
    price: Number(row.price || 0),
    oldPrice: Number(row.old_price || row.price || 0),
    stock: Number(row.stock || 0),
    minimumOrder: Number(row.minimum_order || 1),
    organic: Boolean(row.organic),
    grade: row.grade,
    harvestDate: row.harvest_date,
    harvestWindow: row.harvest_window,
    uniqueStory: row.unique_story,
    shortDescription: row.short_description,
    description: row.description,
    benefits: parseJson(row.benefits, [] as string[]),
    image:
      row.image_url ||
      (row.image_key ? `/api/media/${row.image_key}` : `/products/${category}.svg`),
    lat: Number(row.lat),
    lng: Number(row.lng),
    deliveryRadiusKm: Number(row.delivery_radius_km || 35),
    wholesale: Boolean(row.wholesale),
    subscription: Boolean(row.subscription),
    status: row.status,
    rating: Number(row.rating || 4.8),
    featured: Boolean(row.featured),
    farmName: row.farm_name,
    farmSlug: row.farm_slug,
    farmerVerified: row.tenant_status === 'verified',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function tenantPublic(row: TenantRow) {
  return {
    _id: row.id,
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerName: row.owner_name,
    type: row.type,
    plan: row.plan,
    status: row.status,
    location: {
      province: row.province,
      district: row.district,
      municipality: row.municipality,
      ward: row.ward,
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    specialties: parseJson(row.specialties, [] as string[]),
    delivery: {
      radiusKm: Number(row.delivery_radius_km || 35),
      pickup: Boolean(row.pickup_enabled),
      sameDay: Boolean(row.same_day_enabled),
    },
    commissionRate: Number(row.commission_rate || 0.08),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const productSelect = `SELECT p.*,t.name AS farm_name,t.slug AS farm_slug,t.status AS tenant_status,t.commission_rate
  FROM products p JOIN tenants t ON t.id=p.tenant_id`;

async function registerBuyer(req: NextRequest) {
  const env = cloudflareEnv();
  const input = validation(buyerRegistration, await requestBody(req));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.HARIYO_DB.prepare(
    `INSERT INTO users (id,name,email,phone,password_hash,role,is_verified,created_at,updated_at)
     VALUES (?,?,?,?,?,'customer',1,?,?)`,
  )
    .bind(
      id,
      input.name,
      input.email.toLowerCase(),
      input.phone || null,
      await hashPassword(input.password),
      now,
      now,
    )
    .run();
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(id)
    .first<CloudflareUserRow>();
  const tokens = await issueSession(user!);
  await audit(req, user!, 'auth.buyer_registered', 'user', id);
  return attachSessionCookies(req, apiJson({ user: publicUser(user!), ...tokens }, 201), tokens);
}

async function registerFarmer(req: NextRequest) {
  const env = cloudflareEnv();
  const input = validation(farmerRegistration, await requestBody(req));
  const userId = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const now = new Date().toISOString();
  const tenantSlug = `${slugify(input.farmName)}-${tenantId.slice(0, 6)}`;
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(
      `INSERT INTO tenants (id,slug,name,owner_name,type,plan,status,province,district,municipality,ward,lat,lng,specialties,created_at,updated_at)
       VALUES (?,?,?,?,'farm','free','pending',?,?,?,?,?,?,?, ?,?)`,
    ).bind(
      tenantId,
      tenantSlug,
      input.farmName,
      input.ownerName,
      input.province,
      input.district,
      input.municipality,
      input.ward,
      input.lat || null,
      input.lng || null,
      JSON.stringify(
        input.specialties
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
      now,
      now,
    ),
    env.HARIYO_DB.prepare(
      `INSERT INTO users (id,tenant_id,name,email,phone,password_hash,role,is_verified,created_at,updated_at)
       VALUES (?,?,?,?,?,?,'farmer',0,?,?)`,
    ).bind(
      userId,
      tenantId,
      input.ownerName,
      input.email.toLowerCase(),
      input.phone,
      await hashPassword(input.password),
      now,
      now,
    ),
  ]);
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(userId)
    .first<CloudflareUserRow>();
  const tokens = await issueSession(user!);
  await audit(req, user!, 'auth.farmer_registered', 'tenant', tenantId);
  return attachSessionCookies(
    req,
    apiJson(
      { user: publicUser(user!), tenant: { id: tenantId, slug: tenantSlug }, ...tokens },
      201,
    ),
    tokens,
  );
}

async function login(req: NextRequest) {
  const env = cloudflareEnv();
  const input = validation(loginInput, await requestBody(req));
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE')
    .bind(input.email.toLowerCase())
    .first<CloudflareUserRow>();
  if (!user || !(await verifyPassword(input.password, user.password_hash)))
    throw new CloudflareApiError(401, 'Invalid email or password');
  const tokens = await issueSession(user);
  await audit(req, user, 'auth.login', 'user', user.id);
  return attachSessionCookies(req, apiJson({ user: publicUser(user), ...tokens }), tokens);
}

async function refresh(req: NextRequest) {
  const input = (await requestBody(req)) as { refreshToken?: string };
  const token = refreshFromRequest(req, input);
  if (!token) throw new CloudflareApiError(401, 'Refresh token required');
  const result = await rotateSession(token);
  return attachSessionCookies(
    req,
    apiJson({ user: publicUser(result.user), ...result.tokens }),
    result.tokens,
  );
}

async function logout(req: NextRequest) {
  const input = (await requestBody(req)) as { refreshToken?: string };
  await revokeSession(refreshFromRequest(req, input));
  return clearSessionCookies(apiJson({ ok: true }));
}

async function me(req: NextRequest) {
  const user = await requireAuth(req);
  return apiJson({ user: publicUser(user) });
}

async function bootstrapAdmin(req: NextRequest) {
  const env = cloudflareEnv();
  const key = req.headers.get('x-bootstrap-key');
  if (!(await safeSecretEqual(key, env.ADMIN_BOOTSTRAP_KEY)))
    throw new CloudflareApiError(403, 'Invalid bootstrap key');
  const existing = await env.HARIYO_DB.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE role='admin'",
  ).first<{ count: number }>();
  if (Number(existing?.count || 0) > 0)
    throw new CloudflareApiError(409, 'An admin account already exists');
  const input = validation(
    z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(12) }),
    await requestBody(req),
  );
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(
    `INSERT INTO users (id,name,email,password_hash,role,is_verified) VALUES (?,?,?,?,'admin',1)`,
  )
    .bind(id, input.name, input.email.toLowerCase(), await hashPassword(input.password))
    .run();
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(id)
    .first<CloudflareUserRow>();
  await audit(req, user!, 'auth.admin_bootstrapped', 'user', id);
  return apiJson({ user: publicUser(user!) }, 201);
}

async function listProducts(req: NextRequest) {
  const env = cloudflareEnv();
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 40)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const filters = ["p.status='active'", "t.status='verified'"];
  const values: unknown[] = [];
  for (const [parameter, column] of [
    ['category', 'p.category'],
    ['province', 'p.province'],
  ] as const) {
    const value = url.searchParams.get(parameter);
    if (value) {
      filters.push(`${column}=?`);
      values.push(value);
    }
  }
  const query = url.searchParams.get('q')?.trim();
  if (query) {
    filters.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.district LIKE ?)');
    values.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }
  const result = await env.HARIYO_DB.prepare(
    `${productSelect} WHERE ${filters.join(' AND ')} ORDER BY p.featured DESC,p.updated_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...values, limit, offset)
    .all<ProductRow>();
  return apiJson({
    data: (result.results || []).map(productPublic),
    pagination: {
      limit,
      offset,
      nextOffset: result.results?.length === limit ? offset + limit : null,
    },
    serverTime: new Date().toISOString(),
  });
}

async function productBySlug(req: NextRequest, slug: string) {
  const row = await cloudflareEnv()
    .HARIYO_DB.prepare(
      `${productSelect} WHERE (p.slug=? OR p.id=?) AND p.status='active' AND t.status='verified'`,
    )
    .bind(slug, slug)
    .first<ProductRow>();
  if (!row) throw new CloudflareApiError(404, 'Product not found');
  return apiJson(productPublic(row));
}

async function sellerProducts(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  const where = user.role === 'admin' ? '1=1' : 'p.tenant_id=?';
  const statement = env.HARIYO_DB.prepare(
    `${productSelect} WHERE ${where} ORDER BY p.updated_at DESC LIMIT 200`,
  );
  const result = await (
    user.role === 'admin' ? statement : statement.bind(user.tenant_id)
  ).all<ProductRow>();
  return apiJson({ data: (result.results || []).map(productPublic) });
}

async function createProduct(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor']);
  if (!user.tenant_id) throw new CloudflareApiError(403, 'Seller tenant required');
  const input = validation(productInput, await requestBody(req));
  const id = crypto.randomUUID();
  const slug = `${slugify(input.slug || input.name)}-${id.slice(0, 6)}`;
  const now = new Date().toISOString();
  await env.HARIYO_DB.prepare(
    `INSERT INTO products (id,tenant_id,slug,name,category,province,district,municipality,unit,price,stock,minimum_order,organic,grade,harvest_date,harvest_window,unique_story,short_description,description,image_url,lat,lng,delivery_radius_km,wholesale,subscription,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_review',?,?)`,
  )
    .bind(
      id,
      user.tenant_id,
      slug,
      input.name,
      input.category,
      input.province,
      input.district,
      input.municipality || null,
      input.unit,
      input.price,
      input.stock,
      input.minimumOrder,
      input.organic ? 1 : 0,
      input.grade || null,
      input.harvestDate || null,
      input.harvestWindow || null,
      input.uniqueStory || null,
      input.shortDescription || null,
      input.description || null,
      input.image || null,
      input.lat,
      input.lng,
      input.deliveryRadiusKm,
      input.wholesale ? 1 : 0,
      input.subscription ? 1 : 0,
      now,
      now,
    )
    .run();
  await audit(req, user, 'product.created', 'product', id, { slug });
  const row = await env.HARIYO_DB.prepare(`${productSelect} WHERE p.id=?`)
    .bind(id)
    .first<ProductRow>();
  return apiJson({ product: productPublic(row!), status: 'pending_review' }, 201);
}

async function patchProduct(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  const product = await env.HARIYO_DB.prepare('SELECT * FROM products WHERE id=? OR slug=?')
    .bind(id, id)
    .first<ProductRow>();
  if (!product) throw new CloudflareApiError(404, 'Product not found');
  if (user.role !== 'admin' && product.tenant_id !== user.tenant_id)
    throw new CloudflareApiError(403, 'This listing belongs to another tenant');
  const input = validation(
    z.object({
      status: z
        .enum(['draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'])
        .optional(),
      price: z.coerce.number().nonnegative().optional(),
      stock: z.coerce.number().nonnegative().optional(),
      deliveryRadiusKm: z.coerce.number().min(1).max(1000).optional(),
    }),
    await requestBody(req),
  );
  if (input.status === 'active' && user.role !== 'admin')
    throw new CloudflareApiError(403, 'Marketplace approval is required to activate a listing');
  if (input.status === 'active') {
    const tenant = await env.HARIYO_DB.prepare('SELECT status FROM tenants WHERE id=?')
      .bind(product.tenant_id)
      .first<{ status: string }>();
    if (tenant?.status !== 'verified')
      throw new CloudflareApiError(409, 'Verify the seller tenant before activating products');
  }
  const now = new Date().toISOString();
  const stockChanged = input.stock !== undefined && input.stock !== Number(product.stock || 0);
  const updateStatement = env.HARIYO_DB.prepare(
    `UPDATE products SET status=COALESCE(?,status),price=COALESCE(?,price),stock=COALESCE(?,stock),delivery_radius_km=COALESCE(?,delivery_radius_km),updated_at=? WHERE id=?`,
  ).bind(
    input.status || null,
    input.price ?? null,
    input.stock ?? null,
    input.deliveryRadiusKm ?? null,
    now,
    product.id,
  );
  if (stockChanged) {
    await env.HARIYO_DB.batch([
      updateStatement,
      env.HARIYO_DB.prepare(
        `INSERT INTO inventory_events (id,product_id,tenant_id,actor_id,event_type,quantity_change,stock_after,reason,reference_type,reference_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(),
        product.id,
        product.tenant_id,
        user.id,
        'adjustment',
        Number(input.stock) - Number(product.stock || 0),
        Number(input.stock),
        'Stock updated from product workspace',
        'product_update',
        product.id,
      ),
    ]);
  } else {
    await updateStatement.run();
  }
  await audit(req, user, 'product.updated', 'product', product.id, input);
  return apiJson({ ok: true, id: product.id, ...input });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function nearby(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const radius = Math.min(1000, Math.max(1, Number(url.searchParams.get('radiusKm') || 100)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw new CloudflareApiError(400, 'lat and lng are required');
  const rows = await cloudflareEnv()
    .HARIYO_DB.prepare(`${productSelect} WHERE p.status='active' AND t.status='verified' LIMIT 500`)
    .all<ProductRow>();
  const data = (rows.results || [])
    .map((row) => ({
      ...productPublic(row),
      distanceKm: haversineKm(lat, lng, Number(row.lat), Number(row.lng)),
    }))
    .filter((product) => product.distanceKm <= Math.min(radius, product.deliveryRadiusKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((product) => ({ ...product, distanceKm: Math.round(product.distanceKm * 10) / 10 }));
  return apiJson({
    data,
    center: { lat, lng },
    radiusKm: radius,
    serverTime: new Date().toISOString(),
  });
}

async function farms(_req: NextRequest) {
  const result = await cloudflareEnv()
    .HARIYO_DB.prepare(
      `SELECT t.*,COUNT(p.id) AS product_count FROM tenants t LEFT JOIN products p ON p.tenant_id=t.id AND p.status='active'
     WHERE t.status='verified' GROUP BY t.id ORDER BY product_count DESC,t.name`,
    )
    .all<TenantRow & { product_count: number }>();
  return apiJson({
    data: (result.results || []).map((row) => ({
      ...tenantPublic(row),
      productCount: Number(row.product_count),
    })),
  });
}

async function farmBySlug(req: NextRequest, slug: string) {
  const env = cloudflareEnv();
  const tenant = await env.HARIYO_DB.prepare(
    "SELECT * FROM tenants WHERE slug=? AND status='verified'",
  )
    .bind(slug)
    .first<TenantRow>();
  if (!tenant) throw new CloudflareApiError(404, 'Farm not found');
  const products = await env.HARIYO_DB.prepare(
    `${productSelect} WHERE p.tenant_id=? AND p.status='active' ORDER BY p.featured DESC,p.name`,
  )
    .bind(tenant.id)
    .all<ProductRow>();
  return apiJson({
    farm: tenantPublic(tenant),
    products: (products.results || []).map(productPublic),
  });
}

async function deliveryQuote(req: NextRequest) {
  const input = validation(
    z.object({
      sellerLat: z.number(),
      sellerLng: z.number(),
      buyerLat: z.number(),
      buyerLng: z.number(),
      subtotal: z.number().nonnegative(),
    }),
    await requestBody(req),
  );
  const distance = haversineKm(input.sellerLat, input.sellerLng, input.buyerLat, input.buyerLng);
  const fee =
    distance > 300
      ? null
      : input.subtotal >= 3000 && distance <= 35
        ? 0
        : distance <= 15
          ? 90
          : distance <= 35
            ? 150
            : distance <= 80
              ? 250
              : 450;
  return apiJson({
    distanceKm: Math.round(distance * 10) / 10,
    deliveryFee: fee,
    serviceable: fee != null,
  });
}

async function placeOrder(req: NextRequest, guest: boolean) {
  const env = cloudflareEnv();
  const user = guest ? await currentAuth(req) : await requireAuth(req, ['customer', 'admin']);
  const input = validation(orderInput, await requestBody(req));
  if (guest && !user && !input.guestCustomer)
    throw new CloudflareApiError(400, 'Guest customer details are required');
  const idempotencyKey = req.headers.get('x-idempotency-key');
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200)
    throw new CloudflareApiError(400, 'A valid X-Idempotency-Key is required');
  const payload: CheckoutPayload = {
    ...input,
    ...(user ? { buyerId: user.id } : {}),
    idempotencyKey,
  };
  let responseData: unknown;
  if (env.HARIYO_SERVICES) {
    try {
      const serviceResponse = await env.HARIYO_SERVICES.fetch('https://hariyo-services/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      responseData = await serviceResponse.json();
      if (!serviceResponse.ok)
        throw new CloudflareApiError(
          serviceResponse.status,
          String((responseData as { error?: string }).error || 'Checkout failed'),
        );
    } catch (error) {
      if (error instanceof CloudflareApiError) throw error;
      responseData = await checkoutCore(env, payload);
    }
  } else {
    responseData = await checkoutCore(env, payload);
  }
  await audit(req, user, 'order.placed', 'order', (responseData as { id?: string }).id, {
    orderNumber: (responseData as { orderNumber?: string }).orderNumber,
  });
  return apiJson(responseData, 201);
}

type OrderRow = Record<string, unknown> & {
  id: string;
  order_number: string;
  buyer_id: string | null;
  guest_customer: string | null;
  delivery_address: string;
  payment_method: string;
  payment_status: string;
  status: string;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
};
type FulfillmentRow = Record<string, unknown> & { id: string; order_id: string; timeline: string };

async function orderDocuments(where: string, bindings: unknown[] = [], limit = 100) {
  const env = cloudflareEnv();
  const orders = await env.HARIYO_DB.prepare(
    `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(...bindings, limit)
    .all<OrderRow>();
  if (!orders.results?.length) return [];
  const ids = orders.results.map((order) => order.id);
  const placeholders = ids.map(() => '?').join(',');
  const fulfillments = await env.HARIYO_DB.prepare(
    `SELECT * FROM fulfillments WHERE order_id IN (${placeholders}) ORDER BY created_at`,
  )
    .bind(...ids)
    .all<FulfillmentRow>();
  const byOrder = new Map<string, unknown[]>();
  for (const fulfillment of fulfillments.results || []) {
    byOrder.set(fulfillment.order_id, [
      ...(byOrder.get(fulfillment.order_id) || []),
      {
        ...fulfillment,
        _id: fulfillment.id,
        tenantId: fulfillment.tenant_id,
        deliveryFee: Number(fulfillment.delivery_fee),
        commissionAmount: Number(fulfillment.commission_amount),
        farmerNet: Number(fulfillment.farmer_net),
        payoutStatus: fulfillment.payout_status,
        distanceKm: fulfillment.distance_km == null ? null : Number(fulfillment.distance_km),
        timeline: parseJson(fulfillment.timeline, []),
      },
    ]);
  }
  return orders.results.map((order) => ({
    ...order,
    _id: order.id,
    orderNumber: order.order_number,
    buyerId: order.buyer_id,
    guestCustomer: parseJson(order.guest_customer, null),
    deliveryAddress: parseJson(order.delivery_address, {}),
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    deliveryFee: Number(order.delivery_fee),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    fulfillments: byOrder.get(order.id) || [],
  }));
}

async function myOrders(req: NextRequest) {
  const user = await requireAuth(req);
  return apiJson(await orderDocuments('buyer_id=?', [user.id]));
}

async function trackGuestOrder(req: NextRequest) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get('orderNumber')?.trim();
  const phone = url.searchParams.get('phone')?.trim();
  if (!orderNumber || !phone)
    throw new CloudflareApiError(400, 'Order number and phone are required');
  const orders = await orderDocuments('order_number=?', [orderNumber], 1);
  const order = orders[0] as unknown as
    { guestCustomer?: { phone?: string }; deliveryAddress?: { phone?: string } } | undefined;
  if (!order || (order.guestCustomer?.phone !== phone && order.deliveryAddress?.phone !== phone))
    throw new CloudflareApiError(404, 'Order not found');
  return apiJson({ order });
}

async function sellerOrders(req: NextRequest) {
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  if (user.role === 'admin') return apiJson(await orderDocuments('1=1', [], 200));
  const rows = await cloudflareEnv()
    .HARIYO_DB.prepare(
      'SELECT DISTINCT order_id FROM fulfillments WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100',
    )
    .bind(user.tenant_id)
    .all<{ order_id: string }>();
  const ids = (rows.results || []).map((row) => row.order_id);
  if (!ids.length) return apiJson([]);
  return apiJson(await orderDocuments(`id IN (${ids.map(() => '?').join(',')})`, ids));
}

async function cancelMyOrder(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const order = await env.HARIYO_DB.prepare(
    "SELECT * FROM orders WHERE (id=? OR order_number=?) AND buyer_id=? AND status IN ('placed','confirmed')",
  )
    .bind(id, id, user.id)
    .first<OrderRow>();
  if (!order) throw new CloudflareApiError(404, 'Cancellable order not found');
  const items = await env.HARIYO_DB.prepare(
    'SELECT product_id,quantity FROM order_items WHERE order_id=?',
  )
    .bind(order.id)
    .all<{ product_id: string; quantity: number }>();
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").bind(
      new Date().toISOString(),
      order.id,
    ),
    env.HARIYO_DB.prepare(
      "UPDATE fulfillments SET status='cancelled',updated_at=? WHERE order_id=?",
    ).bind(new Date().toISOString(), order.id),
    ...(items.results || []).map((item) =>
      env.HARIYO_DB.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?').bind(
        item.quantity,
        new Date().toISOString(),
        item.product_id,
      ),
    ),
  ]);
  await audit(req, user, 'order.cancelled', 'order', order.id);
  return apiJson({ ok: true });
}

async function updateFulfillment(req: NextRequest, orderId: string, fulfillmentId: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  const input = validation(
    z.object({
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
    }),
    await requestBody(req),
  );
  const fulfillment = await env.HARIYO_DB.prepare(
    'SELECT * FROM fulfillments WHERE id=? AND order_id=?',
  )
    .bind(fulfillmentId, orderId)
    .first<FulfillmentRow>();
  if (!fulfillment) throw new CloudflareApiError(404, 'Fulfillment not found');
  if (user.role !== 'admin' && fulfillment.tenant_id !== user.tenant_id)
    throw new CloudflareApiError(403, 'This fulfillment belongs to another tenant');
  const timeline = parseJson<Array<Record<string, unknown>>>(fulfillment.timeline, []);
  timeline.push({
    status: input.status,
    at: new Date().toISOString(),
    ...(input.note ? { note: input.note } : {}),
  });
  await env.HARIYO_DB.prepare('UPDATE fulfillments SET status=?,timeline=?,updated_at=? WHERE id=?')
    .bind(input.status, JSON.stringify(timeline), new Date().toISOString(), fulfillmentId)
    .run();
  const states = await env.HARIYO_DB.prepare('SELECT status FROM fulfillments WHERE order_id=?')
    .bind(orderId)
    .all<{ status: string }>();
  const values = (states.results || []).map((state) => state.status);
  const orderStatus = values.every((value) => value === 'delivered')
    ? 'delivered'
    : values.every((value) => value === 'cancelled')
      ? 'cancelled'
      : values.some((value) => value !== 'pending')
        ? 'partially_fulfilled'
        : 'placed';
  await env.HARIYO_DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?')
    .bind(orderStatus, new Date().toISOString(), orderId)
    .run();
  await audit(req, user, 'fulfillment.status_changed', 'fulfillment', fulfillmentId, input);
  return apiJson({ ok: true, status: input.status, orderStatus });
}

async function updatePayout(req: NextRequest, orderId: string, fulfillmentId: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['admin']);
  const input = validation(
    z.object({ payoutStatus: z.enum(['pending', 'scheduled', 'paid', 'held']) }),
    await requestBody(req),
  );
  const result = await env.HARIYO_DB.prepare(
    'UPDATE fulfillments SET payout_status=?,updated_at=? WHERE id=? AND order_id=?',
  )
    .bind(input.payoutStatus, new Date().toISOString(), fulfillmentId, orderId)
    .run();
  if (!result.meta.changes) throw new CloudflareApiError(404, 'Fulfillment not found');
  await audit(req, user, 'fulfillment.payout_changed', 'fulfillment', fulfillmentId, input);
  return apiJson({ ok: true, ...input });
}

async function tenantMine(req: NextRequest) {
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  if (!user.tenant_id) throw new CloudflareApiError(404, 'No tenant assigned');
  const row = await cloudflareEnv()
    .HARIYO_DB.prepare('SELECT * FROM tenants WHERE id=?')
    .bind(user.tenant_id)
    .first<TenantRow>();
  if (!row) throw new CloudflareApiError(404, 'Tenant not found');
  return apiJson({ tenant: tenantPublic(row) });
}

async function tenantList(req: NextRequest) {
  await requireAuth(req, ['admin']);
  const result = await cloudflareEnv()
    .HARIYO_DB.prepare('SELECT * FROM tenants ORDER BY created_at DESC LIMIT 200')
    .all<TenantRow>();
  return apiJson({ data: (result.results || []).map(tenantPublic) });
}

async function verifyTenant(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['admin']);
  const input = validation(
    z.object({ status: z.enum(['verified', 'rejected', 'suspended']) }),
    await requestBody(req),
  );
  const result = await env.HARIYO_DB.prepare('UPDATE tenants SET status=?,updated_at=? WHERE id=?')
    .bind(input.status, new Date().toISOString(), id)
    .run();
  if (!result.meta.changes) throw new CloudflareApiError(404, 'Tenant not found');
  await env.HARIYO_DB.prepare('UPDATE users SET is_verified=?,updated_at=? WHERE tenant_id=?')
    .bind(input.status === 'verified' ? 1 : 0, new Date().toISOString(), id)
    .run();
  await audit(req, user, 'tenant.reviewed', 'tenant', id, input);
  return apiJson({ ok: true, ...input });
}

async function patchTenant(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  if (user.role !== 'admin' && user.tenant_id !== id)
    throw new CloudflareApiError(403, 'This tenant belongs to another seller');
  const input = validation(
    z.object({
      name: z.string().min(2).max(120).optional(),
      deliveryRadiusKm: z.coerce.number().min(1).max(1000).optional(),
      pickup: z.boolean().optional(),
      sameDay: z.boolean().optional(),
    }),
    await requestBody(req),
  );
  await env.HARIYO_DB.prepare(
    `UPDATE tenants SET name=COALESCE(?,name),delivery_radius_km=COALESCE(?,delivery_radius_km),pickup_enabled=COALESCE(?,pickup_enabled),same_day_enabled=COALESCE(?,same_day_enabled),updated_at=? WHERE id=?`,
  )
    .bind(
      input.name || null,
      input.deliveryRadiusKm ?? null,
      input.pickup == null ? null : input.pickup ? 1 : 0,
      input.sameDay == null ? null : input.sameDay ? 1 : 0,
      new Date().toISOString(),
      id,
    )
    .run();
  await audit(req, user, 'tenant.updated', 'tenant', id, input);
  return apiJson({ ok: true });
}

function profilePublic(user: CloudflareUserRow) {
  return {
    ...publicUser(user),
    language: user.language,
    marketingOptIn: Boolean(user.marketing_opt_in),
    rewardPoints: Number(user.reward_points || 0),
    addresses: parseJson(user.addresses, []),
    wishlist: parseJson(user.wishlist, []),
    createdAt: user.created_at,
  };
}

async function accountMe(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  if (req.method === 'GET') return apiJson({ profile: profilePublic(user) });
  const input = validation(profileInput, await requestBody(req));
  await env.HARIYO_DB.prepare(
    `UPDATE users SET name=COALESCE(?,name),phone=COALESCE(?,phone),language=COALESCE(?,language),marketing_opt_in=COALESCE(?,marketing_opt_in),updated_at=? WHERE id=?`,
  )
    .bind(
      input.name || null,
      input.phone ?? null,
      input.language || null,
      input.marketingOptIn == null ? null : input.marketingOptIn ? 1 : 0,
      new Date().toISOString(),
      user.id,
    )
    .run();
  const updated = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(user.id)
    .first<CloudflareUserRow>();
  await audit(req, user, 'account.profile_updated', 'user', user.id);
  return apiJson({ profile: profilePublic(updated!) });
}

async function addAddress(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const input = validation(addressInput, await requestBody(req));
  const addresses = parseJson<Array<Record<string, unknown>>>(user.addresses, []);
  if (addresses.length >= 20) throw new CloudflareApiError(409, 'Address limit reached');
  if (input.isDefault) addresses.forEach((address) => (address.isDefault = false));
  const address = { _id: crypto.randomUUID(), ...input };
  addresses.push(address);
  await env.HARIYO_DB.prepare('UPDATE users SET addresses=?,updated_at=? WHERE id=?')
    .bind(JSON.stringify(addresses), new Date().toISOString(), user.id)
    .run();
  await audit(req, user, 'account.address_added', 'address', address._id);
  return apiJson({ address, addresses }, 201);
}

async function deleteAddress(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const addresses = parseJson<Array<{ _id?: string }>>(user.addresses, []);
  const updated = addresses.filter((address) => address._id !== id);
  if (updated.length === addresses.length) throw new CloudflareApiError(404, 'Address not found');
  await env.HARIYO_DB.prepare('UPDATE users SET addresses=?,updated_at=? WHERE id=?')
    .bind(JSON.stringify(updated), new Date().toISOString(), user.id)
    .run();
  await audit(req, user, 'account.address_deleted', 'address', id);
  return apiJson({ ok: true, addresses: updated });
}

async function wishlist(req: NextRequest, slug: string, remove: boolean) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const values = new Set(parseJson<string[]>(user.wishlist, []));
  if (remove) values.delete(slug);
  else {
    const product = await env.HARIYO_DB.prepare(
      "SELECT id FROM products WHERE slug=? AND status='active'",
    )
      .bind(slug)
      .first();
    if (!product) throw new CloudflareApiError(404, 'Product not found');
    values.add(slug);
  }
  const updated = [...values].slice(0, 100);
  await env.HARIYO_DB.prepare('UPDATE users SET wishlist=?,updated_at=? WHERE id=?')
    .bind(JSON.stringify(updated), new Date().toISOString(), user.id)
    .run();
  return apiJson({ wishlist: updated });
}

async function dashboard(req: NextRequest, role: string) {
  const env = cloudflareEnv();
  if (role === 'farmer') {
    const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
    if (!user.tenant_id && user.role !== 'admin')
      throw new CloudflareApiError(403, 'Seller tenant required');
    const tenantId = user.tenant_id;
    const tenant = tenantId
      ? await env.HARIYO_DB.prepare('SELECT * FROM tenants WHERE id=?')
          .bind(tenantId)
          .first<TenantRow>()
      : null;
    const productMetrics = tenantId
      ? await env.HARIYO_DB.prepare(
          "SELECT COUNT(CASE WHEN status='active' THEN 1 END) AS live_products,COALESCE(SUM(stock),0) AS stock_units FROM products WHERE tenant_id=?",
        )
          .bind(tenantId)
          .first<{ live_products: number; stock_units: number }>()
      : { live_products: 0, stock_units: 0 };
    const orderMetrics = tenantId
      ? await env.HARIYO_DB.prepare(
          `SELECT COALESCE(SUM(CASE WHEN f.created_at>=datetime('now','-7 days') THEN f.subtotal ELSE 0 END),0) AS sales_7d,
           COUNT(CASE WHEN f.status NOT IN ('delivered','cancelled') THEN 1 END) AS open_orders,
           COALESCE(SUM(CASE WHEN f.payout_status!='paid' THEN f.farmer_net ELSE 0 END),0) AS pending_payout,
           COUNT(DISTINCT COALESCE(o.buyer_id,json_extract(o.guest_customer,'$.phone'))) AS customers
           FROM fulfillments f JOIN orders o ON o.id=f.order_id WHERE f.tenant_id=?`,
        )
          .bind(tenantId)
          .first<Record<string, number>>()
      : {};
    const recentOrders = tenantId
      ? await orderDocuments(
          'id IN (SELECT order_id FROM fulfillments WHERE tenant_id=?)',
          [tenantId],
          5,
        )
      : [];
    const lowStock = tenantId
      ? await env.HARIYO_DB.prepare(
          "SELECT * FROM products WHERE tenant_id=? AND status='active' AND stock<=10 ORDER BY stock LIMIT 10",
        )
          .bind(tenantId)
          .all<ProductRow>()
      : { results: [] as ProductRow[] };
    return apiJson({
      source: 'database',
      tenant: tenant ? tenantPublic(tenant) : null,
      metrics: {
        sales7d: Number(orderMetrics?.sales_7d || 0),
        openOrders: Number(orderMetrics?.open_orders || 0),
        stockUnits: Number(productMetrics?.stock_units || 0),
        liveProducts: Number(productMetrics?.live_products || 0),
        pendingPayout: Number(orderMetrics?.pending_payout || 0),
        customers: Number(orderMetrics?.customers || 0),
      },
      recentOrders,
      lowStock: (lowStock.results || []).map(productPublic),
    });
  }
  if (role === 'admin') {
    await requireAuth(req, ['admin']);
    const metrics = await env.HARIYO_DB.prepare(
      `SELECT
       (SELECT COUNT(*) FROM tenants) AS tenants,
       (SELECT COUNT(*) FROM tenants WHERE status='pending') AS pending_farmers,
       (SELECT COUNT(*) FROM products WHERE status='active') AS live_products,
       (SELECT COUNT(*) FROM orders) AS orders,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COALESCE(SUM(total),0) FROM orders WHERE status!='cancelled') AS gmv,
       (SELECT COALESCE(SUM(farmer_net),0) FROM fulfillments WHERE payout_status!='paid') AS payout_liability`,
    ).first<Record<string, number>>();
    const pendingTenants = await env.HARIYO_DB.prepare(
      "SELECT * FROM tenants WHERE status='pending' ORDER BY created_at LIMIT 10",
    ).all<TenantRow>();
    const pendingProducts = await env.HARIYO_DB.prepare(
      `${productSelect} WHERE p.status='pending_review' ORDER BY p.created_at LIMIT 10`,
    ).all<ProductRow>();
    return apiJson({
      source: 'database',
      metrics: {
        tenants: Number(metrics?.tenants || 0),
        pendingFarmers: Number(metrics?.pending_farmers || 0),
        liveProducts: Number(metrics?.live_products || 0),
        orders: Number(metrics?.orders || 0),
        users: Number(metrics?.users || 0),
        gmv: Number(metrics?.gmv || 0),
        payoutLiability: Number(metrics?.payout_liability || 0),
      },
      pendingTenants: (pendingTenants.results || []).map(tenantPublic),
      pendingProducts: (pendingProducts.results || []).map(productPublic),
    });
  }
  const user = await requireAuth(req, ['customer', 'admin']);
  const orders = await orderDocuments('buyer_id=?', [user.id], 100);
  return apiJson({
    source: 'database',
    profile: profilePublic(user),
    orders,
    metrics: {
      orders: orders.length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
      rewardPoints: Number(user.reward_points || 0),
      wishlist: parseJson<string[]>(user.wishlist, []).length,
    },
  });
}

async function uploadMedia(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 8.5 * 1024 * 1024)
    throw new CloudflareApiError(413, 'Crop photos must be 8 MB or smaller');
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new CloudflareApiError(400, 'Image file is required');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new CloudflareApiError(400, 'Use a JPEG, PNG or WebP crop photo');
  if (file.size > 8 * 1024 * 1024)
    throw new CloudflareApiError(413, 'Crop photos must be 8 MB or smaller');
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const tenant = user.tenant_id || 'admin';
  const key = `products/${tenant}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  await env.HARIYO_MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { ownerId: user.id, tenantId: tenant },
  });
  await env.HARIYO_DB.prepare(
    'INSERT INTO media (id,tenant_id,owner_id,object_key,content_type,size_bytes) VALUES (?,?,?,?,?,?)',
  )
    .bind(crypto.randomUUID(), user.tenant_id, user.id, key, file.type, file.size)
    .run();
  await audit(req, user, 'media.uploaded', 'media', key, {
    contentType: file.type,
    size: file.size,
  });
  return apiJson({ key, url: `/api/media/${key}` }, 201);
}

async function media(req: NextRequest, key: string) {
  const object = await cloudflareEnv().HARIYO_MEDIA.get(key);
  if (!object) throw new CloudflareApiError(404, 'Media not found');
  const headers = new Headers();
  const extension = key.split('.').pop()?.toLowerCase();
  headers.set(
    'content-type',
    extension === 'jpg' || extension === 'jpeg'
      ? 'image/jpeg'
      : extension === 'png'
        ? 'image/png'
        : 'image/webp',
  );
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(await object.arrayBuffer(), { headers });
}

async function readiness() {
  const env = cloudflareEnv();
  let database = 'connected';
  try {
    await env.HARIYO_DB.prepare('SELECT 1 AS ok').first();
  } catch {
    database = 'error';
  }
  const required = {
    D1: database === 'connected',
    R2: Boolean(env.HARIYO_MEDIA),
    KV: Boolean(env.HARIYO_KV),
    QUEUES: Boolean(env.HARIYO_EVENTS),
    SERVICES: Boolean(env.HARIYO_SERVICES),
    JWT_SECRET: Boolean(env.JWT_SECRET && env.JWT_SECRET.length >= 32),
    JWT_REFRESH_SECRET: Boolean(env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length >= 32),
  };
  return apiJson({
    service: 'hariyo-mart-cloudflare',
    version: '6.2.0',
    status: Object.values(required).every(Boolean) ? 'ready' : 'degraded',
    architecture: 'Cloudflare Workers + D1 + Durable Objects + R2 + KV + Queues',
    database,
    required,
    timestamp: new Date().toISOString(),
  });
}

function payments() {
  return apiJson({
    providers: [
      { id: 'cod', name: 'Cash on delivery', enabled: true },
      { id: 'esewa', name: 'eSewa', enabled: false, note: 'Merchant onboarding required' },
      { id: 'khalti', name: 'Khalti', enabled: false, note: 'Merchant onboarding required' },
      { id: 'fonepay', name: 'Fonepay', enabled: false, note: 'Merchant onboarding required' },
    ],
  });
}

export async function dispatchCloudflareApi(req: NextRequest, segments: string[]) {
  if (req.method === 'OPTIONS') return apiOptions(req);
  const route = segments.join('/');
  const method = req.method.toUpperCase();
  try {
    assertSafeRequest(req);
    await enforceRateLimit(req);
    if ((route === 'health' || route === 'system/readiness') && method === 'GET')
      return await readiness();
    if (route === 'auth/register' && method === 'POST') return await registerBuyer(req);
    if (route === 'auth/register-farmer' && method === 'POST') return await registerFarmer(req);
    if (route === 'auth/login' && method === 'POST') return await login(req);
    if (route === 'auth/refresh' && method === 'POST') return await refresh(req);
    if (route === 'auth/logout' && method === 'POST') return await logout(req);
    if (route === 'auth/me' && method === 'GET') return await me(req);
    if (route === 'auth/bootstrap-admin' && method === 'POST') return await bootstrapAdmin(req);
    if (route === 'products' && method === 'GET') return await listProducts(req);
    if (route === 'products' && method === 'POST') return await createProduct(req);
    if (route === 'products/seller/mine' && method === 'GET') return await sellerProducts(req);
    if (segments[0] === 'products' && segments.length === 2 && method === 'GET')
      return await productBySlug(req, segments[1]);
    if (segments[0] === 'products' && segments.length === 2 && method === 'PATCH')
      return await patchProduct(req, segments[1]);
    if (route === 'marketplace/nearby' && method === 'GET') return await nearby(req);
    if (route === 'marketplace/farms' && method === 'GET') return await farms(req);
    if (segments[0] === 'marketplace' && segments[1] === 'farms' && segments[2] && method === 'GET')
      return await farmBySlug(req, segments[2]);
    if (route === 'marketplace/delivery-quote' && method === 'POST')
      return await deliveryQuote(req);
    if (route === 'orders' && method === 'POST') return await placeOrder(req, false);
    if (route === 'orders/guest' && method === 'POST') return await placeOrder(req, true);
    if (route === 'orders/mine' && method === 'GET') return await myOrders(req);
    if (route === 'orders/track' && method === 'GET') return await trackGuestOrder(req);
    if (route === 'orders/seller' && method === 'GET') return await sellerOrders(req);
    if (segments[0] === 'orders' && segments[1] && segments[2] === 'cancel' && method === 'POST')
      return await cancelMyOrder(req, segments[1]);
    if (
      segments[0] === 'orders' &&
      segments[2] === 'fulfillments' &&
      segments[4] === 'status' &&
      method === 'PATCH'
    )
      return await updateFulfillment(req, segments[1], segments[3]);
    if (
      segments[0] === 'orders' &&
      segments[2] === 'fulfillments' &&
      segments[4] === 'payout' &&
      method === 'PATCH'
    )
      return await updatePayout(req, segments[1], segments[3]);
    if (route === 'tenants/mine' && method === 'GET') return await tenantMine(req);
    if (route === 'tenants' && method === 'GET') return await tenantList(req);
    if (segments[0] === 'tenants' && segments[2] === 'verify' && method === 'PATCH')
      return await verifyTenant(req, segments[1]);
    if (segments[0] === 'tenants' && segments.length === 2 && method === 'PATCH')
      return await patchTenant(req, segments[1]);
    if (route === 'account/me' && (method === 'GET' || method === 'PATCH'))
      return await accountMe(req);
    if (route === 'account/addresses' && method === 'POST') return await addAddress(req);
    if (
      segments[0] === 'account' &&
      segments[1] === 'addresses' &&
      segments[2] &&
      method === 'DELETE'
    )
      return await deleteAddress(req, segments[2]);
    if (
      segments[0] === 'account' &&
      segments[1] === 'wishlist' &&
      segments[2] &&
      (method === 'PUT' || method === 'DELETE')
    )
      return await wishlist(req, segments[2], method === 'DELETE');
    if (
      segments[0] === 'dashboard' &&
      ['farmer', 'admin', 'buyer'].includes(segments[1] || '') &&
      method === 'GET'
    )
      return await dashboard(req, segments[1]);
    if (route === 'locations/provinces' && method === 'GET') return apiJson(catalog.provinces);
    if (route === 'locations/service-areas' && method === 'GET') return await publicServiceAreas();
    if (
      segments[0] === 'locations' &&
      segments[1] === 'provinces' &&
      segments[2] &&
      segments[3] === 'products' &&
      method === 'GET'
    ) {
      const clone = new URL(req.url);
      clone.searchParams.set('province', segments[2]);
      return await listProducts(new Request(clone, req) as NextRequest);
    }
    if (route === 'uploads' && method === 'POST') return await uploadMedia(req);
    if (segments[0] === 'media' && segments.length > 1 && method === 'GET')
      return await media(req, segments.slice(1).join('/'));
    if (route === 'payments/providers' && method === 'GET') return payments();
    if (route === 'content/newsletter' && method === 'POST') return await newsletterSubscribe(req);
    if (route === 'content/blog' && method === 'GET') return await publicBlog(req);
    if (segments[0] === 'content' && segments[1] === 'blog' && segments[2] && method === 'GET')
      return await publicBlog(req, segments[2]);
    if (route === 'catalog/categories' && method === 'GET') return await publicCategories();
    if (segments[0] === 'content' && segments[1] === 'pages' && segments[2] && method === 'GET')
      return await publicPage(segments[2]);
    if (route === 'support/tickets' && method === 'POST') return await createSupportTicket(req);
    if (segments[0] === 'reviews' && segments[1] && ['GET', 'POST'].includes(method))
      return await productReviews(req, segments[1]);
    if (route === 'inventory/events' && ['GET', 'POST'].includes(method))
      return await inventoryEvents(req);
    if (route === 'admin/operations' && method === 'GET') return await adminOperations(req);
    if (route === 'admin/content/posts' && ['GET', 'POST'].includes(method))
      return await adminBlog(req);
    if (
      segments[0] === 'admin' &&
      segments[1] === 'content' &&
      segments[2] === 'posts' &&
      segments[3] &&
      method === 'PATCH'
    )
      return await adminBlog(req, segments[3]);
    if (route === 'admin/catalog/categories' && ['GET', 'POST'].includes(method))
      return await adminCategories(req);
    if (
      segments[0] === 'admin' &&
      segments[1] === 'catalog' &&
      segments[2] === 'categories' &&
      segments[3] &&
      method === 'PATCH'
    )
      return await adminCategories(req, segments[3]);
    if (route === 'admin/content/pages' && ['GET', 'POST'].includes(method))
      return await adminPages(req);
    if (
      segments[0] === 'admin' &&
      segments[1] === 'content' &&
      segments[2] === 'pages' &&
      segments[3] &&
      method === 'PATCH'
    )
      return await adminPages(req, segments[3]);
    if (route === 'admin/media' && method === 'GET') return await adminMedia(req);
    if (route === 'admin/audit' && method === 'GET') return await adminAudit(req);
    if (route === 'admin/service-areas' && ['GET', 'POST'].includes(method))
      return await adminServiceAreas(req);
    if (
      segments[0] === 'admin' &&
      segments[1] === 'service-areas' &&
      segments[2] &&
      method === 'PATCH'
    )
      return await adminServiceAreas(req, segments[2]);
    if (route === 'admin/promotions' && ['GET', 'POST'].includes(method))
      return await adminPromotions(req);
    if (
      segments[0] === 'admin' &&
      segments[1] === 'promotions' &&
      segments[2] &&
      method === 'PATCH'
    )
      return await adminPromotions(req, segments[2]);
    if (route === 'admin/support' && method === 'GET') return await adminSupport(req);
    if (segments[0] === 'admin' && segments[1] === 'support' && segments[2] && method === 'PATCH')
      return await adminSupport(req, segments[2]);
    if (route === 'admin/reviews' && method === 'GET') return await adminReviews(req);
    if (segments[0] === 'admin' && segments[1] === 'reviews' && segments[2] && method === 'PATCH')
      return await adminReviews(req, segments[2]);
    if (route === 'admin/settings' && ['GET', 'PUT'].includes(method))
      return await adminSettings(req);
    throw new CloudflareApiError(404, 'Route not found');
  } catch (error) {
    const details = error instanceof CloudflareApiError ? error.details : undefined;
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    let status = error instanceof CloudflareApiError ? error.status : 500;
    if (/UNIQUE constraint failed/i.test(message)) status = 409;
    const payload: Record<string, unknown> = {
      error: status >= 500 ? 'Unexpected server error' : message,
    };
    if (details) payload.details = details;
    if (status >= 500 && process.env.NODE_ENV !== 'production') payload.debug = message;
    return apiJson(payload, status);
  }
}
