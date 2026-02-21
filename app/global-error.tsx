'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = (error && typeof error.message === 'string') ? error.message : 'Er trad een ernstige fout op.'
  return (
    <html lang="nl">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: 'var(--bg-main, #F4F6F8)', color: 'var(--text-primary, #111827)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Er is iets misgegaan</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #6B7280)', marginBottom: 16 }}>{message}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '8px 16px', fontSize: 14, fontWeight: 500, color: '#fff', background: 'var(--primary, #3B82F6)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  )
}
