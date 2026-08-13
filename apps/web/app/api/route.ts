import { NextRequest } from 'next/server';
import { json } from '@/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return json(req, {
    service: 'Hariyo Mart Nepal API',
    version: '6.2.0-cloudflare',
    platform: 'Cloudflare Workers, D1, Durable Objects, R2, KV and Queues',
    health: '/api/health',
    readiness: '/api/system/readiness',
  });
}
