export default function Loading() {
  return (
    <main className="section" aria-busy="true" aria-live="polite">
      <div className="container workspace-state">
        <span className="eyebrow">Refreshing marketplace</span>
        <h1>Loading fresh stock…</h1>
        <p>Checking farms, product availability and delivery coverage.</p>
      </div>
    </main>
  );
}
