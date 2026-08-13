import type { Metadata } from 'next';
import { ShopClient } from '@/components/ShopClient';
export const metadata: Metadata = {
  title: 'Shop Organic Products in Nepal',
  description: 'Browse fresh foods and natural products from Nepal’s seven provinces.',
};
export default function Shop() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs">Home / Shop</div>
          <h1>Shop fresh from Nepal</h1>
          <p className="section-copy">
            Search farmer-published harvests by category and province. When the API is connected,
            live approved seller inventory replaces the seed preview automatically.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <ShopClient />
        </div>
      </section>
    </main>
  );
}
