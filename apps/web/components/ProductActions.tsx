'use client';

import { Heart, Scale } from 'lucide-react';
import { useProductExperience } from './ProductExperienceProvider';

export function ProductActions({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const experience = useProductExperience();
  const saved = experience.isSaved(slug);
  const compared = experience.isCompared(slug);
  const busy = experience.savedBusy.includes(slug);
  return (
    <div className={`product-experience-actions${compact ? ' is-compact' : ''}`}>
      <button
        type="button"
        className={saved ? 'is-active' : ''}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); void experience.toggleSaved(slug); }}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved products' : 'Save product'}
        disabled={busy}
      >
        <Heart size={compact ? 16 : 18} fill={saved ? 'currentColor' : 'none'} />
        {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
      </button>
      <button
        type="button"
        className={compared ? 'is-active' : ''}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); experience.toggleCompare(slug); }}
        aria-pressed={compared}
        aria-label={compared ? 'Remove from comparison' : 'Compare product'}
      >
        <Scale size={compact ? 16 : 18} />
        {!compact && <span>{compared ? 'Comparing' : 'Compare'}</span>}
      </button>
    </div>
  );
}
