import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircleHelp,
  ClipboardCheck,
  HandCoins,
  LocateFixed,
  PackageCheck,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Store,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How Hariyo Mart Works',
  description: 'From farmer onboarding and harvest publishing to location matching, multi-seller checkout, delivery, reviews and payout.',
  alternates: { canonical: '/how-it-works' },
};

const steps = [
  ['01', Store, 'Create a seller workspace', 'A farmer, cooperative or supplier enters an isolated tenant workspace with team roles, products, inventory, orders and settlement records.'],
  ['02', UserCheck, 'Verify identity and service area', 'Operators can review seller identity, pickup location, district, municipality, delivery radius, fulfilment options and relevant claims.'],
  ['03', Boxes, 'Publish real harvest and stock', 'Products carry photos, price, unit, grade, origin, harvest context, minimum order, stock and wholesale/subscription rules.'],
  ['04', LocateFixed, 'Match with buyer location', 'Hariyo Match ranks serviceable products using distance, seller radius, stock, freshness, rating, verification and buyer intent.'],
  ['05', ShoppingBasket, 'Build one multi-seller basket', 'A buyer can save, compare and combine products from different farms while the cart keeps seller and fulfilment context visible.'],
  ['06', ClipboardCheck, 'Confirm checkout details', 'Delivery address, date/window, payment method, minimum-order rules, coupon and seller groups are reviewed before the order is created.'],
  ['07', Truck, 'Fulfil and track independently', 'Each seller-level fulfilment can move through its own pickup, dispatch and delivery status while the buyer tracks the combined order.'],
  ['08', HandCoins, 'Review, resolve and settle', 'Reviews, support tickets, returns, commission and farmer payout complete the operating loop and create feedback for future quality decisions.'],
] as const;

