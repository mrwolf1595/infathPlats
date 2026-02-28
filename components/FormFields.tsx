'use client';

import { FIELD_SCHEMA } from '@/lib/types';
import type { BoardFormData } from '@/lib/types';

interface FormFieldsProps {
  values: BoardFormData;
  onChange: (data: BoardFormData) => void;
  errors?: Record<string, string>;
}

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
    fields: ['Start_day', 'start_date', 'Start_hour', 'PM_AM_start'],
    columns: 4,
  },
  {
    title: 'نهاية المزاد',
    icon: '🔴',
    description: 'يوم وتاريخ ووقت نهاية المزاد',
    fields: ['End_day', 'end_date', 'End_hour', 'PM_AM_end'],
    columns: 4,
  },
  {
    title: 'تفاصيل العقار',
    icon: '🏠',
    description: 'معلومات الموقع والعقار',
    fields: ['District', 'Area', 'Usage', 'Plan_number', 'Land_number', 'Sakk_number', 'Court_number'],
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

export function FormFields({ values, onChange, errors }: FormFieldsProps) {
  const allTextFields = FIELD_SCHEMA.text_fields;

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
                const fieldError = errors?.[field.name];
                const fieldValue =
                  values[field.name as keyof BoardFormData] ?? '';

                const isAmPm = field.name === 'PM_AM_start' || field.name === 'PM_AM_end';
                const isDayName = field.name === 'Start_day' || field.name === 'End_day';

                return (
                  <div key={field.name} className="field-group">
                    <label className="label-field">
                      {field.label_ar}
                      {field.required && (
                        <span className="required-star">*</span>
                      )}
                    </label>

                    {isAmPm ? (
                      /* AM/PM Select */
                      <select
                        name={field.name}
                        value={fieldValue}
                        onChange={(e) =>
                          onChange({ ...values, [field.name]: e.target.value })
                        }
                        className={`input-field ${fieldError ? 'error' : ''}`}
                      >
                        <option value="">اختر...</option>
                        <option value="ص">ص (صباحاً)</option>
                        <option value="م">م (مساءً)</option>
                      </select>
                    ) : isDayName ? (
                      /* Day Name Select */
                      <select
                        name={field.name}
                        value={fieldValue}
                        onChange={(e) =>
                          onChange({ ...values, [field.name]: e.target.value })
                        }
                        className={`input-field ${fieldError ? 'error' : ''}`}
                      >
                        <option value="">اختر اليوم...</option>
                        <option value="السبت">السبت</option>
                        <option value="الاحد">الاحد</option>
                        <option value="الاثنين">الاثنين</option>
                        <option value="الثلاثاء">الثلاثاء</option>
                        <option value="الاربعاء">الاربعاء</option>
                        <option value="الخميس">الخميس</option>
                        <option value="الجمعة">الجمعة</option>
                      </select>
                    ) : (
                      /* Regular Text Input */
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
                    )}

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
