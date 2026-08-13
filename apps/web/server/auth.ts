import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { NextRequest, NextResponse } from 'next/server';
import {
  rotateRefreshSession,
  storeRefreshSession,
  revokeRefreshSession,
  redisConfigured,
} from './redis';

export type AuthUser = { sub: string; role: string; tenantId?: string; jti?: string };
type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessJti: string;
  refreshJti: string;
};
const ACCESS_COOKIE = 'hm_access';
const REFRESH_COOKIE = 'hm_refresh';
const ACCESS_TTL = 15 * 60,
  REFRESH_TTL = 30 * 24 * 60 * 60;
function secret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = process.env[name];
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === 'production')
      throw Object.assign(new Error(`${name} must be configured with at least 32 characters`), {
        status: 503,
      });
    return `${name}-development-only-secret-change-me-1234567890`;
  }
  return value;
}
function basePayload(user: { id?: string; _id?: unknown; role: string; tenantId?: unknown }) {
  return {
    sub: String(user.id || user._id),
    role: user.role,
    tenantId: user.tenantId ? String(user.tenantId) : undefined,
  };
}
export async function issueTokens(user: {
  id?: string;
  _id?: unknown;
  role: string;
  tenantId?: unknown;
}): Promise<TokenPair> {
  const payload = basePayload(user),
    accessJti = randomUUID(),
    refreshJti = randomUUID();
  const common = { issuer: 'hariyo-mart-nepal', audience: 'hariyo-clients' } as const;
  const accessToken = jwt.sign(payload, secret('JWT_SECRET'), {
    ...common,
    jwtid: accessJti,
    expiresIn: ACCESS_TTL,
  });
  const refreshToken = jwt.sign(payload, secret('JWT_REFRESH_SECRET'), {
    ...common,
    jwtid: refreshJti,
    expiresIn: REFRESH_TTL,
  });
  await storeRefreshSession(refreshJti, payload.sub, REFRESH_TTL);
  return { accessToken, refreshToken, accessJti, refreshJti };
}
export function verifyAccess(token: string) {
  return jwt.verify(token, secret('JWT_SECRET'), {
    issuer: 'hariyo-mart-nepal',
    audience: 'hariyo-clients',
  }) as AuthUser;
}
export function verifyRefresh(token: string) {
  return jwt.verify(token, secret('JWT_REFRESH_SECRET'), {
    issuer: 'hariyo-mart-nepal',
    audience: 'hariyo-clients',
  }) as AuthUser;
}
export async function rotateRefresh(
  oldToken: string,
  user: { id?: string; _id?: unknown; role: string; tenantId?: unknown },
) {
  const old = verifyRefresh(oldToken);
  const pair = await issueTokens(user);
  if (redisConfigured()) {
    const ok = await rotateRefreshSession(
      String(old.jti || ''),
      String(old.sub),
      pair.refreshJti,
      REFRESH_TTL,
    );
    if (!ok) {
      await revokeRefreshSession(pair.refreshJti);
      throw Object.assign(new Error('Refresh session is no longer valid'), { status: 401 });
    }
  }
  return pair;
}
export async function revokeRefreshToken(token?: string) {
  if (!token) return;
  try {
    const p = verifyRefresh(token);
    if (p.jti) await revokeRefreshSession(String(p.jti));
  } catch {}
}
export function authFromRequest(req: NextRequest): AuthUser | null {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = bearer || req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifyAccess(token);
  } catch {
    return null;
  }
}
export function requireAuth(req: NextRequest, roles?: string[]) {
  const user = authFromRequest(req);
  if (!user) throw Object.assign(new Error('Authentication required'), { status: 401 });
  if (roles && !roles.includes(user.role))
    throw Object.assign(new Error('Insufficient permission'), { status: 403 });
  return user;
}
export function requireTenant(user: AuthUser) {
  if (!user.tenantId && user.role !== 'admin')
    throw Object.assign(new Error('Seller tenant required'), { status: 403 });
  return user;
}
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
export function isMobileClient(req: NextRequest) {
  return req.headers.get('x-client-platform') === 'mobile';
}
export function setAuthCookies(res: NextResponse, pair: TokenPair) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, pair.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL,
  });
  res.cookies.set(REFRESH_COOKIE, pair.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL,
  });
  return res;
}
export function clearAuthCookies(res: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
  return res;
}
export function refreshTokenFrom(req: NextRequest, body: any) {
  return String(body?.refreshToken || req.cookies.get(REFRESH_COOKIE)?.value || '');
}
