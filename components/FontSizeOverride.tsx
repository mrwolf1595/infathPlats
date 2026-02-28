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
    <div className="card">
      <h2 className="mb-4 text-lg font-semibold text-nafeth-blue">
        تكبير الخط (اختياري)
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        يمكنك تغيير حجم الخط لهذه الحقول فقط (من 50 إلى 1000 نقطة)
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {ALLOWED_FONT_OVERRIDES.map((fieldName) => {
          const fieldMeta = FIELD_SCHEMA.text_fields.find(
            (f) => f.name === fieldName
          );
          const defaultSize = getDefaultSize(fieldName);

          return (
            <div key={fieldName}>
              <label className="label-field">
                {fieldMeta?.label_ar ?? fieldName}
              </label>
              <div className="flex items-center gap-2">
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
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  الافتراضي: {defaultSize}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
