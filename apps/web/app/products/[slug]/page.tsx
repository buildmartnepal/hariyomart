import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BadgeCheck,
  Clock3,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { farmForProduct } from '@/lib/marketplace';
import { AddToCart } from '@/components/AddToCart';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';
import { LiveProductGrid } from '@/components/LiveProductGrid';
type LiveProduct = Product & {
  farmName?: string;
  farmSlug?: string;
  farmerVerified?: boolean;
  deliveryRadiusKm?: number;
  municipality?: string;
  uniqueStory?: string;
  harvestWindow?: string;
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
      (p.image.startsWith('/') || p.image.startsWith('https://res.cloudinary.com/'))
        ? p.image
        : `/products/${p.category}.svg`,
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
      images: [p.image],
    },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const farm = farmForProduct(p);
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
            <div className="detail-image">
              <Image
                src={p.image}
                alt={p.name}
                width={900}
                height={700}
                sizes="(max-width: 860px) 100vw, 50vw"
                priority
              />
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
            <h1>{p.name}</h1>
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
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container">
          <h2 className="section-title">You may also like</h2>
          <LiveProductGrid category={p.category} excludeSlug={p.slug} limit={4} />
        </div>
      </section>
    </main>
  );
}
