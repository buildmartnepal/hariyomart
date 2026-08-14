import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Headphones,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { NewsletterSignup } from './NewsletterSignup';

const popularCategories = catalog.categories.slice(0, 6);

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <section className="footer-conversion" aria-labelledby="footer-conversion-title">
          <div className="footer-conversion-copy">
            <span className="footer-eyebrow">
              <Leaf size={16} /> One marketplace. Every fresh connection.
            </span>
            <h2 id="footer-conversion-title">Buy closer. Sell smarter. Grow together.</h2>
            <p>
              Discover nearby harvests or launch a verified farmer storefront with inventory,
              orders, fulfilment and support in one operating platform.
            </p>
            <div className="footer-conversion-actions">
              <Link className="btn btn-primary" href="/shop">
                <ShoppingBasket size={18} /> Shop fresh
              </Link>
              <Link className="btn footer-outline-button" href="/sell">
                <Store size={18} /> Become a supplier
              </Link>
            </div>
          </div>
          <Link className="footer-app-card" href="/info/mobile-app">
            <span className="footer-app-icon">
              <Smartphone />
            </span>
            <span>
              <small>HARIYO IN YOUR POCKET</small>
              <b>Web, Android & iOS experience</b>
              <em>Explore mobile features and installation</em>
            </span>
            <ArrowUpRight />
          </Link>
        </section>

        <div className="footer-top">
          <div className="footer-brand-column">
            <Image
              className="footer-logo"
              src="/brand/logo-on-dark.svg"
              alt="Hariyo Mart Nepal"
              width={220}
              height={54}
            />
            <p>
              नेपालभरका किसान, सहकारी र स्थानीय उत्पादकलाई location-based digital marketplace मा
              जोड्ने farmer-first commerce platform.
            </p>
            <div className="footer-pills">
              <Link href="/nearby">
                <MapPin size={15} /> Find nearby food
              </Link>
              <Link href="/sell">
                <Store size={15} /> Sell on Hariyo
              </Link>
            </div>
            <NewsletterSignup />
          </div>

          <nav className="footer-grid-links" aria-label="Footer navigation">
            <div>
              <h4>Shop popular</h4>
              {popularCategories.map((item) => (
                <Link href={`/categories/${item.slug}`} key={item.slug}>
                  <span>{item.emoji}</span> {item.name}
                </Link>
              ))}
              <Link className="footer-view-all" href="/shop">
                View all products <ArrowUpRight size={13} />
              </Link>
            </div>
            <div>
              <h4>For farmers</h4>
              <Link href="/sell">Start selling</Link>
              <Link href="/farmer/overview">Farmer dashboard</Link>
              <Link href="/info/farmers">Farmer network</Link>
              <Link href="/farmer/inventory">Manage inventory</Link>
              <Link href="/how-it-works">How Hariyo works</Link>
              <Link href="/info/bulk-orders">Wholesale programme</Link>
            </div>
            <div>
              <h4>Discover</h4>
              <Link href="/nearby">Nearby market</Link>
              <Link href="/farmers">Verified farms</Link>
              <Link href="/blog">Stories & guides</Link>
              <Link href="/campaigns">Campaign studio</Link>
              <Link href="/info/sustainability">Sustainability</Link>
              <Link href="/info/mobile-app">Mobile apps</Link>
            </div>
            <div>
              <h4>Help & company</h4>
              <Link href="/info/contact">Contact support</Link>
              <Link href="/track">Track an order</Link>
              <Link href="/info/delivery">Delivery information</Link>
              <Link href="/info/returns">Returns & refunds</Link>
              <Link href="/info/faq">FAQs</Link>
              <Link href="/info/about">About Hariyo Mart</Link>
            </div>
          </nav>
        </div>

        <div className="footer-operations">
          <div>
            <MapPin size={20} />
            <span>
              <b>Serving all Nepal</b>Koshi to Sudurpashchim
            </span>
          </div>
          <div>
            <Truck size={20} />
            <span>
              <b>Local fulfilment</b>Delivery or farm pickup
            </span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <span>
              <b>Safer commerce</b>Verified seller workflows
            </span>
          </div>
          <div>
            <Headphones size={20} />
            <span>
              <b>Buyer & seller help</b>Support ticket workspace
            </span>
          </div>
        </div>

        <div className="footer-platform-row">
          <span>
            <Building2 size={16} /> Built for households, farms, restaurants and institutions
          </span>
          <div>
            <Link href="/info/privacy">Privacy</Link>
            <Link href="/info/terms">Terms</Link>
            <Link href="/info/accessibility">Accessibility</Link>
          </div>
        </div>
        <div className="copyright">
          <span>© 2026 Hariyo Mart Nepal. Farmer-first marketplace platform.</span>
          <span>7 Provinces · Location Matching · Multi-Tenant Seller Stores</span>
        </div>
      </div>
    </footer>
  );
}
