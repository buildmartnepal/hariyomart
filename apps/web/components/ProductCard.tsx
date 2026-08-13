'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Clock3, MapPin, ShoppingBasket, Truck } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { distanceKm, farmForProduct } from '@/lib/marketplace';
import { useCart } from './CartProvider';
import { useMarketLocation } from './LocationProvider';
export function ProductCard({ product }: { product: Product }) {
  const c = useCart();
  const farm = farmForProduct(product);
  const location = useMarketLocation();
  const distance = distanceKm(location.place.lat, location.place.lng, farm.lat, farm.lng);
  const freshProduct = ['leafy-greens', 'vegetables', 'fresh-fruits', 'dairy'].includes(
    product.category,
  );
  return (
    <article className="product-card">
      <Link className="product-photo" href={`/products/${product.slug}`}>
        <Image
          className="product-image"
          src={product.image}
          alt={product.name}
          width={800}
          height={800}
          sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 20vw"
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
          <span className="distance-note">
            {distance < 999 ? `${distance.toFixed(0)} km` : product.provinceName}
          </span>
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="product-delivery-row">
          <small className="harvest-note">
            <Clock3 size={13} /> {freshProduct ? 'Fresh harvest' : 'Seller packed'} · {product.unit}
          </small>
          <small>
            <Truck size={13} /> {farm.sameDay ? 'Same day' : 'Scheduled'}
          </small>
        </div>
        <div className="product-actions">
          <div>
            <span className="price">NPR {product.price}</span>
            {product.oldPrice > product.price && (
              <span className="old-price">{product.oldPrice}</span>
            )}
          </div>
          <button
            className="cart-button square-add"
            onClick={() => c.add(product)}
            disabled={product.stock <= 0}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBasket size={17} />
            {product.stock > 0 ? 'Add' : 'Sold'}
          </button>
        </div>
      </div>
    </article>
  );
}
