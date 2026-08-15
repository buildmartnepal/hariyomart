'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, HardDrive, KeyRound, Radio, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = { section: 'security-center' | 'system-health' | 'mobile-apps' };

export function AdminPlatformCenter({ section }: Props) {
  const auth = useAuth();
  const [readiness, setReadiness] = useState<any>(null);
  const [supply, setSupply] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const [r, s] = await Promise.all([
        auth.apiRequest('/system/readiness'),
        auth.apiRequest('/system/supply-stack'),
      ]);
      setReadiness(r);
      setSupply(s);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load platform status');
    }
  }, [auth]);
  useEffect(() => { if (auth.ready && auth.user?.role === 'admin') void load(); }, [auth.ready, auth.user?.role, load]);
  if (section === 'mobile-apps') return <MobileControl readiness={readiness} />;
  if (section === 'security-center') return <SecurityControl readiness={readiness} />;
  return (
    <div className="platform-control-shell">
      {error && <div className="workspace-error">{error}</div>}
      <div className="platform-control-heading">
        <div><span className="eyebrow">LIVE PLATFORM</span><h2>Cloudflare system health</h2><p>D1, R2, KV, Queues, sessions and seller SaaS readiness in one control view.</p></div>
        <button className="btn btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="platform-status-grid">
        <StatusCard icon={<Database />} label="D1 database" value={readiness?.required?.D1} />
        <StatusCard icon={<HardDrive />} label="R2 media" value={readiness?.required?.R2} />
        <StatusCard icon={<Radio />} label="KV cache" value={readiness?.required?.KV} />
        <StatusCard icon={<Activity />} label="Queues" value={readiness?.required?.QUEUES} />
        <StatusCard icon={<KeyRound />} label="JWT access secret" value={readiness?.required?.JWT_SECRET} />
        <StatusCard icon={<ShieldCheck />} label="JWT refresh secret" value={readiness?.required?.JWT_REFRESH_SECRET} />
      </div>
      <div className="access-grid">
        <section className="access-panel"><h3>Data readiness</h3><pre className="platform-json">{JSON.stringify(readiness?.seed || {}, null, 2)}</pre></section>
        <section className="access-panel"><h3>Supply SaaS</h3><pre className="platform-json">{JSON.stringify(supply || {}, null, 2)}</pre></section>
      </div>
    </div>
  );
}

function SecurityControl({ readiness }: { readiness: any }) {
  const controls = [
    ['Admin access', 'Role-restricted /admin workspace and API permission checks.', true],
    ['Password storage', 'bcrypt hashes only; passwords are never stored or displayed after creation.', true],
    ['Session rotation', 'Short access token plus refresh session rotation and revocation.', true],
    ['One-time resets', 'Admin-generated temporary passwords revoke existing sessions.', true],
    ['Turnstile', 'Web login/register bot protection when the production secret and public site key are configured.', Boolean(readiness?.turnstile?.configured ?? readiness?.required?.TURNSTILE)],
    ['Audit history', 'Sensitive tenant, content, user and order actions are recorded.', true],
  ];
  return (
    <div className="platform-control-shell">
      <div className="platform-control-heading"><div><span className="eyebrow">SECURITY CENTER</span><h2>Identity, sessions and marketplace trust</h2><p>Operational controls are separated from public storefront features.</p></div></div>
      <div className="security-control-list">
        {controls.map(([title, copy, ok]) => <div key={String(title)}><ShieldCheck /><span><b>{title}</b><small>{copy}</small></span><strong className={ok ? 'control-ok' : 'control-warn'}>{ok ? 'ACTIVE' : 'CHECK'}</strong></div>)}
      </div>
    </div>
  );
}

function MobileControl({ readiness }: { readiness: any }) {
  return (
    <div className="platform-control-shell">
      <div className="platform-control-heading"><div><span className="eyebrow">MOBILE APPS</span><h2>One API, role-aware mobile workspaces</h2><p>Expo buyer, farmer and admin experiences use the same Cloudflare-native authentication and marketplace records.</p></div></div>
      <div className="platform-status-grid">
        <StatusCard icon={<Smartphone />} label="Buyer app" value={true} text="Shop · cart · checkout · orders" />
        <StatusCard icon={<Smartphone />} label="Farmer app" value={true} text="Seller access · role dashboard" />
        <StatusCard icon={<Smartphone />} label="Admin app" value={true} text="Mobile command center" />
        <StatusCard icon={<KeyRound />} label="SecureStore tokens" value={true} text="Access + refresh token storage" />
      </div>
      <section className="access-panel">
        <h3>Production mobile configuration</h3>
        <p className="muted-copy">Set <code>EXPO_PUBLIC_API_URL</code> to the deployed same API base, build with EAS, and keep all writes server-authoritative. Current web readiness: <b>{readiness?.database || 'checking'}</b>.</p>
      </section>
    </div>
  );
}

function StatusCard({ icon, label, value, text }: { icon: React.ReactNode; label: string; value: unknown; text?: string }) {
  const ok = Boolean(value);
  return <div className="platform-status-card">{icon}<span><b>{label}</b><small>{text || (ok ? 'Configured and reachable' : 'Needs configuration')}</small></span><strong className={ok ? 'control-ok' : 'control-warn'}>{ok ? 'READY' : 'CHECK'}</strong></div>;
}
