import { DEMO_PASSWORD, demoAccounts } from '@/lib/demo-accounts';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  if (!getPublicRuntimeConfig().demoEnabled) {
    return Response.json({ message: 'Demo mode is disabled.' }, { status: 404 });
  }
  return Response.json(
    { password: DEMO_PASSWORD, accounts: demoAccounts },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
