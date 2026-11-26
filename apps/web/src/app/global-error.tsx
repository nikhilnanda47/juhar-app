'use client';

// The last resort: used only when the page frame itself (the layout) crashes, so there is no header, no styles and
// no fonts to lean on. It carries its own tiny styling.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7', color: '#1A1A1A', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <div role="alert" style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 28, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#6B6B6B', margin: '0 0 24px' }}>We could not show Juhar just now. Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ background: '#8B3A4A', color: '#fff', border: 0, borderRadius: 8, padding: '12px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
