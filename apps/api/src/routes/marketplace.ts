import { Router } from 'express';
import catalog from '../data/catalog.json' with { type: 'json' };
import { Product } from '../models/Product.js';
import { Farm } from '../models/Farm.js';
import { Tenant } from '../models/Tenant.js';
import { haversineKm, seedOrigins } from '../services/geo.js';
export const marketplaceRouter = Router();
marketplaceRouter.get('/nearby', async (req, res) => {
  const lat = Number(req.query.lat),
    lng = Number(req.query.lng),
    radiusKm = Math.min(Math.max(Number(req.query.radiusKm || 150), 1), 1000),
    category = String(req.query.category || 'all'),
    limit = Math.min(Number(req.query.limit || 40), 100);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return res.status(400).json({ error: 'lat and lng are required' });
  if (process.env.MONGODB_URI) {
    const filter: any = {
      isActive: true,
      status: 'active',
      origin: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    };
    if (category !== 'all') filter.category = category;
    const products = await Product.find(filter)
      .limit(limit * 2)
      .lean();
    const farmIds = [...new Set(products.map((p: any) => String(p.farmId || '')).filter(Boolean))];
    const farmDocs = await Farm.find({ _id: { $in: farmIds } })
      .select('_id name slug verificationStatus serviceRadiusKm')
      .lean();
    const farmMap = new Map(farmDocs.map((f: any) => [String(f._id), f]));
    const data = products
      .map((p: any) => {
        const distance =
          p.origin?.coordinates?.length === 2
            ? Number(
                haversineKm(lat, lng, p.origin.coordinates[1], p.origin.coordinates[0]).toFixed(1),
              )
            : null;
        const farm: any = farmMap.get(String(p.farmId || ''));
        const serviceRadius = Math.min(
          Number(p.deliveryRadiusKm || 1000),
          Number(farm?.serviceRadiusKm || 1000),
        );
        return {
          ...p,
          farmName: farm?.name || 'Hariyo farmer',
          farmSlug: farm?.slug,
          farmerVerified: farm?.verificationStatus === 'verified',
          distanceKm: distance,
          serviceRadiusKm: serviceRadius,
        };
      })
      .filter((p: any) => p.distanceKm == null || p.distanceKm <= p.serviceRadiusKm)
      .slice(0, limit);
    return res.json({ data, center: { lat, lng }, radiusKm, source: 'database' });
  }
  const data = (catalog.products as any[])
    .filter((p) => category === 'all' || p.category === category)
    .map((p) => {
      const o = seedOrigins[p.province] || seedOrigins.bagmati;
      return {
        ...p,
        farmName: o.farm,
        originName: o.name,
        lat: o.lat,
        lng: o.lng,
        distanceKm: Number(haversineKm(lat, lng, o.lat, o.lng).toFixed(1)),
      };
    })
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
  return res.json({ data, center: { lat, lng }, radiusKm, source: 'seed' });
});
marketplaceRouter.get('/farms', async (req, res) => {
  const lat = Number(req.query.lat),
    lng = Number(req.query.lng),
    radiusKm = Math.min(Math.max(Number(req.query.radiusKm || 150), 1), 1000);
  if (process.env.MONGODB_URI) {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const farmRows = await Farm.find({
        'location.geo': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000,
          },
        },
        verificationStatus: 'verified',
      })
        .limit(50)
        .lean();
      const data = farmRows.map((f: any) => {
        const c = f.location?.geo?.coordinates;
        return {
          ...f,
          distanceKm:
            Array.isArray(c) && c.length === 2
              ? Number(haversineKm(lat, lng, c[1], c[0]).toFixed(1))
              : null,
        };
      });
      return res.json({ data, source: 'database' });
    }
    return res.json({
      data: await Farm.find({ verificationStatus: 'verified' })
        .sort({ rating: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      source: 'database',
    });
  }
  const data = Object.entries(seedOrigins)
    .map(([province, o]) => ({
      province,
      name: o.farm,
      locationName: o.name,
      lat: o.lat,
      lng: o.lng,
      distanceKm:
        Number.isFinite(lat) && Number.isFinite(lng)
          ? Number(haversineKm(lat, lng, o.lat, o.lng).toFixed(1))
          : null,
      verificationStatus: 'verified',
    }))
    .filter((x: any) => x.distanceKm == null || x.distanceKm <= radiusKm)
    .sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return res.json({ data, source: 'seed' });
});
marketplaceRouter.get('/farms/:slug', async (req, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(404).json({ error: 'Live farm not found in seed API' });
  const farm: any = await Farm.findOne({
    slug: req.params.slug,
    verificationStatus: 'verified',
  }).lean();
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  const [tenant, products] = await Promise.all([
    Tenant.findById(farm.tenantId).select('ownerName specialties delivery status').lean(),
    Product.find({ farmId: farm._id, isActive: true, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);
  return res.json({
    farm: {
      ...farm,
      ownerName: (tenant as any)?.ownerName,
      specialties: (tenant as any)?.specialties || farm.productionTypes,
      delivery: (tenant as any)?.delivery,
    },
    products,
    source: 'database',
  });
});
marketplaceRouter.post('/delivery-quote', (req, res) => {
  const { buyerLat, buyerLng, sellerLat, sellerLng, subtotal = 0 } = req.body;
  const values = [buyerLat, buyerLng, sellerLat, sellerLng].map(Number);
  if (values.some((v) => !Number.isFinite(v)))
    return res.status(400).json({ error: 'Buyer and seller coordinates are required' });
  const distance = Number(haversineKm(values[0], values[1], values[2], values[3]).toFixed(1));
  const serviceable = distance <= 300;
  const fee = !serviceable
    ? null
    : Number(
        (Number(subtotal) >= 3000
          ? Math.max(0, distance - 15) * 7
          : 120 + Math.max(0, distance - 10) * 8
        ).toFixed(0),
      );
  res.json({
    distanceKm: distance,
    serviceable,
    fee,
    estimatedHours: distance <= 20 ? '2–6' : distance <= 80 ? '12–24' : '24–72',
    recommendedMethod:
      distance <= 35 ? 'local_delivery' : distance <= 300 ? 'intercity' : 'unavailable',
  });
});
