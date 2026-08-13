'use client';
import { useEffect, useMemo, useState } from 'react';
import { catalog, type Product } from '@/lib/catalog';
import { ProductCard } from './ProductCard';
const api = process.env.NEXT_PUBLIC_API_URL || '/api';
function normalize(p: any): Product & {
  farmName?: string;
  farmSlug?: string;
  farmerVerified?: boolean;
  deliveryRadiusKm?: number;
  municipality?: string;
} {
  const province = catalog.provinces.find((x) => x.slug === p.province);
  return {
    ...p,
    provinceName: p.provinceName || province?.name || p.province,
    emoji: p.emoji || '🌱',
    oldPrice: Number(p.oldPrice || p.price || 0),
    rating: Number(p.rating || 4.8),
    featured: !!p.featured,
    shortDescription:
      p.shortDescription || `Fresh ${p.name} listed directly by a Hariyo Mart farmer.`,
    description:
      p.description ||
      p.shortDescription ||
      `Traceable ${p.name} from ${p.district || p.province}.`,
    benefits: p.benefits || [
      'Traceable Nepal origin',
      'Location-aware marketplace',
      'Seller-managed live stock',
    ],
    image:
      typeof p.image === 'string' && p.image.startsWith('/')
        ? p.image
        : `/products/${p.category}.svg`,
  };
}
export function ShopClient() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [province, setProvince] = useState('all');
  const [live, setLive] = useState<
    | (Product & {
        farmName?: string;
        farmSlug?: string;
        farmerVerified?: boolean;
        deliveryRadiusKm?: number;
        municipality?: string;
      })[]
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: '100' });
        const response = await fetch(`${api}/products?${qs}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Marketplace API unavailable');
        const data = (await response.json()) as { data?: any[]; serverTime?: string };
        if (active) {
          setLive(Array.isArray(data.data) ? data.data.map(normalize) : null);
          setLastSync(new Date(data.serverTime || Date.now()));
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError'))
          setLive(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  const source = live || catalog.products;
  const items = useMemo(
    () =>
      source.filter(
        (p) =>
          (category === 'all' || p.category === category) &&
          (province === 'all' || p.province === province) &&
          `${p.name} ${p.shortDescription}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, category, province, source],
  );
  return (
    <div className="shop-layout">
      <aside className="filter">
        <h3>Filter products</h3>
        <label htmlFor="q">Search</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tea, apple, honey..."
        />
        <label htmlFor="cat">Category</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {catalog.categories.map((c) => (
            <option value={c.slug} key={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="prov">Province</label>
        <select id="prov" value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="all">All provinces</option>
          {catalog.provinces.map((p) => (
            <option value={p.slug} key={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <p aria-live="polite" style={{ color: 'var(--muted)', marginTop: 22 }}>
          {loading ? 'Refreshing live stock…' : `${items.length} products found`}
          <br />
          <small>
            {live
              ? `Live farmer inventory${lastSync ? ` · synced ${lastSync.toLocaleTimeString()}` : ''}`
              : 'Seed marketplace preview'}
          </small>
        </p>
      </aside>
      <div className="grid product-grid">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
