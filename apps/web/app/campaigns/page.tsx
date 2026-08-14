import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, HeartHandshake, MapPinned, Sprout } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hariyo Campaign Studio',
  description:
    'Explore the Hariyo Mart Nepal brand story connecting local suppliers, farms and customers across Nepal.',
  openGraph: { images: ['/campaigns/campaign-board.webp'] },
};

const stories = [
  {
    image: '/campaigns/fresh-every-corner.webp',
    title: 'Fresh from every corner',
    copy: 'Discover home-based sellers, cooperatives and local farms through one trusted marketplace.',
    href: '/shop',
  },
  {
    image: '/campaigns/connect-suppliers.webp',
    title: 'Connect suppliers to homes',
    copy: 'Location-aware discovery helps nearby harvests reach customers while they are still fresh.',
    href: '/nearby',
  },
  {
    image: '/campaigns/sell-from-home.webp',
    title: 'Turn fresh products into daily orders',
    copy: 'Home suppliers receive a real seller tenant with catalog, stock, orders and payout visibility.',
    href: '/sell',
  },
  {
    image: '/campaigns/grow-with-hariyo.webp',
    title: 'Grow with Hariyo Mart',
    copy: 'Farms can build a trusted digital presence and serve both household and business buyers.',
    href: '/info/farmers',
  },
];

export default function CampaignsPage() {
  return (
    <main>
      <section className="page-hero campaign-page-hero">
        <div className="container campaign-page-heading">
          <div>
            <span className="eyebrow">Hariyo Mart Nepal Premium</span>
            <h1>A living brand for Nepal&apos;s fresh economy.</h1>
            <p>
              These stories now power the website and mobile experience—connecting local trust, real
              locations and everyday fresh commerce.
            </p>
            <div className="hero-actions">
              <Link href="/nearby" className="btn btn-primary">
                Explore nearby <ArrowRight size={17} />
              </Link>
              <Link href="/sell" className="btn btn-secondary">
                Join as a supplier
              </Link>
            </div>
          </div>
          <Image
            src="/campaigns/premium-logo.webp"
            alt="Hariyo Mart Nepal Premium logo"
            width={1600}
            height={854}
            priority
            sizes="(max-width: 800px) 100vw, 46vw"
          />
        </div>
      </section>
      <section className="section">
        <div className="container campaign-story-grid">
          {stories.map((story) => (
            <article key={story.title}>
              <Image
                src={story.image}
                alt={story.title}
                width={1000}
                height={1000}
                sizes="(max-width: 760px) 100vw, 50vw"
              />
              <div>
                <h2>{story.title}</h2>
                <p>{story.copy}</p>
                <Link href={story.href}>
                  Continue <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section campaign-board-section">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">One connected system</span>
              <h2 className="section-title">Local people. Real produce. One platform.</h2>
            </div>
            <p className="section-copy">
              A campaign system built around the same promise as the product: stronger farmer
              businesses and simpler fresh buying.
            </p>
          </div>
          <Image
            className="campaign-board"
            src="/campaigns/campaign-board.webp"
            alt="Hariyo Mart campaign collection showing farmers, local produce, delivery and platform benefits"
            width={1536}
            height={1024}
            sizes="100vw"
          />
          <div className="campaign-value-grid">
            <span>
              <MapPinned />
              <b>Local by default</b>Location shapes discovery and delivery.
            </span>
            <span>
              <BadgeCheck />
              <b>Trust made visible</b>Seller verification and origin travel with products.
            </span>
            <span>
              <Sprout />
              <b>Farmer-first tools</b>Independent tenant operations for every seller.
            </span>
            <span>
              <HeartHandshake />
              <b>Shared prosperity</b>Retail, wholesale and repeat buyers in one network.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
