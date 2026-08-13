import { catalog, type Product } from './catalog';

export type Farm = {
  slug: string;
  name: string;
  owner: string;
  province: string;
  district: string;
  municipality: string;
  lat: number;
  lng: number;
  verified: boolean;
  rating: number;
  story: string;
  specialties: string[];
  deliveryRadiusKm: number;
  pickup: boolean;
  sameDay: boolean;
  badge: string;
};

export const farms: Farm[] = [
  {
    slug: 'ilam-hills-organic',
    name: 'Ilam Hills Organic Farm',
    owner: 'Maya Rai',
    province: 'koshi',
    district: 'Ilam',
    municipality: 'Suryodaya',
    lat: 26.9115,
    lng: 88.0495,
    verified: true,
    rating: 4.9,
    story: 'Tea, ginger, cardamom and seasonal hill produce grown by a family cooperative in Ilam.',
    specialties: ['Orthodox Tea', 'Ginger', 'Cardamom'],
    deliveryRadiusKm: 85,
    pickup: true,
    sameDay: true,
    badge: 'Hill-grown',
  },
  {
    slug: 'morang-fresh-field',
    name: 'Morang Fresh Field',
    owner: 'Bikash Chaudhary',
    province: 'koshi',
    district: 'Morang',
    municipality: 'Biratnagar',
    lat: 26.4525,
    lng: 87.2718,
    verified: true,
    rating: 4.8,
    story:
      'Lowland vegetables and grains harvested for local homes, hotels and institutional kitchens.',
    specialties: ['Vegetables', 'Rice', 'Mustard'],
    deliveryRadiusKm: 70,
    pickup: true,
    sameDay: true,
    badge: 'Daily harvest',
  },
  {
    slug: 'janakpur-natural-growers',
    name: 'Janakpur Natural Growers',
    owner: 'Sita Mahato',
    province: 'madhesh',
    district: 'Dhanusha',
    municipality: 'Janakpurdham',
    lat: 26.7271,
    lng: 85.9407,
    verified: true,
    rating: 4.8,
    story: 'Madhesh fruits, lentils and year-round vegetables grown with water-smart practices.',
    specialties: ['Mango', 'Lentils', 'Vegetables'],
    deliveryRadiusKm: 90,
    pickup: true,
    sameDay: true,
    badge: 'Terai fresh',
  },
  {
    slug: 'kathmandu-valley-farm',
    name: 'Kathmandu Valley Farm',
    owner: 'Ramesh Shrestha',
    province: 'bagmati',
    district: 'Kathmandu',
    municipality: 'Kageshwori Manohara',
    lat: 27.7286,
    lng: 85.4031,
    verified: true,
    rating: 4.9,
    story:
      'Leafy greens, mushrooms and everyday vegetables supplied directly into the Kathmandu Valley.',
    specialties: ['Leafy Greens', 'Mushroom', 'Dairy'],
    deliveryRadiusKm: 35,
    pickup: true,
    sameDay: true,
    badge: 'Same-day valley',
  },
  {
    slug: 'chitwan-community-farm',
    name: 'Chitwan Community Farm',
    owner: 'Kamala Gurung',
    province: 'bagmati',
    district: 'Chitwan',
    municipality: 'Bharatpur',
    lat: 27.6766,
    lng: 84.4356,
    verified: true,
    rating: 4.7,
    story:
      'A farmer group producing vegetables, dairy and grains with shared collection and cold handling.',
    specialties: ['Vegetables', 'Dairy', 'Maize'],
    deliveryRadiusKm: 65,
    pickup: true,
    sameDay: true,
    badge: 'Co-op verified',
  },
  {
    slug: 'pokhara-hillside-growers',
    name: 'Pokhara Hillside Growers',
    owner: 'Nabin Gurung',
    province: 'gandaki',
    district: 'Kaski',
    municipality: 'Pokhara',
    lat: 28.2096,
    lng: 83.9856,
    verified: true,
    rating: 4.9,
    story: 'Hill vegetables, honey, beans and orchard products aggregated around Pokhara.',
    specialties: ['Honey', 'Beans', 'Fruit'],
    deliveryRadiusKm: 75,
    pickup: true,
    sameDay: true,
    badge: 'Pokhara local',
  },
  {
    slug: 'mustang-orchard-collective',
    name: 'Mustang Orchard Collective',
    owner: 'Tsering Gurung',
    province: 'gandaki',
    district: 'Mustang',
    municipality: 'Gharapjhong',
    lat: 28.7829,
    lng: 83.7306,
    verified: true,
    rating: 4.9,
    story: 'High-altitude apples, buckwheat and herbs from small orchards and farms in Mustang.',
    specialties: ['Apple', 'Buckwheat', 'Herbs'],
    deliveryRadiusKm: 120,
    pickup: true,
    sameDay: false,
    badge: 'High altitude',
  },
  {
    slug: 'rupandehi-green-basket',
    name: 'Rupandehi Green Basket',
    owner: 'Sarita Tharu',
    province: 'lumbini',
    district: 'Rupandehi',
    municipality: 'Butwal',
    lat: 27.7006,
    lng: 83.4484,
    verified: true,
    rating: 4.8,
    story:
      'Grains, mustard products and vegetables serving Butwal, Bhairahawa and nearby municipalities.',
    specialties: ['Mustard', 'Grains', 'Vegetables'],
    deliveryRadiusKm: 80,
    pickup: true,
    sameDay: true,
    badge: 'Local basket',
  },
  {
    slug: 'jumla-heritage-harvest',
    name: 'Jumla Heritage Harvest',
    owner: 'Kali Bahadur Rokaya',
    province: 'karnali',
    district: 'Jumla',
    municipality: 'Chandannath',
    lat: 29.2747,
    lng: 82.1838,
    verified: true,
    rating: 5,
    story: 'Marshi rice, beans, walnuts and mountain herbs sold with batch and village origin.',
    specialties: ['Marshi Rice', 'Beans', 'Walnut'],
    deliveryRadiusKm: 160,
    pickup: true,
    sameDay: false,
    badge: 'Heritage crop',
  },
  {
    slug: 'nepalgunj-farmer-hub',
    name: 'Nepalgunj Farmer Hub',
    owner: 'Asha Bista',
    province: 'lumbini',
    district: 'Banke',
    municipality: 'Nepalgunj',
    lat: 28.05,
    lng: 81.6167,
    verified: true,
    rating: 4.7,
    story:
      'A western Nepal collection hub connecting small farms with households and wholesale buyers.',
    specialties: ['Vegetables', 'Grains', 'Honey'],
    deliveryRadiusKm: 95,
    pickup: true,
    sameDay: true,
    badge: 'Collection hub',
  },
  {
    slug: 'dhangadhi-natural-produce',
    name: 'Dhangadhi Natural Produce',
    owner: 'Hari Rana',
    province: 'sudurpashchim',
    district: 'Kailali',
    municipality: 'Dhangadhi',
    lat: 28.695,
    lng: 80.5938,
    verified: true,
    rating: 4.8,
    story:
      'Millet, citrus, honey and traditional crops grown across Kailali and nearby hill districts.',
    specialties: ['Millet', 'Honey', 'Citrus'],
    deliveryRadiusKm: 100,
    pickup: true,
    sameDay: true,
    badge: 'Far-west fresh',
  },
];

