import { PDFDocument, PDFFont, PDFForm, PDFTextField, PDFButton, PDFPage, PDFImage, PDFName, PDFBool, TextAlignment } from 'pdf-lib';
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

    // Phone field: override font size to 808pt
    if (fieldSpec.name === 'phone') {
      pdfField.setFontSize(808);
    }

    // Apply the embedded Arabic font — this updates the DA (Default
    // Appearance) string so Acrobat knows which font to use when it
    // rebuilds appearances via NeedAppearances. It also creates an
    // appearance stream, but we strip those later (see below).
    const font = fontCache[fieldSpec.font.family as FontFamily];
    if (font) {
      pdfField.defaultUpdateAppearances(font);
    }

    // Set text value
    pdfField.setText(value);
  }
}

/**
 * Remove pre-built appearance streams (/AP) from every text field widget.
 *
 * WHY: pdf-lib's defaultUpdateAppearances() cannot do proper Arabic
 * shaping or RTL layout — the appearances it generates display Arabic
 * text as disconnected LTR glyphs. Those broken appearance streams
 * also cause Acrobat to show a "+" overflow indicator because the
 * glyph widths are calculated incorrectly.
 *
 * By deleting the /AP entry from each widget, we force the PDF viewer
 * to rebuild appearances from scratch on document open (driven by the
 * NeedAppearances flag set on the AcroForm). The DA string (set by
 * defaultUpdateAppearances) is preserved, so the viewer knows which
 * embedded Arabic font and size to use.
 *
 * Image fields (buttons) are NOT affected — their appearances are
 * generated correctly by pdf-lib's setImage().
 */
function stripTextFieldAppearances(form: PDFForm): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    const pdfField = getTextField(form, fieldSpec.name);
    if (!pdfField) continue;

    const widgets = pdfField.acroField.getWidgets();
    for (const widget of widgets) {
      widget.dict.delete(PDFName.of('AP'));
    }
  }
}

// ─── Image Drawing ───────────────────────────────────────────────────

/**
 * Draw an image directly on the PDF page (NOT as a form field).
 *
 * WHY NOT form buttons? Because NeedAppearances=true (required for
 * Arabic text) causes the PDF viewer to regenerate ALL field
 * appearances, destroying button images set via setImage(). By
 * drawing images as static page content they are unaffected.
 *
 * We also remove the corresponding button field from the form so
 * Acrobat doesn't show an empty interactive box on top.
 */
async function drawImageOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  form: PDFForm,
  fieldName: string,
  imageBase64: string
): Promise<void> {
  if (!imageBase64) return;

  // Find the image field spec from the schema
  const fieldSpec = FIELD_SCHEMA.image_fields.find(f => f.name === fieldName);
  if (!fieldSpec) {
    console.warn(`[pdf-generator] Image field "${fieldName}" not found in schema.`);
    return;
  }

  // Embed the image
  const imageBytes = base64ToUint8Array(imageBase64);
  const image = isJpeg(imageBase64)
    ? await pdfDoc.embedJpg(imageBytes)
    : await pdfDoc.embedPng(imageBytes);

  // Get the button widget rectangle from the PDF form (most accurate position)
  let x = fieldSpec.position.x;
  let y = fieldSpec.position.y;
  let width = fieldSpec.size.width_pt;
  let height = fieldSpec.size.height_pt;

  try {
    const button = form.getButton(fieldName);
    const widgets = button.acroField.getWidgets();
    if (widgets.length > 0) {
      const rect = widgets[0].getRectangle();
      x = rect.x;
      y = rect.y;
      width = rect.width;
      height = rect.height;
    }
    // Remove the button field so it doesn't show an empty box
    form.removeField(button);
  } catch {
    // Button not found in form — use schema coordinates
    // Convert from top-left origin to PDF bottom-left origin
    const pageHeight = page.getHeight();
    y = pageHeight - fieldSpec.position.y - fieldSpec.size.height_pt;
  }

  // Draw the image on the page as static content
  page.drawImage(image, { x, y, width, height });
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
  const page = pdfDoc.getPages()[0];

  // ── 3b. Set NeedAppearances flag ──────────────────────
  //    Tells Acrobat to rebuild text field appearances on open
  //    using its own Arabic-aware shaping engine. Without this,
  //    text fields with stripped /AP show blank in Acrobat.
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

  // ── 4. Fill text fields (with font + centering) ───────
  fillTextFields(
    form,
    formData as Record<string, string | undefined>,
    fontCache
  );

  // ── 4b. Strip broken Arabic appearance streams ────────
  //    Remove /AP from text field widgets so Acrobat rebuilds
  //    them correctly via NeedAppearances.
  stripTextFieldAppearances(form);

  // ── 5. Draw images directly on page ───────────────────
  //    Images are drawn as static page content (not form fields)
  //    so they are NOT affected by NeedAppearances regeneration.
  //    The button fields are removed from the form to avoid
  //    empty interactive boxes overlapping the images.
  if (images.logo) {
    await drawImageOnPage(pdfDoc, page, form, 'Company_logo', images.logo);
  }
  if (images.qr) {
    await drawImageOnPage(pdfDoc, page, form, 'QRcode', images.qr);
  }

  // ── 6. Serialize ──────────────────────────────────────
  //    updateFieldAppearances: false → don't let pdf-lib rebuild
  //    appearances on save. Acrobat will rebuild text field
  //    appearances on open via NeedAppearances. Images are
  //    static page content and don't need regeneration.
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
