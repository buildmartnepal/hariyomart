export const seedOrigins: Record<string, { name: string; lat: number; lng: number; farm: string }> =
  {
    koshi: {
      name: 'Biratnagar / Ilam network',
      lat: 26.4525,
      lng: 87.2718,
      farm: 'Koshi Farmer Network',
    },
    madhesh: { name: 'Janakpur', lat: 26.7271, lng: 85.9407, farm: 'Janakpur Natural Growers' },
    bagmati: {
      name: 'Kathmandu Valley',
      lat: 27.7286,
      lng: 85.4031,
      farm: 'Kathmandu Valley Farm',
    },
    gandaki: { name: 'Pokhara', lat: 28.2096, lng: 83.9856, farm: 'Pokhara Hillside Growers' },
    lumbini: { name: 'Butwal', lat: 27.7006, lng: 83.4484, farm: 'Rupandehi Green Basket' },
    karnali: { name: 'Jumla', lat: 29.2747, lng: 82.1838, farm: 'Jumla Heritage Harvest' },
    sudurpashchim: {
      name: 'Dhangadhi',
      lat: 28.695,
      lng: 80.5938,
      farm: 'Dhangadhi Natural Produce',
    },
  };
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371,
    rad = (d: number) => (d * Math.PI) / 180,
    dLat = rad(lat2 - lat1),
    dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
