'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Minus, Plus, ShoppingBasket, Store, Trash2, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useCart } from '@/components/CartProvider';
import { farmForProduct } from '@/lib/marketplace';

export default function Cart() {
  const c = useCart();
  const groups = useMemo(() => {
    const map = new Map<string, typeof c.lines>();
    for (const line of c.lines) {
      const farm = farmForProduct(line.product);
      map.set(farm.slug, [...(map.get(farm.slug) || []), line]);
    }
    return [...map.entries()].map(([slug, lines]) => ({ slug, farm: farmForProduct(lines[0].product), lines, subtotal: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0) }));
  }, [c.lines]);
  return <main>
    <section className="page-hero compact cart-hero"><div className="container"><span className="eyebrow"><ShoppingBasket size={14}/> Basket</span><h1>Review products by seller.</h1><p className="section-copy">One Hariyo basket can contain multiple farmer stores. Each seller fulfills only their own items while you place one order.</p></div></section>
    <section className="section"><div className="container cart-page-grid">
      <div className="cart-page-lines">
        {!groups.length ? <div className="market-empty"><ShoppingBasket size={34}/><h3>Your basket is empty</h3><p>Find fresh products ranked by distance, availability and seller trust.</p><Link className="btn btn-primary" href="/shop">Start shopping</Link></div> : groups.map((group) => <section className="cart-page-seller" key={group.slug}>
          <header><div><Store/><span><b>{group.farm.name}</b><small>{group.farm.district} · {group.farm.verified ? 'Verified seller' : 'Marketplace seller'}</small></span>{group.farm.verified && <BadgeCheck/>}</div><strong>NPR {group.subtotal.toLocaleString()}</strong></header>
          <div className="cart-page-fulfillment"><Truck size={15}/><span>{group.farm.sameDay ? 'Same-day delivery can be available inside this seller’s local zone.' : 'This seller uses scheduled delivery.'}</span></div>
          {group.lines.map((line) => <div className="cart-page-line" key={line.product.slug}>
            <Link href={`/products/${line.product.slug}`}><Image src={line.product.image} alt={line.product.name} width={112} height={96}/></Link>
            <div className="cart-page-line-copy"><Link href={`/products/${line.product.slug}`}><h3>{line.product.name}</h3></Link><span>{line.product.district} · {line.product.unit}</span><small>{line.product.stock} in seller stock</small><div className="cart-quantity"><button type="button" onClick={() => c.update(line.product.slug, line.quantity - Number(line.product.minimumOrder || 1))}><Minus/></button><small>{line.quantity}</small><button type="button" disabled={line.quantity >= line.product.stock} onClick={() => c.update(line.product.slug, line.quantity + Number(line.product.minimumOrder || 1))}><Plus/></button></div></div>
            <div className="cart-page-line-price"><b>NPR {(line.product.price * line.quantity).toLocaleString()}</b><small>NPR {line.product.price.toLocaleString()} / {line.product.unit}</small><button type="button" onClick={() => c.remove(line.product.slug)}><Trash2/> Remove</button></div>
          </div>)}
        </section>)}
      </div>
      <aside className="cart-page-summary"><span className="eyebrow">Order summary</span><h2>NPR {c.total.toLocaleString()}</h2><div><span>Products</span><b>NPR {c.total.toLocaleString()}</b></div><div><span>Sellers</span><b>{groups.length}</b></div><div><span>Delivery</span><b>Calculated at checkout</b></div><p>No account is required to place an order. Delivery dates and fees are confirmed using your address and each seller’s service zone.</p><Link className={`btn btn-primary btn-full${c.lines.length ? '' : ' disabled'}`} href="/checkout" aria-disabled={!c.lines.length}>Continue as guest</Link><Link className="btn btn-soft btn-full" href="/shop">Continue shopping</Link></aside>
    </div></section>
  </main>;
}
