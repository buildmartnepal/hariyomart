import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BadgeCheck,
  Clock3,
  FileCheck2,
  Globe2,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Boxes,
} from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { farmForProduct } from '@/lib/marketplace';
import { AddToCart } from '@/components/AddToCart';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';
import { LiveProductGrid } from '@/components/LiveProductGrid';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductLocationFit } from '@/components/ProductLocationFit';
import { ProductActions } from '@/components/ProductActions';
import { ProductViewed } from '@/components/ProductViewed';
import { MobileProductBar } from '@/components/MobileProductBar';
import { RecentlyViewedRail } from '@/components/RecentlyViewedRail';
import { ProductReviews } from '@/components/ProductReviews';
type LiveProduct = Product & {
  farmName?: string;
  farmSlug?: string;
  farmerVerified?: boolean;
  farmSameDay?: boolean;
  farmPickup?: boolean;
  deliveryRadiusKm?: number;
  municipality?: string;
  uniqueStory?: string;
  harvestWindow?: string;
  grade?: string;
  wholesale?: boolean;
  subscription?: boolean;
  images?: readonly string[];
  lat?: number;
  lng?: number;
  exportReady?: boolean;
  exportStatus?: string;
  hsCodeHint?: string;
  botanicalName?: string | null;
  originAltitude?: string;
  harvestSeason?: string;
  processingMethod?: string;
  typicalShelfLifeDays?: number;
  storageGuidance?: string;
  tradePack?: string;
  exportMoq?: number;
  leadTimeDays?: number;
  destinationMarkets?: readonly string[];
  domesticMarkets?: readonly string[];
  traceabilityLevel?: string;
  complianceNote?: string;
  sourceType?: string;
};
function normalize(p: any): LiveProduct {
  const province = catalog.provinces.find((x) => x.slug === p.province);
  return {
    ...p,
    provinceName: p.provinceName || province?.name || p.province,
    emoji: p.emoji || '🌱',
    oldPrice: Number(p.oldPrice || p.price || 0),
    rating: Number(p.rating || 4.8),
    stock: Number(p.stock || 0),
    organic: !!p.organic,
    featured: !!p.featured,
    shortDescription:
      p.shortDescription || `Fresh ${p.name} listed directly by a Hariyo Mart farmer.`,
    description:
      p.description ||
      p.uniqueStory ||
      p.shortDescription ||
      `Traceable ${p.name} from ${p.district || p.province}.`,
    benefits: p.benefits || [
      'Traceable farm origin',
      'Seller-managed live inventory',
      'Location-aware fulfillment',
    ],
    image:
      typeof p.image === 'string' &&
      (p.image.startsWith('/') || p.image.startsWith('https://images.unsplash.com/'))
        ? p.image
        : `/products/${p.category}.svg`,
    images: Array.isArray(p.images)
      ? p.images.filter(
          (image: unknown): image is string =>
            typeof image === 'string' &&
            (image.startsWith('/') || image.startsWith('https://images.unsplash.com/')),
        ).slice(0, 8)
      : [],
    lat: Number.isFinite(Number(p.lat)) ? Number(p.lat) : undefined,
    lng: Number.isFinite(Number(p.lng)) ? Number(p.lng) : undefined,
  };
}
async function getProduct(slug: string): Promise<LiveProduct | null> {
  const config = getPublicRuntimeConfig();
  const api = config.apiBase;
  if (api) {
    try {
      const response = await fetch(`${api}/products/${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (response.ok) return normalize(await response.json());
    } catch {
      // Production never substitutes sample inventory for a failed live API request.
    }
  }
  return config.demoEnabled ? catalog.products.find((product) => product.slug === slug) || null : null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const farm = farmForProduct(p);
  return {
    title: p.name,
    description: p.shortDescription,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title: `${p.name} from ${farm.name}`,
      description: p.shortDescription,
      images: [p.image, ...(p.images || [])].slice(0, 4),
    },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const seedFarm = farmForProduct(p);
  const farm = {
    ...seedFarm,
    name: p.farmName || seedFarm.name,
    slug: p.farmSlug || seedFarm.slug,
    verified: p.farmerVerified ?? seedFarm.verified,
    municipality: p.municipality || seedFarm.municipality,
    lat: p.lat ?? seedFarm.lat,
    lng: p.lng ?? seedFarm.lng,
    deliveryRadiusKm: p.deliveryRadiusKm ?? seedFarm.deliveryRadiusKm,
    sameDay: p.farmSameDay ?? seedFarm.sameDay,
    pickup: p.farmPickup ?? seedFarm.pickup,
  };
  const category = catalog.categories.find((item) => item.slug === p.category);
  const discount =
    p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDescription,
    brand: { '@type': 'Brand', name: 'Hariyo Mart Nepal' },
    seller: { '@type': 'Organization', name: farm.name },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NPR',
      price: p.price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  const jsonLdText = JSON.stringify(jsonLd).replaceAll('<', '\\u003c');
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText }} />
      <ProductViewed slug={p.slug} />
      <section className="page-hero compact">
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">Home</Link> / <Link href="/shop">Marketplace</Link> / {p.name}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 25 }}>
        <div className="container detail premium-product-detail">
          <div className="detail-gallery">
            <div className="detail-image detail-image-v860">
              <ProductGallery name={p.name} primary={p.image} images={p.images} priority />
              <div className="detail-image-badges">
                {p.organic && (
                  <span>
                    <Leaf size={14} /> Organic
                  </span>
                )}
                {discount > 0 && <span className="detail-saving">Save {discount}%</span>}
              </div>
            </div>
            <div className="detail-gallery-caption">
              <span>
                <ShieldCheck size={17} /> Quality workflow checked
              </span>
              <span>
                <MapPin size={17} /> Origin visible before checkout
              </span>
            </div>
          </div>
          <div className="detail-card">
            <Link className="product-category-link" href={`/categories/${p.category}`}>
              {category?.emoji || '🌱'} {category?.name || p.category.replaceAll('-', ' ')}
            </Link>
            <div className="product-origin-line">
              <span className="pill">{p.organic ? '✓ Organic' : 'Quality checked'}</span>
              <span>
                <MapPin size={15} />
                {p.district}, {p.provinceName}
              </span>
            </div>
            <div className="product-title-row"><h1>{p.name}</h1><ProductActions slug={p.slug} /></div>
            <div className="product-detail-rating">
              <span>
                <Star size={15} fill="currentColor" /> {p.rating} / 5
              </span>
              <span>Verified marketplace listing</span>
              <span>{p.stock > 0 ? 'Available now' : 'Restocking'}</span>
            </div>
            <div className="product-detail-price">
              <span className="price">NPR {p.price}</span>
              <span>/ {p.unit}</span>
              {discount > 0 && (
                <>
                  <del>NPR {p.oldPrice}</del>
                  <b>You save NPR {p.oldPrice - p.price}</b>
                </>
              )}
            </div>
            <div className="product-detail-stockline">
              <span className={p.stock < 10 ? 'is-low' : ''} />
              <b>{p.stock > 0 ? `${p.stock} units in seller stock` : 'Currently unavailable'}</b>
              <span>
                <Clock3 size={14} /> Updated by seller
              </span>
            </div>
            {p.harvestWindow && <div className="pill">{p.harvestWindow}</div>}
            <p className="product-detail-summary">{p.shortDescription}</p>
            <div className="product-decision-strip">
              <span><ShieldCheck size={16}/><b>Verified listing</b><small>Seller + stock traceable</small></span>
              <span><Truck size={16}/><b>{farm.sameDay ? 'Today locally' : 'Scheduled'}</b><small>Delivery date confirmed at checkout</small></span>
              <span><Store size={16}/><b>{farm.name}</b><small>{farm.deliveryRadiusKm} km seller service zone</small></span>
            </div>
            <div className="product-fact-grid" aria-label="Product buying details">
              <div><small>PACK / UNIT</small><b>{p.unit}</b></div>
              <div><small>MINIMUM ORDER</small><b>{p.minimumOrder || 1} {p.unit}</b></div>
              <div><small>GRADE</small><b>{p.grade || 'Seller quality checked'}</b></div>
              <div><small>BUYING OPTIONS</small><b>{[p.wholesale ? 'Wholesale' : '', p.subscription ? 'Subscription' : ''].filter(Boolean).join(' · ') || 'One-time order'}</b></div>
            </div>
            <ProductLocationFit
              productName={p.name}
              sellerName={farm.name}
              sellerLat={p.lat ?? farm.lat}
              sellerLng={p.lng ?? farm.lng}
              deliveryRadiusKm={p.deliveryRadiusKm ?? farm.deliveryRadiusKm}
              sameDay={farm.sameDay}
            />
            <AddToCart product={p} />
            <div className="feature-list">
              {p.benefits.map((b) => (
                <div key={b}>
                  ✓ <span>{b}</span>
                </div>
              ))}
            </div>
            <div className="product-assurance-grid">
              <div>
                <Leaf />
                <span>
                  <b>Farm origin</b>
                  {p.district}, Nepal
                </span>
              </div>
              <div>
                <Truck />
                <span>
                  <b>Flexible fulfilment</b>
                  Delivery or pickup
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <b>Order support</b>
                  Track every fulfilment
                </span>
              </div>
            </div>
            <Link href={`/farmers/${farm.slug}`} className="product-farmer">
              <div className="farm-mini-icon">
                <Store />
              </div>
              <div>
                <small>SOLD BY {farm.verified ? 'VERIFIED' : 'MARKETPLACE'} FARMER</small>
                <b>
                  {farm.name}
                  {farm.verified && <BadgeCheck />}
                </b>
                <span>
                  {farm.municipality}, {farm.district} · {farm.deliveryRadiusKm} km service zone
                </span>
              </div>
              <strong>Visit store →</strong>
            </Link>
          </div>
        </div>
      </section>
      <section className="section product-story">
        <div className="container story-grid">
          <div>
            <span className="eyebrow">Product story</span>
            <h2 className="section-title">Know what you’re buying.</h2>
            {p.description.split('\n\n').map((t, i) => (
              <p className="section-copy" key={i}>
                {t}
              </p>
            ))}
            {p.uniqueStory && (
              <p className="section-copy">
                <b>Farmer note:</b> {p.uniqueStory}
              </p>
            )}
          </div>
          <aside className="trace-card">
            <div>
              <MapPin />
              <span>
                <small>ORIGIN</small>
                <b>
                  {p.district}, {p.provinceName}
                </b>
              </span>
            </div>
            <div>
              <PackageCheck />
              <span>
                <small>INVENTORY</small>
                <b>Seller-owned live harvest</b>
              </span>
            </div>
            <div>
              <Truck />
              <span>
                <small>FULFILLMENT</small>
                <b>
                  {farm.sameDay
                    ? 'Same-day local where serviceable'
                    : 'Seller service-radius delivery'}
                </b>
              </span>
            </div>
            <Link href="/nearby" className="btn btn-soft">
              Check distance from me
            </Link>
          </aside>
        </div>
      </section>
      <section className="section product-spec-section">
        <div className="container">
          <div className="product-spec-head"><div><span className="eyebrow">Buying details</span><h2 className="section-title">Everything needed to decide confidently.</h2></div><Link className="btn btn-soft" href={`/farmers/${farm.slug}`}>View seller store</Link></div>
          <div className="product-spec-grid">
            <div><small>PRODUCT</small><b>{p.name}</b><span>{p.category.replaceAll('-', ' ')}</span></div>
            <div><small>ORIGIN</small><b>{p.district}</b><span>{p.provinceName}, Nepal</span></div>
            <div><small>ORDER UNIT</small><b>{p.unit}</b><span>Minimum {p.minimumOrder || 1} {p.unit}</span></div>
            <div><small>QUALITY / GRADE</small><b>{p.grade || (p.organic ? 'Organic listing' : 'Seller quality checked')}</b><span>{p.harvestWindow || 'Seller-managed fresh batch'}</span></div>
            <div><small>SELLER</small><b>{farm.name}</b><span>{farm.verified ? 'Verified farmer store' : 'Marketplace seller'}</span></div>
            <div><small>FULFILLMENT</small><b>{farm.sameDay ? 'Same-day local eligible' : 'Scheduled delivery'}</b><span>Pickup {farm.pickup ? 'available' : 'not listed'} · {farm.deliveryRadiusKm} km zone</span></div>
          </div>
        </div>
      </section>
      {p.exportReady ? (
        <section className="section product-export-section">
          <div className="container product-export-card">
            <div className="product-export-copy">
              <span className="eyebrow"><Globe2 size={15}/> Nepal Origin Trade Profile</span>
              <h2>Qualified for export inquiry — final lot verification required.</h2>
              <p>This catalog profile carries trade fields for sourcing, but no certification, phytosanitary clearance, laboratory result or final HS classification is implied until Hariyo verifies the actual supplier and shipment lot.</p>
              <div className="product-export-facts">
                <div><small>HS CODE HINT</small><b>{p.hsCodeHint || 'Confirm before quotation'}</b></div>
                <div><small>BOTANICAL / PRODUCT ID</small><b>{p.botanicalName || 'Commercial product name'}</b></div>
                <div><small>ORIGIN ALTITUDE</small><b>{p.originAltitude || 'Supplier lot specific'}</b></div>
                <div><small>TRADE PACK</small><b>{p.tradePack || p.unit}</b></div>
                <div><small>EXPORT MOQ</small><b>{p.exportMoq ? `${p.exportMoq} trade units` : 'By RFQ'}</b></div>
                <div><small>LEAD TIME</small><b>{p.leadTimeDays ? `${p.leadTimeDays} days indicative` : 'Confirm per lot'}</b></div>
                <div><small>PROCESSING</small><b>{p.processingMethod || 'Supplier specification'}</b></div>
                <div><small>STORAGE</small><b>{p.storageGuidance || 'Product-specific'}</b></div>
              </div>
              {p.destinationMarkets?.length ? <div className="destination-market-row"><Globe2 size={17}/><span><b>Target buyer markets:</b> {p.destinationMarkets.join(' · ')}</span></div> : null}
              <div className="product-export-note"><FileCheck2 size={18}/><span>{p.complianceNote || 'Documents and destination admissibility are checked per supplier lot.'}</span></div>
              <Link href={`/export?product=${encodeURIComponent(p.slug)}`} className="btn btn-primary">Request trade / export quotation <Globe2 size={17}/></Link>
            </div>
            <aside className="product-export-flow"><span><Boxes/><b>1. Product & pack</b></span><span><ShieldCheck/><b>2. Supplier + lot</b></span><span><FileCheck2/><b>3. Docs + tests</b></span><span><Truck/><b>4. Quote + logistics</b></span></aside>
          </div>
        </section>
      ) : null}
      <section className="section product-reviews-section">
        <div className="container">
          <ProductReviews slug={p.slug} catalogRating={p.rating} />
        </div>
      </section>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container">
          <h2 className="section-title">You may also like</h2>
          <LiveProductGrid category={p.category} excludeSlug={p.slug} limit={4} />
        </div>
      </section>
      <section className="section recently-viewed-wrap"><div className="container"><RecentlyViewedRail excludeSlug={p.slug} /></div></section>
      <MobileProductBar product={p} />
    </main>
  );
}
