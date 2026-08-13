import { catalog } from '@/data/catalog';
export const origins: Record<string, { farm: string; city: string; lat: number; lng: number }> = {
  koshi: { farm: 'Koshi Farmer Network', city: 'Biratnagar / Ilam', lat: 26.4525, lng: 87.2718 },
  madhesh: { farm: 'Janakpur Natural Growers', city: 'Janakpur', lat: 26.7271, lng: 85.9407 },
  bagmati: { farm: 'Kathmandu Valley Farm', city: 'Kathmandu', lat: 27.7286, lng: 85.4031 },
  gandaki: { farm: 'Pokhara Hillside Growers', city: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  lumbini: { farm: 'Rupandehi Green Basket', city: 'Butwal', lat: 27.7006, lng: 83.4484 },
  karnali: { farm: 'Jumla Heritage Harvest', city: 'Jumla', lat: 29.2747, lng: 82.1838 },
  sudurpashchim: {
    farm: 'Dhangadhi Natural Produce',
    city: 'Dhangadhi',
    lat: 28.695,
    lng: 80.5938,
  },
};
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371,
    rad = (d: number) => (d * Math.PI) / 180,
    dLat = rad(lat2 - lat1),
    dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function nearProducts(lat: number, lng: number, radius = 150) {
  return catalog.products
    .map((p) => {
      const o = origins[p.province] || origins.bagmati;
      return { ...p, farmName: o.farm, distanceKm: distanceKm(lat, lng, o.lat, o.lng) };
    })
    .filter((p) => p.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
