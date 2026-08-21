'use client';

import Link from 'next/link';
import { Heart, MapPin, ShoppingBasket, Store, UserRound } from 'lucide-react';
import { useCart } from './CartProvider';
import { useProductExperience } from './ProductExperienceProvider';
import { useAuth } from './AuthProvider';

export function MobileCommerceNav() {
  const cart = useCart();
  const experience = useProductExperience();
  const auth = useAuth();
  const accountHref = auth.user?.role === 'admin' ? '/admin/overview' : auth.user?.role === 'farmer' || auth.user?.role === 'vendor' ? '/farmer/overview' : auth.user ? '/account/overview' : '/login';
  return (
    <nav className="mobile-commerce-nav" aria-label="Mobile marketplace navigation">
      <Link href="/shop"><Store/><span>Shop</span></Link>
      <Link href="/nearby"><MapPin/><span>Nearby</span></Link>
      <Link href="/saved" className="has-count"><Heart/><span>Saved</span>{experience.saved.length > 0 && <b>{Math.min(experience.saved.length, 99)}</b>}</Link>
      <Link href={accountHref}><UserRound/><span>Account</span></Link>
      <button type="button" onClick={() => cart.setOpen(true)} className="has-count"><ShoppingBasket/><span>Basket</span>{cart.count > 0 && <b>{Math.min(cart.count, 99)}</b>}</button>
    </nav>
  );
}
