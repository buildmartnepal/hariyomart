import type { Metadata } from 'next';
import { ShopClient } from '@/components/ShopClient';
import { BadgeCheck, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { RecentlyViewedRail } from '@/components/RecentlyViewedRail';
export const metadata: Metadata = {
  title: 'Shop Organic Products in Nepal',
  description: 'Browse fresh foods and natural products from Nepal’s seven provinces.',
};
export default function Shop() {
  return (
    <main>
      <section className="page-hero marketplace-hero">
        <div className="container">
          <div className="breadcrumbs">Home / Shop</div>
          <span className="eyebrow">Nepal’s location-aware farm marketplace</span>
          <h1>Fresh food, ranked from the farms nearest to you.</h1>
          <p className="section-copy">
            Compare live seller stock, distance, origin and delivery options from verified farmers,
            cooperatives and local producers across every province of Nepal.
          </p>
          <div className="marketplace-hero-trust">
            <span>
              <MapPin size={17} />
              <b>7 provinces</b> location matching
            </span>
            <span>
              <BadgeCheck size={17} />
              <b>Verified</b> farmer storefronts
            </span>
            <span>
              <Truck size={17} />
              <b>Flexible</b> delivery & pickup
            </span>
            <span>
              <ShieldCheck size={17} />
              <b>Traceable</b> orders and stock
            </span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <ShopClient />
        </div>
      </section>
      <section className="section shop-recent-section"><div className="container"><RecentlyViewedRail /></div></section>
    </main>
  );
}
