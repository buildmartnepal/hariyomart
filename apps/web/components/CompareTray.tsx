'use client';

import Link from 'next/link';
import { Scale, X } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useProductExperience } from './ProductExperienceProvider';

export function CompareTray() {
  const experience = useProductExperience();
  if (!experience.compare.length) return null;
  const names = experience.compare.map((slug) => catalog.products.find((product) => product.slug === slug)?.name || slug);
  return (
    <aside className="compare-tray" aria-label="Product comparison tray">
      <div className="compare-tray-copy">
        <span className="compare-icon"><Scale size={18} /></span>
        <div><b>Compare products</b><span>{names.join(' · ')}</span></div>
      </div>
      <div className="compare-tray-actions">
        <span>{experience.compare.length}/3</span>
        <button type="button" className="compare-clear" onClick={experience.clearCompare} aria-label="Clear comparison"><X size={16}/></button>
        <Link className="btn btn-primary compact-btn" href="/compare">Compare now</Link>
      </div>
    </aside>
  );
}
