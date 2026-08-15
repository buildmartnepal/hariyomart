import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { catalog } from '@/lib/catalog';
import { LiveProductGrid } from '@/components/LiveProductGrid';
export function generateStaticParams() {
  return catalog.provinces.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = catalog.provinces.find((x) => x.slug === slug);
  return p ? { title: `Organic products from ${p.name}`, description: p.description } : {};
}
export default async function Province({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = catalog.provinces.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs">Home / Provinces / {p.name}</div>
          <span className="eyebrow">Province marketplace</span>
          <h1>{p.name}</h1>
          <p className="section-copy">
            {p.description}. Featured collection point: {p.district}. Location-aware checkout can
            show district-level delivery windows and charges.
          </p>
          <span className="pill">Specialty: {p.specialty}</span>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <LiveProductGrid province={slug} limit={100} />
        </div>
      </section>
    </main>
  );
}