export const locationPresets = [
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  { name: 'Biratnagar', lat: 26.4525, lng: 87.2718 },
  { name: 'Janakpur', lat: 26.7271, lng: 85.9407 },
  { name: 'Bharatpur', lat: 27.6766, lng: 84.4356 },
  { name: 'Butwal', lat: 27.7006, lng: 83.4484 },
  { name: 'Nepalgunj', lat: 28.05, lng: 81.6167 },
  { name: 'Dhangadhi', lat: 28.695, lng: 80.5938 },
  { name: 'Jumla', lat: 29.2747, lng: 82.1838 },
] as const;

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1),
    dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function farmForProduct(product: Product) {
  const live = product as Product & {
    farmName?: string;
    farmSlug?: string;
    farmerVerified?: boolean;
    deliveryRadiusKm?: number;
    municipality?: string;
    lat?: number;
    lng?: number;
  };
  if (live.farmName)
    return {
      slug:
        live.farmSlug ||
        `seller-${product.province}-${product.district}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      name: live.farmName,
      owner: 'Hariyo seller',
      province: product.province,
      district: product.district,
      municipality: live.municipality || product.district,
      lat: Number.isFinite(live.lat)
        ? Number(live.lat)
        : farms.find((f) => f.province === product.province)?.lat || 0,
      lng: Number.isFinite(live.lng)
        ? Number(live.lng)
        : farms.find((f) => f.province === product.province)?.lng || 0,
      verified: live.farmerVerified !== false,
      rating: product.rating || 4.8,
      story: 'Independent Hariyo Mart farmer store with traceable marketplace inventory.',
      specialties: [product.name],
      deliveryRadiusKm: Number(live.deliveryRadiusKm || 35),
      pickup: true,
      sameDay: Number(live.deliveryRadiusKm || 35) <= 35,
      badge: 'Live farmer',
    };
  const sameDistrict = farms.find(
    (f) =>
      f.province === product.province &&
      f.district.toLowerCase() === product.district.toLowerCase(),
  );
  return sameDistrict || farms.find((f) => f.province === product.province) || farms[0];
}

export function marketplaceProduct(product: Product) {
  const farm = farmForProduct(product);
  return {
    ...product,
    farm,
    lat: farm.lat,
    lng: farm.lng,
    minimumOrder: 1,
    harvestWindow:
      product.category.includes('fresh') ||
      product.category.includes('vegetable') ||
      product.category === 'leafy-greens'
        ? 'Harvested within 24–48h'
        : 'Fresh batch',
    sellerType: 'Farmer tenant',
  };
}

export function nearbyProducts(lat: number, lng: number, radiusKm = 150) {
  return catalog.products
    .map(marketplaceProduct)
    .map((p) => ({ ...p, distanceKm: distanceKm(lat, lng, p.lat, p.lng) }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
