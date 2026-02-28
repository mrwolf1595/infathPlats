import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names (handles conflicts) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a File or Blob to a base64 data-URL string.
 * Returns just the base64 part (after the comma).
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:…;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Detect image MIME type from base64 header bytes.
 * Defaults to 'image/png' if detection fails.
 */
export function detectImageType(base64: string): 'image/png' | 'image/jpeg' {
  // PNG starts with iVBOR, JPEG with /9j/
  if (base64.startsWith('/9j/') || base64.startsWith('JFIF')) {
    return 'image/jpeg';
  }
  return 'image/png';
}
