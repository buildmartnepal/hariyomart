'use client';

import Link from 'next/link';
import { Heart, ShoppingBasket } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { useProductExperience } from '@/components/ProductExperienceProvider';
import { useAuth } from '@/components/AuthProvider';

export default function SavedProductsPage() {
  const experience = useProductExperience();
  const auth = useAuth();
  const products = experience.saved.flatMap((slug) => {
    const product = catalog.products.find((item) => item.slug === slug);
    return product ? [product] : [];
  });
  return <main>
    <section className="page-hero compact saved-page-hero"><div className="container"><span className="eyebrow"><Heart size={15}/> Saved products</span><h1>Your shortlist, ready when you are.</h1><p className="section-copy">Save products while browsing. Signed-in buyers synchronize saved listings to their Hariyo account; guest saves stay on this device.</p></div></section>
    <section className="section"><div className="container">
      {products.length ? <><div className="saved-page-summary"><div><b>{products.length} saved product{products.length === 1 ? '' : 's'}</b><span>{auth.user ? 'Synchronized with your buyer profile' : 'Saved on this device'}</span></div><Link href="/shop" className="btn btn-soft">Keep shopping</Link></div><div className="grid product-grid square-product-grid">{products.map((product) => <ProductCard key={product.slug} product={product}/>)}</div></> : <div className="market-empty"><Heart size={34}/><h3>No saved products yet</h3><p>Use the heart on any product card to build a shortlist for later.</p><Link className="btn btn-primary" href="/shop"><ShoppingBasket size={17}/> Browse marketplace</Link></div>}
    </div></section>
  </main>;
}
