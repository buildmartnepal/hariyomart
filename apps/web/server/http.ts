import { NextRequest, NextResponse } from 'next/server';
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export function clientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
function allowedOrigin(origin: string | null) {
  if (!origin) return '';
  const allowed = (process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}

export function assertSafeMutationOrigin(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) return;
  if (req.headers.get('authorization')) return;

  const origin = req.headers.get('origin');
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new ApiError(403, 'Cross-site request blocked');
  if (origin && origin !== new URL(req.url).origin && !allowedOrigin(origin))
    throw new ApiError(403, 'Request origin is not allowed');
}
export function json(req: NextRequest, data: unknown, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set('Cache-Control', 'no-store');
  const origin = allowedOrigin(req.headers.get('origin'));
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
}
export function options(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  const origin = allowedOrigin(req.headers.get('origin'));
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Bootstrap-Key, X-Client-Platform, X-Idempotency-Key',
  );
  return res;
}
export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 1_000_000)
    throw new ApiError(413, 'Request body is too large');
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(400, 'Request body must be a JSON object');
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Request body must be valid JSON');
  }
}
