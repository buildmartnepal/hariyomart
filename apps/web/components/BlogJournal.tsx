'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { blogPosts, type BlogPost } from '@/lib/blog';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

type ApiPost = Partial<BlogPost> & {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt?: string;
  createdAt?: string;
};

export function normalizeBlogPost(post: ApiPost): BlogPost {
  const paragraphs = post.sections?.flatMap((section) => section.paragraphs) || [];
  const words = paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: (post.category || 'Food knowledge') as BlogPost['category'],
    author: post.author || 'Hariyo Mart Editorial',
    publishedAt: (post.publishedAt || post.createdAt || new Date().toISOString()).slice(0, 10),
    readTime: post.readTime || `${Math.max(3, Math.ceil(words / 200))} min read`,
    emoji: post.emoji || topicEmoji(post.category),
    relatedCategory: post.relatedCategory || 'vegetables',
    featured: Boolean(post.featured),
    sections: post.sections?.length
      ? post.sections
      : [{ heading: 'From Hariyo Journal', paragraphs: [post.excerpt] }],
  };
}

function topicEmoji(category?: string) {
  if (category === 'Farm story') return '🧑🏽‍🌾';
  if (category === 'Seller academy') return '🧺';
  if (category === 'Buying guide') return '🗺️';
  return '🌱';
}

export function BlogJournal() {
  const [remote, setRemote] = useState<BlogPost[]>([]);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}/content/blog?limit=50`, { cache: 'no-store', signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ data?: ApiPost[] }>)
          : Promise.reject(new Error('Journal API unavailable')),
      )
      .then((payload) => setRemote((payload.data || []).map(normalizeBlogPost)))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setRemote([]);
      })
      .finally(() => setSyncing(false));
    return () => controller.abort();
  }, []);

  const posts = useMemo(() => {
    const combined = [...remote, ...blogPosts];
    return combined.filter(
      (post, index) => combined.findIndex((item) => item.slug === post.slug) === index,
    );
  }, [remote]);
  const featured = posts.find((post) => post.featured) || posts[0];
  const rest = posts.filter((post) => post.slug !== featured.slug);

  return (
    <>
      <Link href={`/blog/${featured.slug}`} className="featured-story">
        <div className="featured-story-art" aria-hidden="true">
          <span>{featured.emoji}</span>
          <i>Fresh thinking from every corner of Nepal</i>
        </div>
        <div className="featured-story-copy">
          <small className="story-category">Featured · {featured.category}</small>
          <h2>{featured.title}</h2>
          <p>{featured.excerpt}</p>
          <StoryMeta post={featured} />
          <b>
            Read the field guide <ArrowRight size={17} />
          </b>
        </div>
      </Link>
      <div className="journal-heading">
        <div>
          <span className="eyebrow">Latest from the field</span>
          <h2>Stories worth bringing home</h2>
        </div>
        <p className="journal-sync">
          {syncing ? (
            <>
              <RefreshCw className="is-spinning" size={14} /> Syncing live stories…
            </>
          ) : (
            'Published from the Hariyo operations studio.'
          )}
        </p>
      </div>
      <div className="journal-grid">
        {rest.map((post) => (
          <Link href={`/blog/${post.slug}`} className="story-card" key={post.slug}>
            <div className="story-card-art">
              <span>{post.emoji}</span>
              <small>{post.category}</small>
            </div>
            <div className="story-card-copy">
              <StoryMeta post={post} compact />
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <b>
                Read article <ArrowRight size={15} />
              </b>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function StoryMeta({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <div className="story-meta">
      <span>
        {!compact && <CalendarDays size={14} />}
        {post.publishedAt}
      </span>
      <span>
        {!compact && <Clock3 size={14} />}
        {post.readTime}
      </span>
    </div>
  );
}
