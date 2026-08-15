import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChefHat,
  CircleCheckBig,
  Clock3,
  HeartHandshake,
  LocateFixed,
  PackageCheck,
  QrCode,
  Smartphone,
  Store,
  Sparkles,
  Sprout,
  Tractor,
  Truck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { blogPosts } from '@/lib/blog';
import { LiveProductGrid } from '@/components/LiveProductGrid';
import { LocationMarket } from '@/components/LocationMarket';
export default function Home() {
  return (
    <main>
      <section className="campaign-stage">
        <div className="container">
          <div className="campaign-hero">
            <h1 className="sr-only">
              Hariyo Mart Nepal — a trusted marketplace for fresh business
            </h1>
            <Image
              className="campaign-hero-desktop"
              src="/campaigns/trusted-marketplace.webp"
              alt="Hariyo Mart Nepal connects customers with fresh products from local farms and home-based suppliers"
              width={1672}
              height={941}
              priority
              sizes="(max-width: 760px) 0px, 100vw"
            />
            <Image
              className="campaign-hero-mobile"
              src="/campaigns/fresh-every-corner.webp"
              alt="Fresh products from local suppliers, farms and home-based sellers across Nepal"
              width={1000}
              height={1000}
              priority
              sizes="(max-width: 760px) 100vw, 0px"
            />
            <div className="campaign-action-dock">
              <span>
                <i /> Live across seven province markets
              </span>
              <div>
                <Link className="btn btn-primary" href="/nearby">
                  <LocateFixed size={18} /> Explore near me
                </Link>
                <Link className="btn campaign-ghost" href="/sell">
                  <Store size={18} /> Become a supplier
                </Link>
              </div>
            </div>
          </div>
          <div className="campaign-trust-strip">
            <span>
              <LocateFixed /> Location matched <small>nearest supply first</small>
            </span>
            <span>
              <CircleCheckBig /> Verified origin <small>traceable farmer stores</small>
            </span>
            <span>
              <Truck /> Flexible delivery <small>pickup, local & intercity</small>
            </span>
            <span>
              <PackageCheck /> Freshness aware <small>harvest and live stock</small>
            </span>
          </div>
        </div>
      </section>
      <section className="section campaign-pathways">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Fresh business for everyone</span>
              <h2 className="section-title">Choose your place in the Hariyo network.</h2>
            </div>
            <Link href="/campaigns" className="text-link">
              Explore the Hariyo story <ArrowRight size={17} />
            </Link>
          </div>
          <div className="campaign-pathway-grid">
            {[
              [
                '/campaigns/connect-suppliers.webp',
                'For buyers',
                'Connect suppliers to homes',
                '/nearby',
              ],
              [
                '/campaigns/grow-with-hariyo.webp',
                'For farms',
                'Grow with Hariyo Mart',
                '/info/farmers',
              ],
              [
                '/campaigns/sell-from-home.webp',
                'For suppliers',
                'Sell fresh products from home',
                '/sell',
              ],
            ].map(([image, label, title, href]) => (
              <Link className="campaign-pathway-card" href={href} key={title}>
                <Image
                  src={image}
                  alt={title}
                  width={1000}
                  height={1000}
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
                <span>{label}</span>
                <b>{title}</b>
                <i>
                  <ArrowRight />
                </i>
              </Link>
            ))}
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
      <section className="section farmer-os-home">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Hariyo Farmer OS</span>
              <h2 className="section-title">Run the farm like a modern business.</h2>
            </div>
            <p className="section-copy">
              Plan harvests, understand farm profit, match real buyer demand, trace produce lots and
              use Hariyo AI from the same workspace that already manages products and orders.
            </p>
          </div>
          <div className="farmer-os-home-grid">
            {[
              [<Sprout key="crop" />, 'Crop planning', 'Plan planting, harvest timing, expected volume, budget and target revenue.'],
              [<BarChart3 key="profit" />, 'Farm profitability', 'Record farm costs and compare expenses, marketplace revenue, waste and crop economics.'],
              [<Building2 key="b2b" />, 'B2B demand', 'See restaurant, hotel and retailer requirements and send supply offers directly.'],
              [<QrCode key="trace" />, 'Lot traceability', 'Create a public produce journey from harvest and QC through packing, dispatch and delivery.'],
              [<Sparkles key="ai" />, 'Hariyo AI', 'Ask business questions in English or Nepali using your own farm and marketplace data.'],
              [<WalletCards key="saas" />, 'Farmer SaaS', 'Starter, Growth and Enterprise plans enforce product, warehouse and AI usage allowances.'],
            ].map(([icon,title,copy]) => (
              <article className="farmer-os-home-card" key={String(title)}>
                <span>{icon}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="farmer-os-home-actions">
            <Link className="btn btn-primary" href="/sell">Start Farmer OS <ArrowRight size={17} /></Link>
            <Link className="btn btn-secondary" href="/login">Open Farmer Studio</Link>
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
          <div className="category-rail" aria-label="More product categories">
            {catalog.categories.slice(12).map((category) => (
              <Link href={`/categories/${category.slug}`} key={category.slug}>
                <span>{category.emoji}</span>
                <b>{category.name}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-how">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Simple from field to doorstep</span>
              <h2 className="section-title">Know what happens after you tap “Add”.</h2>
            </div>
            <Link href="/how-it-works" className="text-link">
              Explore every step <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-step-grid">
            {[
              [
                <LocateFixed key="locate" />,
                '1',
                'Set your market',
                'Use your location or choose a Nepal city and delivery radius.',
              ],
              [
                <Store key="store" />,
                '2',
                'Compare real sellers',
                'See origin, farm verification, live stock, price and delivery fit.',
              ],
              [
                <PackageCheck key="pack" />,
                '3',
                'One safe checkout',
                'A mixed cart becomes seller-level fulfilments with one buyer order.',
              ],
              [
                <Truck key="truck" />,
                '4',
                'Track every delivery',
                'Follow packing, pickup, delivery and seller settlement independently.',
              ],
            ].map(([icon, number, title, copy]) => (
              <article key={String(number)}>
                <div>
                  {icon}
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
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
      <section className="section trust-platform-section">
        <div className="container trust-platform-grid">
          <div className="trust-platform-copy">
            <span className="eyebrow">More than a product catalogue</span>
            <h2 className="section-title">
              A marketplace operating system for Nepal’s food economy.
            </h2>
            <p className="section-copy">
              Hariyo Mart connects buyer discovery with seller operations, content, support,
              fulfilment and traceability—without hiding where each product originated.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/register">
                Create buyer account
              </Link>
              <Link className="btn btn-soft" href="/sell">
                Open farmer studio
              </Link>
            </div>
          </div>
          <div className="trust-feature-grid">
            {[
              [
                <CircleCheckBig key="verified" />,
                'Verified workflows',
                'Farmer onboarding, product review and public moderation.',
              ],
              [
                <Sprout key="stock" />,
                'Harvest-aware stock',
                'Reservations, adjustments, spoilage and low-stock watch.',
              ],
              [
                <HeartHandshake key="support" />,
                'Buyer & seller support',
                'Ticket triage, reviews, returns and transparent order records.',
              ],
              [
                <WalletCards key="settlement" />,
                'Seller settlement',
                'Commission, farmer net and payout status per fulfilment.',
              ],
            ].map(([icon, title, copy]) => (
              <article key={String(title)}>
                {icon}
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <span className="eyebrow">Fresh on the marketplace</span>
          <h2 className="section-title">Popular products from local sellers</h2>
          <LiveProductGrid
            limit={8}
            featuredOnly
            emptyTitle="Marketplace listings are opening soon"
            emptyCopy="Verified farmers and cooperatives can publish the first live harvests from Farmer Studio."
          />
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
      <section className="section home-journal">
        <div className="container">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Hariyo Journal</span>
              <h2 className="section-title">Buy better. Grow better. Waste less.</h2>
            </div>
            <Link href="/blog" className="text-link">
              Read all field stories <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-journal-grid">
            {blogPosts.slice(0, 3).map((post) => (
              <Link href={`/blog/${post.slug}`} key={post.slug}>
                <span>{post.emoji}</span>
                <small>{post.category}</small>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <b>
                  <Clock3 size={14} /> {post.readTime}
                </b>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
