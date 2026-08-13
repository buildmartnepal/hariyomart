'use client';
import { FormEvent, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  Crosshair,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { farmForProduct } from '@/lib/marketplace';
export default function Checkout() {
  const { lines, total, clear } = useCart();
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [orderNo, setOrderNo] = useState('');
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const checkoutKey = useRef('');
  const groups = useMemo(() => {
    const m = new Map<string, typeof lines>();
    for (const line of lines) {
      const f = farmForProduct(line.product);
      m.set(f.slug, [...(m.get(f.slug) || []), line]);
    }
    return [...m.entries()].map(([slug, lines]) => ({
      farm: farmForProduct(lines[0].product),
      slug,
      lines,
      subtotal: lines.reduce((a, l) => a + l.product.price * l.quantity, 0),
    }));
  }, [lines]);
  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () =>
        setMessage(
          'Location permission was not granted. You can continue with your written address.',
        ),
      { maximumAge: 300000, timeout: 8000 },
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lines.length) return;
    setStatus('sending');
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    if (!checkoutKey.current)
      checkoutKey.current =
        globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random()}`;
    const payload = {
      lines: lines.map((l) => ({ productSlug: l.product.slug, quantity: l.quantity })),
      paymentMethod: String(fd.get('paymentMethod') || 'cod'),
      guestCustomer: {
        name: String(fd.get('name') || ''),
        phone: String(fd.get('phone') || ''),
        email: String(fd.get('email') || '') || undefined,
      },
      deliveryAddress: {
        province: String(fd.get('province') || ''),
        district: String(fd.get('district') || ''),
        municipality: String(fd.get('municipality') || ''),
        ward: String(fd.get('ward') || ''),
        street: String(fd.get('street') || ''),
        phone: String(fd.get('phone') || ''),
        ...coords,
      },
    };
    try {
      const r = await fetch(`${api}/orders/guest`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-idempotency-key': checkoutKey.current,
        },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as { error?: string; orderNumber?: string };
      if (!r.ok) throw new Error(data.error || 'Order could not be placed');
      setOrderNo(data.orderNumber || `HMN-${Date.now()}`);
      setStatus('done');
      clear();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Order could not be placed');
    }
  }
  return (
    <main>
      <section className="page-hero compact">
        <div className="container">
          <span className="eyebrow">Multi-seller checkout</span>
          <h1>One cart. Seller-by-seller fulfillment.</h1>
          <p className="section-copy">
            Hariyo Mart keeps your checkout unified while each farmer receives only the items,
            delivery task and settlement that belong to their store.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container checkout-grid">
          {status === 'done' ? (
            <div className="checkout-success">
              <PackageCheck size={58} />
              <span className="eyebrow">Order received</span>
              <h2>{orderNo}</h2>
              <p>
                Your order has been split into the required farmer fulfillment groups. Payment and
                seller acceptance continue from this order record.
              </p>
              <a className="btn btn-primary" href="/shop">
                Continue shopping
              </a>
              <a className="btn btn-secondary" href="/track">
                Track this order
              </a>
            </div>
          ) : (
            <form className="checkout-form" onSubmit={submit}>
              <div className="checkout-card">
                <div className="form-heading">
                  <MapPin />
                  <div>
                    <b>Delivery details</b>
                    <span>Used for seller distance and serviceability</span>
                  </div>
                </div>
                <div className="form-2">
                  <label>
                    Full name
                    <input name="name" required />
                  </label>
                  <label>
                    Mobile number
                    <input name="phone" inputMode="tel" required />
                  </label>
                </div>
                <label>
                  Email (optional)
                  <input name="email" type="email" />
                </label>
                <div className="form-2">
                  <label>
                    Province
                    <input name="province" required placeholder="Bagmati" />
                  </label>
                  <label>
                    District
                    <input name="district" required placeholder="Kathmandu" />
                  </label>
                </div>
                <div className="form-2">
                  <label>
                    Municipality
                    <input name="municipality" required />
                  </label>
                  <label>
                    Ward
                    <input name="ward" required />
                  </label>
                </div>
                <label>
                  Street / landmark
                  <input name="street" required />
                </label>
                <button className="location-helper" type="button" onClick={locate}>
                  <Crosshair size={16} />
                  {coords.lat
                    ? 'Current location attached'
                    : 'Attach current location for better delivery matching'}
                </button>
              </div>
              <div className="checkout-card">
                <div className="form-heading">
                  <ShieldCheck />
                  <div>
                    <b>Payment method</b>
                    <span>Order total remains separated by seller for settlement</span>
                  </div>
                </div>
                <select name="paymentMethod" defaultValue="cod" aria-label="Payment method">
                  <option value="cod">Cash on delivery</option>
                </select>
                <p className="payment-note">
                  Cash on delivery is active. eSewa, Khalti and Fonepay will only appear after their
                  signed callbacks and merchant accounts are verified in production.
                </p>
              </div>
              {message && <div className="checkout-message">{message}</div>}
              <button
                className="btn btn-primary btn-full"
                disabled={status === 'sending' || !lines.length}
              >
                {status === 'sending' ? 'Creating order…' : 'Place marketplace order'}
              </button>
            </form>
          )}
          <aside className="order-summary">
            <div className="summary-head">
              <h2>Order summary</h2>
              <span>
                {groups.length} seller{groups.length === 1 ? '' : 's'}
              </span>
            </div>
            {groups.map((g) => (
              <div className="seller-group" key={g.slug}>
                <div className="seller-group-head">
                  <div>
                    <Store />
                    <span>
                      <b>{g.farm.name}</b>
                      <small>
                        <BadgeCheck /> Verified · {g.farm.district}
                      </small>
                    </span>
                  </div>
                  <span>NPR {g.subtotal.toLocaleString()}</span>
                </div>
                {g.lines.map((l) => (
                  <div className="checkout-line" key={l.product.slug}>
                    <Image src={l.product.image} width={56} height={48} alt={l.product.name} />
                    <div>
                      <b>{l.product.name}</b>
                      <span>
                        {l.quantity} × NPR {l.product.price}
                      </span>
                    </div>
                    <strong>NPR {(l.product.price * l.quantity).toLocaleString()}</strong>
                  </div>
                ))}
                <div className="fulfillment-note">
                  <Truck size={15} /> Seller fulfillment is tracked independently.
                </div>
              </div>
            ))}
            <div className="summary-total">
              <span>Products</span>
              <b>NPR {total.toLocaleString()}</b>
              <small>Delivery fee is finalized per seller service zone by the API.</small>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
