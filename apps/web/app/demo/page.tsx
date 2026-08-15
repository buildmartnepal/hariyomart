import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, KeyRound, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { DEMO_PASSWORD, demoAccounts } from '@/lib/demo-accounts';

export const metadata: Metadata = {
  title: 'Demo Accounts | Hariyo Mart Nepal',
  description: 'Role-based Hariyo Mart demo workspaces for buyer, farmer, cooperative, operations and administration testing.',
};

export default function DemoAccountsPage() {
  const enabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow"><Sparkles size={15} /> Guided product demo</span>
          <h1>Test Hariyo Mart from every role.</h1>
          <p className="section-copy">
            Demo identities exercise the same role-aware buyer, Farmer OS, cooperative, operations and platform-admin workspaces.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container demo-directory-shell">
          {!enabled ? (
            <div className="demo-disabled-card">
              <ShieldCheck />
              <div>
                <h2>Demo access is disabled on this deployment.</h2>
                <p>Set <code>NEXT_PUBLIC_DEMO_MODE=true</code> only on a staging or dedicated demo deployment, seed the demo users, and redeploy.</p>
              </div>
            </div>
          ) : (
            <>
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
                  <b>Demo-only identities:</b> remove them before a real launch with <code>npm run demo:remove:remote</code>. Your production owner/admin account remains separate.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
