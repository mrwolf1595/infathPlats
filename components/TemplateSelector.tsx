'use client';

interface TemplateSelectorProps {
  value: number;
  onChange: (templateId: number) => void;
}

const TEMPLATES = [
  { id: 1, label: 'لوحة 2×4', file: 'Art_board_2×4.pdf', size: '4م × 2م' },
  { id: 2, label: 'لوحة 3×6', file: 'Art_board_3×6.pdf', size: '6م × 3م' },
  { id: 3, label: 'لوحة 3×10', file: 'Art_board_3×10.pdf', size: '10م × 3م' },
];

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="card animate-in">
      <div className="section-title">
        <div className="icon">📐</div>
        <div>
          <span>اختر القالب</span>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '400',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            اختر تصميم اللوحة المناسب
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {TEMPLATES.map((t) => {
          const isSelected = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem 2rem',
                borderRadius: '14px',
                border: isSelected
                  ? '2px solid var(--nafeth-teal)'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'rgba(13, 148, 136, 0.1)'
                  : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'var(--text-primary)',
                minWidth: '160px',
                fontFamily: 'inherit',
                boxShadow: isSelected
                  ? '0 0 20px rgba(13, 148, 136, 0.15)'
                  : 'none',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '80px',
                  height: '40px',
                  borderRadius: '8px',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(13, 148, 136, 0.1))'
                    : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                }}
              >
                {t.size}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                {t.label}
              </span>
              {isSelected && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--nafeth-teal-light)',
                    marginTop: '0.25rem',
                  }}
                >
                  ✓ محدد
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
