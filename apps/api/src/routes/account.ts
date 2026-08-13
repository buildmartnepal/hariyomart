import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

export const accountRouter = Router();
const profile = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  language: z.enum(['en', 'ne']).optional(),
  marketingOptIn: z.boolean().optional(),
});
const address = z.object({
  label: z.string().max(50).default('Home'),
  province: z.string().min(2),
  district: z.string().min(2),
  municipality: z.string().min(2),
  ward: z.string().min(1),
  street: z.string().min(2),
  phone: z.string().min(7),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

accountRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI) return res.json({ profile: null, source: 'demo' });
  const user = await User.findById(req.user?.sub).select('-passwordHash').lean();
  return user
    ? res.json({ profile: user, source: 'database' })
    : res.status(404).json({ error: 'User not found' });
});
accountRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const p = profile.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: 'Invalid profile', details: p.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to update profile' });
  const user = await User.findByIdAndUpdate(req.user?.sub, p.data, {
    new: true,
    runValidators: true,
  })
    .select('-passwordHash')
    .lean();
  return user ? res.json(user) : res.status(404).json({ error: 'User not found' });
});
accountRouter.post('/addresses', requireAuth, async (req: AuthRequest, res) => {
  const p = address.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: 'Invalid address', details: p.error.flatten() });
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to save addresses' });
  const user: any = await User.findById(req.user?.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (p.data.isDefault) for (const a of user.addresses) a.isDefault = false;
  user.addresses.push({
    ...p.data,
    geo:
      p.data.lat != null && p.data.lng != null ? { lat: p.data.lat, lng: p.data.lng } : undefined,
  });
  await user.save();
  return res.status(201).json(user.addresses);
});
accountRouter.delete('/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to manage addresses' });
  const user: any = await User.findById(req.user?.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.addresses.pull({ _id: req.params.id });
  await user.save();
  return res.json(user.addresses);
});
accountRouter.put('/wishlist/:slug', requireAuth, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to manage wishlist' });
  const user: any = await User.findById(req.user?.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.wishlist.includes(req.params.slug)) user.wishlist.push(req.params.slug);
  await user.save();
  return res.json({ wishlist: user.wishlist });
});
accountRouter.delete('/wishlist/:slug', requireAuth, async (req: AuthRequest, res) => {
  if (!process.env.MONGODB_URI)
    return res.status(503).json({ error: 'Connect MongoDB to manage wishlist' });
  const user: any = await User.findById(req.user?.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.wishlist = user.wishlist.filter((x: string) => x !== req.params.slug);
  await user.save();
  return res.json({ wishlist: user.wishlist });
});
