import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { demoAccounts } from '@/lib/demo-accounts';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';
import { DemoLaunchCenter } from '@/components/DemoLaunchCenter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Demo Lab | Hariyo Mart Nepal',
  description: 'One-click role-based Hariyo Mart test workspaces with runtime readiness diagnostics.',
  robots: { index: false, follow: false },
};

export default function DemoAccountsPage() {
  if (!getPublicRuntimeConfig().demoEnabled) notFound();
  return (
    <main>
      <section className="page-hero demo-lab-hero"><div className="container"><span className="eyebrow"><Sparkles size={15}/> Hariyo Test Mode</span><h1>Test the full marketplace without fighting demo credentials.</h1><p className="section-copy">Buyer, farmer, operations and platform roles can be launched directly. Test identities are repaired or created at runtime inside the dedicated demo sandbox.</p><div className="security-note"><ShieldCheck/><p><b>Test-only:</b> disable <code>PRODUCTION_TEST_MODE</code> and <code>NEXT_PUBLIC_DEMO_MODE</code> before real customer launch.</p></div></div></section>
      <section className="section"><div className="container"><DemoLaunchCenter accounts={demoAccounts}/></div></section>
    </main>
  );
}
