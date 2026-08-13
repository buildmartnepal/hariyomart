import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiJson,
  audit,
  cloudflareEnv,
  CloudflareApiError,
  currentAuth,
  parseJson,
  requestBody,
  requireAuth,
  slugify,
} from './platform';

const newsletterInput = z.object({
  email: z.string().email().max(240),
  source: z.string().min(1).max(60).default('website'),
});

const contentSections = z
  .array(
    z.object({
      heading: z.string().min(2).max(180),
      paragraphs: z.array(z.string().min(2).max(3000)).min(1).max(12),
    }),
  )
  .min(1)
  .max(20);

const blogCreateInput = z.object({
  title: z.string().min(4).max(180),
  slug: z.string().min(2).max(140).optional(),
  excerpt: z.string().min(10).max(500),
  category: z.string().min(2).max(80),
  author: z.string().min(2).max(120),
  coverImage: z.string().max(500).optional(),
  content: contentSections,
  relatedCategory: z.string().max(80).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const blogPatchInput = blogCreateInput.partial().extend({
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
});

const serviceAreaInput = z.object({
  name: z.string().min(2).max(120),
  tenantId: z.string().uuid().nullable().optional(),
  province: z.string().min(2).max(80),
  districts: z.array(z.string().min(2).max(100)).max(30).default([]),
  centerLat: z.coerce.number().min(-90).max(90).nullable().optional(),
  centerLng: z.coerce.number().min(-180).max(180).nullable().optional(),
  radiusKm: z.coerce.number().positive().max(1000).default(35),
  deliveryFee: z.coerce.number().nonnegative().max(1_000_000).default(0),
  freeDeliveryAbove: z.coerce.number().nonnegative().max(10_000_000).nullable().optional(),
  minimumOrder: z.coerce.number().nonnegative().max(10_000_000).default(0),
  deliveryDays: z.array(z.string().min(2).max(12)).max(7).default([]),
  cutoffTime: z.string().max(20).nullable().optional(),
  active: z.boolean().default(true),
});

const promotionInput = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  code: z.string().min(2).max(40).nullable().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  discountType: z.enum(['percent', 'fixed', 'free_delivery']),
  discountValue: z.coerce.number().nonnegative().max(1_000_000),
  minimumOrder: z.coerce.number().nonnegative().max(10_000_000).default(0),
  maximumDiscount: z.coerce.number().nonnegative().max(10_000_000).nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
});

const categoryInput = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  description: z.string().min(6).max(300),
  emoji: z.string().min(1).max(16).default('🌱'),
  imageUrl: z.string().max(500).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
});

const cmsPageInput = z.object({
  title: z.string().min(3).max(180),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  summary: z.string().min(10).max(500),
  sections: contentSections,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
});

const reviewInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(4).max(2000),
  orderId: z.string().uuid().optional(),
});

const supportInput = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(240).optional(),
  phone: z.string().min(7).max(30).optional(),
  orderId: z.string().uuid().optional(),
  subject: z.string().min(4).max(180),
  message: z.string().min(10).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

function validation<T>(schema: z.ZodSchema<T>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new CloudflareApiError(400, 'Validation failed', parsed.error.flatten());
  return parsed.data;
}

function blogPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    author: row.author,
    coverImage: row.cover_image,
    sections: parseJson(String(row.content_json || '[]'), []),
    relatedCategory: row.related_category,
    status: row.status,
    featured: Boolean(row.featured),
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function areaPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    province: row.province,
    districts: parseJson(String(row.districts || '[]'), []),
    center: { lat: row.center_lat, lng: row.center_lng },
    radiusKm: Number(row.radius_km || 0),
    deliveryFee: Number(row.delivery_fee || 0),
    freeDeliveryAbove: row.free_delivery_above,
    minimumOrder: Number(row.minimum_order || 0),
    deliveryDays: parseJson(String(row.delivery_days || '[]'), []),
    cutoffTime: row.cutoff_time,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function promotionPublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    minimumOrder: Number(row.minimum_order || 0),
    maximumDiscount: row.maximum_discount,
    usageLimit: row.usage_limit,
    usageCount: Number(row.usage_count || 0),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function categoryPublic(row: Record<string, unknown>) {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    imageUrl: row.image_url,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pagePublic(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    sections: parseJson(String(row.sections_json || '[]'), []),
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function newsletterSubscribe(req: NextRequest) {
  const input = validation(newsletterInput, await requestBody(req));
  const env = cloudflareEnv();
  await env.HARIYO_DB.prepare(
    `INSERT INTO newsletter_subscribers (id,email,source,status,subscribed_at)
     VALUES (?,?,?,'subscribed',?)
     ON CONFLICT(email) DO UPDATE SET status='subscribed',source=excluded.source,subscribed_at=excluded.subscribed_at,unsubscribed_at=NULL`,
  )
    .bind(crypto.randomUUID(), input.email.toLowerCase(), input.source, new Date().toISOString())
    .run();
  return apiJson({ ok: true, message: 'Subscribed' }, 201);
}

export async function publicBlog(req: NextRequest, slug?: string) {
  const env = cloudflareEnv();
  if (slug) {
    const row = await env.HARIYO_DB.prepare(
      `SELECT * FROM blog_posts WHERE slug=? AND status='published' AND COALESCE(published_at,datetime('now'))<=datetime('now')`,
    )
      .bind(slug)
      .first<Record<string, unknown>>();
    if (!row) throw new CloudflareApiError(404, 'Story not found');
    return apiJson({ post: blogPublic(row) });
  }
  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get('limit') || 20)));
  const result = await env.HARIYO_DB.prepare(
    `SELECT * FROM blog_posts WHERE status='published' AND COALESCE(published_at,datetime('now'))<=datetime('now') ORDER BY featured DESC,published_at DESC,created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all<Record<string, unknown>>();
  return apiJson({ data: (result.results || []).map(blogPublic) });
}

export async function publicServiceAreas() {
  const result = await cloudflareEnv()
    .HARIYO_DB.prepare('SELECT * FROM service_areas WHERE active=1 ORDER BY province,name')
    .all<Record<string, unknown>>();
  return apiJson({ data: (result.results || []).map(areaPublic) });
}

export async function publicCategories() {
  const result = await cloudflareEnv()
    .HARIYO_DB.prepare('SELECT * FROM categories WHERE active=1 ORDER BY sort_order,name')
    .all<Record<string, unknown>>();
  return apiJson({ data: (result.results || []).map(categoryPublic) });
}

export async function publicPage(slug: string) {
  const row = await cloudflareEnv()
    .HARIYO_DB.prepare("SELECT * FROM cms_pages WHERE slug=? AND status='published'")
    .bind(slug)
    .first<Record<string, unknown>>();
  if (!row) throw new CloudflareApiError(404, 'Page not found');
  return apiJson({ page: pagePublic(row) });
}

export async function productReviews(req: NextRequest, productSlug: string) {
  const env = cloudflareEnv();
  const product = await env.HARIYO_DB.prepare('SELECT id FROM products WHERE slug=? OR id=?')
    .bind(productSlug, productSlug)
    .first<{ id: string }>();
  if (!product) throw new CloudflareApiError(404, 'Product not found');
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      `SELECT r.id,r.rating,r.title,r.body,r.seller_reply,r.created_at,u.name AS buyer_name
       FROM reviews r JOIN users u ON u.id=r.buyer_id
       WHERE r.product_id=? AND r.status='published' ORDER BY r.created_at DESC LIMIT 100`,
    )
      .bind(product.id)
      .all<Record<string, unknown>>();
    return apiJson({ data: result.results || [] });
  }
  const user = await requireAuth(req, ['customer', 'admin']);
  const input = validation(reviewInput, await requestBody(req));
  if (input.orderId) {
    const bought = await env.HARIYO_DB.prepare(
      `SELECT 1 AS ok FROM orders o JOIN order_items i ON i.order_id=o.id
       WHERE o.id=? AND o.buyer_id=? AND i.product_id=? AND o.status='delivered'`,
    )
      .bind(input.orderId, user.id, product.id)
      .first();
    if (!bought) throw new CloudflareApiError(409, 'Only delivered purchases can be reviewed');
  }
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(
    `INSERT INTO reviews (id,product_id,buyer_id,order_id,rating,title,body,status)
     VALUES (?,?,?,?,?,?,?,'pending')`,
  )
    .bind(
      id,
      product.id,
      user.id,
      input.orderId || null,
      input.rating,
      input.title || null,
      input.body,
    )
    .run();
  await audit(req, user, 'review.created', 'review', id, { productId: product.id });
  return apiJson({ id, status: 'pending' }, 201);
}

export async function createSupportTicket(req: NextRequest) {
  const input = validation(supportInput, await requestBody(req));
  const auth = await currentAuth(req);
  const env = cloudflareEnv();
  const id = crypto.randomUUID();
  const ticketNumber = `HM-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
  await env.HARIYO_DB.prepare(
    `INSERT INTO support_tickets (id,ticket_number,user_id,order_id,name,email,phone,subject,message,priority)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      ticketNumber,
      auth?.id || null,
      input.orderId || null,
      input.name,
      input.email || auth?.email || null,
      input.phone || auth?.phone || null,
      input.subject,
      input.message,
      input.priority,
    )
    .run();
  return apiJson({ id, ticketNumber, status: 'open' }, 201);
}

export async function adminOperations(req: NextRequest) {
  await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  const metrics = await env.HARIYO_DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','in_progress')) AS open_tickets,
      (SELECT COUNT(*) FROM reviews WHERE status='pending') AS pending_reviews,
      (SELECT COUNT(*) FROM blog_posts WHERE status IN ('draft','scheduled')) AS content_queue,
      (SELECT COUNT(*) FROM newsletter_subscribers WHERE status='subscribed') AS subscribers,
      (SELECT COUNT(*) FROM service_areas WHERE active=1) AS service_areas,
      (SELECT COUNT(*) FROM promotions WHERE active=1) AS active_promotions,
      (SELECT COUNT(*) FROM products WHERE status='active' AND stock<=10) AS low_stock,
      (SELECT COUNT(*) FROM orders WHERE status IN ('placed','confirmed','partially_fulfilled')) AS open_orders`,
  ).first<Record<string, number>>();
  const recentTickets = await env.HARIYO_DB.prepare(
    'SELECT id,ticket_number,name,subject,priority,status,created_at FROM support_tickets ORDER BY created_at DESC LIMIT 8',
  ).all<Record<string, unknown>>();
  return apiJson({
    metrics: {
      openTickets: Number(metrics?.open_tickets || 0),
      pendingReviews: Number(metrics?.pending_reviews || 0),
      contentQueue: Number(metrics?.content_queue || 0),
      subscribers: Number(metrics?.subscribers || 0),
      serviceAreas: Number(metrics?.service_areas || 0),
      activePromotions: Number(metrics?.active_promotions || 0),
      lowStock: Number(metrics?.low_stock || 0),
      openOrders: Number(metrics?.open_orders || 0),
    },
    recentTickets: recentTickets.results || [],
  });
}

