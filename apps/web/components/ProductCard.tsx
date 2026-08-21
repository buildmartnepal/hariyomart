'use client';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Clock3, MapPin, ShoppingBasket, Star, Truck } from 'lucide-react';
import type { Product } from '@/lib/catalog';
type CardProduct = Product & {
  lat?: number;
  lng?: number;
  farmName?: string;
  farmSlug?: string;
  farmerVerified?: boolean;
  farmSameDay?: boolean;
  deliveryRadiusKm?: number;
};
import { distanceKm, farmForProduct } from '@/lib/marketplace';
import { useCart } from './CartProvider';
import { useMarketLocation } from './LocationProvider';
import { ProductCardGallery } from './ProductGallery';
import { ProductActions } from './ProductActions';

export function ProductCard({ product, matchScore, matchReasons }: { product: CardProduct; matchScore?: number; matchReasons?: readonly string[] }) {
  const c = useCart(); const farm = farmForProduct(product); const location = useMarketLocation();
  const sellerLat = Number.isFinite(Number(product.lat)) ? Number(product.lat) : farm.lat;
  const sellerLng = Number.isFinite(Number(product.lng)) ? Number(product.lng) : farm.lng;
  const sellerName = product.farmName || farm.name;
  const sellerVerified = product.farmerVerified ?? farm.verified;
  const sellerSameDay = product.farmSameDay ?? farm.sameDay;
  const distance = distanceKm(location.place.lat, location.place.lng, sellerLat, sellerLng);
  const line = c.lines.find((item) => item.product.slug === product.slug);
  const category = product.category.replaceAll('-', ' ');
  const discount = product.oldPrice > product.price ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;
  const freshProduct = ['leafy-greens','vegetables','fresh-fruits','dairy'].includes(product.category);
  return <article className="product-card product-card-v85">
    <div className="product-media-shell">
      <ProductCardGallery name={product.name} slug={product.slug} primary={product.image} images={product.images} />
      <div className="product-photo-topline"><ProductActions slug={product.slug} compact />
        {product.organic ? <span className="organic-chip">Organic</span> : product.featured ? <span className="featured-chip">Hariyo pick</span> : <span/>}
        {discount > 0 && <span className="discount-chip">Save {discount}%</span>}
      </div>
      <div className="product-photo-bottomline"><span className="origin-chip"><MapPin size={12}/>{product.district}</span>{matchScore ? <span className="match-chip">{matchScore}% match</span> : <Link className="quick-view-chip" href={`/products/${product.slug}`}>View <ArrowUpRight size={13}/></Link>}</div>
    </div>
    <div className="product-body">
      <div className="product-kicker"><span>{category}</span><span className="product-rating"><Star size={12} fill="currentColor"/> {product.rating}</span></div>
      <Link className="product-name-link" href={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
      {matchReasons?.length ? <div className="match-reasons">{matchReasons.slice(0,2).map((reason) => <span key={reason}>{reason}</span>)}</div> : null}
      <div className="product-meta product-farm-row"><span className="farm-name">{sellerName}{sellerVerified && <BadgeCheck size={13}/>}</span><span className="distance-note">{distance < 999 ? `${distance.toFixed(0)} km` : product.provinceName}</span></div>
      <div className="product-delivery-row"><small className="harvest-note"><Clock3 size={13}/> {freshProduct ? 'Fresh harvest' : 'Seller packed'} · {product.unit}</small><small><Truck size={13}/> {sellerSameDay ? 'Same day' : 'Scheduled'}</small></div>
      <div className="product-actions"><div className="product-price-stack"><span><span className="price">NPR {product.price}</span><small> / {product.unit}</small></span>{product.oldPrice > product.price && <span className="old-price">NPR {product.oldPrice}</span>}</div>
        <button className={`cart-button square-add${line ? ' is-in-basket' : ''}`} onClick={() => c.add(product)} disabled={product.stock <= 0} aria-label={`Add ${product.name} to cart`}><ShoppingBasket size={17}/>{product.stock <= 0 ? 'Sold out' : line ? `${line.quantity} added` : 'Add'}</button>
      </div>
      <div className={`product-stock ${product.stock < 10 ? 'is-low' : ''}`}><span/>{product.stock <= 0 ? 'Restocking soon' : product.stock < 10 ? `Only ${product.stock} left today` : 'In stock and ready to order'}{product.minimumOrder && product.minimumOrder > 1 ? <small>Min. {product.minimumOrder} {product.unit}</small> : null}</div>
    </div>
  </article>;
}
