import type { NextRequest } from 'next/server';
import { z } from 'zod';
import catalog from '../data/catalog.json';
import { rankMarketplaceProducts } from '../../lib/matching';
import { DEMO_PASSWORD } from '../../lib/demo-accounts';
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
  coordinateInventory,
  currentAuth,
  enforceRateLimit,
  hashPassword,
  issueSession,
  parseJson,
  publicUser,
  refreshFromRequest,
  requestBody,
  requireAuth,
  requireTenantAccess,
  safeSecretEqual,
  revokeSession,
  rotateSession,
  slugify,
  verifyPassword,
  verifyTurnstile,
  type CloudflareUserRow,
} from './platform';
import { supplyStackStatus } from './supply-stack';
import {
  customersApi,
  deliveryRoutesApi,
  harvestPlansApi,
  lotsApi,
  purchaseOrdersApi,
  priceListsApi,
  qualityApi,
  subscriptionsApi,
  suppliersApi,
  supplyOverview,
  supplyReportsApi,
  platformEventsApi,
  platformNetworkApi,
  platformPlansApi,
  platformTenantsApi,
  tenantTeamApi,
  tenantSaasProfileApi,
  warehousesApi,
} from './supply-api';
import {
  buyerDemandOffersApi,
  farmerAiAssistantApi,
  buyerDemandsApi,
  cropCyclesApi,
  farmExpensesApi,
  farmerOsOverviewApi,
  farmerProfitabilityApi,
  farmerRecommendationsApi,
  publicTraceabilityApi,
  traceabilityApi,
} from './farmer-os-api';
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
import {
  cartApi,
  commerceSummaryApi,
  deliverySlotsApi,
  inventoryAlertRulesApi,
  returnsApi,
  tenantReturnsApi,
  updateReturnApi,
  validateCouponApi,
} from './commerce-api';

const accountPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200)
  .refine((value) => /[a-z]/.test(value), 'Add a lowercase letter')
  .refine((value) => /[A-Z]/.test(value), 'Add an uppercase letter')
  .refine((value) => /\d/.test(value), 'Add a number');

const buyerRegistration = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: accountPassword,
  phone: z.string().max(30).optional(),
  turnstileToken: z.string().max(2048).optional(),
});
const farmerRegistration = z.object({
  farmName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: accountPassword,
  phone: z.string().min(7).max(30),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().min(2),
  ward: z.string().min(1).max(20),
  specialties: z.string().min(2).max(1000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  turnstileToken: z.string().max(2048).optional(),
});
const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().max(2048).optional(),
});
const strongPassword = z
  .string()
  .min(14)
  .max(200)
  .refine((value) => /[a-z]/.test(value), 'Add a lowercase letter')
  .refine((value) => /[A-Z]/.test(value), 'Add an uppercase letter')
  .refine((value) => /\d/.test(value), 'Add a number')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'Add a symbol');
const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: strongPassword,
});
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
  images: z
    .array(
      z.string().max(500).refine((value) => value.startsWith('/api/media/') || value.startsWith('/products/')),
    )
    .max(8)
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
  couponCode: z.string().trim().min(2).max(60).optional(),
  deliverySlotId: z.string().min(1).max(120).optional(),
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
  id: string; tenant_id: string; slug: string;
  name?: string; category?: string; province?: string; district?: string; municipality?: string; unit?: string;
  price?: number; old_price?: number; stock?: number; minimum_order?: number; grade?: string | null;
  harvest_date?: string | null; harvest_window?: string | null; unique_story?: string | null;
  short_description?: string | null; description?: string | null;
  image_url?: string | null; image_key?: string | null; images_json?: string | null; benefits?: string;
  organic?: number; featured?: number; wholesale?: number; subscription?: number;
  lat?: number; lng?: number; delivery_radius_km?: number; status?: string; rating?: number;
  farm_name?: string; farm_slug?: string; tenant_status?: string; farm_same_day?: number; farm_pickup?: number;
  created_at?: string; updated_at?: string;
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

