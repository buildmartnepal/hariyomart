import Link from 'next/link';
import { blogPosts } from '@/lib/blog';
export default function Blog() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <h1>Stories, recipes and practical guides</h1>
          <p className="section-copy">
            SEO-ready editorial routes for farm stories, food education and seasonal discovery.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container grid province-grid">
          {blogPosts.map((p, i) => (
            <Link href={`/blog/${p.slug}`} className="province-card" key={p.slug}>
              <div className="mapdot">{['🌱', '🍎', '🍵', '🌾'][i % 4]}</div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <small>Read article →</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
