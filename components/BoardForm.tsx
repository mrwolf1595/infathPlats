'use client';

import { useState } from 'react';
import { TemplateSelector } from './TemplateSelector';
import { FormFields } from './FormFields';
import { FontSizeOverride } from './FontSizeOverride';
import { ImageUploader } from './ImageUploader';
import { FIELD_SCHEMA } from '@/lib/types';
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

  // Get image field specs from schema
  const logoSpec = FIELD_SCHEMA.image_fields.find((f) => f.name === 'Company_logo');
  const qrSpec = FIELD_SCHEMA.image_fields.find((f) => f.name === 'QRcode');

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* 1. Template selection */}
      <TemplateSelector value={templateId} onChange={setTemplateId} />

      {/* 2. Text fields (grouped) */}
      <FormFields values={formData} onChange={setFormData} errors={errors} />

      {/* 3. Font overrides */}
      <FontSizeOverride value={fontOverrides} onChange={setFontOverrides} />

      {/* 4. Image uploads */}
      <div className="card animate-in animate-in-delay-5">
        <div className="section-title">
          <div className="icon">🖼️</div>
          <div>
            <span>الصور</span>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '400',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              ارفع شعار الشركة ورمز QR
            </p>
          </div>
        </div>

        <div className="form-grid-2">
          <ImageUploader
            label="شعار الشركة *"
            fieldName="Company_logo"
            value={images.logo}
            onChange={(b64) => setImages((prev) => ({ ...prev, logo: b64 }))}
            fieldMeta={
              logoSpec
                ? {
                    size: logoSpec.size,
                    position: logoSpec.position,
                    accepted_formats: logoSpec.accepted_formats,
                  }
                : undefined
            }
          />
          <ImageUploader
            label="رمز QR (اختياري — يُنشأ تلقائيًا)"
            fieldName="QRcode"
            value={images.qr}
            onChange={(b64) => setImages((prev) => ({ ...prev, qr: b64 }))}
            fieldMeta={
              qrSpec
                ? {
                    size: qrSpec.size,
                    position: qrSpec.position,
                    accepted_formats: qrSpec.accepted_formats,
                  }
                : undefined
            }
          />
        </div>

        {errors.image_logo && (
          <div className="error-alert" style={{ marginTop: '1rem' }}>
            <span>⚠️</span>
            {errors.image_logo}
          </div>
        )}
      </div>

      {/* API-level error */}
      {apiError && (
        <div className="error-alert animate-in">
          <span>⚠️</span>
          {apiError}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{ display: 'flex', gap: '1rem' }}
        className="animate-in animate-in-delay-5"
      >
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <div className="spinner" />
              جاري إنشاء اللوحة…
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.2rem' }}>📄</span>
              إنشاء اللوحة
            </>
          )}
        </button>
      </div>
    </form>
  );
}