async function checkoutCoordinationKey(lines: Array<{ productSlug: string }>) {
  const inventorySet = [...new Set(lines.map((line) => line.productSlug))].sort().join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(inventorySet));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

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
    name: String(row.name || ''),
    category,
    province: String(row.province || ''),
    provinceName: provinces.get(String(row.province)) || String(row.province || ''),
    district: String(row.district || ''),
    municipality: String(row.municipality || ''),
    unit: String(row.unit || 'unit'),
    price: Number(row.price || 0),
    oldPrice: Number(row.old_price || row.price || 0),
    stock: Number(row.stock || 0),
    minimumOrder: Number(row.minimum_order || 1),
    organic: Boolean(row.organic),
    grade: row.grade ? String(row.grade) : null,
    harvestDate: row.harvest_date ? String(row.harvest_date) : null,
    harvestWindow: row.harvest_window ? String(row.harvest_window) : null,
    uniqueStory: row.unique_story ? String(row.unique_story) : null,
    shortDescription: row.short_description ? String(row.short_description) : null,
    description: row.description ? String(row.description) : null,
    benefits: parseJson(row.benefits, [] as string[]),
    image:
      row.image_url ||
      (row.image_key ? `/api/media/${row.image_key}` : `/products/${category}.svg`),
    images: parseJson(row.images_json, [] as string[])
      .filter((image): image is string => typeof image === 'string')
      .slice(0, 8),
    lat: Number(row.lat),
    lng: Number(row.lng),
    deliveryRadiusKm: Number(row.delivery_radius_km || 35),
    wholesale: Boolean(row.wholesale),
    subscription: Boolean(row.subscription),
    status: String(row.status || 'active'),
    rating: Number(row.rating || 4.8),
    featured: Boolean(row.featured),
    farmName: row.farm_name ? String(row.farm_name) : null,
    farmSlug: row.farm_slug ? String(row.farm_slug) : null,
    farmerVerified: row.tenant_status === 'verified',
    farmSameDay: Boolean(row.farm_same_day),
    farmPickup: Boolean(row.farm_pickup),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function tenantPublic(row: TenantRow) {
  return {
    _id: row.id,
    id: row.id,
    slug: row.slug,
    name: String(row.name || ''),
    ownerName: row.owner_name,
    type: row.type,
    plan: row.plan,
    status: String(row.status || 'active'),
    location: {
      province: String(row.province || ''),
      district: String(row.district || ''),
      municipality: String(row.municipality || ''),
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
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

const productSelect = `SELECT p.*,t.name AS farm_name,t.slug AS farm_slug,t.status AS tenant_status,t.commission_rate,t.same_day_enabled AS farm_same_day,t.pickup_enabled AS farm_pickup
  FROM products p JOIN tenants t ON t.id=p.tenant_id`;

function sessionResponsePayload(
  req: NextRequest,
  user: CloudflareUserRow,
  tokens: { accessToken: string; refreshToken: string },
  extra: Record<string, unknown> = {},
) {
  const isMobile = req.headers.get('x-client-platform')?.toLowerCase() === 'mobile';
  return { user: publicUser(user), ...extra, ...(isMobile ? tokens : {}) };
}

async function registerBuyer(req: NextRequest) {
  await enforceRateLimit(req, 8, 60, 'auth:register-buyer');
  const env = cloudflareEnv();
  const input = validation(buyerRegistration, await requestBody(req));
  await verifyTurnstile(req, input.turnstileToken, 'register');
  const existing = await env.HARIYO_DB.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE')
    .bind(input.email.toLowerCase())
    .first<{ id: string }>();
  if (existing) throw new CloudflareApiError(409, 'An account already exists for this email');
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
  return attachSessionCookies(req, apiJson(sessionResponsePayload(req, user!, tokens), 201), tokens);
}

async function registerFarmer(req: NextRequest) {
  await enforceRateLimit(req, 6, 60, 'auth:register-farmer');
  const env = cloudflareEnv();
  const input = validation(farmerRegistration, await requestBody(req));
  await verifyTurnstile(req, input.turnstileToken, 'register');
  const existing = await env.HARIYO_DB.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE')
    .bind(input.email.toLowerCase())
    .first<{ id: string }>();
  if (existing) throw new CloudflareApiError(409, 'An account already exists for this email');
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
      `INSERT INTO users (id,tenant_id,active_tenant_id,name,email,phone,password_hash,role,is_verified,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'farmer',0,?,?)`,
    ).bind(
      userId,
      tenantId,
      tenantId,
      input.ownerName,
      input.email.toLowerCase(),
      input.phone,
      await hashPassword(input.password),
      now,
      now,
    ),
    env.HARIYO_DB.prepare(
      `INSERT INTO tenant_members (tenant_id,user_id,role,status,joined_at,created_at) VALUES (?,?,'owner','active',?,?)`,
    ).bind(tenantId, userId, now, now),
    env.HARIYO_DB.prepare(
      `INSERT INTO tenant_subscriptions (tenant_id,plan_code,status,trial_ends_at,updated_at) VALUES (?,'starter','trialing',?,?)`,
    ).bind(tenantId, new Date(Date.now() + 14 * 86400000).toISOString(), now),
    env.HARIYO_DB.prepare(
      `INSERT INTO tenant_settings_v8 (tenant_id,updated_at) VALUES (?,?)`,
    ).bind(tenantId, now),
  ]);
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(userId)
    .first<CloudflareUserRow>();
  const tokens = await issueSession(user!);
  await audit(req, user!, 'auth.farmer_registered', 'tenant', tenantId);
  return attachSessionCookies(
    req,
    apiJson(
      sessionResponsePayload(req, user!, tokens, { tenant: { id: tenantId, slug: tenantSlug } }),
      201,
    ),
    tokens,
  );
}

