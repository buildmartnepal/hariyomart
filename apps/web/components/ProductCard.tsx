'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  MapPin,
  ShoppingBasket,
  Star,
  Truck,
} from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { distanceKm, farmForProduct } from '@/lib/marketplace';
import { useCart } from './CartProvider';
import { useMarketLocation } from './LocationProvider';
export function ProductCard({ product }: { product: Product }) {
  const c = useCart();
  const farm = farmForProduct(product);
  const location = useMarketLocation();
  const distance = distanceKm(location.place.lat, location.place.lng, farm.lat, farm.lng);
  const line = c.lines.find((item) => item.product.slug === product.slug);
  const category = product.category.replaceAll('-', ' ');
  const discount =
    product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
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
        <span className="product-photo-topline">
          {product.organic ? (
            <span className="organic-chip">Organic</span>
          ) : product.featured ? (
            <span className="featured-chip">Hariyo pick</span>
          ) : (
            <span />
          )}
          {discount > 0 && <span className="discount-chip">Save {discount}%</span>}
        </span>
        <span className="product-photo-bottomline">
          <span className="origin-chip">
            <MapPin size={12} />
            {product.district}
          </span>
          <span className="quick-view-chip">
            View <ArrowUpRight size={13} />
          </span>
        </span>
      </Link>
      <div className="product-body">
        <div className="product-kicker">
          <span>{category}</span>
          <span className="product-rating" aria-label={`${product.rating} out of 5 stars`}>
            <Star size={12} fill="currentColor" /> {product.rating}
          </span>
        </div>
        <Link className="product-name-link" href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="product-meta product-farm-row">
          <span className="farm-name">
            {farm.name}
            {farm.verified && <BadgeCheck size={13} />}
          </span>
          <span className="distance-note">
            {distance < 999 ? `${distance.toFixed(0)} km` : product.provinceName}
          </span>
        </div>
        <div className="product-delivery-row">
          <small className="harvest-note">
            <Clock3 size={13} /> {freshProduct ? 'Fresh harvest' : 'Seller packed'} · {product.unit}
          </small>
          <small>
            <Truck size={13} /> {farm.sameDay ? 'Same day' : 'Scheduled'}
          </small>
        </div>
        <div className="product-actions">
          <div className="product-price-stack">
            <span>
              <span className="price">NPR {product.price}</span>
              <small> / {product.unit}</small>
            </span>
            {product.oldPrice > product.price && (
              <span className="old-price">NPR {product.oldPrice}</span>
            )}
          </div>
          <button
            className={`cart-button square-add${line ? ' is-in-basket' : ''}`}
            onClick={() => c.add(product)}
            disabled={product.stock <= 0}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBasket size={17} />
            {product.stock <= 0 ? 'Sold out' : line ? `${line.quantity} added` : 'Add'}
          </button>
        </div>
        <div className={`product-stock ${product.stock < 10 ? 'is-low' : ''}`}>
          <span />
          {product.stock <= 0
            ? 'Restocking soon'
            : product.stock < 10
              ? `Only ${product.stock} left today`
              : 'In stock and ready to order'}
        </div>
      </div>
    </article>
  );
}
