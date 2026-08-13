'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Hariyo Mart route error', error);
  }, [error]);
  return (
    <main className="section">
      <div className="container workspace-state">
        <span className="eyebrow">Temporary problem</span>
        <h1>This part of Hariyo Mart could not load.</h1>
        <p>Your basket and account data are safe. Try the request again.</p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
