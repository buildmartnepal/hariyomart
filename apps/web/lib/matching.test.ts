import { describe, expect, it } from 'vitest';
import { rankMarketplaceProducts, scoreMarketplaceProduct } from './matching';

const buyer = { lat: 27.7172, lng: 85.324, radiusKm: 40 };
const base = {
  slug: 'base',
  name: 'Fresh Tomato',
  category: 'vegetables',
  district: 'Kathmandu',
  price: 120,
  stock: 25,
  rating: 4.7,
  organic: true,
  farmerVerified: true,
  featured: false,
  wholesale: true,
  subscription: false,
  lat: 27.72,
  lng: 85.33,
  deliveryRadiusKm: 30,
  harvestWindow: 'Harvested this week',
};

describe('Hariyo Match v3', () => {
  it('ranks a close, fresh, verified product above a distant alternative', () => {
    const ranked = rankMarketplaceProducts([
      { ...base, slug: 'near' },
      { ...base, slug: 'far', lat: 27.95, lng: 85.55, rating: 4.2, farmerVerified: false },
    ], buyer);
    expect(ranked[0]?.slug).toBe('near');
    expect(ranked[0]?.matchScore).toBeGreaterThan(ranked[1]?.matchScore ?? 0);
  });

  it('excludes products outside the seller delivery radius', () => {
    const scored = scoreMarketplaceProduct({ ...base, deliveryRadiusKm: 1, lat: 27.8, lng: 85.4 }, buyer);
    expect(scored.serviceable).toBe(false);
    expect(scored.matchScore).toBe(0);
  });

  it('respects buyer intent and hard filters', () => {
    const ranked = rankMarketplaceProducts([
      { ...base, slug: 'tomato' },
      { ...base, slug: 'apple', name: 'Mustang Apple', category: 'fresh-fruits' },
    ], { ...buyer, category: 'vegetables', query: 'tomato', organicOnly: true });
    expect(ranked.map((item) => item.slug)).toEqual(['tomato']);
    expect(ranked[0]?.matchReasons).toContain('Category match');
  });
});
