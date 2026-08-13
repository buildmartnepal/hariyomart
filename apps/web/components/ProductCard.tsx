'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, MapPin } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { farmForProduct } from '@/lib/marketplace';
import { useCart } from './CartProvider';
export function ProductCard({ product }: { product: Product }) {
  const c = useCart();
  const farm = farmForProduct(product);
  return (
    <article className="product-card">
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
            {farm.name}
            {farm.verified && <BadgeCheck size={13} />}
          </span>
          <span>★ {product.rating}</span>
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <small className="harvest-note">
          {product.category === 'leafy-greens' ||
          product.category === 'vegetables' ||
          product.category === 'fresh-fruits'
            ? 'Fresh harvest · '
            : ''}
          {product.unit}
        </small>
        <div className="product-actions">
          <div>
            <span className="price">NPR {product.price}</span>
            {product.oldPrice > product.price && (
              <span className="old-price">{product.oldPrice}</span>
            )}
          </div>
          <button
            className="cart-button"
            onClick={() => c.add(product)}
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
