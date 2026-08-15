'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, RefreshCw, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from './AuthProvider';

type AccessUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'farmer' | 'vendor' | 'admin';
  tenantId?: string;
  tenantName?: string;
  status: 'active' | 'suspended';
  isVerified: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
};
type Tenant = { id: string; name: string; status: string };

function formattedDate(value?: string) {
  if (!value) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-NP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AdminUserAccess() {
  const auth = useAuth();
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<{ email: string; password: string; note: string } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [userData, tenantData] = await Promise.all([
        auth.apiRequest<{ data: AccessUser[] }>('/admin/users'),
        auth.apiRequest<{ data: Tenant[] }>('/tenants'),
      ]);
      setUsers(userData.data || []);
      setTenants(tenantData.data || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load access control');
    }
  }, [auth]);

  useEffect(() => {
    if (auth.ready && auth.user?.role === 'admin') void load();
  }, [auth.ready, auth.user?.role, load]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((item) => item.role === 'admin').length,
    sellers: users.filter((item) => ['farmer', 'vendor'].includes(item.role)).length,
    buyers: users.filter((item) => item.role === 'customer').length,
    suspended: users.filter((item) => item.status === 'suspended').length,
  }), [users]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy('create');
    setError('');
    setIssued(null);
    try {
      const result = await auth.apiRequest<{ user: AccessUser; temporaryPassword: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          phone: String(data.get('phone') || ''),
          role: String(data.get('role') || 'customer'),
          tenantId: String(data.get('tenantId') || '') || undefined,
          verified: data.get('verified') === 'on',
        }),
      });
      setIssued({
        email: result.user.email,
        password: result.temporaryPassword,
        note: 'Share this temporary password securely. It is shown only now and the user should change it after sign-in.',
      });
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create user');
    } finally {
      setBusy('');
    }
  }

  async function toggle(user: AccessUser) {
    setBusy(`status:${user.id}`);
    setError('');
    try {
      await auth.apiRequest(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: user.status === 'active' ? 'suspended' : 'active' }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update user');
    } finally {
      setBusy('');
    }
  }

  async function resetPassword(user: AccessUser) {
    setBusy(`reset:${user.id}`);
    setError('');
    setIssued(null);
    try {
      const result = await auth.apiRequest<{ temporaryPassword: string }>(`/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        body: '{}',
      });
      setIssued({
        email: user.email,
        password: result.temporaryPassword,
        note: 'All existing sessions were revoked. This temporary password is shown once.',
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reset password');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="access-control-shell">
      {error && <div className="workspace-error">{error}</div>}
      <div className="access-kpis">
        <AccessMetric label="All users" value={stats.total} />
        <AccessMetric label="Admins" value={stats.admins} />
        <AccessMetric label="Farmers / vendors" value={stats.sellers} />
        <AccessMetric label="Customers" value={stats.buyers} />
        <AccessMetric label="Suspended" value={stats.suspended} />
      </div>

      {issued && (
        <div className="temporary-credential-card" role="status">
          <div>
            <span className="eyebrow">ONE-TIME CREDENTIAL</span>
            <h3>{issued.email}</h3>
            <code>{issued.password}</code>
            <p>{issued.note}</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard?.writeText(`${issued.email}\n${issued.password}`)}>
            <Copy size={16} /> Copy
          </button>
        </div>
      )}

      <div className="access-grid">
        <section className="access-panel">
          <div className="access-panel-title">
            <UserPlus />
            <div><h3>Create account</h3><p>Create a real marketplace identity with a temporary password.</p></div>
          </div>
          <form className="workspace-form" onSubmit={createUser}>
            <div className="form-grid">
              <label>Full name<input name="name" required minLength={2} /></label>
              <label>Email<input name="email" required type="email" autoComplete="off" /></label>
            </div>
            <div className="form-grid">
              <label>Phone<input name="phone" inputMode="tel" /></label>
              <label>Role
                <select name="role" defaultValue="customer">
                  <option value="customer">Customer</option>
                  <option value="farmer">Farmer</option>
                  <option value="vendor">Vendor / cooperative</option>
                  <option value="admin">Platform admin</option>
                </select>
              </label>
            </div>
            <label>Seller tenant (required for farmer/vendor)
              <select name="tenantId" defaultValue="">
                <option value="">No tenant / buyer / admin</option>
                {tenants.map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.name} · {tenant.status}</option>)}
              </select>
            </label>
            <label className="checkline"><input name="verified" type="checkbox" /> Mark identity verified</label>
            <button className="btn btn-primary" disabled={busy === 'create'} type="submit">
              <ShieldCheck size={16} /> {busy === 'create' ? 'Creating…' : 'Create secure account'}
            </button>
          </form>
        </section>

        <section className="access-panel access-security-copy">
          <div className="access-panel-title">
            <ShieldCheck />
            <div><h3>Access policy</h3><p>Production-safe identity rules for admin, seller and buyer workspaces.</p></div>
          </div>
          <ul>
            <li>Passwords are bcrypt-hashed and never readable after creation.</li>
            <li>Temporary passwords are generated server-side and shown only once.</li>
            <li>Password reset revokes active sessions.</li>
            <li>Seller users must belong to a tenant; tenant roles remain separately scoped.</li>
            <li>Suspended accounts cannot start a new session.</li>
            <li>Admin changes are written to the audit log.</li>
          </ul>
        </section>
      </div>

      <section className="access-panel">
        <div className="access-panel-title access-list-heading">
          <UsersRound />
          <div><h3>User directory</h3><p>Account inventory with tenant, role, status and last access.</p></div>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
        </div>
        <div className="access-table-wrap">
          <div className="access-table access-table-head">
            <span>User</span><span>Role</span><span>Workspace</span><span>Status</span><span>Last login</span><span>Actions</span>
          </div>
          {users.map((user) => (
            <div className="access-table" key={user.id}>
              <span><b>{user.name}</b><small>{user.email}</small></span>
              <span><strong className={`role-pill role-${user.role}`}>{user.role}</strong></span>
              <span>{user.tenantName || user.tenantId || 'Platform / buyer'}</span>
              <span><strong className={`status-pill status-${user.status}`}>{user.status}</strong>{user.mustChangePassword && <small>Change password required</small>}</span>
              <span>{formattedDate(user.lastLoginAt)}</span>
              <span className="access-actions">
                <button type="button" disabled={!!busy} onClick={() => void resetPassword(user)}><KeyRound size={14} /> Reset</button>
                <button type="button" disabled={!!busy || (user.id === auth.user?.id && user.status === 'active')} onClick={() => void toggle(user)}>{user.status === 'active' ? 'Suspend' : 'Activate'}</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccessMetric({ label, value }: { label: string; value: number }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}
