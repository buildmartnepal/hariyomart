import type { Metadata } from 'next';
import { SavedBasketsClient } from '@/components/SavedBasketsClient';
export const metadata: Metadata = { title: 'Saved Baskets | Hariyo Mart Nepal', robots: { index: false, follow: false } };
export default function SavedBasketsPage(){ return <main><section className="page-hero"><div className="container"><span className="eyebrow">Repeat purchase center</span><h1>Save a basket once. Rebuild it in one tap.</h1><p className="section-copy">Useful for weekly vegetables, office fruit, restaurant supplies and household staples.</p></div></section><section className="section"><div className="container"><SavedBasketsClient/></div></section></main>; }
