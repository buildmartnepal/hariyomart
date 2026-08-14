'use client';
import { useState } from 'react';
import { Minus, Plus, ShoppingBasket } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { useCart } from './CartProvider';
export function AddToCart({ product }: { product: Product }) {
  const c = useCart();
  const minimum = Math.max(0.01, Number(product.minimumOrder || 1));
  const [quantity, setQuantity] = useState(minimum);
  const line = c.lines.find((item) => item.product.slug === product.slug);
  const normalize = (value: number) => Math.round(value * 100) / 100;

  function change(next: number) {
    setQuantity(normalize(Math.min(product.stock, Math.max(minimum, next))));
  }

  return (
    <div className="purchase-panel">
      <div className="quantity-picker-row">
        <div>
          <small>QUANTITY</small>
          <span>Choose your order amount</span>
        </div>
        <div className="quantity-stepper" aria-label={`Quantity in ${product.unit}`}>
          <button
            onClick={() => change(quantity - minimum)}
            disabled={quantity <= minimum}
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <strong aria-live="polite">{quantity}</strong>
          <button
            onClick={() => change(quantity + minimum)}
            disabled={quantity >= product.stock}
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <button
        className="btn btn-primary purchase-add-button"
        onClick={() => c.add(product, quantity)}
        disabled={product.stock <= 0}
      >
        <ShoppingBasket size={19} />
        {product.stock > 0
          ? `Add to basket · NPR ${product.price * quantity}`
          : 'Currently sold out'}
      </button>
      <div className="purchase-panel-foot">
        <span>
          {line
            ? `${line.quantity} ${product.unit} already in your basket`
            : 'No payment taken yet'}
        </span>
        <span>Stock: {product.stock}</span>
      </div>
    </div>
  );
}