async function login(req: NextRequest) {
  await enforceRateLimit(req, 12, 60, 'auth:login');
  const env = cloudflareEnv();
  const input = validation(loginInput, await requestBody(req));
  const email = input.email.toLowerCase();
  const envRecord = env as unknown as Record<string, unknown>;
  const productionTestMode =
    String(env.APP_ENV) === 'production' && String(envRecord.PRODUCTION_TEST_MODE) === 'true';
  const isProductionTestBuyer =
    productionTestMode && email === 'buyer@demo.hariyomart.local' && input.password === DEMO_PASSWORD;

  // The scoped production-test buyer is intentionally allowed through without Turnstile so
  // a new deployment can always be smoke-tested even before the real widget keys are installed.
  // All real production accounts still require the configured Turnstile policy.
  if (!isProductionTestBuyer) await verifyTurnstile(req, input.turnstileToken, 'login');

  let user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE')
    .bind(email)
    .first<CloudflareUserRow>();

  if (isProductionTestBuyer && !user) {
    const now = new Date().toISOString();
    await env.HARIYO_DB.prepare(
      `INSERT INTO users (id,tenant_id,active_tenant_id,name,email,phone,password_hash,role,is_verified,language,marketing_opt_in,reward_points,addresses,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'customer',1,'en',0,0,'[]',?,?)`,
    )
      .bind(
        'production-test-buyer',
        null,
        null,
        'Hariyo Production Test Buyer',
        email,
        null,
        await hashPassword(DEMO_PASSWORD),
        now,
        now,
      )
      .run();
    user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE')
      .bind(email)
      .first<CloudflareUserRow>();
  }

  if (!user || !(await verifyPassword(input.password, user.password_hash)))
    throw new CloudflareApiError(401, 'Invalid email or password');
  const tokens = await issueSession(user);
  await audit(req, user, 'auth.login', 'user', user.id);
  return attachSessionCookies(req, apiJson(sessionResponsePayload(req, user, tokens)), tokens);
}

async function refresh(req: NextRequest) {
  await enforceRateLimit(req, 60, 60, 'auth:refresh');
  const input = (await requestBody(req)) as { refreshToken?: string };
  const token = refreshFromRequest(req, input);
  if (!token) throw new CloudflareApiError(401, 'Refresh token required');
  const result = await rotateSession(token);
  return attachSessionCookies(
    req,
    apiJson(sessionResponsePayload(req, result.user, result.tokens)),
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
    z.object({ name: z.string().min(2), email: z.string().email(), password: strongPassword }),
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
  return apiJson({ user: publicUser(user!), bootstrapLocked: true }, 201);
}

async function changePassword(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const input = validation(passwordChangeInput, await requestBody(req));
  if (!(await verifyPassword(input.currentPassword, user.password_hash)))
    throw new CloudflareApiError(401, 'Current password is incorrect');
  if (await verifyPassword(input.newPassword, user.password_hash))
    throw new CloudflareApiError(409, 'Choose a password you have not already used');
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.newPassword);
  try {
    await env.HARIYO_DB.prepare(
      'UPDATE users SET password_hash=?,must_change_password=0,password_changed_at=?,updated_at=? WHERE id=?',
    ).bind(passwordHash, now, now, user.id).run();
  } catch {
    // Backward-compatible path if the access-control migration has not been applied yet.
    await env.HARIYO_DB.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?')
      .bind(passwordHash, now, user.id)
      .run();
  }
  await env.HARIYO_DB.prepare(
    'UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL',
  ).bind(now, user.id).run();
  await audit(req, user, 'account.password_changed', 'user', user.id);
  return clearSessionCookies(apiJson({ ok: true, signInAgain: true }));
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
  const user = await requireAuth(req);
  if (user.role === 'admin') {
    const result = await env.HARIYO_DB.prepare(
      `${productSelect} WHERE 1=1 ORDER BY p.updated_at DESC LIMIT 500`,
    ).all<ProductRow>();
    return apiJson({ data: (result.results || []).map(productPublic) });
  }
  const access = await requireTenantAccess(req, ['owner', 'admin', 'manager', 'inventory', 'sales', 'farmer']);
  const result = await env.HARIYO_DB.prepare(
    `${productSelect} WHERE p.tenant_id=? ORDER BY p.updated_at DESC LIMIT 300`,
  ).bind(access.tenantId).all<ProductRow>();
  return apiJson({ data: (result.results || []).map(productPublic), tenantId: access.tenantId });
}

