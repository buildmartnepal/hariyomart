'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from './AuthProvider';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  seller_reply?: string | null;
  created_at?: string;
  buyer_name?: string;
};

function stars(value: number) {
  return Array.from({ length: 5 }, (_, index) => index + 1 <= Math.round(value));
}

export function ProductReviews({ slug, catalogRating }: { slug: string; catalogRating: number }) {
  const auth = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`${api}/reviews/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Reviews unavailable');
        return (await response.json()) as { data?: Review[] };
      })
      .then((payload) => active && setReviews(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => active && setReviews([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  const summary = useMemo(() => {
    if (!reviews.length) return { average: catalogRating, count: 0 };
    return { average: reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length, count: reviews.length };
  }, [reviews, catalogRating]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth.user || auth.user.role !== 'customer') return;
    setBusy(true);
    setNotice('');
    try {
      await auth.apiRequest(`/reviews/${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: JSON.stringify({ rating, title: title.trim() || undefined, body: body.trim() }),
      });
      setTitle('');
      setBody('');
      setRating(5);
      setNotice('Thanks. Your review was submitted for marketplace moderation.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-reviews-head">
        <div>
          <span className="eyebrow"><MessageSquareText size={15}/> Buyer feedback</span>
          <h2 id="product-reviews-title">Reviews & seller responses</h2>
          <p>Published feedback is moderated by Hariyo Mart. Delivered-order reviews can be tied to verified purchases.</p>
        </div>
        <div className="review-score" aria-label={`${summary.average.toFixed(1)} out of 5`}>
          <strong>{summary.average.toFixed(1)}</strong>
          <div>{stars(summary.average).map((filled, index) => <Star key={index} size={17} fill={filled ? 'currentColor' : 'none'} />)}</div>
          <small>{summary.count ? `${summary.count} published review${summary.count === 1 ? '' : 's'}` : 'Catalog rating'}</small>
        </div>
      </div>

      <div className="product-reviews-grid">
        <div className="review-list">
          {loading && <div className="review-empty">Loading buyer feedback…</div>}
          {!loading && reviews.length === 0 && <div className="review-empty"><ShieldCheck size={22}/><b>No published reviews yet</b><span>Be among the first buyers to share useful product feedback.</span></div>}
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-top">
                <div><strong>{review.buyer_name || 'Hariyo buyer'}</strong><small>{review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Published review'}</small></div>
                <div className="review-stars" aria-label={`${review.rating} out of 5`}>{stars(review.rating).map((filled, index) => <Star key={index} size={15} fill={filled ? 'currentColor' : 'none'} />)}</div>
              </div>
              {review.title && <h3>{review.title}</h3>}
              <p>{review.body}</p>
              {review.seller_reply && <div className="seller-review-reply"><b>Seller response</b><p>{review.seller_reply}</p></div>}
            </article>
          ))}
        </div>

        <aside className="review-compose">
          <span className="eyebrow">Share useful feedback</span>
          <h3>Review this product</h3>
          {!auth.ready ? <p>Checking your account…</p> : !auth.user ? (
            <><p>Sign in as a buyer to submit a review. Reviews are moderated before publication.</p><Link className="btn btn-secondary" href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`}>Sign in to review</Link></>
          ) : auth.user.role !== 'customer' ? (
            <p>Buyer accounts can submit product reviews. Seller and admin workspaces remain separate from buyer feedback.</p>
          ) : (
            <form onSubmit={submit}>
              <fieldset>
                <legend>Rating</legend>
                <div className="review-rating-picker">
                  {[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star size={20} fill={value <= rating ? 'currentColor' : 'none'}/></button>)}
                </div>
              </fieldset>
              <label><span>Short title <small>optional</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Fresh, well packed, great origin…" /></label>
              <label><span>Your feedback <b>required</b></span><textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={8} maxLength={1200} required rows={5} placeholder="What should another buyer know about quality, freshness, packing or value?" /></label>
              <button className="btn btn-primary" disabled={busy || body.trim().length < 8}>{busy ? 'Submitting…' : 'Submit for review'}</button>
              {notice && <p className="review-notice" role="status">{notice}</p>}
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
