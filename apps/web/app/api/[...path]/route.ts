import type { NextRequest } from 'next/server';
import { dispatchCloudflareApi } from '@/server/cloudflare/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ path?: string[] }> };
async function handler(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return dispatchCloudflareApi(req, path);
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
};
