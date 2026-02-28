'use client';

import { FIELD_SCHEMA } from '@/lib/types';
import type { BoardFormData } from '@/lib/types';

interface FormFieldsProps {
  values: BoardFormData;
  onChange: (data: BoardFormData) => void;
  errors?: Record<string, string>;
}

export function FormFields({ values, onChange, errors }: FormFieldsProps) {
  const textFields = FIELD_SCHEMA.text_fields;

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-semibold text-nafeth-blue">
        بيانات اللوحة
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {textFields.map((field) => {
          const fieldError = errors?.[field.name];

          return (
            <div key={field.name}>
              <label className="label-field">
                {field.label_ar}
                {field.required && (
                  <span className="mr-1 text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                name={field.name}
                placeholder={field.label_en}
                value={values[field.name as keyof BoardFormData] ?? ''}
                onChange={(e) =>
                  onChange({ ...values, [field.name]: e.target.value })
                }
                className={`input-field ${
                  fieldError ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                }`}
              />
              {fieldError && (
                <p className="mt-1 text-sm text-red-500">{fieldError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
