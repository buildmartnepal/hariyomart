import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { infoPages } from '@/lib/info-pages';
export function generateStaticParams() {
  return infoPages.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = infoPages.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.summary } : {};
}
export default async function Info({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = infoPages.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs">Home / {p.title}</div>
          <h1>{p.title}</h1>
          <p className="section-copy">{p.summary}</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 850 }}>
          <h2>Designed for trust and practical use</h2>
          <p className="section-copy">
            This page is connected to the platform content model and can be managed through the
            administration system. The supplied implementation includes semantic headings, metadata,
            responsive layout and reusable content sections.
          </p>
          <h2>What this section supports</h2>
          <div className="feature-list">
            <div>
              ✓ <span>English and Nepali content variants</span>
            </div>
            <div>
              ✓ <span>SEO title, description, canonical URL and structured data</span>
            </div>
            <div>
              ✓ <span>CMS-managed text, media, FAQs and calls to action</span>
            </div>
            <div>
              ✓ <span>Revision history and role-based publishing approval</span>
            </div>
          </div>
          <div className="farm-banner" style={{ marginTop: 36, gridTemplateColumns: '1fr' }}>
            <h2 style={{ margin: 0 }}>Need assistance?</h2>
            <p style={{ color: '#c5d8d0' }}>
              Contact customer support or use the mobile app for order and delivery updates.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
