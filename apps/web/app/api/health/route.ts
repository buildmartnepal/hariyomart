import type { NextRequest } from 'next/server';
import { dispatchCloudflareApi } from '@/server/cloudflare/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  return dispatchCloudflareApi(req, ['health']);
}
