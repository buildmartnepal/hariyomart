import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { blogPosts } from '@/lib/blog';
export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = blogPosts.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = blogPosts.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <main>
      <section className="page-hero">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="breadcrumbs">Home / Blog</div>
          <h1>{p.title}</h1>
          <p className="section-copy">{p.excerpt}</p>
        </div>
      </section>
      <article className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          {p.body.map((b, i) => (
            <p key={i} style={{ fontSize: '1.08rem', lineHeight: 1.9, color: 'var(--muted)' }}>
              {b}
            </p>
          ))}
          <div className="farm-banner" style={{ gridTemplateColumns: '1fr', marginTop: 38 }}>
            <h2 style={{ margin: 0 }}>Shop the story</h2>
            <p style={{ color: '#c5d8d0' }}>
              Connect editorial pages to relevant products, provinces, farms and recipes.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