export async function adminBlog(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT * FROM blog_posts ORDER BY updated_at DESC LIMIT 200',
    ).all<Record<string, unknown>>();
    return apiJson({ data: (result.results || []).map(blogPublic) });
  }
  const now = new Date().toISOString();
  if (req.method === 'POST') {
    const input = validation(blogCreateInput, await requestBody(req));
    const postId = crypto.randomUUID();
    const slug = `${slugify(input.slug || input.title)}-${postId.slice(0, 5)}`;
    const publishedAt =
      input.status === 'published' ? input.publishedAt || now : input.publishedAt || null;
    await env.HARIYO_DB.prepare(
      `INSERT INTO blog_posts (id,slug,title,excerpt,category,author,cover_image,content_json,related_category,status,featured,published_at,scheduled_at,created_by,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        postId,
        slug,
        input.title,
        input.excerpt,
        input.category,
        input.author,
        input.coverImage || null,
        JSON.stringify(input.content),
        input.relatedCategory || null,
        input.status,
        input.featured ? 1 : 0,
        publishedAt,
        input.scheduledAt || null,
        user.id,
        now,
        now,
      )
      .run();
    await audit(req, user, 'content.created', 'blog_post', postId, { slug, status: input.status });
    return apiJson({ id: postId, slug, status: input.status }, 201);
  }
  if (!id) throw new CloudflareApiError(400, 'Post id required');
  const current = await env.HARIYO_DB.prepare('SELECT * FROM blog_posts WHERE id=? OR slug=?')
    .bind(id, id)
    .first<Record<string, unknown>>();
  if (!current) throw new CloudflareApiError(404, 'Post not found');
  const input = validation(blogPatchInput, await requestBody(req));
  const title = input.title ?? String(current.title);
  const slug = input.slug ? slugify(input.slug) : String(current.slug);
  const publishedAt =
    input.status === 'published' && !input.publishedAt
      ? String(current.published_at || now)
      : (input.publishedAt ?? current.published_at);
  await env.HARIYO_DB.prepare(
    `UPDATE blog_posts SET slug=?,title=?,excerpt=?,category=?,author=?,cover_image=?,content_json=?,related_category=?,status=?,featured=?,published_at=?,scheduled_at=?,updated_at=? WHERE id=?`,
  )
    .bind(
      slug,
      title,
      input.excerpt ?? current.excerpt,
      input.category ?? current.category,
      input.author ?? current.author,
      input.coverImage ?? current.cover_image,
      input.content ? JSON.stringify(input.content) : current.content_json,
      input.relatedCategory ?? current.related_category,
      input.status ?? current.status,
      input.featured === undefined ? current.featured : input.featured ? 1 : 0,
      publishedAt,
      input.scheduledAt ?? current.scheduled_at,
      now,
      current.id,
    )
    .run();
  await audit(req, user, 'content.updated', 'blog_post', String(current.id), input);
  return apiJson({ id: current.id, slug, title, ok: true });
}

export async function adminCategories(req: NextRequest, slug?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT * FROM categories ORDER BY sort_order,name LIMIT 300',
    ).all<Record<string, unknown>>();
    return apiJson({ data: (result.results || []).map(categoryPublic) });
  }
  const now = new Date().toISOString();
  if (req.method === 'POST') {
    const input = validation(categoryInput, await requestBody(req));
    await env.HARIYO_DB.prepare(
      `INSERT INTO categories (slug,name,description,emoji,image_url,active,sort_order,seo_title,seo_description,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        input.slug,
        input.name,
        input.description,
        input.emoji,
        input.imageUrl || null,
        input.active ? 1 : 0,
        input.sortOrder,
        input.seoTitle || null,
        input.seoDescription || null,
        now,
        now,
      )
      .run();
    await audit(req, user, 'category.created', 'category', input.slug, { name: input.name });
    return apiJson({ slug: input.slug, ok: true }, 201);
  }
  if (!slug) throw new CloudflareApiError(400, 'Category slug required');
  const current = await env.HARIYO_DB.prepare('SELECT * FROM categories WHERE slug=?')
    .bind(slug)
    .first<Record<string, unknown>>();
  if (!current) throw new CloudflareApiError(404, 'Category not found');
  const input = validation(categoryInput.partial().omit({ slug: true }), await requestBody(req));
  await env.HARIYO_DB.prepare(
    `UPDATE categories SET name=?,description=?,emoji=?,image_url=?,active=?,sort_order=?,seo_title=?,seo_description=?,updated_at=? WHERE slug=?`,
  )
    .bind(
      input.name ?? current.name,
      input.description ?? current.description,
      input.emoji ?? current.emoji,
      input.imageUrl === undefined ? current.image_url : input.imageUrl,
      input.active === undefined ? current.active : input.active ? 1 : 0,
      input.sortOrder ?? current.sort_order,
      input.seoTitle === undefined ? current.seo_title : input.seoTitle,
      input.seoDescription === undefined ? current.seo_description : input.seoDescription,
      now,
      slug,
    )
    .run();
  await audit(req, user, 'category.updated', 'category', slug, input);
  return apiJson({ slug, ok: true });
}