async function createProduct(req: NextRequest) {
  const env = cloudflareEnv();
  const access = await requireTenantAccess(req, ['owner', 'admin', 'manager', 'inventory', 'sales', 'farmer']);
  const input = validation(productInput, await requestBody(req));
  const planUsage = await env.HARIYO_DB.prepare(`SELECT COALESCE(p.max_products,150) max_products,(SELECT COUNT(*) FROM products x WHERE x.tenant_id=t.id AND x.status!='archived') used_products FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter') WHERE t.id=?`).bind(access.tenantId).first<{ max_products: number; used_products: number }>();
  if (planUsage && Number(planUsage.used_products || 0) >= Number(planUsage.max_products || 150))
    throw new CloudflareApiError(409, `Your SaaS plan allows ${Number(planUsage.max_products || 150)} active products. Upgrade the workspace plan or archive an existing product.`);
  const id = crypto.randomUUID();
  const slug = `${slugify(input.slug || input.name)}-${id.slice(0, 6)}`;
  const now = new Date().toISOString();
  await env.HARIYO_DB.prepare(
    `INSERT INTO products (id,tenant_id,slug,name,category,province,district,municipality,unit,price,stock,minimum_order,organic,grade,harvest_date,harvest_window,unique_story,short_description,description,image_url,images_json,lat,lng,delivery_radius_km,wholesale,subscription,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_review',?,?)`,
  )
    .bind(
      id, access.tenantId, slug, input.name, input.category, input.province, input.district,
      input.municipality || null, input.unit, input.price, input.stock, input.minimumOrder,
      input.organic ? 1 : 0, input.grade || null, input.harvestDate || null, input.harvestWindow || null,
      input.uniqueStory || null, input.shortDescription || null, input.description || null, input.image || null,
      JSON.stringify(input.images || []), input.lat, input.lng, input.deliveryRadiusKm,
      input.wholesale ? 1 : 0, input.subscription ? 1 : 0, now, now,
    ).run();
  await audit(req, access.user, 'product.created', 'product', id, { slug, tenantId: access.tenantId });
  const row = await env.HARIYO_DB.prepare(`${productSelect} WHERE p.id=?`).bind(id).first<ProductRow>();
  return apiJson({ product: productPublic(row!), status: 'pending_review' }, 201);
}

