'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Crosshair,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Sprout,
  X,
} from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { distanceKm, farmForProduct, locationPresets } from '@/lib/marketplace';
import { scoreMarketplaceProduct } from '@/lib/matching';
import { ProductCard } from './ProductCard';
import { useMarketLocation } from './LocationProvider';
import { usePublicConfig } from './PublicConfigProvider';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

type MarketProduct = Product & {
  matchScore?: number;
  matchReasons?: string[];
  farmName?: string;
  farmSlug?: string;
  farmerVerified?: boolean;
  farmSameDay?: boolean;
  deliveryRadiusKm?: number;
  municipality?: string;
  lat?: number;
  lng?: number;
  createdAt?: string;
};

function normalize(p: Record<string, unknown>): MarketProduct {
  const province = catalog.provinces.find((item) => item.slug === p.province);
  const price = Number(p.price || 0);
  return {
    ...(p as unknown as MarketProduct),
    slug: String(p.slug),
    name: String(p.name),
    category: String(p.category),
    province: String(p.province),
    provinceName: String(p.provinceName || province?.name || p.province),
    district: String(p.district || province?.district || 'Nepal'),
    emoji: String(p.emoji || '🌱'),
    unit: String(p.unit || 'unit'),
    price,
    oldPrice: Number(p.oldPrice || price),
    rating: Number(p.rating || 4.8),
    stock: Number(p.stock || 0),
    organic: Boolean(p.organic),
    featured: Boolean(p.featured),
    shortDescription: String(
      p.shortDescription || `Fresh ${p.name} listed directly by a Hariyo Mart farmer.`,
    ),
    description: String(
      p.description ||
        p.shortDescription ||
        `Traceable ${p.name} from ${p.district || p.province}.`,
    ),
    benefits: Array.isArray(p.benefits)
      ? p.benefits.map(String)
      : ['Traceable Nepal origin', 'Location-aware marketplace', 'Seller-managed live stock'],
    image:
      typeof p.image === 'string' && (p.image.startsWith('/') || p.image.startsWith('https://images.unsplash.com/'))
        ? p.image
        : `/products/${p.category}.svg`,
    images: Array.isArray(p.images)
      ? p.images.filter((image): image is string => typeof image === 'string' && (image.startsWith('/') || image.startsWith('https://images.unsplash.com/'))).slice(0, 8)
      : [],
  };
}

