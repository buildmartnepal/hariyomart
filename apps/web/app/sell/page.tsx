import type { Metadata } from 'next';
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
              transparent settlement.
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
          <div className="seller-phone">
            <div className="phone-notch" />
            <span className="micro">FARMER MODE</span>
            <h3>Today at your farm</h3>
            <div className="phone-stat">
              <b>NPR 18,420</b>
              <span>sales this week</span>
            </div>
            <div className="phone-card">
              <span>🌶️ Akabare chilli</span>
              <b>18 kg live</b>
            </div>
            <div className="phone-card">
              <span>🥬 Saag</span>
              <b>12 orders</b>
            </div>
            <button>+ List today’s harvest</button>
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
