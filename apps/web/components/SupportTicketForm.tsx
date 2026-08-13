'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Headphones, Send } from 'lucide-react';
import { useAuth } from './AuthProvider';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function SupportTicketForm() {
  const auth = useAuth();
  const [sending, setSending] = useState(false);
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(`${api}/support/tickets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          subject: data.get('subject'),
          message: data.get('message'),
          priority: data.get('priority'),
        }),
      });
      const result = (await response.json()) as { ticketNumber?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not open support ticket');
      setTicket(result.ticketNumber || 'Created');
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open support ticket');
    } finally {
      setSending(false);
    }
  }

  if (ticket)
    return (
      <div className="support-success">
        <CheckCircle2 size={34} />
        <h2>Your support ticket is open</h2>
        <p>
          Reference: <b>{ticket}</b>. Keep this number for follow-up.
        </p>
        <button className="btn btn-soft" onClick={() => setTicket('')}>
          Open another ticket
        </button>
      </div>
    );

  return (
    <form className="support-ticket-form" onSubmit={submit}>
      <div className="support-form-head">
        <Headphones />
        <div>
          <h2>Talk to the Hariyo team</h2>
          <p>Buyer orders, seller onboarding, delivery coverage or business enquiries.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Your name
          <input name="name" defaultValue={auth.user?.name || ''} required />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={auth.user?.email || ''} required />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Phone (optional)
          <input name="phone" type="tel" />
        </label>
        <label>
          Priority
          <select name="priority">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent order issue</option>
          </select>
        </label>
      </div>
      <label>
        Subject
        <input name="subject" required minLength={4} />
      </label>
      <label>
        How can we help?
        <textarea name="message" rows={6} required minLength={10} />
      </label>
      {error && <p className="form-message error">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={sending}>
        <Send size={16} /> {sending ? 'Sending…' : 'Create support ticket'}
      </button>
    </form>
  );
}
