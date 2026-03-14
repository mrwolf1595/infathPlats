'use client';


import { FIELD_SCHEMA } from '@/lib/types';
import type { BoardFormData } from '@/lib/types';

interface FormFieldsProps {
  values: BoardFormData;
  onChange: (data: BoardFormData) => void;
  errors?: Record<string, string>;
}

// Arabic day names
const DAYS = [
  'السبت',
  'الاحد',
  'الاثنين',
  'الثلاثاء',
  'الاربعاء',
  'الخميس',
  'الجمعة',
] as const;

// AM/PM options
const AMPM_OPTIONS = [
  { value: 'ص', label: 'ص (صباحاً)' },
  { value: 'م', label: 'م (مساءً)' },
] as const;

// Group the fields by their logical sections based on PDF layout
const FIELD_GROUPS = [
  {
    title: 'معلومات المزاد',
    icon: '🏷️',
    description: 'البيانات الرئيسية للمزاد',
    fields: ['Auction_name', 'Type', 'Provider', 'License_number'],
    columns: 2,
  },
  {
    title: 'بداية المزاد',
    icon: '🟢',
    description: 'يوم وتاريخ ووقت بداية المزاد',
    fields: ['Start_day', 'Start_hour'],
    columns: 2,
  },
  {
    title: 'نهاية المزاد',
    icon: '🔴',
    description: 'يوم وتاريخ ووقت نهاية المزاد',
    fields: ['End_day', 'End_hour'],
    columns: 2,
  },
  {
    title: 'تفاصيل العقار',
    icon: '🏠',
    description: 'معلومات الموقع والعقار',
    fields: [
      'District',
      'Area',
      'Plan_number',
      'Land_number',
      'Sakk_number',
      'Court_number',
    ],
    columns: 3,
  },
  {
    title: 'التواصل',
    icon: '📞',
    description: 'بيانات التواصل',
    fields: ['phone'],
    columns: 1,
  },
];

// Composite field names that need special rendering
const COMPOSITE_DAY_FIELDS = new Set(['Start_day', 'End_day']);
const COMPOSITE_HOUR_FIELDS = new Set(['Start_hour', 'End_hour']);

/**
 * Parse a composite field's JSON value back into its sub-parts.
 */
