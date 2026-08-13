import type { Metadata } from 'next';
import { LocationMarket } from '@/components/LocationMarket';
export const metadata: Metadata = {
  title: 'Nearby Farmers & Local Products',
  description:
    'Use your location to discover verified farms and fresh products closest to you across Nepal.',
};
export default function NearbyPage() {
  return (
    <main>
      <section className="page-hero compact">
        <div className="container">
          <span className="eyebrow">Local discovery</span>
          <h1>Fresh food, matched to your location.</h1>
          <p className="section-copy">
            Hariyo Mart prioritizes nearby stock, direct farm pickup and practical delivery zones so
            buyers can choose local before long-distance delivery.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <LocationMarket />
        </div>
      </section>
    </main>
  );
}
