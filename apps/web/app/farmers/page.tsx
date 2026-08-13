import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, MapPin, Truck } from 'lucide-react';
import { farms, type Farm } from '@/lib/marketplace';
export const metadata: Metadata = {
  title: 'Verified Farmers & Local Producers',
  description:
    'Discover farmer stores across Nepal and shop products by farm, province and delivery location.',
};
async function getFarms(): Promise<Farm[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return farms;
  try {
    const r = await fetch(`${api}/marketplace/farms`, { cache: 'no-store' });
    if (!r.ok) return farms;
    const d = (await r.json()) as { data?: any[] };
    if (!Array.isArray(d.data) || !d.data.length) return farms;
    return d.data.map((x: any) => {
      const c = x.location?.geo?.coordinates;
      return {
        slug: x.slug,
        name: x.name,
        owner: 'Hariyo farmer',
        province: x.location?.province || 'bagmati',
        district: x.location?.district || 'Nepal',
        municipality: x.location?.municipality || x.location?.district || 'Nepal',
        lat: Array.isArray(c) ? Number(c[1]) : 0,
        lng: Array.isArray(c) ? Number(c[0]) : 0,
        verified: x.verificationStatus === 'verified',
        rating: Number(x.rating || 4.8),
        story: x.story || `${x.name} is a verified seller on Hariyo Mart Nepal.`,
        specialties: x.productionTypes || [],
        deliveryRadiusKm: Number(x.serviceRadiusKm || 35),
        pickup: x.pickup !== false,
        sameDay: !!x.sameDay,
        badge: 'Verified farmer',
      } as Farm;
    });
  } catch {
    return farms;
  }
}
export default async function Farmers() {
  const items = await getFarms();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Farmer store network</span>
          <h1>Know exactly who grew it.</h1>
          <p className="section-copy">
            Each verified seller has a separate Hariyo Store with their own farm story, location,
            products, service radius and buyer rating.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="farmer-directory">
            {items.map((f) => (
              <Link href={`/farmers/${f.slug}`} className="farm-directory-card" key={f.slug}>
                <div className="farm-cover">
                  <span>
                    {f.specialties[0]?.includes('Tea')
                      ? '🍃'
                      : f.specialties[0]?.includes('Honey')
                        ? '🍯'
                        : '🌱'}
                  </span>
                  <em>{f.badge}</em>
                </div>
                <div className="farm-dir-body">
                  <div className="farm-title">
                    <h2>{f.name}</h2>
                    {f.verified && <BadgeCheck />}
                  </div>
                  <p>{f.story}</p>
                  <div className="farm-dir-meta">
                    <span>
                      <MapPin /> {f.municipality}, {f.district}
                    </span>
                    <span>
                      <Truck /> {f.deliveryRadiusKm} km delivery
                    </span>
                    <span>★ {f.rating}</span>
                  </div>
                  <b>Visit farmer store →</b>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
