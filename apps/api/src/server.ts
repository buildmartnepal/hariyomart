import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { productsRouter } from './routes/products.js';
import { locationsRouter } from './routes/locations.js';
import { authRouter } from './routes/auth.js';
import { ordersRouter } from './routes/orders.js';
import { tenantsRouter } from './routes/tenants.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { dashboardRouter } from './routes/dashboard.js';
import { accountRouter } from './routes/account.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.get('/health', (_req, res) =>
  res.json({
    service: 'hariyo-api',
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'seed-mode',
    capabilities: [
      'multi-tenant farmers',
      'geo marketplace',
      'multi-seller orders',
      'seller inventory',
    ],
    timestamp: new Date().toISOString(),
  }),
);
app.use('/api/products', productsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/account', accountRouter);
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(Number(err?.status) || 500).json({ error: err?.message || 'Unexpected server error' });
});
const port = Number(process.env.PORT || 4000);
if (process.env.MONGODB_URI)
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((e) =>
      console.error('MongoDB connection failed; API remains available in seed mode', e),
    );
app.listen(port, () => console.log(`Hariyo API listening on http://localhost:${port}`));
