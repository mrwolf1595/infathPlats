'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { fileToBase64 } from '@/lib/utils';

interface ImageUploaderProps {
  label: string;
  value?: string;          // base64 string (no prefix)
  onChange: (base64: string) => void;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
}

export function ImageUploader({
  label,
  value,
  onChange,
  accept = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
  maxSizeMB = 10,
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

  return (
    <div>
      <label className="label-field">{label}</label>
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive
            ? 'border-nafeth-blue bg-nafeth-blue/5'
            : 'border-gray-300 hover:border-gray-400',
          error && 'border-red-400'
        )}
      >
        <input {...getInputProps()} />

        {preview || value ? (
          <img
            src={preview ?? `data:image/png;base64,${value}`}
            alt={label}
            className="h-24 w-auto object-contain"
          />
        ) : (
          <div className="text-center text-sm text-gray-500">
            <p>اسحب الصورة هنا أو اضغط للاختيار</p>
            <p className="mt-1 text-xs text-gray-400">
              PNG / JPG — حد أقصى {maxSizeMB} ميجابايت
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
