'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LoaderCircle, UserRound } from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { blogPosts, type BlogPost } from '@/lib/blog';
import { normalizeBlogPost } from './BlogJournal';
import { ProductCard } from './ProductCard';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function BlogArticle({ slug, fallback }: { slug: string; fallback?: BlogPost }) {
  const [post, setPost] = useState<BlogPost | undefined>(fallback);
  const [loading, setLoading] = useState(!fallback);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (fallback) return;
    const controller = new AbortController();
    fetch(`${api}/content/blog/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              post?: Parameters<typeof normalizeBlogPost>[0];
            }>)
          : Promise.reject(new Error('Story not found')),
      )
      .then((payload) => {
        if (payload.post) setPost(normalizeBlogPost(payload.post));
        else setMissing(true);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setMissing(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fallback, slug]);

  const relatedProducts = useMemo(
    () => catalog.products.filter((item) => item.category === post?.relatedCategory).slice(0, 4),
    [post?.relatedCategory],
  );
  const relatedPosts = blogPosts.filter((item) => item.slug !== post?.slug).slice(0, 3);

  if (loading)
    return (
      <main className="article-state">
        <LoaderCircle className="is-spinning" />
        <h1>Opening this field story…</h1>
      </main>
    );
  if (missing || !post)
    return (
      <main className="article-state">
        <span>🌱</span>
        <h1>This story is not available.</h1>
        <p>It may still be a draft or may have been archived by the editorial team.</p>
        <Link className="btn btn-primary" href="/blog">
          <ArrowLeft size={16} /> Back to Hariyo Journal
        </Link>
      </main>
    );

  return (
    <main>
      <section className="page-hero article-hero">
        <div className="container article-hero-inner">
          <Link href="/blog" className="article-back">
            <ArrowLeft size={16} /> Hariyo Journal
          </Link>
          <span className="story-category">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="section-copy">{post.excerpt}</p>
          <div className="article-byline">
            <span>
              <UserRound size={16} /> {post.author}
            </span>
            <span>
              <CalendarDays size={16} /> {post.publishedAt}
            </span>
            <span>
              <Clock3 size={16} /> {post.readTime}
            </span>
          </div>
        </div>
      </section>
      <article className="section article-section">
        <div className="container article-layout">
          <aside className="article-toc">
            <b>In this story</b>
            {post.sections.map((section, index) => (
              <a key={section.heading} href={`#section-${index + 1}`}>
                {section.heading}
              </a>
            ))}
          </aside>
          <div className="article-body">
            <div className="article-lead-mark">{post.emoji}</div>
            {post.sections.map((section, index) => (
              <section key={section.heading} id={`section-${index + 1}`}>
                <span className="article-section-number">{String(index + 1).padStart(2, '0')}</span>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <div className="article-note">
              <b>Editorial note</b>
              <p>
                Farm conditions, availability and delivery coverage change by season. Always review
                the live listing and seller information before purchasing.
              </p>
            </div>
          </div>
        </div>
      </article>
      {relatedProducts.length > 0 && (
        <section className="section soft-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Shop the story</span>
                <h2>Explore related harvests</h2>
              </div>
              <Link href={`/categories/${post.relatedCategory}`}>
                View category <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid product-grid square-product-grid">
              {relatedProducts.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container">
          <div className="journal-heading">
            <div>
              <span className="eyebrow">Keep reading</span>
              <h2>More from Hariyo Journal</h2>
            </div>
          </div>
          <div className="journal-grid related-journal-grid">
            {relatedPosts.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="story-card compact-story"
              >
                <div className="story-card-art">
                  <span>{item.emoji}</span>
                  <small>{item.category}</small>
                </div>
                <div className="story-card-copy">
                  <h3>{item.title}</h3>
                  <b>
                    Read article <ArrowRight size={15} />
                  </b>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
