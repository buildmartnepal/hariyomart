import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  Boxes,
  CircleHelp,
  LocateFixed,
  PackageCheck,
  Route,
  ShieldCheck,
  Smartphone,
  Store,
  Wallet,
} from 'lucide-react';
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
      <section className="section role-journeys">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">One system, three workspaces</span>
              <h2 className="section-title">The right controls for every role.</h2>
            </div>
            <p className="section-copy">
              Buyers get one simple marketplace while farmers and operators receive purpose-built,
              permission-scoped tools.
            </p>
          </div>
          <div className="role-journey-grid">
            <article>
              <Smartphone />
              <small>BUYER</small>
              <h3>Discover and order</h3>
              <ul>
                <li>Location-ranked marketplace</li>
                <li>Multi-seller cart and checkout</li>
                <li>Order tracking, reviews and repeat baskets</li>
              </ul>
              <Link href="/shop">Open marketplace →</Link>
            </article>
            <article>
              <Store />
              <small>FARMER</small>
              <h3>Run a digital farm store</h3>
              <ul>
                <li>Harvest publishing and live inventory</li>
                <li>Delivery radius and fulfilment updates</li>
                <li>Customer, settlement and payout records</li>
              </ul>
              <Link href="/sell">Start seller onboarding →</Link>
            </article>
            <article>
              <ShieldCheck />
              <small>ADMIN</small>
              <h3>Operate the platform</h3>
              <ul>
                <li>Farmer and product verification</li>
                <li>Categories, pages, media and promotions</li>
                <li>Support, audit history and system settings</li>
              </ul>
              <Link href="/login">Secure admin sign-in →</Link>
            </article>
          </div>
        </div>
      </section>
      <section className="section how-faq">
        <div className="container how-faq-layout">
          <div>
            <span className="eyebrow">Practical questions</span>
            <h2 className="section-title">Before your first order or listing.</h2>
            <p className="section-copy">
              Availability, delivery and seller coverage are intentionally live—they change by
              harvest, route and location.
            </p>
          </div>
          <div className="how-faq-list">
            {[
              [
                'Can one order include several farms?',
                'Yes. The buyer sees one order, while the backend creates a separate fulfilment, commission and payout record for each seller.',
              ],
              [
                'What if no farmer serves my location?',
                'Increase the radius, select a nearby city or request coverage. Products only appear when the seller can reasonably serve the chosen market.',
              ],
              [
                'How does a product become public?',
                'A farmer lists a draft, submits it for review, and an administrator verifies the seller, category, claims, media and serviceability before activation.',
              ],
              [
                'Are online payments enabled?',
                'Cash on delivery is launch-ready. eSewa, Khalti, Fonepay and card adapters remain disabled until merchant onboarding and signed callback flows are certified.',
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  <CircleHelp size={18} />
                  {question}
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
