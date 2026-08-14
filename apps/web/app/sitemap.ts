import type { MetadataRoute } from 'next';
import { catalog } from '@/lib/catalog';
import { farms } from '@/lib/marketplace';
const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://hariyomart.example';
export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = [
    '',
    'shop',
    'nearby',
    'sell',
    'how-it-works',
    'farmers',
    'blog',
    'campaigns',
    'info/about',
    'info/contact',
    'info/farmers',
    'info/subscriptions',
    'info/bulk-orders',
    'info/sustainability',
    'info/faq',
  ];
  return [
    ...fixed.map((path) => ({
      url: `${base}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : path === 'nearby' || path === 'sell' ? 0.9 : 0.7,
    })),
    ...catalog.products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...catalog.categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...catalog.provinces.map((p) => ({
      url: `${base}/provinces/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
    ...farms.map((f) => ({
      url: `${base}/farmers/${f.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.78,
    })),
  ];
}
