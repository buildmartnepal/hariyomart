import { DEMO_PASSWORD, demoAccounts, productionTestAccounts } from '@/lib/demo-accounts';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const runtime = getPublicRuntimeConfig();
  if (!runtime.demoEnabled) {
    return Response.json({ message: 'Demo mode is disabled.' }, { status: 404 });
  }
  return Response.json(
    { password: DEMO_PASSWORD, accounts: runtime.productionTestMode ? productionTestAccounts : demoAccounts },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
