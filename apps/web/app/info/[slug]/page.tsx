import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { infoPageDetails, infoPages } from '@/lib/info-pages';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { InfoPageContent } from '@/components/InfoPageContent';
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
  const details = infoPageDetails(slug);
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
          {slug === 'contact' && <SupportTicketForm />}
          <InfoPageContent
            slug={slug}
            sections={details.sections}
            highlights={details.highlights}
          />
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