async function patchProduct(req: NextRequest, id: string) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const product = await env.HARIYO_DB.prepare('SELECT * FROM products WHERE id=? OR slug=?')
    .bind(id, id).first<ProductRow>();
  if (!product) throw new CloudflareApiError(404, 'Product not found');

  let platformAdmin = user.role === 'admin';
  if (!platformAdmin) {
    const access = await requireTenantAccess(req, ['owner', 'admin', 'manager', 'inventory', 'sales', 'farmer']);
    if (product.tenant_id !== access.tenantId)
      throw new CloudflareApiError(403, 'This listing belongs to another tenant');
  }

  const input = validation(
    z.object({
      status: z.enum(['draft', 'pending_review', 'active', 'paused', 'rejected', 'archived']).optional(),
      name: z.string().min(2).max(160).optional(),
      category: z.string().min(2).max(80).optional(),
      province: z.string().min(2).max(80).optional(),
      district: z.string().min(2).max(100).optional(),
      municipality: z.string().max(100).nullable().optional(),
      unit: z.string().min(1).max(40).optional(),
      price: z.coerce.number().nonnegative().max(10_000_000).optional(),
      stock: z.coerce.number().nonnegative().max(10_000_000).optional(),
      minimumOrder: z.coerce.number().positive().max(1_000_000).optional(),
      organic: z.boolean().optional(),
      grade: z.string().max(100).nullable().optional(),
      harvestDate: z.string().max(40).nullable().optional(),
      harvestWindow: z.string().max(200).nullable().optional(),
      uniqueStory: z.string().max(2000).nullable().optional(),
      shortDescription: z.string().max(500).nullable().optional(),
      description: z.string().max(10000).nullable().optional(),
      image: z.string().max(500).refine((value) => value.startsWith('/api/media/') || value.startsWith('/products/')).nullable().optional(),
      images: z.array(z.string().max(500).refine((value) => value.startsWith('/api/media/') || value.startsWith('/products/'))).max(8).optional(),
      deliveryRadiusKm: z.coerce.number().min(1).max(1000).optional(),
      wholesale: z.boolean().optional(),
      subscription: z.boolean().optional(),
      featured: z.boolean().optional(),
    }).strict(),
    await requestBody(req),
  );
  if (input.status === 'active' && !platformAdmin)
    throw new CloudflareApiError(403, 'Marketplace approval is required to activate a listing');
  if (input.featured !== undefined && !platformAdmin)
    throw new CloudflareApiError(403, 'Only marketplace staff can feature a listing');
  if (input.status === 'active') {
    const tenant = await env.HARIYO_DB.prepare('SELECT status FROM tenants WHERE id=?').bind(product.tenant_id).first<{ status: string }>();
    if (tenant?.status !== 'verified')
      throw new CloudflareApiError(409, 'Verify the seller tenant before activating products');
  }

  const moderatedFields = ['name','category','province','district','municipality','unit','grade','harvestDate','harvestWindow','uniqueStory','shortDescription','description','image','images'] as const;
  const requiresReview = !platformAdmin && product.status === 'active' && moderatedFields.some((field) => field in input);
  const nextStatus = requiresReview ? 'pending_review' : input.status;
  const now = new Date().toISOString();
  const productUpdate = env.HARIYO_DB.prepare(
    `UPDATE products SET
      status=COALESCE(?,status),name=COALESCE(?,name),category=COALESCE(?,category),province=COALESCE(?,province),
      district=COALESCE(?,district),municipality=CASE WHEN ? THEN ? ELSE municipality END,unit=COALESCE(?,unit),
      price=COALESCE(?,price),minimum_order=COALESCE(?,minimum_order),organic=COALESCE(?,organic),
      grade=CASE WHEN ? THEN ? ELSE grade END,harvest_date=CASE WHEN ? THEN ? ELSE harvest_date END,
      harvest_window=CASE WHEN ? THEN ? ELSE harvest_window END,unique_story=CASE WHEN ? THEN ? ELSE unique_story END,
      short_description=CASE WHEN ? THEN ? ELSE short_description END,description=CASE WHEN ? THEN ? ELSE description END,
      image_url=CASE WHEN ? THEN ? ELSE image_url END,images_json=CASE WHEN ? THEN ? ELSE images_json END,
      delivery_radius_km=COALESCE(?,delivery_radius_km),wholesale=COALESCE(?,wholesale),subscription=COALESCE(?,subscription),
      featured=COALESCE(?,featured),updated_at=? WHERE id=?`,
  ).bind(
    nextStatus || null, input.name ?? null, input.category ?? null, input.province ?? null, input.district ?? null,
    'municipality' in input ? 1 : 0, input.municipality ?? null, input.unit ?? null, input.price ?? null, input.minimumOrder ?? null,
    input.organic === undefined ? null : input.organic ? 1 : 0,
    'grade' in input ? 1 : 0, input.grade ?? null, 'harvestDate' in input ? 1 : 0, input.harvestDate ?? null,
    'harvestWindow' in input ? 1 : 0, input.harvestWindow ?? null, 'uniqueStory' in input ? 1 : 0, input.uniqueStory ?? null,
    'shortDescription' in input ? 1 : 0, input.shortDescription ?? null, 'description' in input ? 1 : 0, input.description ?? null,
    'image' in input ? 1 : 0, input.image ?? null,
    'images' in input ? 1 : 0, input.images ? JSON.stringify(input.images) : null, input.deliveryRadiusKm ?? null,
    input.wholesale === undefined ? null : input.wholesale ? 1 : 0,
    input.subscription === undefined ? null : input.subscription ? 1 : 0,
    input.featured === undefined ? null : input.featured ? 1 : 0, now, product.id,
  );
  const priceChanged = input.price !== undefined && Number(input.price) !== Number(product.price || 0);
  if (priceChanged) {
    await env.HARIYO_DB.batch([
      productUpdate,
      env.HARIYO_DB.prepare(
        `INSERT INTO product_price_history (id,product_id,tenant_id,old_price,new_price,changed_by,reason,changed_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(), product.id, product.tenant_id, Number(product.price || 0), Number(input.price),
        user.id, 'Product workspace price update', now,
      ),
    ]);
  } else {
    await productUpdate.run();
  }

  const stockChanged = input.stock !== undefined && input.stock !== Number(product.stock || 0);
  if (stockChanged) {
    const coordinated = await coordinateInventory({ action: 'set', productId: product.id, stock: Number(input.stock), actorId: user.id, reason: 'Stock updated from product workspace' });
    if (!coordinated) {
      await env.HARIYO_DB.batch([
        env.HARIYO_DB.prepare('UPDATE products SET stock=?,updated_at=? WHERE id=?').bind(Number(input.stock), now, product.id),
        env.HARIYO_DB.prepare(`INSERT INTO inventory_events (id,product_id,tenant_id,actor_id,event_type,quantity_change,stock_after,reason,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .bind(crypto.randomUUID(), product.id, product.tenant_id, user.id, 'adjustment', Number(input.stock) - Number(product.stock || 0), Number(input.stock), 'Stock updated from product workspace (local fallback)', 'product_update', product.id),
      ]);
    }
  }
  await audit(req, user, 'product.updated', 'product', product.id, { ...input, status: nextStatus || product.status });
  const row = await env.HARIYO_DB.prepare(`${productSelect} WHERE p.id=?`).bind(product.id).first<ProductRow>();
  return apiJson({ product: productPublic(row!), status: nextStatus || row?.status });
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
    .HARIYO_DB.prepare(`${productSelect} WHERE p.status='active' AND t.status='verified' LIMIT 750`)
    .all<ProductRow>();
  const maxPriceValue = url.searchParams.get('maxPrice');
  const maxPrice = maxPriceValue ? Number(maxPriceValue) : undefined;
  const ranked = rankMarketplaceProducts(
    (rows.results || []).map((row) => ({
      ...productPublic(row),
      lat: Number(row.lat),
      lng: Number(row.lng),
    })),
    {
      lat,
      lng,
      radiusKm: radius,
      category: url.searchParams.get('category') || undefined,
      query: url.searchParams.get('q') || undefined,
      organicOnly: url.searchParams.get('organic') === '1',
      wholesaleOnly: url.searchParams.get('wholesale') === '1',
      subscriptionOnly: url.searchParams.get('subscription') === '1',
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    },
  );
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 48)));
  return apiJson({
    data: ranked.slice(0, limit),
    center: { lat, lng },
    radiusKm: radius,
    matching: {
      engine: 'Hariyo Match v3',
      factors: [
        'delivery fit',
        'freshness',
        'live stock',
        'rating',
        'seller trust',
        'buyer intent',
        'quality',
        'budget',
      ],
    },
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
        headers: {
          'content-type': 'application/json',
          'x-checkout-coordination-key': await checkoutCoordinationKey(input.lines),
        },
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
      if (env.APP_ENV === 'production')
        throw new CloudflareApiError(503, 'Cloudflare inventory coordination service is unavailable');
      responseData = await checkoutCore(env, payload);
    }
  } else {
    if (env.APP_ENV === 'production')
      throw new CloudflareApiError(503, 'Cloudflare inventory coordination service is not bound');
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
  const [fulfillments, items] = await Promise.all([
    env.HARIYO_DB.prepare(
      `SELECT * FROM fulfillments WHERE order_id IN (${placeholders}) ORDER BY created_at`,
    )
      .bind(...ids)
      .all<FulfillmentRow>(),
    env.HARIYO_DB.prepare(
      `SELECT id,order_id,fulfillment_id,product_id,tenant_id,product_name,product_slug,unit,unit_price,quantity,line_total
       FROM order_items WHERE order_id IN (${placeholders}) ORDER BY rowid`,
    )
      .bind(...ids)
      .all<Record<string, unknown> & { order_id: string }>(),
  ]);
  const byOrder = new Map<string, unknown[]>();
  const itemsByOrder = new Map<string, unknown[]>();
  for (const item of items.results || []) {
    itemsByOrder.set(item.order_id, [
      ...(itemsByOrder.get(item.order_id) || []),
      {
        ...item,
        _id: item.id,
        orderId: item.order_id,
        fulfillmentId: item.fulfillment_id,
        productId: item.product_id,
        tenantId: item.tenant_id,
        productName: item.product_name,
        productSlug: item.product_slug,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      },
    ]);
  }
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
    guestCustomer: parseJson<{ name?: string; phone?: string; email?: string } | null>(
      order.guest_customer,
      null,
    ),
    deliveryAddress: parseJson<{ phone?: string; [key: string]: unknown }>(
      order.delivery_address,
      {},
    ),
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    deliveryFee: Number(order.delivery_fee),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    fulfillments: byOrder.get(order.id) || [],
    items: itemsByOrder.get(order.id) || [],
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
  const order = orders[0];
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
  const now = new Date().toISOString();
  const cancellationPayload = {
    orderId: order.id,
    orderNumber: order.order_number,
    actorId: user.id,
    items: items.results || [],
  };
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").bind(now, order.id),
    env.HARIYO_DB.prepare("UPDATE fulfillments SET status='cancelled',updated_at=? WHERE order_id=?").bind(now, order.id),
    env.HARIYO_DB.prepare(
      `INSERT OR IGNORE INTO integration_outbox (id,topic,aggregate_type,aggregate_id,payload_json,status,idempotency_key,available_at,created_at)
       VALUES (?,'order.cancelled.inventory_restore','order',?,?,'pending',?,?,?)`,
    ).bind(crypto.randomUUID(), order.id, JSON.stringify(cancellationPayload), `cancel:${order.id}`, now, now),
  ]);
  let inventoryRecovery: 'coordinated' | 'queued' = 'coordinated';
  for (const item of items.results || []) {
    try {
      const coordinated = await coordinateInventory({
        action: 'adjust',
        productId: item.product_id,
        quantityChange: Number(item.quantity),
        actorId: user.id,
        eventType: 'return',
        reason: `Order ${order.order_number} cancelled`,
        operationId: `cancel:${order.id}:${item.product_id}`,
      });
      if (!coordinated) {
        await env.HARIYO_DB.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?')
          .bind(item.quantity, now, item.product_id)
          .run();
      }
    } catch {
      inventoryRecovery = 'queued';
    }
  }
  await audit(req, user, 'order.cancelled', 'order', order.id, { inventoryRecovery });
  return apiJson({ ok: true, inventoryRecovery });
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

