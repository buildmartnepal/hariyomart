'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Clock3 } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useProductExperience } from './ProductExperienceProvider';
export function RecentlyViewedRail({ excludeSlug }: { excludeSlug?: string }) {
  const experience = useProductExperience();
  const products = experience.recent.flatMap((slug) => {
    if (slug === excludeSlug) return [];
    const product = catalog.products.find((item) => item.slug === slug);
    return product ? [product] : [];
  }).slice(0, 8);
  if (!products.length) return null;
  return (
    <section className="recent-products-section">
      <div className="recent-products-head"><div><span className="eyebrow"><Clock3 size={14}/> Recently viewed</span><h2>Pick up where you left off.</h2></div><Link href="/shop">Browse all →</Link></div>
      <div className="recent-products-rail">
        {products.map((product) => <Link href={`/products/${product.slug}`} className="recent-product-card" key={product.slug}>
          <Image src={product.image} width={180} height={150} alt={product.name}/>
          <span><b>{product.name}</b><small>{product.district} · NPR {product.price}/{product.unit}</small></span>
        </Link>)}
      </div>
    </section>
  );
}
