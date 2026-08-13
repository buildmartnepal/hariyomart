import 'dotenv/config';
import mongoose from 'mongoose';
import catalog from './data/catalog.json' with { type: 'json' };
import { Product } from './models/Product.js';
import { Tenant } from './models/Tenant.js';
import { Farm } from './models/Farm.js';
import { seedOrigins } from './services/geo.js';
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([Product.deleteMany({}), Farm.deleteMany({}), Tenant.deleteMany({})]);
const provinceNames: Record<string, string> = {
  koshi: 'Koshi Farmer Network',
  madhesh: 'Janakpur Natural Growers',
  bagmati: 'Kathmandu Valley Farm',
  gandaki: 'Pokhara Hillside Growers',
  lumbini: 'Rupandehi Green Basket',
  karnali: 'Jumla Heritage Harvest',
  sudurpashchim: 'Dhangadhi Natural Produce',
};
const farmMap = new Map<
  string,
  { tenantId: mongoose.Types.ObjectId; farmId: mongoose.Types.ObjectId }
>();
for (const province of catalog.provinces) {
  const o = seedOrigins[province.slug];
  const tenant = await Tenant.create({
    name: provinceNames[province.slug],
    slug: `${province.slug}-farmer-network`,
    type: 'cooperative',
    status: 'verified',
    plan: 'cooperative',
    location: {
      province: province.slug,
      district: province.district,
      municipality: o.name,
      geo: { type: 'Point', coordinates: [o.lng, o.lat] },
    },
    delivery: { radiusKm: 150, pickup: true, localDelivery: true, nationwide: true },
    specialties: [province.specialty],
    verifiedAt: new Date(),
  });
  const farm = await Farm.create({
    tenantId: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    story: province.description,
    productionTypes: [province.specialty],
    location: {
      province: province.slug,
      district: province.district,
      municipality: o.name,
      geo: { type: 'Point', coordinates: [o.lng, o.lat] },
    },
    serviceRadiusKm: 150,
    pickup: true,
    sameDay: province.slug === 'bagmati' || province.slug === 'madhesh',
    verificationStatus: 'verified',
    rating: 4.8,
    ratingCount: 24,
  });
  farmMap.set(province.slug, { tenantId: tenant._id, farmId: farm._id });
}
const products = catalog.products.map((p: any) => {
  const ids = farmMap.get(p.province)!;
  const o = seedOrigins[p.province];
  return {
    ...p,
    tenantId: ids.tenantId,
    farmId: ids.farmId,
    origin: { type: 'Point', coordinates: [o.lng, o.lat] },
    minimumOrder: 1,
    harvestWindow: ['vegetables', 'leafy-greens', 'fresh-fruits'].includes(p.category)
      ? 'Harvested within 24–48h'
      : 'Fresh batch',
    saleChannels: {
      retail: true,
      wholesale: true,
      subscription: ['vegetables', 'leafy-greens', 'dairy'].includes(p.category),
    },
    deliveryRadiusKm: 150,
    pickupAvailable: true,
    status: 'active',
    isActive: true,
  };
});
await Product.insertMany(products);
console.log(`Seeded ${products.length} products across ${farmMap.size} multi-tenant farmer stores`);
await mongoose.disconnect();
