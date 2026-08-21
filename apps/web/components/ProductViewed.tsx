'use client';
import { useEffect } from 'react';
import { useProductExperience } from './ProductExperienceProvider';
export function ProductViewed({ slug }: { slug: string }) {
  const experience = useProductExperience();
  useEffect(() => { experience.markViewed(slug); }, [slug]);
  return null;
}
