import type { Metadata } from 'next';
import { OrderTracker } from '@/components/OrderTracker';

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Track a Hariyo Mart Nepal guest order using its order number and mobile number.',
};

export default function TrackPage() {
  return (
    <main>
      <section className="page-hero compact">
        <div className="container">
          <span className="eyebrow">Live seller fulfillment</span>
          <h1>Track your Hariyo order.</h1>
          <p className="section-copy">
            One checkout can include several farmers. Follow each seller delivery from acceptance to
            doorstep.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <OrderTracker />
        </div>
      </section>
    </main>
  );
}
