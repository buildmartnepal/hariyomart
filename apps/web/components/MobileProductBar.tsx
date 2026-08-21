'use client';
import { ShoppingBasket } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { useCart } from './CartProvider';
export function MobileProductBar({ product }: { product: Product }) {
  const cart = useCart();
  const line = cart.lines.find((item) => item.product.slug === product.slug);
  const quantity = Math.max(0.01, Number(product.minimumOrder || 1));
  return (
    <div className="mobile-product-buybar">
      <div><small>NPR</small><strong>{product.price.toLocaleString()}</strong><span>/{product.unit}</span></div>
      <button type="button" className="btn btn-primary" disabled={product.stock <= 0} onClick={() => cart.add(product, quantity)}>
        <ShoppingBasket size={18}/>{product.stock <= 0 ? 'Sold out' : line ? `${line.quantity} in basket` : 'Add to basket'}
      </button>
    </div>
  );
}
