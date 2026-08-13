import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
export function generateStaticParams() {
  return catalog.categories.map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = catalog.categories.find((x) => x.slug === slug);
  return c ? { title: `${c.name} in Nepal`, description: c.description } : {};
}
export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = catalog.categories.find((x) => x.slug === slug);
  if (!c) notFound();
  const products = catalog.products.filter((p) => p.category === slug);
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs">Home / Categories / {c.name}</div>
          <div style={{ fontSize: '4rem' }}>{c.emoji}</div>
          <h1>{c.name}</h1>
          <p className="section-copy">
            {c.description}. Browse traceable options with clear province, pack size, stock and
            delivery information.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid product-grid">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
