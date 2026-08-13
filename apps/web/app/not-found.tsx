import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="section">
      <div className="container workspace-state">
        <span className="eyebrow">404 · Not found</span>
        <h1>This harvest or page is no longer here.</h1>
        <p>Fresh stock can sell out or move. Browse the live marketplace for an alternative.</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/shop">
            Browse marketplace
          </Link>
          <Link className="btn btn-secondary" href="/nearby">
            Find nearby farms
          </Link>
        </div>
      </div>
    </main>
  );
}
