import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Boxes, LocateFixed, PackageCheck, Route, Store, Wallet } from 'lucide-react';
export const metadata: Metadata = {
  title: 'How Hariyo Mart Works',
  description:
    'How farmers list crops, buyers discover nearby produce, multi-vendor orders are routed and sellers get paid.',
};
const steps = [
  [
    '1',
    'Farmer creates a store',
    'Each farmer/cooperative becomes an isolated tenant with their own products, service area, team and settlement records.',
  ],
  [
    '2',
    'Farm location is verified',
    'Seller chooses farm/pickup coordinates, district, municipality, delivery radius and collection hub options.',
  ],
  [
    '3',
    'Harvest is listed',
    'Crop, grade, quantity, unit, harvest date, minimum order, photos and wholesale/retail prices go live.',
  ],
  [
    '4',
    'Buyer shares location',
    'The marketplace ranks stock by distance, availability, freshness, delivery fit and seller trust.',
  ],
  [
    '5',
    'Order is split safely',
    'One customer cart can contain multiple sellers; the platform creates seller-level fulfillment groups.',
  ],
  [
    '6',
    'Delivery & payout complete',
    'Pickup/delivery status, buyer confirmation, commission and farmer payout are tracked independently.',
  ],
];
export default function How() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Marketplace operating model</span>
          <h1>One marketplace. Thousands of independent farm stores.</h1>
          <p className="section-copy">
            The buyer sees one Hariyo Mart. Behind it, each producer operates in a secure tenant
            workspace with isolated inventory, orders, staff, delivery rules and payouts.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="flow-grid">
            {steps.map((s) => (
              <article key={s[0]}>
                <span>{s[0]}</span>
                <h3>{s[1]}</h3>
                <p>{s[2]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="architecture-card">
            <div>
              <span className="eyebrow">What the system connects</span>
              <h2>Farm → Marketplace → Buyer → Fulfillment → Payout</h2>
            </div>
            <div className="arch-flow">
              <div>
                <Store />
                <b>Farmer tenant</b>
              </div>
              <i>→</i>
              <div>
                <Boxes />
                <b>Live stock</b>
              </div>
              <i>→</i>
              <div>
                <LocateFixed />
                <b>Geo matching</b>
              </div>
              <i>→</i>
              <div>
                <Route />
                <b>Delivery zone</b>
              </div>
              <i>→</i>
              <div>
                <PackageCheck />
                <b>Order</b>
              </div>
              <i>→</i>
              <div>
                <Wallet />
                <b>Payout</b>
              </div>
            </div>
            <div className="security-note">
              <BadgeCheck />
              <p>
                <b>Tenant isolation:</b> every seller record carries a tenant/farm scope. Protected
                API writes use authenticated seller identity and role permissions before inventory,
                order or payout data is changed.
              </p>
            </div>
            <Link href="/sell" className="btn btn-primary">
              Open a farmer store →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
