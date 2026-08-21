'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, BookmarkPlus, Minus, Plus, ShoppingBasket, Store, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCart } from './CartProvider';
import { farmForProduct } from '@/lib/marketplace';
import { useAuth } from './AuthProvider';

export function CartDrawer() {
  const c = useCart();
  const auth = useAuth();
  const [saveState, setSaveState] = useState('');
  const groups = useMemo(() => {
    const map = new Map<string, typeof c.lines>();
    for (const line of c.lines) {
      const farm = farmForProduct(line.product);
      map.set(farm.slug, [...(map.get(farm.slug) || []), line]);
    }
    return [...map.entries()].map(([slug, lines]) => ({ slug, farm: farmForProduct(lines[0].product), lines }));
  }, [c.lines]);

  async function saveBasket() {
    if (!auth.user || !c.lines.length) return;
    setSaveState('Saving…');
    try {
      const now = new Date();
      await auth.apiRequest('/commerce/saved-baskets', {
        method: 'POST',
        body: JSON.stringify({
          name: `Basket ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          lines: c.lines.map((line) => ({ productSlug: line.product.slug, quantity: line.quantity })),
        }),
      });
      setSaveState('Saved');
      window.setTimeout(() => setSaveState(''), 1800);
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : 'Could not save');
    }
  }

  if (!c.open) return null;
  return <>
    <button type="button" className="cart-drawer-backdrop" aria-label="Close basket" onClick={() => c.setOpen(false)} />
    <aside className="cart-drawer cart-drawer-v88" aria-label="Shopping basket">
      <div className="cart-drawer-head"><div><span className="cart-drawer-icon"><ShoppingBasket size={19}/></span><div><h3>Your basket</h3><small>{c.count} item{c.count === 1 ? '' : 's'} · {groups.length} seller{groups.length === 1 ? '' : 's'}</small></div></div><button className="icon-btn" onClick={() => c.setOpen(false)} aria-label="Close basket"><X/></button></div>
      {!c.lines.length ? <div className="cart-drawer-empty"><ShoppingBasket size={32}/><b>Your basket is ready for something fresh.</b><p>Browse nearby harvests and add products from one or more farmers.</p><Link className="btn btn-primary" href="/shop" onClick={() => c.setOpen(false)}>Explore marketplace</Link></div> : <div className="cart-drawer-scroll">
        {groups.map((group) => <section className="cart-seller-group" key={group.slug}>
          <div className="cart-seller-head"><span><Store size={15}/><b>{group.farm.name}</b>{group.farm.verified && <BadgeCheck size={14}/>}</span><small>{group.farm.sameDay ? 'Local same-day eligible' : 'Scheduled fulfillment'}</small></div>
          {group.lines.map((line) => <div className="cart-row cart-row-v88" key={line.product.slug}>
            <Link href={`/products/${line.product.slug}`} onClick={() => c.setOpen(false)}><Image src={line.product.image} alt={line.product.name} width={72} height={64} sizes="72px" /></Link>
            <div className="cart-line-main"><Link href={`/products/${line.product.slug}`} onClick={() => c.setOpen(false)}><strong>{line.product.name}</strong></Link><small>NPR {line.product.price.toLocaleString()} / {line.product.unit}</small><span className="cart-quantity" aria-label={`Quantity for ${line.product.name}`}><button type="button" onClick={() => c.update(line.product.slug, line.quantity - Number(line.product.minimumOrder || 1))} aria-label={`Reduce ${line.product.name}`}><Minus/></button><small>{line.quantity}</small><button type="button" onClick={() => c.update(line.product.slug, line.quantity + Number(line.product.minimumOrder || 1))} disabled={line.quantity >= line.product.stock} aria-label={`Add another ${line.product.name}`}><Plus/></button></span></div>
            <div className="cart-line-tail"><b>NPR {(line.product.price * line.quantity).toLocaleString()}</b><button type="button" className="cart-remove" onClick={() => c.remove(line.product.slug)} aria-label={`Remove ${line.product.name}`}><Trash2 size={15}/></button></div>
          </div>)}
        </section>)}
      </div>}
      <div className="cart-drawer-footer">
        <div><span>Product total</span><strong>NPR {c.total.toLocaleString()}</strong></div>
        <small>Delivery is calculated per seller service zone at checkout.</small>
        <Link href="/checkout" onClick={() => c.setOpen(false)} className={`btn btn-primary btn-full${c.lines.length ? '' : ' disabled'}`} aria-disabled={!c.lines.length} tabIndex={c.lines.length ? 0 : -1}>Guest checkout</Link>
        {auth.user ? <button type="button" className="btn btn-soft btn-full" disabled={!c.lines.length || saveState === 'Saving…'} onClick={() => void saveBasket()}><BookmarkPlus size={15}/>{saveState || 'Save basket'}</button> : <Link href="/login?next=/cart" onClick={() => c.setOpen(false)} className="btn btn-soft btn-full"><BookmarkPlus size={15}/>Sign in to save basket</Link>}
        {auth.user && <Link href="/saved-baskets" onClick={() => c.setOpen(false)} className="cart-saved-link">Saved baskets →</Link>}
        <Link href="/cart" onClick={() => c.setOpen(false)} className="btn btn-soft btn-full">Review basket</Link>
      </div>
    </aside>
  </>;
}
