import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, KeyRound, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { DEMO_PASSWORD, demoAccounts } from '@/lib/demo-accounts';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Demo Accounts | Hariyo Mart Nepal',
  description: 'Role-based Hariyo Mart demo workspaces for controlled staging environments.',
};

export default function DemoAccountsPage() {
  if (!getPublicRuntimeConfig().demoEnabled) notFound();

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow"><Sparkles size={15} /> Guided product demo</span>
          <h1>Test Hariyo Mart from every role.</h1>
          <p className="section-copy">
            Demo identities are available only on a deployment explicitly configured for demo mode.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container demo-directory-shell">
          <div className="demo-password-card">
            <KeyRound />
            <div>
              <span>Shared demo password</span>
              <strong>{DEMO_PASSWORD}</strong>
            </div>
            <Link className="btn btn-primary" href="/login">Open sign in</Link>
          </div>
          <div className="demo-account-directory">
            {demoAccounts.map((account) => (
              <article key={account.email}>
                <div className="demo-role-icon"><UsersRound /></div>
                <div>
                  <span className="demo-role-label">{account.label}</span>
                  <h3>{account.workspace}</h3>
                  <code>{account.email}</code>
                </div>
                <BadgeCheck className="demo-role-check" />
              </article>
            ))}
          </div>
          <div className="security-note">
            <ShieldCheck />
            <p>
              <b>Demo-only identities:</b> remove them before a real launch with{' '}
              <code>npm run production:demo:remove</code>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
