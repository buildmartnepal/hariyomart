'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/CartProvider';
export default function Cart() {
  const c = useCart();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <h1>Your basket</h1>
        </div>
      </section>
      <section className="section">
        <div className="container detail-card">
          {c.lines.length === 0 ? (
            <p>
              Your basket is empty.{' '}
              <Link href="/shop">
                <strong>Start shopping.</strong>
              </Link>
            </p>
          ) : (
            c.lines.map((l) => (
              <div className="cart-row" key={l.product.slug}>
                <Image
                  src={l.product.image}
                  alt={l.product.name}
                  width={72}
                  height={58}
                  sizes="72px"
                />
                <div>
                  <strong>{l.product.name}</strong>
                  <span className="cart-quantity" aria-label={`Quantity for ${l.product.name}`}>
                    <button
                      type="button"
                      onClick={() =>
                        c.update(l.product.slug, l.quantity - Number(l.product.minimumOrder || 1))
                      }
                    >
                      −
                    </button>
                    <small>{l.quantity}</small>
                    <button
                      type="button"
                      disabled={l.quantity >= l.product.stock}
                      onClick={() =>
                        c.update(l.product.slug, l.quantity + Number(l.product.minimumOrder || 1))
                      }
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
              marginTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong>Total: NPR {c.total.toLocaleString()}</strong>
            <Link
              className={`btn btn-primary${c.lines.length ? '' : ' disabled'}`}
              aria-disabled={!c.lines.length}
              tabIndex={c.lines.length ? 0 : -1}
              href="/checkout"
            >
              Checkout
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
