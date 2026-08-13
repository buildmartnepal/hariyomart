'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    try {
      const response = await fetch(`${api}/content/newsletter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      if (!response.ok) throw new Error('Unable to subscribe');
      setEmail('');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor="newsletter-email">
        <Mail size={17} /> Harvest news and seasonal offers
      </label>
      <div>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <button type="submit" disabled={status === 'loading'} aria-label="Subscribe">
          {status === 'success' ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
        </button>
      </div>
      <small aria-live="polite">
        {status === 'success'
          ? 'You’re on the list.'
          : status === 'error'
            ? 'Could not subscribe yet. Please try again.'
            : 'Useful farm updates only. Unsubscribe anytime.'}
      </small>
    </form>
  );
}
