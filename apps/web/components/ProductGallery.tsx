'use client';
import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';

function uniqueImages(primary: string, images?: readonly string[]) {
  return Array.from(new Set([primary, ...(images || [])].filter(Boolean))).slice(0, 8);
}

export function ProductGallery({ name, primary, images, priority = false }: { name: string; primary: string; images?: readonly string[]; priority?: boolean }) {
  const list = useMemo(() => uniqueImages(primary, images), [primary, images]);
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const current = list[Math.min(active, list.length - 1)] || primary;
  const move = (delta: number) => {
    if (list.length <= 1) return;
    setActive((index) => (index + delta + list.length) % list.length);
  };
  return <div className="product-gallery-v85">
    <div
      className="product-gallery-stage"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${name} product photos`}
      tabIndex={list.length > 1 ? 0 : -1}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1); }}
      onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) >= 42) move(delta > 0 ? -1 : 1);
      }}
    >
      <Image src={current} alt={`${name} photo ${active + 1}`} width={1000} height={780} sizes="(max-width: 860px) 100vw, 52vw" priority={priority} />
      {list.length > 1 && <>
        <button type="button" className="gallery-arrow is-prev" onClick={() => move(-1)} aria-label="Previous product photo"><ChevronLeft /></button>
        <button type="button" className="gallery-arrow is-next" onClick={() => move(1)} aria-label="Next product photo"><ChevronRight /></button>
        <span className="gallery-count" aria-live="polite"><Images size={14}/>{active + 1}/{list.length}</span>
      </>}
    </div>
    {list.length > 1 && <div className="product-gallery-thumbs" aria-label="Product photos">
      {list.map((src, index) => <button type="button" key={`${src}-${index}`} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`View photo ${index + 1}`}>
        <Image src={src} alt="" width={110} height={88} />
      </button>)}
    </div>}
  </div>;
}

export function ProductCardGallery({ name, slug, primary, images }: { name: string; slug: string; primary: string; images?: readonly string[] }) {
  const list = useMemo(() => uniqueImages(primary, images), [primary, images]);
  const [active, setActive] = useState(0);
  const current = list[Math.min(active, list.length - 1)] || primary;
  const move = (delta: number) => setActive((index) => (index + delta + list.length) % list.length);
  return <div className="product-card-gallery">
    <Link className="product-card-gallery-link" href={`/products/${slug}`} aria-label={`View ${name}`}>
      <Image className="product-image" src={current} alt={name} width={800} height={800} sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 20vw" />
    </Link>
    {list.length > 1 && <>
      <button className="card-gallery-arrow is-prev" type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={16}/></button>
      <button className="card-gallery-arrow is-next" type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={16}/></button>
      <div className="card-gallery-dots" aria-hidden="true">{list.slice(0,5).map((_, i) => <span className={i === active ? 'is-active' : ''} key={i}/>)}</div>
    </>}
  </div>;
}
