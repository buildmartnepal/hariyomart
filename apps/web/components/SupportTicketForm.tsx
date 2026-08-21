'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Headphones, Send, ShieldCheck } from 'lucide-react';
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
    const helpType = String(data.get('helpType') || 'General');
    const orderReference = String(data.get('orderReference') || '').trim();
    const message = String(data.get('message') || '');
    const structuredMessage = [
      `Support type: ${helpType}`,
      orderReference ? `Order/reference: ${orderReference}` : '',
      '',
      message,
    ].filter(Boolean).join('\n');
    try {
      const response = await fetch(`${api}/support/tickets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          subject: `[${helpType}] ${String(data.get('subject') || '')}`,
          message: structuredMessage,
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

  if (ticket) return (
    <div className="support-success">
      <CheckCircle2 size={38} />
      <span className="eyebrow">Request received</span>
      <h2>Your support ticket is open</h2>
      <p>Reference: <b>{ticket}</b>. Keep this number for follow-up or include it when you contact the team again.</p>
      <button className="btn btn-soft" onClick={() => setTicket('')}>Open another ticket</button>
    </div>
  );

  return (
    <form className="support-ticket-form" onSubmit={submit}>
      <div className="support-form-head">
        <Headphones />
        <div><span className="eyebrow">Support desk</span><h2>Open a Hariyo support ticket</h2><p>Buyer orders, seller onboarding, delivery coverage, technical help or business procurement.</p></div>
      </div>
      <div className="form-grid">
        <label>Your name<input name="name" autoComplete="name" defaultValue={auth.user?.name || ''} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" defaultValue={auth.user?.email || ''} required /></label>
      </div>
      <div className="form-grid">
        <label>What do you need help with?
          <select name="helpType" defaultValue="Order & buyer care">
            <option>Order & buyer care</option><option>Farmer onboarding</option><option>Seller operations</option><option>Delivery & fulfilment</option><option>Wholesale & business buying</option><option>Technical & account help</option><option>Accessibility</option><option>Media & partnership</option><option>General enquiry</option>
          </select>
        </label>
        <label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent order issue</option></select></label>
      </div>
      <div className="form-grid">
        <label>Phone (optional)<input name="phone" type="tel" autoComplete="tel" /></label>
        <label>Order / reference (optional)<input name="orderReference" placeholder="Order number, ticket or seller name" /></label>
      </div>
      <label>Subject<input name="subject" required minLength={4} placeholder="Short description of the issue" maxLength={130} /></label>
      <label>How can we help?<textarea name="message" rows={7} required minLength={10} placeholder="What happened, when it happened, and what outcome you need…" maxLength={4500} /></label>
      <div className="support-privacy-note"><ShieldCheck size={18} /><span><b>Keep sensitive credentials private.</b> Do not include passwords, OTPs, wallet PINs, card details or infrastructure/API secrets.</span></div>
      {error && <p className="form-message error">{error}</p>}
      <button className="btn btn-primary support-submit" type="submit" disabled={sending}><Send size={16} /> {sending ? 'Creating ticket…' : 'Create support ticket'}</button>
    </form>
  );
}
