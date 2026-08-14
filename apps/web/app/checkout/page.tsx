'use client';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  CalendarClock,
  Crosshair,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { farmForProduct } from '@/lib/marketplace';

type DeliverySlot = {
  id: string;
  zone_name?: string | null;
  slot_date: string;
  starts_at: string;
  ends_at: string;
  capacity_orders: number;
  reserved_orders: number;
  fee_override_npr?: number | null;
};

export default function Checkout() {
  const { lines, total, clear, cloudSynced } = useCart();
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [orderNo, setOrderNo] = useState('');
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponNote, setCouponNote] = useState('');
  const [discountNpr, setDiscountNpr] = useState(0);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [deliverySlotId, setDeliverySlotId] = useState('');
  const checkoutKey = useRef('');
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const groups = useMemo(() => {
    const m = new Map<string, typeof lines>();
    for (const line of lines) {
      const f = farmForProduct(line.product);
      m.set(f.slug, [...(m.get(f.slug) || []), line]);
    }
    return [...m.entries()].map(([slug, sellerLines]) => ({
      farm: farmForProduct(sellerLines[0].product),
      slug,
      lines: sellerLines,
      subtotal: sellerLines.reduce((a, l) => a + l.product.price * l.quantity, 0),
    }));
  }, [lines]);

  useEffect(() => {
    let active = true;
    fetch(`${api}/commerce/delivery-slots`, { cache: 'no-store', credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: { data?: DeliverySlot[] }) => {
        if (active) setDeliverySlots(Array.isArray(payload.data) ? payload.data : []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api]);

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

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      setDiscountNpr(0);
      setCouponNote('');
      return;
    }
    setCouponBusy(true);
    setCouponNote('');
    try {
      const response = await fetch(`${api}/commerce/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, subtotal: total }),
      });
      const data = (await response.json()) as {
        error?: string;
        discountNpr?: number;
        code?: string;
        name?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Coupon could not be validated');
      setDiscountNpr(Number(data.discountNpr || 0));
      setCouponNote(
        `${data.code || code} applied${data.name ? ` · ${data.name}` : ''}. Final eligibility is rechecked when the order is placed.`,
      );
    } catch (error) {
      setDiscountNpr(0);
      setCouponNote(error instanceof Error ? error.message : 'Coupon could not be validated');
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lines.length) return;
    setStatus('sending');
    setMessage('');
    const fd = new FormData(e.currentTarget);
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
      couponCode: couponCode.trim() || undefined,
      deliverySlotId: deliverySlotId || undefined,
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
      const data = (await r.json()) as {
        error?: string;
        orderNumber?: string;
        discountNpr?: number;
      };
      if (!r.ok) throw new Error(data.error || 'Order could not be placed');
      setDiscountNpr(Number(data.discountNpr || discountNpr));
      setOrderNo(data.orderNumber || `HMN-${Date.now()}`);
      setStatus('done');
      clear();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Order could not be placed');
    }
  }

  const selectedSlot = deliverySlots.find((slot) => slot.id === deliverySlotId);
  const productsAfterDiscount = Math.max(0, total - discountNpr);

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
                  <CalendarClock />
                  <div>
                    <b>Delivery schedule</b>
                    <span>Capacity is rechecked and reserved atomically at checkout</span>
                  </div>
                </div>
                <label>
                  Preferred delivery slot
                  <select
                    value={deliverySlotId}
                    onChange={(event) => setDeliverySlotId(event.target.value)}
                  >
                    <option value="">Automatic / next available</option>
                    {deliverySlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slot_date} · {slot.starts_at}–{slot.ends_at}
                        {slot.zone_name ? ` · ${slot.zone_name}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedSlot && (
                  <p className="payment-note">
                    {Math.max(0, selectedSlot.capacity_orders - selectedSlot.reserved_orders)} order
                    spaces currently available
                    {selectedSlot.fee_override_npr != null
                      ? ` · delivery fee NPR ${Number(selectedSlot.fee_override_npr).toLocaleString()}`
                      : ''}
                    .
                  </p>
                )}
                {!deliverySlots.length && (
                  <p className="payment-note">
                    No fixed slots are published right now. Hariyo will use the normal delivery
                    window for each seller.
                  </p>
                )}
              </div>

              <div className="checkout-card">
                <div className="form-heading">
                  <Tag />
                  <div>
                    <b>Coupon / promotion</b>
                    <span>Discount rules and limits are verified again in D1 at order creation</span>
                  </div>
                </div>
                <div className="commerce-coupon-row">
                  <input
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setDiscountNpr(0);
                      setCouponNote('');
                    }}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={couponBusy || !couponCode.trim()}
                    onClick={applyCoupon}
                  >
                    {couponBusy ? 'Checking…' : 'Apply'}
                  </button>
                </div>
                {couponNote && <p className="payment-note">{couponNote}</p>}
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
                  Cash on delivery is active. eSewa, Khalti and Fonepay only become visible after
                  their signed callbacks and merchant accounts are verified in production.
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
            <div className="commerce-sync-note">
              <ShieldCheck size={14} />
              {cloudSynced
                ? 'Signed-in basket is synchronized to Cloudflare D1.'
                : 'Basket is available locally; sign in to synchronize it across devices.'}
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
              {discountNpr > 0 && (
                <>
                  <span>Promotion</span>
                  <b>− NPR {discountNpr.toLocaleString()}</b>
                  <span>Products after discount</span>
                  <b>NPR {productsAfterDiscount.toLocaleString()}</b>
                </>
              )}
              <small>Delivery fee is finalized per seller service zone by the API.</small>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
