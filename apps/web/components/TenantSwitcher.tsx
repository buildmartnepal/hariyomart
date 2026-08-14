'use client';
import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, LoaderCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Membership = {
  id: string;
  name: string;
  status?: string;
  member_role?: string;
};

export function TenantSwitcher({ role }: { role: 'Farmer' | 'Admin' | 'Account' }) {
  const auth = useAuth();
  const [items, setItems] = useState<Membership[]>([]);
  const [active, setActive] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!auth.ready || !auth.user || role === 'Account') return;
    try {
      const payload: any = await auth.apiRequest('/tenants/memberships');
      const memberships = Array.isArray(payload?.data) ? payload.data : [];
      setItems(memberships);
      const requested = String(payload?.activeTenantId || auth.user.tenantId || '');
      setActive(memberships.some((item: Membership) => item.id === requested) ? requested : String(memberships[0]?.id || ''));
    } catch {
      setItems([]);
      setError('Unable to load workspaces.');
    }
  }, [auth, role]);
  useEffect(() => { void load(); }, [load]);
  if (role === 'Account' || !auth.user || items.length < 2) return null;
  return (
    <label className="tenant-switcher">
      {error && <small role="alert">{error}</small>}
      <span><Building2 size={14} /> Workspace</span>
      <span className="tenant-switch-control">
        <select
          value={active}
          disabled={busy}
          onChange={async (event) => {
            const tenantId = event.target.value;
            if (!tenantId || tenantId === active) return;
            setBusy(true);
            setError('');
            try {
              await auth.apiRequest('/tenants/switch', { method: 'POST', body: JSON.stringify({ tenantId }) });
              setActive(tenantId);
              await auth.refreshMe();
              window.location.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to switch workspace.');
            } finally {
              setBusy(false);
            }
          }}
          aria-label="Switch business workspace"
        >
          {items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.member_role || item.status || 'member'}</option>)}
        </select>
        {busy ? <LoaderCircle className="spin" size={14} /> : <ChevronDown size={14} />}
      </span>
    </label>
  );
}