export default function How() {
  return (
    <main>
      <section className="page-hero how-premium-hero">
        <div className="container how-premium-hero-grid">
          <div>
            <span className="eyebrow">Farm-to-market operating model</span>
            <h1>One marketplace experience. A complete operating flow behind every order.</h1>
            <p className="section-copy">Hariyo Mart connects farmer onboarding, product data, location matching, buyer decisions, multi-seller fulfilment, support and payout instead of treating each step as a separate tool.</p>
            <div className="how-hero-actions"><Link className="btn btn-primary" href="/shop">Shop the marketplace <ArrowRight size={16} /></Link><Link className="btn btn-soft" href="/sell">Open a farmer store</Link></div>
          </div>
          <div className="how-system-graphic" aria-label="Farm to buyer system flow">
            <span className="how-system-core"><BadgeCheck /><b>Hariyo</b><small>operating layer</small></span>
            <span className="hsg-node hsg-a"><Store /><b>Farm</b></span>
            <span className="hsg-node hsg-b"><Boxes /><b>Stock</b></span>
            <span className="hsg-node hsg-c"><LocateFixed /><b>Match</b></span>
            <span className="hsg-node hsg-d"><ShoppingBasket /><b>Order</b></span>
            <span className="hsg-node hsg-e"><Route /><b>Route</b></span>
            <span className="hsg-node hsg-f"><Wallet /><b>Payout</b></span>
          </div>
        </div>
      </section>

      <section className="section how-metric-section"><div className="container how-metric-strip"><div><strong>8</strong><span>connected operational stages</span></div><div><strong>1</strong><span>buyer-facing marketplace</span></div><div><strong>Multi-seller</strong><span>cart, fulfilment and settlement</span></div><div><strong>Location-aware</strong><span>discovery before checkout</span></div></div></section>

      <section className="section">
        <div className="container">
          <div className="split-heading"><div><span className="eyebrow">The full journey</span><h2 className="section-title">From seller setup to repeat trust.</h2></div><p className="section-copy">Each stage preserves context needed by the next one: seller identity informs products, products feed matching, matching feeds the basket, and fulfilment/reviews feed future quality.</p></div>
          <div className="how-step-grid">
            {steps.map(([number, Icon, title, copy]) => <article key={number}><div className="how-step-top"><span>{number}</span><i><Icon /></i></div><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section soft-section">
        <div className="container how-dual-journey">
          <article className="how-journey-card buyer"><div className="how-journey-head"><Smartphone /><div><span>BUYER JOURNEY</span><h2>Find what fits your place, not just what exists.</h2></div></div><ol><li><b>Choose a location</b><span>Use GPS permission or a selected market/radius.</span></li><li><b>Search and compare</b><span>Use Best Match, distance, filters, wishlist and comparison.</span></li><li><b>Inspect product trust</b><span>See origin, photos, seller, delivery fit, rating, reviews and minimum order.</span></li><li><b>Checkout once</b><span>Confirm a multi-seller basket with clear fulfilment groups.</span></li><li><b>Track and respond</b><span>Follow delivery, review products or open an order-linked ticket.</span></li></ol><Link href="/shop">Start buying <ArrowRight size={15} /></Link></article>
          <article className="how-journey-card seller"><div className="how-journey-head"><Store /><div><span>SELLER JOURNEY</span><h2>Turn a harvest into an accountable digital store.</h2></div></div><ol><li><b>Create the farm profile</b><span>Set identity, location, team and service rules.</span></li><li><b>Publish harvests</b><span>Add real media, stock, grade, pricing and fulfilment detail.</span></li><li><b>Operate inventory</b><span>Keep availability current so matching and checkout stay trustworthy.</span></li><li><b>Fulfil orders</b><span>Manage seller-specific picking, delivery/pickup and buyer communication.</span></li><li><b>Review the business</b><span>Use customers, profitability, settlements, payouts and demand tools.</span></li></ol><Link href="/sell">Start seller onboarding <ArrowRight size={15} /></Link></article>
        </div>
      </section>

      <section className="section">
        <div className="container how-trust-layout">
          <div><span className="eyebrow">Trust checkpoints</span><h2 className="section-title">Controls appear where the risk actually occurs.</h2><p className="section-copy">Verification does not magically guarantee every outcome. Hariyo combines identity checks, product moderation, inventory state, serviceability, buyer evidence and operational records at different stages.</p></div>
          <div className="how-trust-grid">
            <article><UserCheck /><h3>Seller</h3><p>Identity, tenant role and public verification status.</p></article>
            <article><PackageCheck /><h3>Product</h3><p>Listing claims, media, status, stock, grade and origin context.</p></article>
            <article><LocateFixed /><h3>Delivery fit</h3><p>Buyer location compared with service radius and fulfilment options.</p></article>
            <article><ShieldCheck /><h3>Account action</h3><p>Protected writes use authenticated role and tenant context.</p></article>
            <article><ClipboardCheck /><h3>Order</h3><p>Cart, totals, seller groups, address and payment method confirmed.</p></article>
            <article><BadgeCheck /><h3>Feedback</h3><p>Reviews, support, returns and audit records close the loop.</p></article>
          </div>
        </div>
      </section>

      <section className="section how-faq">
        <div className="container how-faq-layout">
          <div><span className="eyebrow">Practical questions</span><h2 className="section-title">What buyers and sellers usually ask first.</h2><p className="section-copy">Availability, delivery and seller coverage are intentionally live—they change by harvest, route and location.</p></div>
          <div className="how-faq-list">
            {[
              ['Can one order include several farms?', 'Yes. The buyer sees one basket/order experience while the backend keeps seller-level fulfilment and settlement records.'],
              ['What if no seller serves my location?', 'Increase the radius or select a nearby market. Products should not be presented as equally available when the seller cannot reasonably fulfil the route.'],
              ['How does a product become public?', 'The seller publishes product detail and operators can review seller status, category, claims, media and serviceability before activation.'],
              ['How are reviews handled?', 'Published reviews are shown on product pages. New buyer reviews can enter moderation, and seller replies can be retained with the review record.'],
              ['Are online payments automatically live?', 'No. Payment adapters should remain disabled until merchant onboarding, callback validation, reconciliation and refund handling are certified.'],
            ].map(([question, answer]) => <details key={question}><summary><CircleHelp size={18} />{question}</summary><p>{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="section how-final-cta"><div className="container"><div className="info-final-cta"><div><span className="eyebrow">Choose your next step</span><h2>Use Hariyo as a buyer, seller or operating team.</h2><p>The public marketplace stays simple while role-specific workspaces carry the operational detail.</p></div><div className="info-final-cta-actions"><Link href="/shop" className="btn btn-primary">Shop fresh</Link><Link href="/sell" className="btn footer-outline-button">Become a seller</Link><Link href="/info/contact" className="btn footer-outline-button">Talk to support</Link></div></div></div></section>
    </main>
  );
}
