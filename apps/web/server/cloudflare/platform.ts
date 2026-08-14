import { getCloudflareContext } from '@opennextjs/cloudflare';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export type CloudflareUserRow = {
  id: string;
  tenant_id: string | null;
  active_tenant_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: 'customer' | 'farmer' | 'vendor' | 'admin';
  is_verified: number;
  language: 'en' | 'ne';
  marketing_opt_in: number;
  addresses: string;
  wishlist: string;
  reward_points: number;
  created_at: string;
  updated_at: string;
};

export type TenantMemberRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'procurement'
  | 'inventory'
  | 'sales'
  | 'delivery'
  | 'accounting'
  | 'farmer'
  | 'viewer';

export function effectiveTenantId(user: Pick<CloudflareUserRow, 'tenant_id' | 'active_tenant_id'>) {
  return user.active_tenant_id || user.tenant_id || null;
}

type TokenPayload = {
  sub: string;
  role: CloudflareUserRow['role'];
  tenantId?: string;
  type: 'access' | 'refresh';
  jti: string;
  iat: number;
  exp: number;
};

export class CloudflareApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function cloudflareEnv() {
  return getCloudflareContext().env as HariyoCloudflareBindings;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function publicUser(user: CloudflareUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || undefined,
    role: user.role,
    tenantId: effectiveTenantId(user) || undefined,
    isVerified: Boolean(user.is_verified),
  };
}

export function clientIp(req: NextRequest) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function assertSafeRequest(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) return;
  if (req.headers.get('authorization') || req.headers.get('x-client-platform') === 'mobile') return;
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new CloudflareApiError(403, 'Cross-site request blocked');
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    throw new CloudflareApiError(403, 'Request origin is not allowed');
}

export function apiJson(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export function apiOptions(req: NextRequest) {
  const origin = req.headers.get('origin');
  const sameOrigin = !origin || origin === new URL(req.url).origin;
  const response = new NextResponse(null, { status: 204 });
  if (origin && sameOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Bootstrap-Key,X-Client-Platform,X-Idempotency-Key,X-Tenant-Id',
  );
  return response;
}

export async function requestBody(req: NextRequest) {
  const length = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > 1_000_000)
    throw new CloudflareApiError(413, 'Request body is too large');
  try {
    return await req.json();
  } catch {
    throw new CloudflareApiError(400, 'Request body must be valid JSON');
  }
}

export async function safeSecretEqual(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;
  const [actualHash, expectedHash] = await Promise.all(
    [actual, expected].map(
      async (value) =>
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    ),
  );
  let difference = 0;
  for (let index = 0; index < actualHash.length; index++) {
    difference |= actualHash[index] ^ expectedHash[index];
  }
  return difference === 0;
}


export async function verifyTurnstile(
  req: NextRequest,
  token: string | undefined,
  expectedAction?: string,
) {
  const env = cloudflareEnv();
  const secret = env.TURNSTILE_SECRET_KEY;
  // Wrangler type generation narrows plain-text vars to their current literal
  // value (for example "web"). Widen here because deployments may intentionally
  // configure any supported enforcement mode without changing application code.
  const mode = String(env.TURNSTILE_ENFORCEMENT_MODE || 'web') as 'web' | 'all' | 'off';
  if (!secret || mode === 'off') return { configured: Boolean(secret), success: true, skipped: true };
  const isMobile = req.headers.get('x-client-platform')?.toLowerCase() === 'mobile';
  if (mode === 'web' && isMobile)
    return { configured: true, success: true, skipped: true, reason: 'mobile-rate-limit-mode' };
  if (!token) throw new CloudflareApiError(400, 'Security verification is required');
  const idempotencyKey = crypto.randomUUID();
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: clientIp(req) === 'unknown' ? undefined : clientIp(req),
      idempotency_key: idempotencyKey,
    }),
  });
  const result = (await response.json()) as {
    success?: boolean;
    action?: string;
    hostname?: string;
    ['error-codes']?: string[];
  };
  if (!response.ok || !result.success)
    throw new CloudflareApiError(403, 'Security verification failed');
  if (expectedAction && result.action && result.action !== expectedAction)
    throw new CloudflareApiError(403, 'Security verification action mismatch');
  return { configured: true, success: true, hostname: result.hostname };
}

