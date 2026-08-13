'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from './CartProvider';
export function CartDrawer() {
  const c = useCart();
  if (!c.open) return null;
  return (
    <aside className="cart-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Your basket</h3>
        <button className="icon-btn" onClick={() => c.setOpen(false)} aria-label="Close basket">
          ×
        </button>
      </div>
      {c.lines.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Your basket is empty.</p>
      ) : (
        c.lines.map((l) => (
          <div className="cart-row" key={l.product.slug}>
            <Image src={l.product.image} alt="" width={56} height={48} sizes="56px" />
            <div>
              <strong>{l.product.name}</strong>
              <span className="cart-quantity" aria-label={`Quantity for ${l.product.name}`}>
                <button
                  type="button"
                  onClick={() =>
                    c.update(l.product.slug, l.quantity - Number(l.product.minimumOrder || 1))
                  }
                  aria-label={`Reduce ${l.product.name}`}
                >
                  −
                </button>
                <small>{l.quantity}</small>
                <button
                  type="button"
                  onClick={() =>
                    c.update(l.product.slug, l.quantity + Number(l.product.minimumOrder || 1))
                  }
                  disabled={l.quantity >= l.product.stock}
                  aria-label={`Add another ${l.product.name}`}
                >
                  +
                </button>
              </span>
            </div>
            <button
              className="icon-btn"
              onClick={() => c.remove(l.product.slug)}
              aria-label={`Remove ${l.product.name}`}
            >
              ×
            </button>
          </div>
        ))
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 900,
          padding: '18px 0',
        }}
      >
        <span>Total</span>
        <span>NPR {c.total.toLocaleString()}</span>
      </div>
      <Link
        href="/checkout"
        onClick={() => c.setOpen(false)}
        className={`btn btn-primary${c.lines.length ? '' : ' disabled'}`}
        aria-disabled={!c.lines.length}
        tabIndex={c.lines.length ? 0 : -1}
        style={{ width: '100%' }}
      >
        Proceed to checkout
      </Link>
    </aside>
  );
}
