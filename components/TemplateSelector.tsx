'use client';

import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  value: number;
  onChange: (templateId: number) => void;
}

const TEMPLATES = [
  { id: 1, label: 'لوحة 2×4', file: 'Art_board_2×4.pdf' },
];

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-semibold text-nafeth-blue">
        اختر القالب
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-all',
              value === t.id
                ? 'border-nafeth-blue bg-nafeth-blue/5 ring-2 ring-nafeth-blue/20'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            {/* Placeholder thumbnail */}
            <div
              className={cn(
                'mb-2 h-12 w-20 rounded bg-gray-200',
                value === t.id && 'bg-nafeth-blue/20'
              )}
            />
            <span className="text-sm font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
