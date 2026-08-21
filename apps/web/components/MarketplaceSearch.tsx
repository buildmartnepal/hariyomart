'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { categoryCatalog, productCatalog, type Product } from '@/lib/catalog';

const RECENT_KEY = 'hariyo-market-searches-v1';

function safeImage(product: Product) {
  return product.image?.trim() || `/products/${product.category}.svg`;
}

export function MarketplaceSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(parsed)) setRecent(parsed.filter((item): item is string => typeof item === 'string').slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('commerce-modal-open');
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('commerce-modal-open');
    };
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const productResults = useMemo(() => {
    if (!normalized) return productCatalog.filter((product) => product.featured).slice(0, 6);
    return productCatalog
      .filter((product) =>
        `${product.name} ${product.shortDescription} ${product.category} ${product.district} ${product.provinceName}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 7);
  }, [normalized]);
  const categoryResults = useMemo(() => {
    if (!normalized) return categoryCatalog.slice(0, 5);
    return categoryCatalog
      .filter((category) => `${category.name} ${category.description}`.toLowerCase().includes(normalized))
      .slice(0, 4);
  }, [normalized]);

  function remember(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  function browse(value = query) {
    const clean = value.trim();
    remember(clean);
    setOpen(false);
    router.push(clean ? `/shop?query=${encodeURIComponent(clean)}` : '/shop');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    browse();
  }

  return (
    <>
      <button className="icon-btn market-search-trigger" type="button" aria-label="Search marketplace" onClick={() => setOpen(true)}>
        <Search size={19} />
      </button>
      {open && (
        <div className="market-search-shell" role="dialog" aria-modal="true" aria-label="Search Hariyo Mart">
          <button className="market-search-backdrop" aria-label="Close search" onClick={() => setOpen(false)} />
          <section className="market-search-panel">
            <div className="market-search-head">
              <div>
                <span className="eyebrow"><Sparkles size={14}/> Search the fresh market</span>
                <h2>What are you looking for?</h2>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close search"><X size={20}/></button>
            </div>
            <form className="market-search-form" onSubmit={submit}>
              <Search size={20} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tomato, Ilam tea, organic honey, Mustang…"
                aria-label="Search products"
                autoComplete="off"
              />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={17}/></button>}
              <button className="btn btn-primary" type="submit">See all</button>
            </form>

            {!normalized && recent.length > 0 && (
              <div className="market-search-recent">
                <strong>Recent searches</strong>
                <div>{recent.map((item) => <button key={item} onClick={() => {setQuery(item); browse(item);}}>{item}</button>)}</div>
              </div>
            )}

            <div className="market-search-grid">
              <div>
                <div className="market-search-section-title"><strong>{normalized ? 'Product matches' : 'Popular now'}</strong><span>{productResults.length}</span></div>
                <div className="market-search-products">
                  {productResults.map((product) => (
                    <Link key={product.slug} href={`/products/${product.slug}`} onClick={() => { remember(query || product.name); setOpen(false); }}>
                      <span className="market-search-thumb"><Image src={safeImage(product)} alt="" fill sizes="64px" /></span>
                      <span><b>{product.name}</b><small>{product.district} · NPR {product.price.toLocaleString()} / {product.unit}</small></span>
                      <ArrowRight size={16}/>
                    </Link>
                  ))}
                  {productResults.length === 0 && <div className="market-search-empty">No exact product yet. Browse the full marketplace for related harvests.</div>}
                </div>
              </div>
              <aside>
                <div className="market-search-section-title"><strong>Categories</strong></div>
                <div className="market-search-categories">
                  {categoryResults.map((category) => (
                    <Link key={category.slug} href={`/categories/${category.slug}`} onClick={() => setOpen(false)}>
                      <span>{category.emoji}</span><b>{category.name}</b><ArrowRight size={15}/>
                    </Link>
                  ))}
                </div>
                <button className="market-search-all" onClick={() => browse()}>
                  Browse all matching products <ArrowRight size={16}/>
                </button>
              </aside>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