export async function adminPages(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT * FROM cms_pages ORDER BY updated_at DESC LIMIT 300',
    ).all<Record<string, unknown>>();
    return apiJson({ data: (result.results || []).map(pagePublic) });
  }
  const now = new Date().toISOString();
  if (req.method === 'POST') {
    const input = validation(cmsPageInput, await requestBody(req));
    const pageId = crypto.randomUUID();
    const slug = slugify(input.slug || input.title);
    const publishedAt = input.status === 'published' ? now : null;
    await env.HARIYO_DB.prepare(
      `INSERT INTO cms_pages (id,slug,title,summary,sections_json,status,seo_title,seo_description,updated_by,published_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        pageId,
        slug,
        input.title,
        input.summary,
        JSON.stringify(input.sections),
        input.status,
        input.seoTitle || null,
        input.seoDescription || null,
        user.id,
        publishedAt,
        now,
        now,
      )
      .run();
    await audit(req, user, 'page.created', 'cms_page', pageId, { slug, status: input.status });
    return apiJson({ id: pageId, slug, ok: true }, 201);
  }
  if (!id) throw new CloudflareApiError(400, 'Page id required');
  const current = await env.HARIYO_DB.prepare('SELECT * FROM cms_pages WHERE id=? OR slug=?')
    .bind(id, id)
    .first<Record<string, unknown>>();
  if (!current) throw new CloudflareApiError(404, 'Page not found');
  const input = validation(cmsPageInput.partial(), await requestBody(req));
  const status = input.status ?? String(current.status);
  const publishedAt =
    status === 'published' ? String(current.published_at || now) : current.published_at;
  await env.HARIYO_DB.prepare(
    `UPDATE cms_pages SET slug=?,title=?,summary=?,sections_json=?,status=?,seo_title=?,seo_description=?,updated_by=?,published_at=?,updated_at=? WHERE id=?`,
  )
    .bind(
      input.slug ? slugify(input.slug) : current.slug,
      input.title ?? current.title,
      input.summary ?? current.summary,
      input.sections ? JSON.stringify(input.sections) : current.sections_json,
      status,
      input.seoTitle === undefined ? current.seo_title : input.seoTitle,
      input.seoDescription === undefined ? current.seo_description : input.seoDescription,
      user.id,
      publishedAt,
      now,
      current.id,
    )
    .run();
  await audit(req, user, 'page.updated', 'cms_page', String(current.id), input);
  return apiJson({ id: current.id, slug: input.slug || current.slug, ok: true });
}

export async function adminMedia(req: NextRequest) {
  await requireAuth(req, ['admin']);
  const result = await cloudflareEnv()
    .HARIYO_DB.prepare(
      `SELECT m.id,m.object_key,m.content_type,m.size_bytes,m.created_at,u.name AS owner_name,t.name AS tenant_name
       FROM media m JOIN users u ON u.id=m.owner_id LEFT JOIN tenants t ON t.id=m.tenant_id
       ORDER BY m.created_at DESC LIMIT 300`,
    )
    .all<Record<string, unknown>>();
  return apiJson({ data: result.results || [] });
}

export async function adminAudit(req: NextRequest) {
  await requireAuth(req, ['admin']);
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const statement = action
    ? cloudflareEnv()
        .HARIYO_DB.prepare(
          `SELECT a.*,u.name AS actor_name,t.name AS tenant_name FROM audit_logs a
           LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN tenants t ON t.id=a.tenant_id
           WHERE a.action=? ORDER BY a.created_at DESC LIMIT 300`,
        )
        .bind(action)
    : cloudflareEnv().HARIYO_DB.prepare(
        `SELECT a.*,u.name AS actor_name,t.name AS tenant_name FROM audit_logs a
         LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN tenants t ON t.id=a.tenant_id
         ORDER BY a.created_at DESC LIMIT 300`,
      );
  const result = await statement.all<Record<string, unknown>>();
  return apiJson({ data: result.results || [] });
}

export async function adminServiceAreas(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT * FROM service_areas ORDER BY active DESC,province,name',
    ).all<Record<string, unknown>>();
    return apiJson({ data: (result.results || []).map(areaPublic) });
  }
  const input = validation(
    id ? serviceAreaInput.partial() : serviceAreaInput,
    await requestBody(req),
  );
  const now = new Date().toISOString();
  if (!id) {
    const areaId = crypto.randomUUID();
    const value = input as z.infer<typeof serviceAreaInput>;
    await env.HARIYO_DB.prepare(
      `INSERT INTO service_areas (id,tenant_id,name,province,districts,center_lat,center_lng,radius_km,delivery_fee,free_delivery_above,minimum_order,delivery_days,cutoff_time,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        areaId,
        value.tenantId || null,
        value.name,
        value.province,
        JSON.stringify(value.districts),
        value.centerLat ?? null,
        value.centerLng ?? null,
        value.radiusKm,
        value.deliveryFee,
        value.freeDeliveryAbove ?? null,
        value.minimumOrder,
        JSON.stringify(value.deliveryDays),
        value.cutoffTime ?? null,
        value.active ? 1 : 0,
        now,
        now,
      )
      .run();
    await audit(req, user, 'service_area.created', 'service_area', areaId, { name: value.name });
    return apiJson({ id: areaId, ok: true }, 201);
  }
  const current = await env.HARIYO_DB.prepare('SELECT * FROM service_areas WHERE id=?')
    .bind(id)
    .first<Record<string, unknown>>();
  if (!current) throw new CloudflareApiError(404, 'Service area not found');
  await env.HARIYO_DB.prepare(
    `UPDATE service_areas SET tenant_id=?,name=?,province=?,districts=?,center_lat=?,center_lng=?,radius_km=?,delivery_fee=?,free_delivery_above=?,minimum_order=?,delivery_days=?,cutoff_time=?,active=?,updated_at=? WHERE id=?`,
  )
    .bind(
      input.tenantId === undefined ? current.tenant_id : input.tenantId,
      input.name ?? current.name,
      input.province ?? current.province,
      input.districts ? JSON.stringify(input.districts) : current.districts,
      input.centerLat === undefined ? current.center_lat : input.centerLat,
      input.centerLng === undefined ? current.center_lng : input.centerLng,
      input.radiusKm ?? current.radius_km,
      input.deliveryFee ?? current.delivery_fee,
      input.freeDeliveryAbove === undefined ? current.free_delivery_above : input.freeDeliveryAbove,
      input.minimumOrder ?? current.minimum_order,
      input.deliveryDays ? JSON.stringify(input.deliveryDays) : current.delivery_days,
      input.cutoffTime === undefined ? current.cutoff_time : input.cutoffTime,
      input.active === undefined ? current.active : input.active ? 1 : 0,
      now,
      id,
    )
    .run();
  await audit(req, user, 'service_area.updated', 'service_area', id, input);
  return apiJson({ id, ok: true });
}