export function ShopClient() {
  const market = useMarketLocation();
  const { demoEnabled } = usePublicConfig();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [province, setProvince] = useState('all');
  const [district, setDistrict] = useState('all');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [stockOnly, setStockOnly] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sameDayOnly, setSameDayOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState('best-match');
  const [live, setLive] = useState<MarketProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [density, setDensity] = useState<'grid' | 'roomy'>('grid');

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('query');
    if (initialQuery) setQ(initialQuery);
  }, []);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      try {
        const response = await fetch(`${api}/products?limit=100`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Marketplace API unavailable');
        const data = (await response.json()) as {
          data?: Record<string, unknown>[];
          serverTime?: string;
        };
        if (active) {
          setLive(Array.isArray(data.data) ? data.data.map(normalize) : []);
          setLastSync(new Date(data.serverTime || Date.now()));
          setLoadError(null);
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setLive(null);
          setLoadError('Live inventory could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    const onVisibility = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const source: readonly MarketProduct[] =
    live ?? (demoEnabled ? (catalog.products as unknown as readonly MarketProduct[]) : []);
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          source
            .filter((product) => province === 'all' || product.province === province)
            .map((product) => product.district),
        ),
      ).sort(),
    [province, source],
  );

  const categoryCounts = useMemo(
    () =>
      new Map(
        catalog.categories.map((item) => [
          item.slug,
          source.filter((product) => product.category === item.slug).length,
        ]),
      ),
    [source],
  );

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return source
      .map((product) => {
        const farm = farmForProduct(product);
        const sellerLat = Number.isFinite(Number(product.lat)) ? Number(product.lat) : farm.lat;
        const sellerLng = Number.isFinite(Number(product.lng)) ? Number(product.lng) : farm.lng;
        const deliveryRadius = Number(product.deliveryRadiusKm || farm.deliveryRadiusKm || market.radius);
        const sellerVerified = product.farmerVerified ?? farm.verified;
        const sellerSameDay = product.farmSameDay ?? farm.sameDay;
        const distance = distanceKm(market.place.lat, market.place.lng, sellerLat, sellerLng);
        const match = scoreMarketplaceProduct(
          {
            ...product,
            lat: sellerLat,
            lng: sellerLng,
            deliveryRadiusKm: deliveryRadius,
            farmerVerified: sellerVerified,
            farmName: product.farmName || farm.name,
          },
          {
            lat: market.place.lat,
            lng: market.place.lng,
            radiusKm: market.radius,
            category,
            query: q,
            organicOnly,
          },
        );
        return { product, distance, deliveryRadius, sellerVerified, sellerSameDay, matchScore: match.matchScore, matchReasons: match.matchReasons };
      })
      .filter(({ product, distance, deliveryRadius, sellerVerified, sellerSameDay }) => {
        const searchable =
          `${product.name} ${product.shortDescription} ${product.district} ${product.provinceName}`.toLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (category === 'all' || product.category === category) &&
          (province === 'all' || product.province === province) &&
          (district === 'all' || product.district === district) &&
          (!organicOnly || product.organic) &&
          (!stockOnly || product.stock > 0) &&
          (!verifiedOnly || sellerVerified) &&
          (!sameDayOnly || sellerSameDay) &&
          (!topRatedOnly || product.rating >= 4.8) &&
          (!maxPrice || product.price <= maxPrice) &&
          distance <= Math.min(market.radius >= 1000 ? deliveryRadius : market.radius, deliveryRadius)
        );
      })
      .sort((a, b) => {
        if (sort === 'best-match') return b.matchScore - a.matchScore || a.distance - b.distance;
        if (sort === 'price-low') return a.product.price - b.product.price;
        if (sort === 'price-high') return b.product.price - a.product.price;
        if (sort === 'rating') return b.product.rating - a.product.rating;
        if (sort === 'fresh') return Number(b.product.featured) - Number(a.product.featured);
        return a.distance - b.distance;
      })
      .map(({ product, matchScore, matchReasons }) => ({ ...product, matchScore, matchReasons }));
  }, [
    source,
    q,
    category,
    province,
    district,
    organicOnly,
    stockOnly,
    verifiedOnly,
    sameDayOnly,
    topRatedOnly,
    maxPrice,
    sort,
    market.place,
    market.radius,
  ]);

  function clearFilters() {
    setQ('');
    setCategory('all');
    setProvince('all');
    setDistrict('all');
    setOrganicOnly(false);
    setStockOnly(true);
    setVerifiedOnly(false);
    setSameDayOnly(false);
    setTopRatedOnly(false);
    setMaxPrice(0);
    setSort('best-match');
    market.setRadius(150);
  }

  const activeFilterCount =
    Number(category !== 'all') +
    Number(province !== 'all') +
    Number(district !== 'all') +
    Number(organicOnly) +
    Number(!stockOnly) +
    Number(verifiedOnly) +
    Number(sameDayOnly) +
    Number(topRatedOnly) +
    Number(maxPrice > 0) +
    Number(Boolean(q.trim()));

  return (
    <div className="marketplace-shell">
      <div className="market-location-toolbar">
        <div className="market-location-copy">
          <span className="location-orb">
            <MapPin size={20} />
          </span>
          <div>
            <small>Your delivery market</small>
            <strong>{market.place.name}</strong>
            <span>{market.message}</span>
          </div>
        </div>
        <div className="market-location-actions">
          <select
            value={market.place.name}
            onChange={(event) => market.choosePreset(event.target.value)}
            aria-label="Choose delivery city"
          >
            {market.place.name === 'Your location' && <option>Your location</option>}
            {locationPresets.map((place) => (
              <option key={place.name}>{place.name}</option>
            ))}
          </select>
          <select
            value={market.radius}
            onChange={(event) => market.setRadius(Number(event.target.value))}
            aria-label="Delivery radius"
          >
            <option value={35}>Within 35 km</option>
            <option value={75}>Within 75 km</option>
            <option value={150}>Within 150 km</option>
            <option value={300}>Within 300 km</option>
            <option value={1000}>All Nepal</option>
          </select>
          <button className="btn btn-dark compact-btn" onClick={market.locate}>
            <Crosshair size={17} /> {market.locating ? 'Finding…' : 'Use my location'}
          </button>
        </div>
      </div>

      <div className="market-category-rail" aria-label="Browse product categories">
        <button
          className={category === 'all' ? 'is-active' : ''}
          onClick={() => setCategory('all')}
          aria-pressed={category === 'all'}
        >
          <span>✦</span>
          <b>All harvests</b>
          <small>{source.length}</small>
        </button>
        {catalog.categories.map((item) => (
          <button
            className={category === item.slug ? 'is-active' : ''}
            key={item.slug}
            onClick={() => setCategory(item.slug)}
            aria-pressed={category === item.slug}
          >
            <span>{item.emoji}</span>
            <b>{item.name}</b>
            <small>{categoryCounts.get(item.slug) || 0}</small>
          </button>
        ))}
      </div>

      <div className="market-quick-filters" aria-label="Quick marketplace filters">
        <button className={sameDayOnly ? 'is-active' : ''} onClick={() => setSameDayOnly((value) => !value)} aria-pressed={sameDayOnly}>⚡ Same-day local</button>
        <button className={verifiedOnly ? 'is-active' : ''} onClick={() => setVerifiedOnly((value) => !value)} aria-pressed={verifiedOnly}>✓ Verified sellers</button>
        <button className={organicOnly ? 'is-active' : ''} onClick={() => setOrganicOnly((value) => !value)} aria-pressed={organicOnly}>🌱 Organic</button>
        <button className={topRatedOnly ? 'is-active' : ''} onClick={() => setTopRatedOnly((value) => !value)} aria-pressed={topRatedOnly}>★ 4.8+ rated</button>
        <button className={maxPrice === 500 ? 'is-active' : ''} onClick={() => setMaxPrice((value) => value === 500 ? 0 : 500)} aria-pressed={maxPrice === 500}>Under NPR 500</button>
      </div>

      <div className="shop-layout advanced-shop-layout">
        <aside className={`filter marketplace-filter${filtersOpen ? ' is-mobile-open' : ''}`}>
          <div className="filter-title-row">
            <h3>
              <SlidersHorizontal size={18} /> Filters
            </h3>
            <span>
              <button onClick={clearFilters}>Reset</button>
              <button
                className="filter-mobile-close"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </span>
          </div>
          <label htmlFor="market-q">Search marketplace</label>
          <div className="filter-search">
            <Search size={17} />
            <input
              id="market-q"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tea, apple, honey..."
            />
          </div>
          <label htmlFor="market-category">Category</label>
          <select
            id="market-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {catalog.categories.map((item) => (
              <option value={item.slug} key={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <label htmlFor="market-province">Province</label>
          <select
            id="market-province"
            value={province}
            onChange={(event) => {
              setProvince(event.target.value);
              setDistrict('all');
            }}
          >
            <option value="all">All 7 provinces</option>
            {catalog.provinces.map((item) => (
              <option value={item.slug} key={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <label htmlFor="market-district">District</label>
          <select
            id="market-district"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="all">All districts</option>
            {districts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <label htmlFor="market-max-price">Maximum price</label>
          <select id="market-max-price" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))}>
            <option value={0}>Any price</option>
            <option value={250}>Up to NPR 250</option>
            <option value={500}>Up to NPR 500</option>
            <option value={1000}>Up to NPR 1,000</option>
            <option value={2500}>Up to NPR 2,500</option>
          </select>
          <div className="filter-checks">
            <label>
              <input
                type="checkbox"
                checked={organicOnly}
                onChange={(event) => setOrganicOnly(event.target.checked)}
              />
              <Sprout size={16} /> Organic only
            </label>
            <label>
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(event) => setStockOnly(event.target.checked)}
              />
              <CheckCircle2 size={16} /> In stock now
            </label>
            <label><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />✓ Verified sellers</label>
            <label><input type="checkbox" checked={sameDayOnly} onChange={(event) => setSameDayOnly(event.target.checked)} />⚡ Same-day local</label>
            <label><input type="checkbox" checked={topRatedOnly} onChange={(event) => setTopRatedOnly(event.target.checked)} />★ Rated 4.8+</label>
          </div>
          <div className="live-inventory-note" aria-live="polite">
            <RefreshCw size={16} className={loading ? 'is-spinning' : ''} />
            <span>
              <b>{live !== null ? 'Live farmer inventory' : demoEnabled ? 'Demo marketplace' : 'Live marketplace'}</b>
              {lastSync
                ? `Synced ${lastSync.toLocaleTimeString()}`
                : loadError || (loading ? 'Connecting to Cloudflare D1…' : 'Waiting for live inventory')}
            </span>
          </div>
        </aside>

        <div className="market-results">
          <div className="market-results-head">
            <div>
              <strong>{items.length} products</strong>
              <span>serviceable near {market.place.name}</span>
            </div>
            <div className="market-view-actions">
              <button
                className="mobile-filter-trigger"
                onClick={() => setFiltersOpen(true)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={16} /> Filters
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
              <label>
                <span className="sort-label">Sort by</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="best-match">Best match</option>
                  <option value="nearest">Nearest first</option>
                  <option value="fresh">Fresh & featured</option>
                  <option value="rating">Top rated</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
              <span className="density-switch" aria-label="Product layout">
                <button
                  onClick={() => setDensity('grid')}
                  className={density === 'grid' ? 'is-active' : ''}
                  aria-label="Compact product grid"
                  aria-pressed={density === 'grid'}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  onClick={() => setDensity('roomy')}
                  className={density === 'roomy' ? 'is-active' : ''}
                  aria-label="Roomy product grid"
                  aria-pressed={density === 'roomy'}
                >
                  <Rows3 size={17} />
                </button>
              </span>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="active-filter-row" aria-label="Active filters">
              <span>Active</span>
              {q.trim() && (
                <button onClick={() => setQ('')}>
                  “{q.trim()}” <X size={13} />
                </button>
              )}
              {category !== 'all' && (
                <button onClick={() => setCategory('all')}>
                  {catalog.categories.find((item) => item.slug === category)?.name || category}
                  <X size={13} />
                </button>
              )}
              {province !== 'all' && (
                <button
                  onClick={() => {
                    setProvince('all');
                    setDistrict('all');
                  }}
                >
                  {catalog.provinces.find((item) => item.slug === province)?.name || province}
                  <X size={13} />
                </button>
              )}
              {district !== 'all' && (
                <button onClick={() => setDistrict('all')}>
                  {district} <X size={13} />
                </button>
              )}
              {organicOnly && (
                <button onClick={() => setOrganicOnly(false)}>
                  Organic <X size={13} />
                </button>
              )}
              {!stockOnly && (
                <button onClick={() => setStockOnly(true)}>
                  Include sold out <X size={13} />
                </button>
              )}
              {verifiedOnly && <button onClick={() => setVerifiedOnly(false)}>Verified sellers <X size={13}/></button>}
              {sameDayOnly && <button onClick={() => setSameDayOnly(false)}>Same-day local <X size={13}/></button>}
              {topRatedOnly && <button onClick={() => setTopRatedOnly(false)}>4.8+ rated <X size={13}/></button>}
              {maxPrice > 0 && <button onClick={() => setMaxPrice(0)}>Up to NPR {maxPrice.toLocaleString()} <X size={13}/></button>}
              <button className="clear-all-filter" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}
          {loadError && !demoEnabled && (
            <div className="security-note" role="status">
              <RefreshCw size={18} />
              <p><b>Live inventory unavailable.</b> Sample products are intentionally not substituted in production.</p>
            </div>
          )}
          {items.length ? (
            <div className={`grid product-grid square-product-grid product-grid-${density}`}>
              {items.map((product) => (
                <ProductCard key={product.slug} product={product} matchScore={product.matchScore} matchReasons={product.matchReasons} />
              ))}
            </div>
          ) : (
            <div className="market-empty">
              <MapPin size={30} />
              <h3>No serviceable harvest found</h3>
              <p>Increase your radius, clear a filter or choose another Nepal delivery city.</p>
              <button className="btn btn-primary" onClick={clearFilters}>
                Show the full market
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
