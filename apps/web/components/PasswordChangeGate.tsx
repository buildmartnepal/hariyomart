'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function PasswordChangeGate() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!auth.user?.mustChangePassword) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get('currentPassword') || '');
    const newPassword = String(data.get('newPassword') || '');
    const confirmation = String(data.get('confirmation') || '');
    if (newPassword !== confirmation) {
      setMessage('The new passwords do not match.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await auth.apiRequest('/account/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage('Password changed. For security, sign in again with the new password.');
      form.reset();
      setTimeout(() => void auth.logout(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="password-change-gate" aria-labelledby="password-change-title">
      <div className="password-change-copy">
        <span className="password-change-icon"><ShieldCheck size={18} /></span>
        <div>
          <strong id="password-change-title">Secure your new account</strong>
          <p>Your administrator issued a temporary password. Replace it before continuing regular work.</p>
        </div>
      </div>
      <form onSubmit={submit} className="password-change-form">
        <input name="currentPassword" type="password" autoComplete="current-password" placeholder="Temporary password" required />
        <input name="newPassword" type="password" autoComplete="new-password" placeholder="New strong password" minLength={14} required />
        <input name="confirmation" type="password" autoComplete="new-password" placeholder="Confirm new password" minLength={14} required />
        <button className="btn btn-primary" disabled={busy} type="submit">
          <KeyRound size={15} /> {busy ? 'Securing…' : 'Change password'}
        </button>
      </form>
      {message && <div className="password-change-message">{message}</div>}
    </section>
  );
}


export function WorkspaceSecurityGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.user?.mustChangePassword) return <PasswordChangeGate />;
  return <>{children}</>;
}
