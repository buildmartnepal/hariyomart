'use client';
import type { Product } from '@/lib/catalog';
import { useCart } from './CartProvider';
export function AddToCart({ product }: { product: Product }) {
  const c = useCart();
  return (
    <div className="quantity-row">
      <button
        className="btn btn-primary"
        style={{ flex: 1 }}
        onClick={() => c.add(product)}
        disabled={product.stock <= 0}
      >
        {product.stock > 0 ? 'Add to basket' : 'Currently sold out'}
      </button>
    </div>
  );
}
