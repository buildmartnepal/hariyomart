import Image from 'next/image';
import Link from 'next/link';
import { Headphones, MapPin, ShieldCheck, Store, Truck } from 'lucide-react';
import { NewsletterSignup } from './NewsletterSignup';
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Image
              src="/brand/logo.svg"
              alt="Hariyo Mart Nepal"
              width={220}
              height={54}
              style={{ filter: 'brightness(0) invert(1)', marginBottom: 14 }}
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
          <div className="footer-grid-links">
            <div>
              <h4>Marketplace</h4>
              <Link href="/shop">Shop all</Link>
              <Link href="/nearby">Nearby products</Link>
              <Link href="/categories/vegetables">Categories</Link>
              <Link href="/info/bulk-orders">Bulk orders</Link>
              <Link href="/account/subscriptions">Subscriptions</Link>
            </div>
            <div>
              <h4>Farmers</h4>
              <Link href="/sell">Start selling</Link>
              <Link href="/farmer/overview">Farmer dashboard</Link>
              <Link href="/info/farmers">Meet farmers</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/farmer/inventory">Manage inventory</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link href="/info/about">About</Link>
              <Link href="/blog">Stories</Link>
              <Link href="/info/sustainability">Sustainability</Link>
              <Link href="/info/contact">Contact</Link>
              <Link href="/info/careers">Careers</Link>
            </div>
            <div>
              <h4>Support</h4>
              <Link href="/info/faq">FAQs</Link>
              <Link href="/info/returns">Returns</Link>
              <Link href="/info/privacy">Privacy</Link>
              <Link href="/info/terms">Terms</Link>
              <Link href="/track">Track an order</Link>
            </div>
          </div>
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
        <div className="copyright">
          <span>© 2026 Hariyo Mart Nepal. Farmer-first marketplace platform.</span>
          <span>7 Provinces · Location Matching · Multi-Tenant Seller Stores</span>
        </div>
      </div>
    </footer>
  );
}
