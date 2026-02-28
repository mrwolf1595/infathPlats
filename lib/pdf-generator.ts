import { PDFDocument, PDFFont, PDFForm, PDFTextField, PDFButton, PDFName, PDFBool, TextAlignment } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FIELD_SCHEMA,
  ALLOWED_FONT_OVERRIDES,
  type BoardFormData,
  type FontOverride,
  type BoardImages,
  type FontCache,
  type FontFamily,
  type TextFieldName,
} from './types';

// ─── Font Paths ──────────────────────────────────────────────────────

const FONT_PATHS: Record<string, string> = {
  'LamaSans-Medium': '/fonts/LamaSans-Medium.ttf',
  'RuaqArabic-Bold': '/fonts/RuaqArabic-Bold.ttf',
  'RuaqArabic-Medium': '/fonts/RuaqArabic-Medium.ttf',
};

// ─── Asset Loading ───────────────────────────────────────────────────

/**
 * Load a file from /public as ArrayBuffer.
 * Uses Node fs in API routes, falls back to fetch with absolute URL otherwise.
 *
 * On Vercel, the public/ directory is NOT on the serverless function's
 * filesystem by default. We rely on `outputFileTracingIncludes` in
 * next.config.ts to bundle them. If that still fails we fetch from
 * the deployment URL (VERCEL_URL / custom domain).
 */
async function loadAssetBytes(publicPath: string): Promise<ArrayBuffer> {
  // 1. Try Node.js filesystem (works locally + on Vercel when files are traced)
  if (typeof process !== 'undefined') {
    try {
      const path = await import('path');
      const fs = await import('fs');
      // Try standard public/ path first
      let filePath = path.join(process.cwd(), 'public', publicPath);
      if (!fs.existsSync(filePath)) {
        // Vercel sometimes places traced files relative to .next/server
        const altPath = path.join(process.cwd(), '.next', 'server', 'public', publicPath);
        if (fs.existsSync(altPath)) filePath = altPath;
      }
      const buffer = fs.readFileSync(filePath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    } catch {
      // Fall through to fetch
    }
  }

  // 2. Fetch fallback – build an absolute URL so it works in serverless
  let baseUrl: string;
  if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.VERCEL_URL) {
    // Vercel provides this automatically; it doesn't include the protocol
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    baseUrl = 'http://localhost:3000';
  }

  const url = `${baseUrl}${publicPath.startsWith('/') ? '' : '/'}${encodeURI(publicPath)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load asset: ${publicPath} (${res.status} from ${url})`);
  }
  return res.arrayBuffer();
}

/**
 * Decode a base64 string (with or without data-URI prefix) to Uint8Array.
 */
function base64ToUint8Array(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Returns true if the base64 data represents a JPEG image.
 */
function isJpeg(b64: string): boolean {
  return (
    b64.startsWith('data:image/jpeg') ||
    b64.startsWith('data:image/jpg') ||
    b64.startsWith('/9j/')
  );
}

// ─── Font Loading ────────────────────────────────────────────────────

/**
 * Embed all Arabic fonts referenced by the schema into the PDF document.
 * Returns a FontCache keyed by family name.
 */
async function loadFonts(pdfDoc: PDFDocument): Promise<FontCache> {
  pdfDoc.registerFontkit(fontkit);

  const cache: FontCache = {};
  const families = new Set<string>();

  for (const field of FIELD_SCHEMA.text_fields) {
    families.add(field.font.family);
  }

  for (const family of families) {
    const fontPath = FONT_PATHS[family];
    if (!fontPath) {
      console.warn(`[pdf-generator] No font file mapped for "${family}"`);
      continue;
    }
    try {
      const fontBytes = await loadAssetBytes(fontPath);
      const embedded = await pdfDoc.embedFont(fontBytes, { subset: false });
      cache[family as FontFamily] = embedded;
    } catch (err) {
      console.error(`[pdf-generator] Failed to embed font "${family}":`, err);
      throw new Error(`Font loading failed for "${family}". Ensure public${fontPath} exists.`);
    }
  }

  return cache;
}

// ─── Text Field Filling ──────────────────────────────────────────────

/**
 * Safely retrieve a text field from the PDF form.
 * Returns null (with a warning) if the field doesn't exist.
 */
function getTextField(form: PDFForm, name: string): PDFTextField | null {
  try {
    return form.getTextField(name);
  } catch {
    console.warn(`[pdf-generator] Text field "${name}" not found in PDF form.`);
    return null;
  }
}

/**
 * Fields that can contain mixed Arabic text + numbers/symbols.
 * These need bidi (LRM/RLM) markers to prevent number reversal.
 */
const BIDI_FIELDS = new Set([
  'Start_hour', 'End_hour', 'Start_day', 'End_day',
]);

/**
 * Wrap numeric/date segments with LRM markers so they display
 * left-to-right within an overall RTL context.
 * Handles patterns like: 10:00, 3/2/2026, 10:45, etc.
 */
function normalizeBidiText(value: string): string {
  const lrm = '\u200E'; // Left-to-Right Mark
  const rlm = '\u200F'; // Right-to-Left Mark
  // Match sequences of digits possibly separated by : / - . or spaces
  const withDirectionalNumbers = value.replace(
    /[0-9٠-٩][0-9٠-٩:\/\-. ]*/g,
    (match) => `${lrm}${match.trim()}${lrm}`
  );
  return `${rlm}${withDirectionalNumbers}${rlm}`;
}

function fillTextFields(
  form: PDFForm,
  formData: Record<string, string | undefined>,
  fontCache: FontCache
): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    const rawValue = formData[fieldSpec.name as TextFieldName];
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;

    // Apply bidi normalization to fields that mix Arabic and numbers
    const value = BIDI_FIELDS.has(fieldSpec.name)
      ? normalizeBidiText(rawValue)
      : rawValue;

    const pdfField = getTextField(form, fieldSpec.name);
    if (!pdfField) continue;

    // Center-align text in the field
    pdfField.setAlignment(TextAlignment.Center);

    // Apply the embedded Arabic font so pdf-lib can build correct appearances
    const font = fontCache[fieldSpec.font.family as FontFamily];
    if (font) {
      pdfField.defaultUpdateAppearances(font);
    }

    // Set text value
    pdfField.setText(value);

    // Phone field: override font size to 808pt
    if (fieldSpec.name === 'phone') {
      pdfField.setFontSize(808);
    }

    // Apply font again after setText to ensure appearance is built with our custom font
    if (font) {
      pdfField.defaultUpdateAppearances(font);
    }
  }
}

