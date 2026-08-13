import type { Metadata } from 'next';
import { BlogArticle } from '@/components/BlogArticle';
import { blogPosts } from '@/lib/blog';

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  return post
    ? { title: post.title, description: post.excerpt }
    : { title: 'Hariyo Journal Story', description: 'A field story from Hariyo Mart Nepal.' };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogArticle slug={slug} fallback={blogPosts.find((post) => post.slug === slug)} />;
}