async function myTenantMemberships(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  if (user.role === 'admin') {
    const result = await env.HARIYO_DB.prepare(
      `SELECT t.id,t.slug,t.name,t.type,t.status,t.plan,'platform_admin' AS member_role
       FROM tenants t ORDER BY t.name LIMIT 500`,
    ).all<Record<string, unknown>>();
    return apiJson({ activeTenantId: user.tenant_id, data: result.results || [] });
  }
  const result = await env.HARIYO_DB.prepare(
    `SELECT t.id,t.slug,t.name,t.type,t.status,t.plan,m.role AS member_role,m.status AS member_status
     FROM tenant_members m JOIN tenants t ON t.id=m.tenant_id
     WHERE m.user_id=? AND m.status='active' ORDER BY t.name`,
  )
    .bind(user.id)
    .all<Record<string, unknown>>();
  return apiJson({ activeTenantId: user.tenant_id, data: result.results || [] });
}

async function switchTenant(req: NextRequest) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const input = validation(z.object({ tenantId: z.string().min(1).max(120) }), await requestBody(req));
  const tenant = await env.HARIYO_DB.prepare('SELECT id,status FROM tenants WHERE id=?')
    .bind(input.tenantId)
    .first<{ id: string; status: string }>();
  if (!tenant) throw new CloudflareApiError(404, 'Tenant workspace not found');
  if (user.role !== 'admin') {
    const membership = await env.HARIYO_DB.prepare(
      `SELECT role FROM tenant_members WHERE tenant_id=? AND user_id=? AND status='active'`,
    )
      .bind(input.tenantId, user.id)
      .first<{ role: string }>();
    if (!membership) throw new CloudflareApiError(403, 'You do not have access to this workspace');
  }
  await env.HARIYO_DB.prepare('UPDATE users SET active_tenant_id=?,updated_at=? WHERE id=?')
    .bind(input.tenantId, new Date().toISOString(), user.id)
    .run();
  const updated = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(user.id)
    .first<CloudflareUserRow>();
  const tokens = await issueSession(updated!);
  await audit(req, { ...updated!, tenant_id: input.tenantId }, 'tenant.switched', 'tenant', input.tenantId);
  return attachSessionCookies(
    req,
    apiJson(sessionResponsePayload(req, updated!, tokens, { tenantId: input.tenantId })),
    tokens,
  );
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
  const access = user.role === 'admin'
    ? { tenantId: user.tenant_id || 'admin' }
    : await requireTenantAccess(req, ['owner', 'admin', 'manager', 'inventory', 'sales', 'farmer']);
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
  const tenant = access.tenantId;
  const key = `products/${tenant}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  await env.HARIYO_MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { ownerId: user.id, tenantId: tenant },
  });
  await env.HARIYO_DB.prepare(
    'INSERT INTO media (id,tenant_id,owner_id,object_key,content_type,size_bytes) VALUES (?,?,?,?,?,?)',
  )
    .bind(crypto.randomUUID(), tenant === 'admin' ? null : tenant, user.id, key, file.type, file.size)
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
  let adminConfigured = false;
  let seed = { tenants: 0, products: 0, orders: 0, demoUsers: 0 };
  try {
    await env.HARIYO_DB.prepare('SELECT 1 AS ok').first();
    const [admin, tenantCount, productCount, orderCount, demoUserCount] = await Promise.all([
      env.HARIYO_DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin'").first<{
        count: number;
      }>(),
      env.HARIYO_DB.prepare('SELECT COUNT(*) AS count FROM tenants').first<{ count: number }>(),
      env.HARIYO_DB.prepare('SELECT COUNT(*) AS count FROM products').first<{ count: number }>(),
      env.HARIYO_DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>(),
      env.HARIYO_DB.prepare("SELECT COUNT(*) AS count FROM users WHERE email LIKE '%@demo.hariyomart.local'").first<{ count: number }>(),
    ]);
    adminConfigured = Number(admin?.count || 0) > 0;
    seed = {
      tenants: Number(tenantCount?.count || 0),
      products: Number(productCount?.count || 0),
      orders: Number(orderCount?.count || 0),
      demoUsers: Number(demoUserCount?.count || 0),
    };
  } catch {
    database = 'error';
  }
  const turnstileMode = String(env.TURNSTILE_ENFORCEMENT_MODE || 'web');
  const turnstileSiteKey = String(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');
  const turnstileConfigured =
    turnstileMode === 'off' ||
    (Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY.length >= 20) &&
      Boolean(turnstileSiteKey && !/REPLACE_WITH|PLACEHOLDER/i.test(turnstileSiteKey)));
  const envRecord = env as unknown as Record<string, unknown>;
  const productionTestMode = String(env.APP_ENV) === 'production' && String(envRecord.PRODUCTION_TEST_MODE) === 'true';
  const required = {
    D1: database === 'connected',
    R2: Boolean(env.HARIYO_MEDIA),
    KV: Boolean(env.HARIYO_KV),
    QUEUES: Boolean(env.HARIYO_EVENTS),
    SERVICES: Boolean(env.HARIYO_SERVICES),
    JWT_SECRET: Boolean(env.JWT_SECRET && env.JWT_SECRET.length >= 32),
    JWT_REFRESH_SECRET: Boolean(env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length >= 32),
    TURNSTILE: turnstileConfigured,
    DEMO_CLEAN: String(env.APP_ENV) !== 'production' || productionTestMode || seed.demoUsers === 0,
  };
  return apiJson({
    service: 'hariyo-mart-cloudflare',
    version: '8.6.2',
    status: Object.values(required).every(Boolean) && adminConfigured ? 'ready' : 'setup_required',
    architecture: 'Cloudflare Workers + D1 + Durable Objects + R2 + KV + Queues + Workflows + Turnstile',
    database,
    required,
    adminConfigured,
    seed,
    productionGuard: {
      demoFallbackEnabled: String(env.NEXT_PUBLIC_DEMO_MODE) === 'true' && (String(env.APP_ENV) !== 'production' || productionTestMode),
      productionTestMode,
      demoUsersPresent: seed.demoUsers > 0,
      turnstileConfigured,
    },
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
    if (route === 'system/supply-stack' && method === 'GET') return await supplyStackStatus();
    if (route === 'commerce/delivery-slots' && method === 'GET') return await deliverySlotsApi(req);
    if (route === 'commerce/coupons/validate' && method === 'POST') return await validateCouponApi(req);
    if (route === 'commerce/cart' && ['GET', 'PUT'].includes(method)) return await cartApi(req);
    if (route === 'commerce/returns' && ['GET', 'POST'].includes(method)) return await returnsApi(req);
    if (route === 'commerce/summary' && method === 'GET') return await commerceSummaryApi(req);
    if (route === 'commerce/inventory-alerts' && ['GET', 'POST'].includes(method)) return await inventoryAlertRulesApi(req);
    if (route === 'commerce/tenant/returns' && method === 'GET') return await tenantReturnsApi(req);
    if (segments[0] === 'commerce' && segments[1] === 'tenant' && segments[2] === 'returns' && segments[3] && method === 'PATCH')
      return await updateReturnApi(req, segments[3]);
    if (route === 'farmer-os/overview' && method === 'GET') return await farmerOsOverviewApi(req);
    if (route === 'farmer-os/crop-cycles' && ['GET', 'POST'].includes(method)) return await cropCyclesApi(req);
    if (route === 'farmer-os/expenses' && ['GET', 'POST'].includes(method)) return await farmExpensesApi(req);
    if (route === 'farmer-os/profitability' && method === 'GET') return await farmerProfitabilityApi(req);
    if (route === 'farmer-os/buyer-demands' && ['GET', 'POST'].includes(method)) return await buyerDemandsApi(req);
    if (route === 'farmer-os/buyer-demand-offers' && method === 'POST') return await buyerDemandOffersApi(req);
    if (route === 'farmer-os/traceability' && ['GET', 'POST'].includes(method)) return await traceabilityApi(req);
    if (route === 'farmer-os/recommendations' && method === 'GET') return await farmerRecommendationsApi(req);
    if (route === 'farmer-os/ai-assistant' && method === 'POST') return await farmerAiAssistantApi(req);
    if (segments[0] === 'trace' && segments[1] && method === 'GET') return await publicTraceabilityApi(segments[1]);
    if (route === 'supply/overview' && method === 'GET') return await supplyOverview(req);
    if (route === 'supply/suppliers' && ['GET', 'POST'].includes(method)) return await suppliersApi(req);
    if (route === 'supply/customers' && ['GET', 'POST'].includes(method)) return await customersApi(req);
    if (route === 'supply/warehouses' && ['GET', 'POST'].includes(method)) return await warehousesApi(req);
    if (route === 'supply/harvest-plans' && ['GET', 'POST'].includes(method)) return await harvestPlansApi(req);
    if (route === 'supply/lots' && ['GET', 'POST'].includes(method)) return await lotsApi(req);
    if (route === 'supply/quality' && ['GET', 'POST'].includes(method)) return await qualityApi(req);
    if (route === 'supply/purchase-orders' && ['GET', 'POST'].includes(method)) return await purchaseOrdersApi(req);
    if (route === 'supply/price-lists' && ['GET', 'POST'].includes(method)) return await priceListsApi(req);
    if (route === 'supply/delivery-routes' && ['GET', 'POST'].includes(method)) return await deliveryRoutesApi(req);
    if (route === 'supply/subscriptions' && ['GET', 'POST'].includes(method)) return await subscriptionsApi(req);
    if (route === 'supply/team' && method === 'GET') return await tenantTeamApi(req);
    if (route === 'supply/reports' && method === 'GET') return await supplyReportsApi(req);
    if (route === 'supply/saas-profile' && method === 'GET') return await tenantSaasProfileApi(req);
    if (route === 'supply/platform/tenants' && method === 'GET') return await platformTenantsApi(req);
    if (route === 'supply/platform/plans' && method === 'GET') return await platformPlansApi(req);
    if (route === 'supply/platform/network' && method === 'GET') return await platformNetworkApi(req);
    if (route === 'supply/platform/events' && method === 'GET') return await platformEventsApi(req);
    if (route === 'auth/register' && method === 'POST') return await registerBuyer(req);
    if (route === 'auth/register-farmer' && method === 'POST') return await registerFarmer(req);
    if (route === 'auth/login' && method === 'POST') return await login(req);
    if (route === 'auth/refresh' && method === 'POST') return await refresh(req);
    if (route === 'auth/logout' && method === 'POST') return await logout(req);
    if (route === 'auth/me' && method === 'GET') return await me(req);
    if (route === 'auth/bootstrap-admin' && method === 'POST') return await bootstrapAdmin(req);
    if (route === 'account/password' && method === 'POST') return await changePassword(req);
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
    if (route === 'tenants/memberships' && method === 'GET') return await myTenantMemberships(req);
    if (route === 'tenants/switch' && method === 'POST') return await switchTenant(req);
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