function parseCompositeValue(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function FormFields({ values, onChange, errors }: FormFieldsProps) {
  const allTextFields = FIELD_SCHEMA.text_fields;

  /**
   * Update a sub-part of a composite field.
   * Stores the value as JSON string: { "day": "...", "date": "..." }
   */
  const handleCompositeChange = (
    fieldName: string,
    subKey: string,
    subValue: string
  ) => {
    const current = parseCompositeValue(
      values[fieldName as keyof BoardFormData]
    );
    const updated = { ...current, [subKey]: subValue };
    onChange({ ...values, [fieldName]: JSON.stringify(updated) });
  };

  /**
   * Render a composite "Day & Date" field (Start_day / End_day)
   * Shows: [Fixed prefix] [Day dropdown] [Date input]
   * Example output: "يبدأ المزاد يوم الخميس 2026/12/26"
   */
  const renderDayField = (field: (typeof allTextFields)[number]) => {
    const parsed = parseCompositeValue(
      values[field.name as keyof BoardFormData]
    );
    const fieldError = errors?.[field.name];
    const prefix =
      field.name === 'Start_day' ? 'يبدأ المزاد يوم' : 'ينتهي المزاد يوم';

    return (
      <div key={field.name} className="field-group" style={{ gridColumn: 'span 2' }}>
        <label className="label-field">
          {field.label_ar}
          {field.required && <span className="required-star">*</span>}
        </label>

        {/* Preview of what will appear in PDF */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            direction: 'rtl',
            textAlign: 'center',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ color: 'var(--primary)' }}>{prefix}</span>{' '}
          <span style={{ color: '#e0e0e0', fontWeight: 600 }}>
            {parsed.day || '...'}
          </span>{' '}
          <span
            style={{
              color: '#4dd0e1',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            {parsed.date || '____/__/__'}
          </span>
        </div>

        {/* Input sub-fields */}
        <div style={{ display: 'flex', gap: '0.75rem', direction: 'rtl' }}>
          {/* Day Name Select */}
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              اليوم
            </label>
            <select
              value={parsed.day || ''}
              onChange={(e) =>
                handleCompositeChange(field.name, 'day', e.target.value)
              }
              className={`input-field ${fieldError ? 'error' : ''}`}
            >
              <option value="">اختر اليوم...</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              التاريخ (مثال: 2026/12/26)
            </label>
            <input
              type="text"
              placeholder="2026/12/26"
              value={parsed.date || ''}
              onChange={(e) =>
                handleCompositeChange(field.name, 'date', e.target.value)
              }
              className={`input-field ${fieldError ? 'error' : ''}`}
              dir="ltr"
              style={{ textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Font badge */}
        <div className="field-badge">
          عربي: RuaqArabic-Medium • أرقام: LamaSans-Medium • {field.font.size}pt •{' '}
          {field.color.name === 'white' ? '⚪ أبيض' : '🔵 أزرق داكن'}
        </div>

        {fieldError && (
          <p
            style={{
              marginTop: '0.25rem',
              fontSize: '0.8rem',
              color: 'var(--error)',
            }}
          >
            {fieldError}
          </p>
        )}
      </div>
    );
  };

  /**
   * Render a composite "Hour" field (Start_hour / End_hour)
   * Shows: [Fixed prefix "الساعة"] [Time input] [AM/PM select]
   * Example output: "الساعة 12:00 ص"
   */
  const renderHourField = (field: (typeof allTextFields)[number]) => {
    const parsed = parseCompositeValue(
      values[field.name as keyof BoardFormData]
    );
    const fieldError = errors?.[field.name];

    return (
      <div key={field.name} className="field-group" style={{ gridColumn: 'span 2' }}>
        <label className="label-field">
          {field.label_ar}
          {field.required && <span className="required-star">*</span>}
        </label>

        {/* Preview */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            direction: 'rtl',
            textAlign: 'center',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--primary)' }}>الساعة</span>{' '}
          <span
            style={{
              color: '#4dd0e1',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            {parsed.time || '__:__'}
          </span>{' '}
          <span style={{ color: '#e0e0e0', fontWeight: 600 }}>
            {parsed.ampm || '...'}
          </span>
        </div>

        {/* Input sub-fields */}
        <div style={{ display: 'flex', gap: '0.75rem', direction: 'rtl' }}>
          {/* Time Input */}
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              الوقت (مثال: 12:00)
            </label>
            <input
              type="text"
              placeholder="12:00"
              value={parsed.time || ''}
              onChange={(e) =>
                handleCompositeChange(field.name, 'time', e.target.value)
              }
              className={`input-field ${fieldError ? 'error' : ''}`}
              dir="ltr"
              style={{ textAlign: 'center' }}
            />
          </div>

          {/* AM/PM Select */}
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              ص/م
            </label>
            <select
              value={parsed.ampm || ''}
              onChange={(e) =>
                handleCompositeChange(field.name, 'ampm', e.target.value)
              }
              className={`input-field ${fieldError ? 'error' : ''}`}
            >
              <option value="">اختر...</option>
              {AMPM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Font badge */}
        <div className="field-badge">
          عربي: RuaqArabic-Medium • أرقام: LamaSans-Medium • {field.font.size}pt •{' '}
          {field.color.name === 'white' ? '⚪ أبيض' : '🔵 أزرق داكن'}
        </div>

        {fieldError && (
          <p
            style={{
              marginTop: '0.25rem',
              fontSize: '0.8rem',
              color: 'var(--error)',
            }}
          >
            {fieldError}
          </p>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {FIELD_GROUPS.map((group, groupIndex) => {
        const groupFields = group.fields
          .map((name) => allTextFields.find((f) => f.name === name))
          .filter(Boolean);

        if (groupFields.length === 0) return null;

        return (
          <div
            key={group.title}
            className={`card animate-in animate-in-delay-${groupIndex + 1}`}
          >
            {/* Section Header */}
            <div className="section-title">
              <div className="icon">{group.icon}</div>
              <div>
                <span>{group.title}</span>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '400',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {group.description}
                </p>
              </div>
            </div>

            {/* Fields Grid */}
            <div
              className={
                group.columns === 4
                  ? 'form-grid-4'
                  : group.columns === 3
                  ? 'form-grid-3'
                  : group.columns === 1
                  ? ''
                  : 'form-grid-2'
              }
            >
              {groupFields.map((field) => {
                if (!field) return null;

                // Composite Day field (Start_day / End_day)
                if (COMPOSITE_DAY_FIELDS.has(field.name)) {
                  return renderDayField(field);
                }

                // Composite Hour field (Start_hour / End_hour)
                if (COMPOSITE_HOUR_FIELDS.has(field.name)) {
                  return renderHourField(field);
                }

                // Regular text field
                const fieldError = errors?.[field.name];
                const fieldValue =
                  values[field.name as keyof BoardFormData] ?? '';

                return (
                  <div key={field.name} className="field-group">
                    <label className="label-field">
                      {field.label_ar}
                      {field.required && (
                        <span className="required-star">*</span>
                      )}
                    </label>

                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.label_en}
                      value={fieldValue}
                      onChange={(e) =>
                        onChange({ ...values, [field.name]: e.target.value })
                      }
                      className={`input-field ${fieldError ? 'error' : ''}`}
                    />

                    {/* Field metadata badge */}
                    <div className="field-badge">
                      {field.font.family} • {field.font.size}pt •{' '}
                      {field.color.name === 'white' ? '⚪' : '🔵'}{' '}
                      {field.color.name === 'white' ? 'أبيض' : 'أزرق داكن'}
                    </div>
                    {fieldError && (
                      <p
                        style={{
                          marginTop: '0.25rem',
                          fontSize: '0.8rem',
                          color: 'var(--error)',
                        }}
                      >
                        {fieldError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
