import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChefHat,
  LocateFixed,
  PackageCheck,
  Smartphone,
  Store,
  Tractor,
  Truck,
  UsersRound,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { LocationMarket } from '@/components/LocationMarket';
export default function Home() {
  const featured = catalog.products.filter((p) => p.featured).slice(0, 8);
  return (
    <main>
      <section className="hero-wrap">
        <div className="container">
          <div className="hero hero-v2">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="live-badge">
                  <span /> Nepal’s location-first farmer marketplace
                </div>
                <h1>
                  From the <span>nearest farm</span> to your table.
                </h1>
                <p>
                  Hariyo Mart lets every farmer, cooperative and local producer open their own
                  digital store, sell what they uniquely grow, and reach buyers based on real
                  delivery location.
                </p>
                <div className="hero-actions">
                  <Link className="btn btn-primary" href="/nearby">
                    <LocateFixed size={18} /> Find food near me
                  </Link>
                  <Link className="btn btn-secondary" href="/sell">
                    <Store size={18} /> Start selling
                  </Link>
                </div>
                <div className="hero-proof">
                  <div>
                    <b>7</b>
                    <span>provinces</span>
                  </div>
                  <div>
                    <b>Multi-tenant</b>
                    <span>farmer stores</span>
                  </div>
                  <div>
                    <b>Retail + B2B</b>
                    <span>buyer modes</span>
                  </div>
                </div>
              </div>
              <div className="hero-media">
                <Image
                  src="/hero-vegetables.jpg"
                  alt="Fresh vegetables grown in Nepal"
                  width={1200}
                  height={900}
                  priority
                />
                <div className="floating-order">
                  <span className="status-dot" />
                  <div>
                    <small>Matched nearby</small>
                    <b>Kathmandu Valley Farm</b>
                    <span>8.4 km · same-day</span>
                  </div>
                  <ArrowRight size={18} />
                </div>
                <div className="floating-farmer">
                  <Tractor size={20} />
                  <div>
                    <b>Farmer mode</b>
                    <span>List today’s harvest</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="benefits">
              <div className="benefit">
                <div className="benefit-icon">
                  <LocateFixed size={20} />
                </div>
                <div>
                  <strong>Location matched</strong>
                  <span>Nearest stock appears first</span>
                </div>
              </div>
              <div className="benefit">
                <div className="benefit-icon">
                  <BadgeCheck size={20} />
                </div>
                <div>
                  <strong>Verified origin</strong>
                  <span>Farm-level traceability</span>
                </div>
              </div>
              <div className="benefit">
                <div className="benefit-icon">
                  <Truck size={20} />
                </div>
                <div>
                  <strong>Flexible fulfillment</strong>
                  <span>Pickup, local & intercity</span>
                </div>
              </div>
              <div className="benefit">
                <div className="benefit-icon">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <strong>Freshness aware</strong>
                  <span>Harvest & stock visibility</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section intro-section">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">One platform, two powerful sides</span>
              <h2 className="section-title">Built for the farmer and the buyer.</h2>
            </div>
            <p className="section-copy">
              A national marketplace should not hide where food comes from. Hariyo Mart turns
              location, farm identity, harvest availability and delivery distance into the core
              buying experience.
            </p>
          </div>
          <div className="audience-grid">
            <article className="audience-card farmer-card">
              <div className="audience-icon">
                <Tractor />
              </div>
              <span>FOR FARMERS</span>
              <h3>Your own Hariyo Store</h3>
              <p>
                List any crop, specialty, honey, herb, grain, dairy or processed farm product
                directly from your location. Control price, quantity, minimum order and delivery
                radius.
              </p>
              <Link href="/sell">
                Create a seller store <ArrowRight size={17} />
              </Link>
            </article>
            <article className="audience-card buyer-card">
              <div className="audience-icon">
                <UsersRound />
              </div>
              <span>FOR BUYERS</span>
              <h3>Buy what is closest and freshest</h3>
              <p>
                Share location or select a city. Compare nearby farms, freshness, delivery options,
                price and verified origin before placing an order.
              </p>
              <Link href="/nearby">
                Find nearby produce <ArrowRight size={17} />
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="section location-section">
        <div className="container">
          <LocationMarket />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Discover Nepal’s harvest</span>
              <h2 className="section-title">Shop by what grows.</h2>
            </div>
            <Link href="/shop" className="text-link">
              See full marketplace <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grid category-grid premium-categories">
            {catalog.categories.slice(0, 12).map((c) => (
              <Link className="category-card" href={`/categories/${c.slug}`} key={c.slug}>
                <div className="category-emoji">{c.emoji}</div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <span>Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section dark-system">
        <div className="container">
          <div className="system-head">
            <span className="eyebrow">Multi-tenant marketplace engine</span>
            <h2>
              Every seller is independent.
              <br />
              The customer experience stays unified.
            </h2>
            <p>
              Hariyo Mart separates each farmer’s catalog, inventory, team, orders, delivery rules
              and settlement while supporting one search, one cart and one buyer account.
            </p>
          </div>
          <div className="system-flow">
            <div>
              <Store />
              <b>Farmer store</b>
              <span>tenant workspace</span>
            </div>
            <i>→</i>
            <div>
              <LocateFixed />
              <b>Geo matching</b>
              <span>distance + radius</span>
            </div>
            <i>→</i>
            <div>
              <Smartphone />
              <b>Buyer app</b>
              <span>one marketplace</span>
            </div>
            <i>→</i>
            <div>
              <Truck />
              <b>Fulfillment</b>
              <span>seller split</span>
            </div>
            <i>→</i>
            <div>
              <Building2 />
              <b>Payout</b>
              <span>farmer settlement</span>
            </div>
          </div>
          <div className="system-cta">
            <Link href="/how-it-works" className="btn btn-primary">
              See how the system works
            </Link>
            <Link href="/farmer/overview" className="btn btn-secondary">
              Preview seller dashboard
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <span className="eyebrow">Fresh on the marketplace</span>
          <h2 className="section-title">Popular products from local sellers</h2>
          <div className="grid product-grid" style={{ marginTop: 30 }}>
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container">
          <div className="b2b-banner">
            <div>
              <span className="eyebrow">Hariyo for Business</span>
              <h2>Restaurants, hotels, retailers and institutions can buy direct.</h2>
              <p>
                Create repeat produce lists, request wholesale quantities, compare nearby supply and
                build dependable sourcing relationships with verified farms.
              </p>
              <div className="hero-actions">
                <Link href="/info/bulk-orders" className="btn btn-primary">
                  <ChefHat size={18} /> Explore bulk buying
                </Link>
                <Link href="/info/contact" className="btn btn-secondary">
                  Talk to marketplace team
                </Link>
              </div>
            </div>
            <div className="b2b-metrics">
              <div>
                <b>Retail</b>
                <span>household delivery</span>
              </div>
              <div>
                <b>Wholesale</b>
                <span>volume pricing</span>
              </div>
              <div>
                <b>Subscription</b>
                <span>repeat baskets</span>
              </div>
              <div>
                <b>Collection</b>
                <span>farm/hub pickup</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <span className="eyebrow">Local by design</span>
          <h2 className="section-title">Seven provinces. Thousands of future micro-markets.</h2>
          <div className="grid province-grid" style={{ marginTop: 30 }}>
            {catalog.provinces.map((p, i) => (
              <Link className="province-card" href={`/provinces/${p.slug}`} key={p.slug}>
                <div className="mapdot">{['🍃', '🌾', '🥬', '🍎', '🫘', '🏔️', '🍯'][i]}</div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <small>Known for: {p.specialty} →</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 15 }}>
        <div className="container">
          <div className="app-banner">
            <div>
              <span className="eyebrow">Hariyo Mart mobile</span>
              <h2>Buyer app + Farmer mode in one ecosystem.</h2>
              <p>
                Nearby discovery, quick re-order, live stock, seller harvest posting, order
                acceptance and delivery updates are included in the Expo app workspace.
              </p>
              <div className="app-badges">
                <span>Android ready</span>
                <span>iOS ready</span>
                <span>Expo Router</span>
                <span>Location permission flow</span>
              </div>
            </div>
            <div className="mini-phone">
              <div className="mini-screen">
                <small>NEAR YOU</small>
                <b>12 farms within 35 km</b>
                <div>
                  🥬 Fresh Saag <strong>2.8 km</strong>
                </div>
                <div>
                  🍯 Local Honey <strong>7.4 km</strong>
                </div>
                <div>
                  🌶️ Akabare <strong>11 km</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
