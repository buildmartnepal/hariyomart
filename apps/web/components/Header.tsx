'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  ChevronDown,
  Crosshair,
  LogIn,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useCart } from './CartProvider';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAuth } from './AuthProvider';
import { useMarketLocation } from './LocationProvider';
import { locationPresets } from '@/lib/marketplace';
export function Header() {
  const cart = useCart(),
    auth = useAuth();
  const market = useMarketLocation();
  const [open, setOpen] = useState(false);
  const accountHref =
    auth.user?.role === 'admin'
      ? '/admin/overview'
      : ['farmer', 'vendor'].includes(auth.user?.role || '')
        ? '/farmer/overview'
        : auth.user
          ? '/account/overview'
          : '/login';
  return (
    <header className="header">
      <div className="market-announcement">
        <div className="container announcement-inner">
          <span>Fresh harvests, verified farms and transparent prices across all 7 provinces.</span>
          <div className="header-location">
            <MapPin size={14} />
            <label htmlFor="header-delivery-city">Deliver near</label>
            <select
              id="header-delivery-city"
              value={market.place.name}
              onChange={(event) => market.choosePreset(event.target.value)}
              aria-label="Delivery city"
            >
              {market.place.name === 'Your location' && (
                <option value="Your location">Your location</option>
              )}
              {locationPresets.map((place) => (
                <option key={place.name} value={place.name}>
                  {place.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="container nav">
        <Link href="/" className="brand-link" onClick={() => setOpen(false)}>
          <Image
            className="logo"
            src="/brand/logo.svg"
            alt="Hariyo Mart Nepal"
            width={260}
            height={64}
            priority
          />
        </Link>
        <nav className="navlinks">
          <Link href="/nearby">Nearby</Link>
          <Link href="/shop">Marketplace</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/farmers">Farmers</Link>
          <Link href="/track">Track order</Link>
          <Link href="/blog">Stories</Link>
        </nav>
        <div className="navtools">
          <Link className="seller-top" href="/sell">
            <Store size={16} /> Sell on Hariyo
          </Link>
          <ThemeSwitcher />
          <Link className="icon-btn desktop-tool" href="/shop" aria-label="Search">
            <Search size={19} />
          </Link>
          <Link
            className="icon-btn desktop-tool account-tool"
            href={accountHref}
            aria-label={auth.user ? 'Workspace' : 'Sign in'}
          >
            {auth.user ? <UserRound size={19} /> : <LogIn size={19} />}
          </Link>
          <button
            className="icon-btn cart-icon"
            onClick={() => cart.setOpen(!cart.open)}
            aria-label="Cart"
          >
            <ShoppingCart size={19} />
            {cart.count > 0 && <span className="cart-count">{cart.count}</span>}
          </button>
          <button
            className="icon-btn mobile-menu"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mobile-nav">
          <div className="container">
            <div className="mobile-actions">
              <button className="mobile-locate" onClick={market.locate}>
                <MapPin size={18} />{' '}
                {market.locating ? 'Finding you…' : `Deliver near ${market.place.name}`}
              </button>
              <Link href="/nearby" onClick={() => setOpen(false)}>
                <Crosshair size={18} /> Find nearby food
              </Link>
              <Link href="/sell" onClick={() => setOpen(false)}>
                <Store size={18} /> Sell on Hariyo
              </Link>
            </div>
            {auth.user ? (
              <Link href={accountHref} onClick={() => setOpen(false)}>
                {auth.user.name} · {auth.user.role} workspace <span>→</span>
              </Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in / register <span>→</span>
              </Link>
            )}
            <Link href="/shop" onClick={() => setOpen(false)}>
              Marketplace <span>→</span>
            </Link>
            <Link href="/how-it-works" onClick={() => setOpen(false)}>
              How it works <span>→</span>
            </Link>
            <Link href="/farmers" onClick={() => setOpen(false)}>
              Farmers <span>→</span>
            </Link>
            <Link href="/track" onClick={() => setOpen(false)}>
              Track order <span>→</span>
            </Link>
            <Link href="/blog" onClick={() => setOpen(false)}>
              Stories <span>→</span>
            </Link>
            {auth.user && (
              <button
                className="mobile-signout"
                onClick={() => {
                  auth.logout();
                  setOpen(false);
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
