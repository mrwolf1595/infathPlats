'use client';

import { useState } from 'react';
import { TemplateSelector } from './TemplateSelector';
import { FormFields } from './FormFields';
import { FontSizeOverride } from './FontSizeOverride';
import { ImageUploader } from './ImageUploader';
import { textFieldsSchema, fontOverrideSchema, imagesSchema } from '@/lib/validation';
import type { BoardFormData, FontOverride, BoardImages } from '@/lib/types';

type FormErrors = Record<string, string>;

export function BoardForm() {
  // ── State ──────────────────────────────────────────────────────────
  const [templateId, setTemplateId] = useState<number>(1);
  const [formData, setFormData] = useState<BoardFormData>({});
  const [fontOverrides, setFontOverrides] = useState<FontOverride>({});
  const [images, setImages] = useState<BoardImages>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Validate ───────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: FormErrors = {};

    // Text fields
    const textResult = textFieldsSchema.safeParse(formData);
    if (!textResult.success) {
      for (const issue of textResult.error.issues) {
        const key = issue.path[0] as string;
        newErrors[key] = issue.message;
      }
    }

    // Font overrides
    const fontResult = fontOverrideSchema.safeParse(fontOverrides);
    if (!fontResult.success) {
      for (const issue of fontResult.error.issues) {
        const key = `fontOverride_${issue.path[0]}`;
        newErrors[key] = issue.message;
      }
    }

    // Images
    const imgResult = imagesSchema.safeParse(images);
    if (!imgResult.success) {
      for (const issue of imgResult.error.issues) {
        const key = `image_${issue.path[0]}`;
        newErrors[key] = issue.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, formData, fontOverrides, images }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nafeth-board-template-${templateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Template selection */}
      <TemplateSelector value={templateId} onChange={setTemplateId} />

      {/* 2. Text fields */}
      <FormFields values={formData} onChange={setFormData} errors={errors} />

      {/* 3. Font overrides */}
      <FontSizeOverride value={fontOverrides} onChange={setFontOverrides} />

      {/* 4. Image uploads */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-nafeth-blue">
          الصور
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploader
            label="شعار الشركة *"
            value={images.logo}
            onChange={(b64) => setImages((prev) => ({ ...prev, logo: b64 }))}
          />
          <ImageUploader
            label="رمز QR (اختياري — يُنشأ تلقائيًا)"
            value={images.qr}
            onChange={(b64) => setImages((prev) => ({ ...prev, qr: b64 }))}
          />
        </div>
        {errors.image_logo && (
          <p className="mt-2 text-sm text-red-500">{errors.image_logo}</p>
        )}
      </div>

      {/* API-level error */}
      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full text-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            جاري إنشاء اللوحة…
          </span>
        ) : (
          'إنشاء اللوحة'
        )}
      </button>
    </form>
  );
}
