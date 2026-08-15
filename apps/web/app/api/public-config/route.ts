import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(getPublicRuntimeConfig(), {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
