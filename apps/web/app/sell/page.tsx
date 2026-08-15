import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SellOnHariyo } from '@/components/SellOnHariyo';
export const metadata: Metadata = {
  title: 'Sell on Hariyo Mart',
  description:
    'Create a farmer store, list crops by location and sell directly to buyers, restaurants and institutions in Nepal.',
};
export default function SellPage() {
  return (
    <main>
      <section className="seller-hero">
        <div className="container seller-hero-grid">
          <div>
            <span className="eyebrow">For every grower in Nepal</span>
            <h1>
              Grow it.
              <br />
              List it.
              <br />
              <span>Sell it locally.</span>
            </h1>
            <p>
              From one basket of Akabare chilli to a cooperative truckload of rice, Hariyo Mart
              gives Nepal’s farmers a location-based storefront, buyer matching, order tools and
              transparent settlement, crop planning, farm profitability and B2B demand matching.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#join">
                Start farmer onboarding
              </a>
              <Link className="btn btn-secondary" href="/farmer/overview">
                Preview farmer dashboard
              </Link>
            </div>
          </div>
          <div className="seller-campaign-visual">
            <Image
              src="/campaigns/sell-from-home.webp"
              alt="Hariyo Mart helps farms and home-based suppliers list products, reach nearby customers and grow"
              width={1000}
              height={1000}
              priority
              sizes="(max-width: 800px) 100vw, 46vw"
            />
            <div className="seller-live-proof">
              <span>
                <i /> Seller system live
              </span>
              <b>Store · Stock · Orders · Payouts</b>
            </div>
          </div>
        </div>
      </section>
      <section className="section seller-saas-section">
        <div className="container">
          <div className="section-heading seller-saas-heading">
            <div>
              <span className="eyebrow">FARMER SAAS</span>
              <h2>Start free. Grow into a complete produce operating system.</h2>
              <p className="section-copy">
                Every farmer store is a secure tenant workspace. Upgrade when you need more team seats,
                products, warehouses, crop economics, buyer demand, traceability, AI assistance, subscriptions and advanced reporting.
              </p>
            </div>
          </div>
          <div className="seller-saas-grid">
            <article className="seller-saas-plan">
              <span>Starter</span><h3>NPR 0</h3><small>For an individual farmer starting online</small>
              <ul><li>Up to 150 products</li><li>3 team members</li><li>1 warehouse / collection point</li><li>Crop planning + profitability</li><li>Buyer demand + QR traceability</li><li>50 Hariyo AI calls / month</li><li>Procurement, lots and delivery tools</li></ul>
              <a className="btn btn-secondary" href="#join">Start free</a>
            </article>
            <article className="seller-saas-plan featured">
              <span>Growth</span><h3>NPR 2,499 <small>/ month</small></h3><small>For growing farms and cooperatives</small>
              <ul><li>Up to 2,000 products</li><li>15 team members</li><li>5 warehouses</li><li>Advanced inventory + CRM/team roles</li><li>Produce subscriptions + advanced reports</li><li>500 Hariyo AI calls / month</li></ul>
              <a className="btn btn-primary" href="#join">Open Growth workspace</a>
            </article>
            <article className="seller-saas-plan">
              <span>Enterprise</span><h3>NPR 9,999 <small>/ month</small></h3><small>For large cooperatives and supply networks</small>
              <ul><li>Up to 100,000 products</li><li>100 team members</li><li>50 warehouses</li><li>Custom domain + API access</li><li>5,000 Hariyo AI calls / month</li><li>Isolated data-tier entitlement</li></ul>
              <a className="btn btn-secondary" href="/contact">Talk to Hariyo</a>
            </article>
          </div>
        </div>
      </section>
      <section className="section" id="join">
        <div className="container">
          <SellOnHariyo />
        </div>
      </section>
    </main>
  );
}