// ─── Image Field Filling ─────────────────────────────────────────────

/**
 * Fill an image field (PDF button) with an embedded image.
 *
 * In PDF forms, image fields are represented as push-button fields.
 * We embed the image into the document and set it as the button icon.
 */
async function fillImageField(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  imageBase64: string
): Promise<void> {
  if (!imageBase64) return;

  let button: PDFButton;
  try {
    button = form.getButton(fieldName);
  } catch {
    console.warn(`[pdf-generator] Button/image field "${fieldName}" not found in PDF form.`);
    return;
  }

  const imageBytes = base64ToUint8Array(imageBase64);

  const image = isJpeg(imageBase64)
    ? await pdfDoc.embedJpg(imageBytes)
    : await pdfDoc.embedPng(imageBytes);

  button.setImage(image);
}

// ─── Main Entry Point ────────────────────────────────────────────────

/**
 * Available template files in /public/templates/.
 * Index 0 = templateId 1, etc.
 */
export const TEMPLATE_FILES = [
  'Art_board_2×4.pdf',
] as const;

export interface GenerateBoardOptions {
  templateId: number;
  formData: BoardFormData;
  fontOverrides?: FontOverride;
  images: BoardImages;
}

/**
 * Generate a filled PDF board.
 *
 * 1. Load the selected template PDF (contains interactive form fields)
 * 2. Embed Arabic fonts via fontkit
 * 3. Get the PDF form with pdfDoc.getForm()
 * 4. Fill text fields with form.getTextField(name).setText(value)
 * 5. Fill image fields with form.getButton(name).setImage(image)
 * 6. Flatten the form so fields are baked into the output
 * 7. Return the final PDF as Uint8Array
 */
export async function generateBoard(
  options: GenerateBoardOptions
): Promise<Uint8Array> {
  const { templateId, formData, fontOverrides, images } = options;

  // ── Validate template ID ───────────────────────────────
  if (templateId < 1 || templateId > TEMPLATE_FILES.length) {
    throw new Error(`Invalid templateId "${templateId}". Must be 1–${TEMPLATE_FILES.length}.`);
  }

  // ── 1. Load template ──────────────────────────────────
  const templatePath = `/templates/${TEMPLATE_FILES[templateId - 1]}`;
  let templateBytes: ArrayBuffer;
  try {
    templateBytes = await loadAssetBytes(templatePath);
  } catch {
    throw new Error(
      `Failed to load template ${templateId}. Ensure public${templatePath} exists.`
    );
  }

  const pdfDoc = await PDFDocument.load(templateBytes);

  // ── 2. Embed Arabic fonts ─────────────────────────────
  const fontCache = await loadFonts(pdfDoc);

  // ── 3. Access PDF form ────────────────────────────────
  const form = pdfDoc.getForm();

  // ── 4. Fill text fields (with font + centering) ───────
  fillTextFields(
    form,
    formData as Record<string, string | undefined>,
    fontCache
  );

  // ── 5. Fill image fields ──────────────────────────────
  //    Images MUST be filled after text fields.
  //    We do NOT set NeedAppearances because that flag tells
  //    the viewer to regenerate ALL appearances, which would
  //    destroy the button image appearances set below.
  if (images.logo) {
    await fillImageField(pdfDoc, form, 'Company_logo', images.logo);
  }
  if (images.qr) {
    await fillImageField(pdfDoc, form, 'QRcode', images.qr);
  }

  // ── 6. Serialize — pdf-lib already built appearances
  //    for text fields via defaultUpdateAppearances() above,
  //    and image fields via setImage(). No viewer-side
  //    regeneration needed.
  return pdfDoc.save({ updateFieldAppearances: false });
}

// ─── Debug Utility ───────────────────────────────────────────────────

/**
 * Inspect a template and return every form field name + type.
 * Useful during development to verify field names match the schema.
 */
export async function inspectTemplateFields(
  templateId: number
): Promise<{ name: string; type: string }[]> {
  const templateBytes = await loadAssetBytes(
    `/templates/template_${templateId}.pdf`
  );
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  return form.getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));
}
