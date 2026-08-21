'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookmarkCheck, LoaderCircle, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useCart } from './CartProvider';
import { getCatalogProduct } from '@/lib/catalog';

type Basket = { id: string; name: string; lines: Array<{ productSlug: string; quantity: number }>; updatedAt: string };

export function SavedBasketsClient() {
  const auth = useAuth();
  const cart = useCart();
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!auth.user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await auth.apiRequest<{ baskets?: Basket[] }>('/commerce/saved-baskets');
      setBaskets(Array.isArray(data.baskets) ? data.baskets : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load saved baskets');
    } finally { setLoading(false); }
  }, [auth]);

  useEffect(() => { if (auth.ready) void load(); }, [auth.ready, load]);

  function restore(basket: Basket) {
    let restored = 0;
    for (const line of basket.lines) {
      const product = getCatalogProduct(line.productSlug);
      if (!product) continue;
      cart.add(product, line.quantity);
      restored += 1;
    }
    setMessage(restored ? `${basket.name} added to your basket.` : 'Those saved products are not currently available.');
  }

  async function remove(id: string) {
    await auth.apiRequest(`/commerce/saved-baskets/${id}`, { method: 'DELETE' });
    setBaskets((items) => items.filter((basket) => basket.id !== id));
    setMessage('Saved basket removed.');
  }

  if (!auth.ready || loading) return <div className="saved-basket-state"><LoaderCircle className="spin"/> Loading saved baskets…</div>;
  if (!auth.user) return <div className="saved-basket-state"><BookmarkCheck/><h2>Sign in to keep reusable baskets.</h2><p>Save weekly produce combinations and restore them on any device.</p><Link className="btn btn-primary" href="/login?next=/saved-baskets">Sign in</Link></div>;
  return <div className="saved-basket-system">
    <div className="saved-basket-intro"><div><span className="eyebrow"><BookmarkCheck size={14}/> Repeat buying</span><h2>Saved baskets</h2><p>Keep a reusable mix of products for weekly household, office, restaurant or institutional orders.</p></div><button className="btn btn-soft" onClick={() => void load()}><RotateCcw size={15}/> Refresh</button></div>
    {message && <div className="notice-card">{message}</div>}
    {baskets.length ? <div className="saved-basket-grid">{baskets.map((basket) => <article key={basket.id}><div className="saved-basket-icon"><ShoppingBasket/></div><div><small>{basket.lines.length} product line{basket.lines.length === 1 ? '' : 's'}</small><h3>{basket.name}</h3><p>Updated {new Date(basket.updatedAt).toLocaleDateString()}</p></div><div className="saved-basket-actions"><button className="btn btn-primary" onClick={() => restore(basket)}>Load basket <ArrowRight size={14}/></button><button className="icon-btn" onClick={() => void remove(basket.id)} aria-label={`Delete ${basket.name}`}><Trash2 size={16}/></button></div></article>)}</div> : <div className="saved-basket-state"><ShoppingBasket/><h2>No saved baskets yet.</h2><p>Build a basket, open the basket drawer, and choose Save basket.</p><Link className="btn btn-primary" href="/shop">Build a basket</Link></div>}
  </div>;
}
