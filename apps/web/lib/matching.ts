export type MatchPreferences = {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
  query?: string;
  organicOnly?: boolean;
  wholesaleOnly?: boolean;
  subscriptionOnly?: boolean;
  maxPrice?: number;
};

export type MatchableProduct = {
  slug: string;
  name: string;
  category: string;
  district?: string;
  price: number;
  stock: number;
  rating?: number;
  organic?: boolean;
  featured?: boolean;
  wholesale?: boolean;
  subscription?: boolean;
  farmerVerified?: boolean;
  lat: number;
  lng: number;
  deliveryRadiusKm?: number;
  harvestDate?: string | null;
  harvestWindow?: string | null;
  shortDescription?: string | null;
  farmName?: string | null;
};

const freshCategories = new Set(['leafy-greens', 'vegetables', 'fresh-fruits', 'dairy']);
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function freshnessScore(product: MatchableProduct, nowMs: number) {
  if (product.harvestDate) {
    const harvest = Date.parse(product.harvestDate);
    if (Number.isFinite(harvest)) {
      const days = Math.max(0, (nowMs - harvest) / 86400000);
      return clamp(15 - days * 2.2, 2, 15);
    }
  }
  if (freshCategories.has(product.category)) return product.harvestWindow ? 12 : 9;
  return product.harvestWindow ? 8 : 5;
}

export function scoreMarketplaceProduct<T extends MatchableProduct>(product: T, prefs: MatchPreferences, nowMs = Date.now()) {
  const radius = Math.max(1, prefs.radiusKm || 150);
  const deliveryRadius = Math.max(1, Number(product.deliveryRadiusKm || radius));
  const serviceRadius = Math.min(radius, deliveryRadius);
  const distanceKm = haversineKm(prefs.lat, prefs.lng, product.lat, product.lng);
  const query = (prefs.query || '').trim().toLowerCase();
  const category = prefs.category && prefs.category !== 'all' ? prefs.category : '';
  const searchable = `${product.name} ${product.category} ${product.district || ''} ${product.shortDescription || ''} ${product.farmName || ''}`.toLowerCase();
  const eligible = product.stock > 0 && distanceKm <= serviceRadius && (!category || product.category === category)
    && (!query || searchable.includes(query))
    && (!prefs.organicOnly || !!product.organic)
    && (!prefs.wholesaleOnly || !!product.wholesale)
    && (!prefs.subscriptionOnly || !!product.subscription)
    && (!prefs.maxPrice || product.price <= prefs.maxPrice);

  const distanceScore = clamp(30 * (1 - distanceKm / Math.max(serviceRadius, 1)), 0, 30);
  const stockScore = clamp(6 + Math.log10(Math.max(1, product.stock)) * 4.5, 0, 15);
  const freshScore = freshnessScore(product, nowMs);
  const ratingScore = clamp((Number(product.rating || 4.5) / 5) * 12, 0, 12);
  const trustScore = (product.farmerVerified ? 5 : 0) + (product.featured ? 3 : 0);
  const intentScore = query ? (searchable.includes(query) ? 10 : 0) : category ? 9 : 6;
  const qualityScore = (product.organic ? 4 : 0) + (product.wholesale ? 1 : 0) + (product.subscription ? 1 : 0);
  const budgetScore = prefs.maxPrice ? clamp(6 * (1 - product.price / Math.max(1, prefs.maxPrice)) + 2, 0, 6) : 4;
  const score = Math.round(clamp(distanceScore + stockScore + freshScore + ratingScore + trustScore + intentScore + qualityScore + budgetScore));
  const reasons: string[] = [];
  if (distanceKm <= 15) reasons.push('Very close to you'); else if (distanceKm <= serviceRadius * .45) reasons.push('Good delivery fit');
  if (freshScore >= 11) reasons.push('Fresh harvest signal');
  if (product.farmerVerified) reasons.push('Verified seller');
  if (Number(product.rating || 0) >= 4.7) reasons.push('Highly rated');
  if (product.organic) reasons.push('Organic / natural');
  if (product.stock >= 20) reasons.push('Strong live stock');
  if (category && product.category === category) reasons.push('Category match');
  return { ...product, distanceKm: Math.round(distanceKm * 10) / 10, matchScore: eligible ? score : 0, matchReasons: reasons.slice(0, 4), serviceable: eligible };
}

export function rankMarketplaceProducts<T extends MatchableProduct>(products: readonly T[], prefs: MatchPreferences) {
  return products.map((p) => scoreMarketplaceProduct(p, prefs)).filter((p) => p.serviceable).sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
}
