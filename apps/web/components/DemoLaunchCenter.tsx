'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, BadgeCheck, Database, Gauge, RefreshCw, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import type { DemoAccountProfile } from '@/lib/demo-accounts';

type ReadyPayload = {
  version?: string;
  status?: string;
  database?: string;
  required?: Record<string, boolean>;
  seed?: { tenants?: number; products?: number; orders?: number; demoUsers?: number };
  productionGuard?: { demoRuntimeBootstrapReady?: boolean; demoCredentialReady?: boolean };
};

export function DemoLaunchCenter({ accounts }: { accounts: readonly DemoAccountProfile[] }) {
  const auth = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState<ReadyPayload | null>(null);
  const [checking, setChecking] = useState(false);

  async function refreshReadiness() {
    setChecking(true);
    try {
      const response = await fetch('/api/system/readiness', { cache: 'no-store' });
      setReady((await response.json()) as ReadyPayload);
    } catch {
      setReady(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshReadiness();
  }, []);

  async function launch(email: string) {
    setBusy(email);
    setMessage('');
    try {
      const user = await auth.demoLogin(email);
      router.push(
        user.role === 'admin'
          ? '/admin/overview'
          : ['farmer', 'vendor'].includes(user.role)
            ? '/farmer/overview'
            : '/account/overview',
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open demo workspace');
      await refreshReadiness();
    } finally {
      setBusy(null);
    }
  }

  const checks = useMemo(() => Object.entries(ready?.required || {}), [ready]);
  return (
    <div className="demo-lab-shell">
      <section className="demo-lab-status">
        <div className="demo-lab-title">
          <span className="demo-role-icon"><Gauge /></span>
          <div><span className="eyebrow">Live test readiness</span><h2>Demo Lab</h2><p>Role launch now self-bootstraps its test identity. A separate remote demo seed is no longer required for sign-in.</p></div>
          <button type="button" className="btn btn-soft" onClick={() => void refreshReadiness()} disabled={checking}><RefreshCw size={15}/>{checking ? 'Checking…' : 'Refresh'}</button>
        </div>
        <div className="demo-health-grid">
          <article><Activity/><span>Runtime</span><b>{ready?.status || 'Checking'}</b><small>Release {ready?.version || '—'}</small></article>
          <article><Database/><span>Database</span><b>{ready?.database || 'Checking'}</b><small>{ready?.seed?.products ?? '—'} products · {ready?.seed?.tenants ?? '—'} workspaces</small></article>
          <article><ShieldCheck/><span>Demo bootstrap</span><b>{ready?.productionGuard?.demoRuntimeBootstrapReady ? 'Ready' : 'Check setup'}</b><small>Password seed may be absent; runtime launch repairs it.</small></article>
        </div>
        {checks.length > 0 && <div className="demo-check-row">{checks.map(([key, value]) => <span key={key} className={value ? 'ok' : 'warn'}><BadgeCheck size={13}/>{key.replaceAll('_',' ')}</span>)}</div>}
      </section>

      <section className="demo-role-launcher">
        <div className="section-head"><div><span className="eyebrow"><Sparkles size={14}/> One-click role sessions</span><h2>Open any workspace without typing credentials.</h2><p>The endpoint is available only while Production Test Mode + Demo Mode are both enabled.</p></div><Link className="btn btn-soft" href="/login">Manual sign in</Link></div>
        <div className="demo-launch-grid">
          {accounts.map((account) => (
            <button type="button" key={account.email} onClick={() => void launch(account.email)} disabled={Boolean(busy)}>
              <span className="demo-role-icon"><UsersRound /></span>
              <span className="demo-launch-copy"><small>{account.label}</small><b>{account.workspace}</b><code>{account.email}</code></span>
              <span className="demo-launch-action">{busy === account.email ? 'Opening…' : 'Launch'} <ArrowRight size={15}/></span>
            </button>
          ))}
        </div>
        {message && <div className="auth-error" role="alert">{message}</div>}
      </section>
    </div>
  );
}
