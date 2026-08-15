'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { catalog, type Product } from '@/lib/catalog';
import { ProductCard } from './ProductCard';
import { usePublicConfig } from './PublicConfigProvider';

type Props = {
  category?: string;
  province?: string;
  limit?: number;
  featuredOnly?: boolean;
  excludeSlug?: string;
  emptyTitle?: string;
  emptyCopy?: string;
};

function normalize(p: Record<string, unknown>): Product {
  const province = catalog.provinces.find((item) => item.slug === p.province);
  const price = Number(p.price || 0);
  return {
    ...(p as unknown as Product),
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
    shortDescription: String(p.shortDescription || `Fresh ${p.name} from a Hariyo Mart seller.`),
    description: String(p.description || p.shortDescription || `Traceable ${p.name} from Nepal.`),
    benefits: Array.isArray(p.benefits)
      ? p.benefits.map(String)
      : ['Traceable farm origin', 'Live seller stock', 'Location-aware fulfillment'],
    image:
      typeof p.image === 'string' && (p.image.startsWith('/') || p.image.startsWith('https://'))
        ? p.image
        : `/products/${p.category}.svg`,
  };
}

export function LiveProductGrid({
  category,
  province,
  limit = 24,
  featuredOnly = false,
  excludeSlug,
  emptyTitle = 'No live products yet',
  emptyCopy = 'Verified sellers can publish inventory from the Farmer workspace.',
}: Props) {
  const { demoEnabled } = usePublicConfig();
  const [live, setLive] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ limit: String(Math.min(100, Math.max(limit * 2, limit))) });
    if (category) query.set('category', category);
    if (province) query.set('province', province);
    fetch(`/api/products?${query}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('live marketplace unavailable'))))
      .then((payload: { data?: Record<string, unknown>[] }) => {
        setLive(Array.isArray(payload.data) ? payload.data.map(normalize) : []);
        setError(false);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setLive(null);
        setError(true);
      });
    return () => controller.abort();
  }, [category, province, limit]);

  const items = useMemo(() => {
    const source = live ?? (demoEnabled ? (catalog.products as Product[]) : []);
    let filtered = source.filter(
      (product) =>
        (!category || product.category === category) &&
        (!province || product.province === province) &&
        (!excludeSlug || product.slug !== excludeSlug),
    );
    if (featuredOnly) {
      const featured = filtered.filter((product) => product.featured);
      filtered = featured.length ? featured : filtered;
    }
    return filtered.slice(0, limit);
  }, [live, demoEnabled, category, province, featuredOnly, excludeSlug, limit]);

  if (live === null && !error && !demoEnabled) {
    return <div className="market-empty"><PackageSearch size={28} /><h3>Loading live marketplace…</h3></div>;
  }

  if (!items.length) {
    return (
      <div className="market-empty">
        {error ? <AlertTriangle size={28} /> : <PackageSearch size={28} />}
        <h3>{error ? 'Live marketplace is temporarily unavailable' : emptyTitle}</h3>
        <p>{error ? 'No sample inventory has been substituted. Please try again shortly.' : emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="grid product-grid" style={{ marginTop: 30 }}>
      {items.map((product) => <ProductCard key={product.slug} product={product} />)}
    </div>
  );
}
