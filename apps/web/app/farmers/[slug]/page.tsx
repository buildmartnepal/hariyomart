import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, MapPin, PackageCheck, Sprout, Truck, UserRound } from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { farms, farmForProduct, type Farm } from '@/lib/marketplace';
import { ProductCard } from '@/components/ProductCard';
import { getPublicRuntimeConfig } from '@/server/cloudflare/public-config';
type StoreData = { farm: Farm; products: Product[] };
function normalizeProduct(p: any, farm: Farm): Product {
  return {
    ...p,
    provinceName: catalog.provinces.find((x) => x.slug === p.province)?.name || p.province,
    emoji: p.emoji || '🌱',
    oldPrice: Number(p.oldPrice || p.price || 0),
    rating: Number(p.rating || farm.rating || 4.8),
    featured: false,
    shortDescription: p.shortDescription || `Fresh ${p.name} from ${farm.name}.`,
    description: p.description || p.uniqueStory || `Traceable ${p.name} from ${farm.district}.`,
    benefits: p.benefits || [
      'Traceable farm origin',
      'Live farmer stock',
      'Location-aware delivery',
    ],
    image:
      typeof p.image === 'string' &&
      (p.image.startsWith('/') || p.image.startsWith('https://res.cloudinary.com/'))
        ? p.image
        : `/products/${p.category}.svg`,
    farmName: farm.name,
    farmSlug: farm.slug,
    farmerVerified: farm.verified,
    deliveryRadiusKm: farm.deliveryRadiusKm,
    municipality: farm.municipality,
  } as Product;
}
async function getStore(slug: string): Promise<StoreData | null> {
  const config = getPublicRuntimeConfig();
  const api = config.apiBase;
  if (api) {
    try {
      const response = await fetch(`${api}/marketplace/farms/${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = (await response.json()) as { farm: any; products?: any[] },
          source = data.farm,
          location = source.location || {};
        const delivery = source.delivery || {};
        const farm: Farm = {
          slug: source.slug,
          name: source.name,
          owner: source.ownerName || 'Hariyo farmer',
          province: source.location?.province || 'bagmati',
          district: source.location?.district || 'Nepal',
          municipality: source.location?.municipality || source.location?.district || 'Nepal',
          lat: Number(location.lat || 0),
          lng: Number(location.lng || 0),
          verified: source.status === 'verified',
          rating: Number(source.rating || 4.8),
          story:
            source.story || `${source.name} sells traceable harvests through Hariyo Mart Nepal.`,
          specialties: source.specialties || source.productionTypes || [],
          deliveryRadiusKm: Number(delivery.radiusKm || 35),
          pickup: delivery.pickup !== false,
          sameDay: Boolean(delivery.sameDay),
          badge: 'Verified farmer',
        };
        return {
          farm,
          products: (data.products || []).map((product: any) => normalizeProduct(product, farm)),
        };
      }
    } catch {
      // Production never substitutes sample sellers for a failed live API request.
    }
  }
  if (!config.demoEnabled) return null;
  const local = farms.find((farm) => farm.slug === slug);
  return local
    ? {
        farm: local,
        products: catalog.products.filter((product) => farmForProduct(product).slug === local.slug),
      }
    : null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  return store ? { title: store.farm.name, description: store.farm.story } : {};
}
export default async function FarmerStore({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();
  const { farm: f, products } = store;
  return (
    <main>
      <section className="farm-store-hero">
        <div className="container">
          <div className="farm-store-grid">
            <div>
              <div className="verified-label">
                <BadgeCheck /> Verified Hariyo seller
              </div>
              <h1>{f.name}</h1>
              <p>{f.story}</p>
              <div className="farm-store-meta">
                <span>
                  <MapPin /> {f.municipality}, {f.district}
                </span>
                <span>
                  <Truck /> Delivery up to {f.deliveryRadiusKm} km
                </span>
                <span>★ {f.rating} farmer rating</span>
              </div>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#farm-products">
                  Browse farm products
                </a>
                <Link className="btn btn-secondary" href="/nearby">
                  Check distance from me
                </Link>
              </div>
            </div>
            <div className="farm-identity-card">
              <div className="farm-avatar">🌱</div>
              <small>FARM OWNER / CONTACT</small>
              <b>{f.owner}</b>
              <div>
                <Sprout />
                <span>
                  <strong>Specialties</strong>
                  {f.specialties.join(' · ') || 'Seasonal Nepal produce'}
                </span>
              </div>
              <div>
                <PackageCheck />
                <span>
                  <strong>Fulfillment</strong>
                  {f.pickup ? 'Farm pickup · ' : ''}
                  {f.sameDay ? 'same-day local available' : 'scheduled delivery'}
                </span>
              </div>
              <div>
                <UserRound />
                <span>
                  <strong>Store model</strong>Independent farmer tenant
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="farm-products">
        <div className="container">
          <span className="eyebrow">Available from this seller</span>
          <h2 className="section-title">Current farm catalogue</h2>
          {products.length ? (
            <div className="grid product-grid" style={{ marginTop: 28 }}>
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-farm">
              <h3>Seasonal listings coming soon</h3>
              <p>
                This farmer can publish new harvest batches from the farmer dashboard or mobile
                Farmer Studio.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
