import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import catalog from '../server/data/catalog.json';
import { connectMongo } from '../server/db';
import { Farm, Product, Tenant } from '../server/models';
import { seedOrigins } from '../server/geo';
if (!process.env.MONGODB_URI)
  throw new Error('MONGODB_URI is required. Put it in apps/web/.env.local or your shell.');
await connectMongo();
const provinceNames: Record<string, string> = {
  koshi: 'Koshi Farmer Network',
  madhesh: 'Janakpur Natural Growers',
  bagmati: 'Kathmandu Valley Farm',
  gandaki: 'Pokhara Hillside Growers',
  lumbini: 'Rupandehi Green Basket',
  karnali: 'Jumla Heritage Harvest',
  sudurpashchim: 'Dhangadhi Natural Produce',
};
const farmMap = new Map<string, { tenantId: any; farmId: any }>();
for (const province of catalog.provinces as any[]) {
  const o = seedOrigins[province.slug];
  const tenant: any = await Tenant.findOneAndUpdate(
    { slug: `${province.slug}-farmer-network` },
    {
      $set: {
        name: provinceNames[province.slug],
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
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const farm: any = await Farm.findOneAndUpdate(
    { slug: tenant.slug },
    {
      $set: {
        tenantId: tenant._id,
        name: tenant.name,
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
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  farmMap.set(province.slug, { tenantId: tenant._id, farmId: farm._id });
}
let count = 0;
for (const p of catalog.products as any[]) {
  const ids = farmMap.get(p.province)!;
  const o = seedOrigins[p.province];
  await Product.findOneAndUpdate(
    { slug: p.slug },
    {
      $set: {
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
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  count++;
}
console.log(
  `Hariyo Mart seed complete: ${count} products across ${farmMap.size} verified cooperative tenants.`,
);
process.exit(0);
