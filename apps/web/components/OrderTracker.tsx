'use client';

import { FormEvent, useState } from 'react';
import { MapPin, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  fulfillments: Array<{
    _id: string;
    status: string;
    total: number;
    timeline?: Array<{ status: string; at: string; note?: string }>;
  }>;
};

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function OrderTracker() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setOrder(null);
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams({
      orderNumber: String(form.get('orderNumber') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
    });
    try {
      const response = await fetch(`${api}/orders/track?${query}`, { cache: 'no-store' });
      const data = (await response.json()) as { error?: string; order?: TrackedOrder };
      if (!response.ok) throw new Error(data.error || 'Unable to find this order');
      setOrder(data.order || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to find this order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="track-layout">
      <form className="checkout-card track-form" onSubmit={submit}>
        <div className="form-heading">
          <Search />
          <div>
            <b>Find a guest order</b>
            <span>Use the same mobile number entered at checkout.</span>
          </div>
        </div>
        <label>
          Order number
          <input name="orderNumber" required placeholder="HMN-20260813-AB12CD34" />
        </label>
        <label>
          Mobile number
          <input name="phone" required inputMode="tel" placeholder="98XXXXXXXX" />
        </label>
        {message && <div className="checkout-message">{message}</div>}
        <button className="btn btn-primary btn-full" disabled={busy}>
          {busy ? 'Checking order…' : 'Track order'}
        </button>
        <small>
          Signed-in buyers can see their complete history in My Hariyo. This lookup intentionally
          requires both order number and mobile number.
        </small>
      </form>

      <section className="checkout-card track-result" aria-live="polite">
        {order ? (
          <>
            <span className="eyebrow">ORDER FOUND</span>
            <h2>{order.orderNumber}</h2>
            <div className="track-summary">
              <div>
                <PackageCheck />
                <span>
                  <small>ORDER STATUS</small>
                  <b>{order.status.replaceAll('_', ' ')}</b>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <small>PAYMENT</small>
                  <b>
                    {order.paymentMethod.toUpperCase()} · {order.paymentStatus}
                  </b>
                </span>
              </div>
              <div>
                <MapPin />
                <span>
                  <small>TOTAL</small>
                  <b>NPR {Number(order.total).toLocaleString()}</b>
                </span>
              </div>
            </div>
            <h3>Seller fulfillments</h3>
            {order.fulfillments.map((fulfillment, index) => (
              <div className="track-fulfillment" key={fulfillment._id || index}>
                <Truck />
                <span>
                  <b>Seller delivery {index + 1}</b>
                  <small>{fulfillment.status.replaceAll('_', ' ')}</small>
                </span>
                <strong>NPR {Number(fulfillment.total).toLocaleString()}</strong>
              </div>
            ))}
          </>
        ) : (
          <div className="workspace-state">
            <div className="workspace-state-icon">
              <PackageCheck />
            </div>
            <h2>Your delivery trail appears here.</h2>
            <p>Enter the order number and checkout mobile number to see current seller statuses.</p>
          </div>
        )}
      </section>
    </div>
  );
}
