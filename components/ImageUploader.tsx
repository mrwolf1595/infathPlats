'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileToBase64 } from '@/lib/utils';

interface ImageUploaderProps {
  label: string;
  fieldName: string;
  value?: string;
  onChange: (base64: string) => void;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  fieldMeta?: {
    size: { width_pt: number; height_pt: number; width_cm: number; height_cm: number };
    position: { x: number; y: number };
    accepted_formats?: string[];
  };
}

export function ImageUploader({
  label,
  fieldName,
  value,
  onChange,
  accept = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
  maxSizeMB = 10,
  fieldMeta,
}: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`حجم الملف يتجاوز ${maxSizeMB} ميجابايت`);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        onChange(base64);
        setPreview(URL.createObjectURL(file));
      } catch {
        setError('حدث خطأ أثناء قراءة الملف');
      }
    },
    [onChange, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  });

  const hasImage = !!(preview || value);

  return (
    <div className="field-group">
      <label className="label-field">
        {label}
      </label>

      <div
        {...getRootProps()}
        className={`drop-zone ${isDragActive ? 'active' : ''} ${hasImage ? 'has-image' : ''} ${error ? 'error' : ''}`}
        style={error ? { borderColor: 'var(--error)' } : {}}
      >
        <input {...getInputProps()} />

        {hasImage ? (
          <div style={{ textAlign: 'center' }}>
            <img
              src={preview ?? `data:image/png;base64,${value}`}
              alt={label}
              style={{
                maxHeight: '100px',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
                marginBottom: '0.5rem',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              اضغط لتغيير الصورة
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                opacity: 0.5,
              }}
            >
              {fieldName === 'QRcode' ? '📱' : '🖼️'}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              اسحب الصورة هنا أو اضغط للاختيار
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              PNG / JPG — حد أقصى {maxSizeMB} ميجابايت
            </p>
          </div>
        )}
      </div>

      {/* Field metadata */}
      {fieldMeta && (
        <div className="field-badge">
          {fieldMeta.size.width_cm.toFixed(1)} × {fieldMeta.size.height_cm.toFixed(1)} سم
          {fieldMeta.accepted_formats && ` • ${fieldMeta.accepted_formats.join(', ')}`}
        </div>
      )}

      {error && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
