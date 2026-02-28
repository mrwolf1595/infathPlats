'use client';

import { FIELD_SCHEMA, ALLOWED_FONT_OVERRIDES } from '@/lib/types';
import type { FontOverride } from '@/lib/types';

interface FontSizeOverrideProps {
  value: FontOverride;
  onChange: (overrides: FontOverride) => void;
}

/** Custom defaults for overridable fields (overrides the schema value) */
const OVERRIDE_DEFAULTS: Record<string, number> = {
  phone: 808,
};

/** Lookup default size for each overridable field */
function getDefaultSize(fieldName: string): number {
  if (OVERRIDE_DEFAULTS[fieldName]) return OVERRIDE_DEFAULTS[fieldName];
  const field = FIELD_SCHEMA.text_fields.find((f) => f.name === fieldName);
  return field?.font.size ?? 300;
}

export function FontSizeOverride({ value, onChange }: FontSizeOverrideProps) {
  return (
    <div className="card animate-in animate-in-delay-4">
      <div className="section-title">
        <div className="icon">🔤</div>
        <div>
          <span>تكبير الخط</span>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '400',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            يمكنك تغيير حجم الخط لهذه الحقول (من 50 إلى 1000 نقطة)
          </p>
        </div>
      </div>

      <div className="form-grid-2">
        {ALLOWED_FONT_OVERRIDES.map((fieldName) => {
          const fieldMeta = FIELD_SCHEMA.text_fields.find(
            (f) => f.name === fieldName
          );
          const defaultSize = getDefaultSize(fieldName);

          return (
            <div key={fieldName} className="field-group">
              <label className="label-field">
                {fieldMeta?.label_ar ?? fieldName}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  placeholder={String(defaultSize)}
                  value={value[fieldName] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onChange({
                      ...value,
                      [fieldName]: raw === '' ? undefined : Number(raw),
                    });
                  }}
                  className="input-field"
                  style={{ direction: 'ltr', textAlign: 'center' }}
                />
                <span
                  className="field-badge"
                  style={{ whiteSpace: 'nowrap', margin: 0 }}
                >
                  الافتراضي: {defaultSize}pt
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