export async function coordinateInventory(input: {
  action: 'adjust';
  productId: string;
  quantityChange: number;
  actorId?: string;
  reason: string;
  eventType: 'harvest' | 'adjustment' | 'return' | 'spoilage';
  operationId?: string;
} | {
  action: 'set';
  productId: string;
  stock: number;
  actorId?: string;
  reason: string;
}) {
  const env = cloudflareEnv();
  if (!env.HARIYO_SERVICES) {
    if (env.APP_ENV === 'production')
      throw new CloudflareApiError(503, 'Cloudflare inventory coordination service is not bound');
    return null;
  }
  try {
    const response = await env.HARIYO_SERVICES.fetch('https://hariyo-services/inventory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { error?: string; stockAfter?: number };
    if (!response.ok)
      throw new CloudflareApiError(response.status, body.error || 'Inventory operation failed');
    return { stockAfter: Number(body.stockAfter || 0) };
  } catch (error) {
    if (error instanceof CloudflareApiError) throw error;
    if (env.APP_ENV === 'production')
      throw new CloudflareApiError(503, 'Cloudflare inventory coordination service is unavailable');
    return null;
  }
}

export async function enforceRateLimit(req: NextRequest, limit = 180, windowSeconds = 60) {
  const env = cloudflareEnv();
  if (!env.HARIYO_SERVICES) return;
  try {
    const response = await env.HARIYO_SERVICES.fetch('https://hariyo-services/rate-limit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: `api:${clientIp(req)}`, limit, windowSeconds }),
    });
    if (!response.ok) return;
    const result = (await response.json()) as { allowed?: boolean };
    if (result.allowed === false) throw new CloudflareApiError(429, 'Too many requests');
  } catch (error) {
    if (error instanceof CloudflareApiError) throw error;
  }
}

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function tokenSecret(env: HariyoCloudflareBindings, type: TokenPayload['type']) {
  const secret = type === 'access' ? env.JWT_SECRET : env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32)
    throw new CloudflareApiError(
      503,
      `${type === 'access' ? 'JWT_SECRET' : 'JWT_REFRESH_SECRET'} is not configured`,
    );
  return secret;
}

async function signToken(
  env: HariyoCloudflareBindings,
  user: CloudflareUserRow,
  type: TokenPayload['type'],
  ttlSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    ...(effectiveTenantId(user) ? { tenantId: effectiveTenantId(user)! } : {}),
    type,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
  };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64url(JSON.stringify(payload));
  const message = `${header}.${encodedPayload}`;
  return { token: `${message}.${base64url(await hmac(tokenSecret(env, type), message))}`, payload };
}

async function verifyToken(
  env: HariyoCloudflareBindings,
  token: string,
  expectedType: TokenPayload['type'],
) {
  const [header, payloadPart, signature] = token.split('.');
  if (!header || !payloadPart || !signature) throw new CloudflareApiError(401, 'Invalid session');
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64url(payloadPart))) as TokenPayload;
  } catch {
    throw new CloudflareApiError(401, 'Invalid session');
  }
  if (payload.type !== expectedType || payload.exp <= Math.floor(Date.now() / 1000))
    throw new CloudflareApiError(401, 'Session expired');
  const expected = await hmac(tokenSecret(env, expectedType), `${header}.${payloadPart}`);
  const received = fromBase64url(signature);
  if (expected.length !== received.length) throw new CloudflareApiError(401, 'Invalid session');
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= expected[index] ^ received[index];
  if (difference !== 0) throw new CloudflareApiError(401, 'Invalid session');
  return payload;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function issueSession(user: CloudflareUserRow) {
  const env = cloudflareEnv();
  const access = await signToken(env, user, 'access', 15 * 60);
  const refresh = await signToken(env, user, 'refresh', 30 * 24 * 60 * 60);
  await env.HARIYO_DB.prepare(
    'INSERT INTO sessions (id,user_id,refresh_hash,expires_at) VALUES (?,?,?,?)',
  )
    .bind(
      refresh.payload.jti,
      user.id,
      await sha256(refresh.token),
      new Date(refresh.payload.exp * 1000).toISOString(),
    )
    .run();
  return { accessToken: access.token, refreshToken: refresh.token };
}

