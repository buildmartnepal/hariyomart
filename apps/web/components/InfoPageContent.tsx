'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import type { InfoSection } from '@/lib/info-pages';

const api = process.env.NEXT_PUBLIC_API_URL || '/api';

export function InfoPageContent({
  slug,
  sections: fallbackSections,
  highlights,
}: {
  slug: string;
  sections: InfoSection[];
  highlights: string[];
}) {
  const [sections, setSections] = useState(fallbackSections);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}/content/pages/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ page?: { sections?: InfoSection[] } }>)
          : Promise.reject(new Error('No published CMS page')),
      )
      .then((payload) => {
        if (payload.page?.sections?.length) {
          setSections(payload.page.sections);
          setLive(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [slug]);

  return (
    <div className="info-page-content">
      <div className="content-source-note">
        {live ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
        {live ? 'Published from the admin page studio' : 'Production-safe built-in content'}
      </div>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <div className="info-highlight-grid">
        {highlights.map((highlight) => (
          <div key={highlight}>
            <CheckCircle2 size={17} />
            <span>{highlight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
