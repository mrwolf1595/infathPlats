'use client';

import { BoardForm } from '@/components/BoardForm';

export default function HomePage() {
  return (
    <div className="relative" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <header
        className="animate-in"
        style={{
          padding: '2.5rem 1rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Logo & Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0d9488, #0d7a70)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 20px rgba(13, 148, 136, 0.3)',
              }}
            >
              📋
            </div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.02em',
              }}
            >
              مولد لوحات إنفاذ
            </h1>
          </div>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              fontWeight: '400',
            }}
          >
            أنشئ لوحات إعلانية للمزادات بحجم{' '}
            <span style={{ color: 'var(--nafeth-teal-light)', fontWeight: '600' }}>
              4م × 2م
            </span>{' '}
            بصيغة PDF
          </p>

          {/* Stats bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '1.25rem',
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              <strong style={{ color: 'var(--nafeth-teal-light)' }}>16</strong> حقل
            </span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>
              <strong style={{ color: 'var(--nafeth-teal-light)' }}>14</strong> نصي
            </span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>
              <strong style={{ color: 'var(--nafeth-teal-light)' }}>2</strong> صورة
            </span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>
              <strong style={{ color: 'var(--nafeth-teal-light)' }}>11338 × 5669</strong> نقطة
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 3rem' }}>
        <BoardForm />
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        مولد لوحات إنفاذ — Nafeth Board Generator v0.1
      </footer>
    </div>
  );
}
