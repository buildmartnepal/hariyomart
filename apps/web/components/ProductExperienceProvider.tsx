'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';

type ProductExperienceValue = {
  saved: readonly string[];
  compare: readonly string[];
  recent: readonly string[];
  savedBusy: readonly string[];
  toggleSaved: (slug: string) => Promise<void>;
  toggleCompare: (slug: string) => void;
  markViewed: (slug: string) => void;
  clearCompare: () => void;
  isSaved: (slug: string) => boolean;
  isCompared: (slug: string) => boolean;
};

const ProductExperienceContext = createContext<ProductExperienceValue | null>(null);
const SAVED_KEY = 'hariyo-saved-products-v2';
const COMPARE_KEY = 'hariyo-compare-products-v1';
const RECENT_KEY = 'hariyo-recent-products-v1';

function readList(key: string, limit: number) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function ProductExperienceProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [savedBusy, setSavedBusy] = useState<string[]>([]);

  useEffect(() => {
    setSaved(readList(SAVED_KEY, 100));
    setCompare(readList(COMPARE_KEY, 3));
    setRecent(readList(RECENT_KEY, 12));
  }, []);

  useEffect(() => {
    if (!auth.ready || !auth.user) return;
    let active = true;
    auth.apiRequest<{ profile?: { wishlist?: string[] } }>('/account/me')
      .then((payload) => {
        if (!active || !Array.isArray(payload.profile?.wishlist)) return;
        setSaved((current) => {
          const remote = payload.profile!.wishlist!;
          const merged = Array.from(new Set([...remote, ...current])).slice(0, 100);
          const missingRemote = merged.filter((slug) => !remote.includes(slug));
          if (missingRemote.length) void Promise.allSettled(missingRemote.map((slug) => auth.apiRequest(`/account/wishlist/${encodeURIComponent(slug)}`, { method: 'PUT' })));
          return merged;
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [auth.ready, auth.user?.id, auth.apiRequest]);

  useEffect(() => {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch {}
  }, [saved]);
  useEffect(() => {
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compare)); } catch {}
  }, [compare]);
  useEffect(() => {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {}
  }, [recent]);

  const toggleSaved = useCallback(async (slug: string) => {
    if (savedBusy.includes(slug)) return;
    const wasSaved = saved.includes(slug);
    setSaved((current) => wasSaved ? current.filter((item) => item !== slug) : [slug, ...current.filter((item) => item !== slug)].slice(0, 100));
    if (!auth.user) return;
    setSavedBusy((current) => [...current, slug]);
    try {
      const result = await auth.apiRequest<{ wishlist?: string[] }>(`/account/wishlist/${encodeURIComponent(slug)}`, { method: wasSaved ? 'DELETE' : 'PUT' });
      if (Array.isArray(result.wishlist)) setSaved(result.wishlist);
    } catch {
      setSaved((current) => wasSaved ? [slug, ...current.filter((item) => item !== slug)] : current.filter((item) => item !== slug));
    } finally {
      setSavedBusy((current) => current.filter((item) => item !== slug));
    }
  }, [auth.user, auth.apiRequest, saved, savedBusy]);

  const toggleCompare = useCallback((slug: string) => {
    setCompare((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      return [...current, slug].slice(-3);
    });
  }, []);

  const markViewed = useCallback((slug: string) => {
    setRecent((current) => [slug, ...current.filter((item) => item !== slug)].slice(0, 12));
  }, []);

  const clearCompare = useCallback(() => setCompare([]), []);
  const value = useMemo<ProductExperienceValue>(() => ({
    saved,
    compare,
    recent,
    savedBusy,
    toggleSaved,
    toggleCompare,
    markViewed,
    clearCompare,
    isSaved: (slug) => saved.includes(slug),
    isCompared: (slug) => compare.includes(slug),
  }), [saved, compare, recent, savedBusy, toggleSaved, toggleCompare, markViewed, clearCompare]);

  return <ProductExperienceContext.Provider value={value}>{children}</ProductExperienceContext.Provider>;
}

export function useProductExperience() {
  const value = useContext(ProductExperienceContext);
  if (!value) throw new Error('useProductExperience must be used inside ProductExperienceProvider');
  return value;
}