export function attachSessionCookies(
  req: NextRequest,
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  if (req.headers.get('x-client-platform') === 'mobile') return response;
  const secure = new URL(req.url).protocol === 'https:';
  response.cookies.set('hariyo_access', tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  response.cookies.set('hariyo_refresh', tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set('hariyo_access', '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set('hariyo_refresh', '', { httpOnly: true, path: '/api/auth', maxAge: 0 });
  return response;
}

function bearer(req: NextRequest) {
  const value = req.headers.get('authorization');
  return value?.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : undefined;
}

export async function currentAuth(req: NextRequest) {
  const env = cloudflareEnv();
  const token = bearer(req) || req.cookies.get('hariyo_access')?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(env, token, 'access');
    const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
      .bind(payload.sub)
      .first<CloudflareUserRow>();
    if (!user) return null;
    const activeTenantId = effectiveTenantId(user);
    return activeTenantId ? { ...user, tenant_id: activeTenantId } : user;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest, roles?: Array<CloudflareUserRow['role']>) {
  const user = await currentAuth(req);
  if (!user) throw new CloudflareApiError(401, 'Authentication required');
  if (roles && !roles.includes(user.role)) throw new CloudflareApiError(403, 'Permission denied');
  return user;
}

export async function requireTenantAccess(
  req: NextRequest,
  roles?: TenantMemberRole[],
) {
  const env = cloudflareEnv();
  const user = await requireAuth(req);
  const tenantId = req.headers.get('x-tenant-id')?.trim() || effectiveTenantId(user);
  if (!tenantId) throw new CloudflareApiError(400, 'Select a tenant workspace first');

  if (user.role === 'admin') {
    const tenant = await env.HARIYO_DB.prepare('SELECT id,status FROM tenants WHERE id=?')
      .bind(tenantId)
      .first<{ id: string; status: string }>();
    if (!tenant) throw new CloudflareApiError(404, 'Tenant workspace not found');
    return { user, tenantId, tenantRole: 'admin' as const, platformAdmin: true };
  }

  const member = await env.HARIYO_DB.prepare(
    `SELECT role,status FROM tenant_members WHERE tenant_id=? AND user_id=?`,
  )
    .bind(tenantId, user.id)
    .first<{ role: TenantMemberRole; status: string }>();
  if (!member || member.status !== 'active')
    throw new CloudflareApiError(403, 'You do not have access to this tenant workspace');
  if (roles && !roles.includes(member.role))
    throw new CloudflareApiError(403, 'Your tenant role cannot perform this action');
  return { user, tenantId, tenantRole: member.role, platformAdmin: false };
}

export function refreshFromRequest(req: NextRequest, input?: { refreshToken?: string }) {
  return input?.refreshToken || req.cookies.get('hariyo_refresh')?.value;
}

export async function rotateSession(refreshToken: string) {
  const env = cloudflareEnv();
  const payload = await verifyToken(env, refreshToken, 'refresh');
  const session = await env.HARIYO_DB.prepare(
    "SELECT * FROM sessions WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>datetime('now')",
  )
    .bind(payload.jti, payload.sub)
    .first<{ refresh_hash: string }>();
  if (!session || session.refresh_hash !== (await sha256(refreshToken)))
    throw new CloudflareApiError(401, 'Session expired');
  const user = await env.HARIYO_DB.prepare('SELECT * FROM users WHERE id=?')
    .bind(payload.sub)
    .first<CloudflareUserRow>();
  if (!user) throw new CloudflareApiError(401, 'Account no longer exists');
  await env.HARIYO_DB.prepare('UPDATE sessions SET revoked_at=? WHERE id=?')
    .bind(new Date().toISOString(), payload.jti)
    .run();
  return { user, tokens: await issueSession(user) };
}

export async function revokeSession(refreshToken?: string) {
  if (!refreshToken) return;
  try {
    const env = cloudflareEnv();
    const payload = await verifyToken(env, refreshToken, 'refresh');
    await env.HARIYO_DB.prepare('UPDATE sessions SET revoked_at=? WHERE id=?')
      .bind(new Date().toISOString(), payload.jti)
      .run();
  } catch {}
}

export async function audit(
  req: NextRequest,
  user: CloudflareUserRow | null,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: unknown,
) {
  const env = cloudflareEnv();
  try {
    await env.HARIYO_EVENTS.send({
      type: action,
      actorId: user?.id,
      tenantId: user ? effectiveTenantId(user) : undefined,
      entityType,
      entityId,
      ip: clientIp(req),
      meta,
      at: new Date().toISOString(),
    });
  } catch {}
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'hariyo'
  );
}
