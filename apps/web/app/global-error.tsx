'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="section">
          <div className="container workspace-state">
            <h1>Hariyo Mart needs a fresh start.</h1>
            <p>Reload the application to reconnect to the marketplace.</p>
            <button className="btn btn-primary" onClick={reset}>
              Reload Hariyo Mart
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