export async function adminPromotions(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT * FROM promotions ORDER BY updated_at DESC',
    ).all<Record<string, unknown>>();
    return apiJson({ data: (result.results || []).map(promotionPublic) });
  }
  const input = validation(id ? promotionInput.partial() : promotionInput, await requestBody(req));
  const now = new Date().toISOString();
  if (!id) {
    const promotionId = crypto.randomUUID();
    const value = input as z.infer<typeof promotionInput>;
    await env.HARIYO_DB.prepare(
      `INSERT INTO promotions (id,tenant_id,code,name,description,discount_type,discount_value,minimum_order,maximum_discount,usage_limit,starts_at,ends_at,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        promotionId,
        value.tenantId || null,
        value.code?.toUpperCase() || null,
        value.name,
        value.description || null,
        value.discountType,
        value.discountValue,
        value.minimumOrder,
        value.maximumDiscount ?? null,
        value.usageLimit ?? null,
        value.startsAt ?? null,
        value.endsAt ?? null,
        value.active ? 1 : 0,
        now,
        now,
      )
      .run();
    await audit(req, user, 'promotion.created', 'promotion', promotionId, { name: value.name });
    return apiJson({ id: promotionId, ok: true }, 201);
  }
  const current = await env.HARIYO_DB.prepare('SELECT * FROM promotions WHERE id=?')
    .bind(id)
    .first<Record<string, unknown>>();
  if (!current) throw new CloudflareApiError(404, 'Promotion not found');
  await env.HARIYO_DB.prepare(
    `UPDATE promotions SET tenant_id=?,code=?,name=?,description=?,discount_type=?,discount_value=?,minimum_order=?,maximum_discount=?,usage_limit=?,starts_at=?,ends_at=?,active=?,updated_at=? WHERE id=?`,
  )
    .bind(
      input.tenantId === undefined ? current.tenant_id : input.tenantId,
      input.code === undefined ? current.code : input.code?.toUpperCase() || null,
      input.name ?? current.name,
      input.description === undefined ? current.description : input.description,
      input.discountType ?? current.discount_type,
      input.discountValue ?? current.discount_value,
      input.minimumOrder ?? current.minimum_order,
      input.maximumDiscount === undefined ? current.maximum_discount : input.maximumDiscount,
      input.usageLimit === undefined ? current.usage_limit : input.usageLimit,
      input.startsAt === undefined ? current.starts_at : input.startsAt,
      input.endsAt === undefined ? current.ends_at : input.endsAt,
      input.active === undefined ? current.active : input.active ? 1 : 0,
      now,
      id,
    )
    .run();
  await audit(req, user, 'promotion.updated', 'promotion', id, input);
  return apiJson({ id, ok: true });
}

export async function adminSupport(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const status = new URL(req.url).searchParams.get('status');
    const statement = status
      ? env.HARIYO_DB.prepare(
          'SELECT * FROM support_tickets WHERE status=? ORDER BY created_at DESC LIMIT 200',
        ).bind(status)
      : env.HARIYO_DB.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200');
    const result = await statement.all<Record<string, unknown>>();
    return apiJson({ data: result.results || [] });
  }
  if (!id) throw new CloudflareApiError(400, 'Ticket id required');
  const input = validation(
    z.object({
      status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      adminNote: z.string().max(5000).optional(),
    }),
    await requestBody(req),
  );
  await env.HARIYO_DB.prepare(
    'UPDATE support_tickets SET status=COALESCE(?,status),priority=COALESCE(?,priority),admin_note=COALESCE(?,admin_note),assignee_id=?,updated_at=? WHERE id=?',
  )
    .bind(
      input.status || null,
      input.priority || null,
      input.adminNote || null,
      user.id,
      new Date().toISOString(),
      id,
    )
    .run();
  await audit(req, user, 'support.updated', 'support_ticket', id, input);
  return apiJson({ id, ok: true });
}

export async function adminReviews(req: NextRequest, id?: string) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      `SELECT r.*,p.name AS product_name,p.slug AS product_slug,u.name AS buyer_name
       FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.buyer_id
       ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 200`,
    ).all<Record<string, unknown>>();
    return apiJson({ data: result.results || [] });
  }
  if (!id) throw new CloudflareApiError(400, 'Review id required');
  const input = validation(
    z.object({
      status: z.enum(['pending', 'published', 'rejected']).optional(),
      sellerReply: z.string().max(2000).optional(),
    }),
    await requestBody(req),
  );
  await env.HARIYO_DB.prepare(
    'UPDATE reviews SET status=COALESCE(?,status),seller_reply=COALESCE(?,seller_reply),updated_at=? WHERE id=?',
  )
    .bind(input.status || null, input.sellerReply || null, new Date().toISOString(), id)
    .run();
  await audit(req, user, 'review.moderated', 'review', id, input);
  return apiJson({ id, ok: true });
}

export async function adminSettings(req: NextRequest) {
  const user = await requireAuth(req, ['admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(
      'SELECT setting_key,value_json,is_public,updated_at FROM platform_settings ORDER BY setting_key',
    ).all<Record<string, unknown>>();
    return apiJson({
      data: (result.results || []).map((row) => ({
        key: row.setting_key,
        value: parseJson(String(row.value_json), null),
        isPublic: Boolean(row.is_public),
        updatedAt: row.updated_at,
      })),
    });
  }
  const input = validation(
    z.object({
      key: z
        .string()
        .min(2)
        .max(120)
        .regex(/^[a-z0-9_.-]+$/),
      value: z.unknown(),
      isPublic: z.boolean().default(false),
    }),
    await requestBody(req),
  );
  await env.HARIYO_DB.prepare(
    `INSERT INTO platform_settings (setting_key,value_json,is_public,updated_by,updated_at)
     VALUES (?,?,?,?,?) ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,is_public=excluded.is_public,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
  )
    .bind(
      input.key,
      JSON.stringify(input.value),
      input.isPublic ? 1 : 0,
      user.id,
      new Date().toISOString(),
    )
    .run();
  await audit(req, user, 'setting.updated', 'platform_setting', input.key, {
    isPublic: input.isPublic,
  });
  return apiJson({ key: input.key, ok: true });
}

