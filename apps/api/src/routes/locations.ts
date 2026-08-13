import { Router } from 'express';
import catalog from '../data/catalog.json' with { type: 'json' };
export const locationsRouter = Router();
locationsRouter.get('/provinces', (_req, res) => res.json(catalog.provinces));
locationsRouter.get('/provinces/:slug/products', (req, res) =>
  res.json((catalog.products as any[]).filter((p) => p.province === req.params.slug)),
);
locationsRouter.post('/delivery-quote', (req, res) => {
  const { province, district, subtotal = 0 } = req.body;
  const fee = Number(subtotal) >= 2500 ? 0 : province === 'bagmati' ? 120 : 220;
  res.json({
    province,
    district,
    serviceable: true,
    fee,
    estimatedDays: province === 'bagmati' ? 1 : 3,
  });
});
