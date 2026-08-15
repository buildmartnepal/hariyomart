'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BadgeCheck,
  Crosshair,
  MapPin,
  Navigation,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
} from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { distanceKm, farms, locationPresets, nearbyProducts, type Farm } from '@/lib/marketplace';
import { ProductCard } from './ProductCard';
import { useCart } from './CartProvider';
import { useMarketLocation } from './LocationProvider';
import { usePublicConfig } from './PublicConfigProvider';

type ApiProduct = Partial<Product> & {
  _id?: string;
  slug: string;
  name: string;
  category: string;
  province: string;
  district: string;
  unit: string;
  price: number;
  stock: number;
  organic?: boolean;
  image?: string;
  farmName?: string;
  originName?: string;
  distanceKm?: number;
  deliveryRadiusKm?: number;
  rating?: number;
  tenantSlug?: string;
};
const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
function normalize(p: ApiProduct): Product {
  const province = catalog.provinces.find((x) => x.slug === p.province);
  const provinceName = province?.name ?? catalog.provinces[2].name;
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    province: p.province,
    provinceName,
    district: p.district || province?.district || 'Nepal',
    emoji: '🌱',
    unit: p.unit || 'unit',
    price: Number(p.price || 0),
    oldPrice: Number((p as any).oldPrice || p.price || 0),
    rating: Number(p.rating || 4.8),
    stock: Number(p.stock || 0),
    organic: !!p.organic,
    featured: false,
    shortDescription: String(
      (p as any).shortDescription || `Fresh ${p.name} listed by a Hariyo Mart farmer.`,
    ),
    description: String(
      (p as any).description || `Traceable ${p.name} from ${p.district || p.province}.`,
    ),
    benefits: ['Traceable farm origin', 'Location-matched delivery', 'Seller-managed live stock'],
    image:
      p.image && (p.image.startsWith('/') || p.image.startsWith('https://res.cloudinary.com/'))
        ? p.image
        : `/products/${p.category}.svg`,
  };
}
function LiveProductCard({ item }: { item: ApiProduct }) {
  const cart = useCart();
  const product = normalize(item);
  return (
    <article className="product-card live-market-card">
      <Link className="product-photo" href={`/products/${product.slug}`}>
        <Image
          className="product-image"
          src={product.image}
          alt={product.name}
          width={900}
          height={700}
          sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 25vw"
        />
        <span className="origin-chip">
          <MapPin size={12} />
          {product.district}
        </span>
        {product.organic && <span className="organic-chip">Organic</span>}
      </Link>
      <div className="product-body">
        <div className="product-meta">
          <span className="farm-name">
            {item.farmName || 'Verified farmer'}
            <BadgeCheck size={13} />
          </span>
          <span>{item.distanceKm != null ? `${item.distanceKm} km` : `★ ${product.rating}`}</span>
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <small className="harvest-note">Live seller stock · {product.unit}</small>
        <div className="product-actions">
          <div>
            <span className="price">NPR {product.price}</span>
          </div>
          <button
            className="cart-button"
            onClick={() => cart.add(product)}
            disabled={product.stock <= 0}
            aria-label={`Add ${product.name} to cart`}
          >
            {product.stock > 0 ? '＋' : '×'}
          </button>
        </div>
      </div>
    </article>
  );
}
export function LocationMarket() {
  const { place, radius, locating, message, setRadius, choosePreset, locate } = useMarketLocation();
  const { demoEnabled } = usePublicConfig();
  const [category, setCategory] = useState('all');
  const [liveItems, setLiveItems] = useState<ApiProduct[] | null>(null);
  const [liveFarms, setLiveFarms] = useState<Farm[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fallback = useMemo(
    () =>
      nearbyProducts(place.lat, place.lng, radius).filter(
        (p) => category === 'all' || p.category === category,
      ),
    [place, radius, category],
  );
  const nearFarms = useMemo(
    () =>
      (liveFarms ?? (demoEnabled ? farms : []))
        .map((f) => ({
          ...f,
          distanceKm: Math.round(distanceKm(place.lat, place.lng, f.lat, f.lng) * 10) / 10,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 4),
    [place, liveFarms, demoEnabled],
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch(`${apiBase}/marketplace/farms`, { cache: 'no-store', signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ data?: Array<Record<string, any>> }>)
          : Promise.reject(new Error('Farm directory unavailable')),
      )
      .then((payload) => {
        if (!active) return;
        const next = (payload.data || []).map((source): Farm => ({
          slug: String(source.slug),
          name: String(source.name),
          owner: String(source.ownerName || 'Hariyo farmer'),
          province: String(source.location?.province || 'bagmati'),
          district: String(source.location?.district || 'Nepal'),
          municipality: String(source.location?.municipality || source.location?.district || 'Nepal'),
          lat: Number(source.location?.lat || 0),
          lng: Number(source.location?.lng || 0),
          verified: source.status === 'verified',
          rating: Number(source.rating || 4.8),
          story: String(source.story || `${source.name} sells through Hariyo Mart Nepal.`),
          specialties: Array.isArray(source.specialties) ? source.specialties.map(String) : [],
          deliveryRadiusKm: Number(source.delivery?.radiusKm || 35),
          pickup: source.delivery?.pickup !== false,
          sameDay: Boolean(source.delivery?.sameDay),
          badge: 'Verified seller',
        }));
        setLiveFarms(next);
      })
      .catch((error) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) setLiveFarms(null);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams({
      lat: String(place.lat),
      lng: String(place.lng),
      radiusKm: String(radius),
      category,
      limit: '48',
    });
    fetch(`${apiBase}/marketplace/nearby?${qs}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ data?: Product[] }>)
          : Promise.reject(new Error('Marketplace API unavailable')),
      )
      .then((data) => {
        if (active) setLiveItems(Array.isArray(data.data) ? data.data : null);
      })
      .catch((e) => {
        if (active && e.name !== 'AbortError') setLiveItems(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [place, radius, category]);
  const items = liveItems ?? (demoEnabled ? fallback : []);
  return (
    <div className="location-market">
      <div className="location-panel">
        <div>
          <span className="eyebrow">Location matching engine</span>
          <h2>Buy from farmers closest to you.</h2>
          <p>
            {message}{' '}
            {liveItems !== null
              ? 'Live farmer inventory is connected.'
              : demoEnabled
                ? 'Demo marketplace fallback is enabled.'
                : 'Connecting to live farmer inventory.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={locate}>
          <Crosshair size={18} />
          {locating ? 'Finding…' : 'Use my location'}
        </button>
        <div className="location-controls">
          <label>
            <span>
              <MapPin size={16} /> Delivery city
            </span>
            <select value={place.name} onChange={(e) => choosePreset(e.target.value)}>
              <option value="Your location" disabled>
                Your location
              </option>
              {locationPresets.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <SlidersHorizontal size={16} /> Radius
            </span>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              <option value={35}>35 km</option>
              <option value={75}>75 km</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
              <option value={1000}>All Nepal</option>
            </select>
          </label>
          <label>
            <span>
              <Store size={16} /> Category
            </span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All farm products</option>
              {catalog.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="match-summary">
          <strong>{items.length}</strong>
          <span>{loading ? 'matching…' : 'products matched'}</span>
          <i />
          <strong>{nearFarms.length}</strong>
          <span>closest farms highlighted</span>
        </div>
      </div>
      <div className="geo-visual" aria-label="Illustrated local marketplace coverage">
        <div className="geo-ring r1" />
        <div className="geo-ring r2" />
        <div className="geo-ring r3" />
        <div className="geo-center">
          <Navigation size={28} />
          <b>{place.name}</b>
          <small>{radius >= 1000 ? 'Nationwide' : `${radius} km market`}</small>
        </div>
        {nearFarms.map((f, i) => (
          <div key={f.slug} className={`farm-pin pin-${i + 1}`}>
            <span>●</span>
            <div>
              <b>{f.name}</b>
              <small>
                {f.distanceKm} km · {f.badge}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="nearby-strip">
        <div>
          <ShieldCheck size={20} />
          <span>
            <b>Verified sellers</b>Farm identity + location
          </span>
        </div>
        <div>
          <Truck size={20} />
          <span>
            <b>Smarter delivery</b>Nearest serviceable stock first
          </span>
        </div>
        <div>
          <Store size={20} />
          <span>
            <b>Multi-tenant</b>Each farmer has their own store
          </span>
        </div>
      </div>
      <div className="grid product-grid nearby-products">
        {items
          .slice(0, 8)
          .map((p: any) =>
            liveItems ? (
              <LiveProductCard key={p.slug} item={p} />
            ) : (
              <ProductCard key={p.slug} product={p} />
            ),
          )}
      </div>
      {!items.length && (
        <div className="empty-location">
          <MapPin size={26} />
          <b>No harvest is serviceable in this radius yet.</b>
          <span>
            Increase the radius or choose another city. Farmers can publish stock from the Seller
            workspace.
          </span>
        </div>
      )}
      <div className="center-actions">
        <Link href="/shop" className="btn btn-dark">
          Browse all products
        </Link>
        <Link href="/sell" className="btn btn-soft">
          Start selling from your farm
        </Link>
      </div>
    </div>
  );
}