export async function inventoryEvents(req: NextRequest) {
  const user = await requireAuth(req, ['farmer', 'vendor', 'admin']);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const where = user.role === 'admin' ? '1=1' : 'e.tenant_id=?';
    const statement = env.HARIYO_DB.prepare(
      `SELECT e.*,p.name AS product_name,p.slug AS product_slug FROM inventory_events e JOIN products p ON p.id=e.product_id WHERE ${where} ORDER BY e.created_at DESC LIMIT 200`,
    );
    const result = await (user.role === 'admin' ? statement : statement.bind(user.tenant_id)).all<
      Record<string, unknown>
    >();
    return apiJson({ data: result.results || [] });
  }
  const input = validation(
    z.object({
      productId: z.string().min(2),
      eventType: z.enum(['harvest', 'adjustment', 'return', 'spoilage']),
      quantityChange: z.coerce.number().min(-10_000_000).max(10_000_000),
      reason: z.string().min(2).max(500),
    }),
    await requestBody(req),
  );
  const product = await env.HARIYO_DB.prepare(
    'SELECT id,tenant_id,stock FROM products WHERE id=? OR slug=?',
  )
    .bind(input.productId, input.productId)
    .first<{ id: string; tenant_id: string; stock: number }>();
  if (!product) throw new CloudflareApiError(404, 'Product not found');
  if (user.role !== 'admin' && product.tenant_id !== user.tenant_id)
    throw new CloudflareApiError(403, 'Product belongs to another seller');
  const stockAfter = Number(product.stock) + input.quantityChange;
  if (stockAfter < 0)
    throw new CloudflareApiError(409, 'Inventory adjustment would make stock negative');
  const eventId = crypto.randomUUID();
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare('UPDATE products SET stock=?,updated_at=? WHERE id=?').bind(
      stockAfter,
      new Date().toISOString(),
      product.id,
    ),
    env.HARIYO_DB.prepare(
      `INSERT INTO inventory_events (id,product_id,tenant_id,actor_id,event_type,quantity_change,stock_after,reason) VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(
      eventId,
      product.id,
      product.tenant_id,
      user.id,
      input.eventType,
      input.quantityChange,
      stockAfter,
      input.reason,
    ),
  ]);
  await audit(req, user, 'inventory.adjusted', 'product', product.id, {
    eventId,
    ...input,
    stockAfter,
  });
  return apiJson({ id: eventId, productId: product.id, stockAfter }, 201);
}
