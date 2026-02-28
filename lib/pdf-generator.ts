import { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FIELD_SCHEMA,
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
  'LamaSans-Bold': '/fonts/LamaSans-Bold.ttf',
  'RuaqArabic-Bold': '/fonts/RuaqArabic-Bold.ttf',
  'RuaqArabic-Medium': '/fonts/RuaqArabic-Medium.ttf',
};

// ─── Asset Loading ───────────────────────────────────────────────────

async function loadAssetBytes(publicPath: string): Promise<ArrayBuffer> {
  if (typeof process !== 'undefined') {
    try {
      const path = await import('path');
      const fs = await import('fs');
      let filePath = path.join(process.cwd(), 'public', publicPath);
      if (!fs.existsSync(filePath)) {
        const altPath = path.join(process.cwd(), '.next', 'server', 'public', publicPath);
        if (fs.existsSync(altPath)) filePath = altPath;
      }
      const buffer = fs.readFileSync(filePath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    } catch {
      // Fall through
    }
  }

  let baseUrl: string;
  if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    baseUrl = 'http://localhost:3000';
  }

  const url = `${baseUrl}${publicPath.startsWith('/') ? '' : '/'}${encodeURI(publicPath)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load asset: ${publicPath} (${res.status})`);
  }
  return res.arrayBuffer();
}

function base64ToUint8Array(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isJpeg(b64: string): boolean {
  return (
    b64.startsWith('data:image/jpeg') ||
    b64.startsWith('data:image/jpg') ||
    b64.startsWith('/9j/')
  );
}

// ─── Font Loading ────────────────────────────────────────────────────

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
      console.warn(`No font file for "${family}"`);
      continue;
    }
    try {
      const fontBytes = await loadAssetBytes(fontPath);
      const embedded = await pdfDoc.embedFont(fontBytes, { subset: false });
      cache[family as FontFamily] = embedded;
    } catch (err) {
      console.error(`Failed to embed font "${family}":`, err);
      throw new Error(`Font loading failed for "${family}".`);
    }
  }

  return cache;
}

// ─── Fill PDF Form Fields ────────────────────────────────────────────

/**
 * Fill the actual PDF form fields with user data.
 * This uses the existing form fields in the PDF template
 * instead of drawing text at absolute coordinates.
 */
function fillTextFields(
  form: ReturnType<PDFDocument['getForm']>,
  formData: Record<string, string | undefined>,
  fontCache: FontCache,
  fontOverrides?: FontOverride
): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    const rawValue = formData[fieldSpec.name as TextFieldName];
    if (!rawValue) continue;

    try {
      const textField = form.getTextField(fieldSpec.name);

      // Get the font for this field
      const font = fontCache[fieldSpec.font.family as FontFamily];

      // Determine font size
      let fontSize = fieldSpec.font.size;
      if (fieldSpec.name === 'phone') {
        fontSize = fontOverrides?.phone || 808;
      }

      // Set the font size on the field
      textField.setFontSize(fontSize);

      // Set text value
      textField.setText(rawValue);

      // Update appearances with the custom font for Arabic support
      if (font) {
        textField.updateAppearances(font);
      }

      console.log(`✅ Filled field "${fieldSpec.name}" with "${rawValue}" (${fontSize}pt)`);
    } catch (err) {
      console.warn(`⚠️ Could not fill field "${fieldSpec.name}":`, err);
    }
  }
}

/**
 * Fill image fields (Company_logo, QRcode) using PDF button fields.
 */
async function fillImageFields(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  images: BoardImages
): Promise<void> {
  // Company Logo
  if (images.logo) {
    try {
      const logoButton = form.getButton('Company_logo');
      const imageBytes = base64ToUint8Array(images.logo);
      const image = isJpeg(images.logo)
        ? await pdfDoc.embedJpg(imageBytes)
        : await pdfDoc.embedPng(imageBytes);
      logoButton.setImage(image);
      console.log('✅ Set Company_logo image');
    } catch (err) {
      console.warn('⚠️ Could not set Company_logo:', err);
    }
  }

  // QR Code
  if (images.qr) {
    try {
      const qrButton = form.getButton('QRcode');
      const imageBytes = base64ToUint8Array(images.qr);
      const image = await pdfDoc.embedPng(imageBytes);
      qrButton.setImage(image);
      console.log('✅ Set QRcode image');
    } catch (err) {
      console.warn('⚠️ Could not set QRcode:', err);
    }
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────

export const TEMPLATE_FILES = ['Art_board_2×4.pdf'] as const;

export interface GenerateBoardOptions {
  templateId: number;
  formData: BoardFormData;
  fontOverrides?: FontOverride;
  images: BoardImages;
}

/**
 * Generate PDF by filling the actual form fields in the template.
 * 
 * This approach:
 * - Loads the template PDF which already has positioned form fields
 * - Fills each text field using form.getTextField().setText()
 * - Fills image fields using form.getButton().setImage()
 * - Uses custom Arabic fonts via updateAppearances()
 * - Text lands exactly in the designated fields!
 */
export async function generateBoard(
  options: GenerateBoardOptions
): Promise<Uint8Array> {
  const { templateId, formData, fontOverrides, images } = options;

  if (templateId < 1 || templateId > TEMPLATE_FILES.length) {
    throw new Error(`Invalid templateId "${templateId}".`);
  }

  // 1. Load template
  const templatePath = `/templates/${TEMPLATE_FILES[templateId - 1]}`;
  const templateBytes = await loadAssetBytes(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // 2. Embed fonts
  const fontCache = await loadFonts(pdfDoc);

  // 3. Get form
  const form = pdfDoc.getForm();

  // Log available fields for debugging
  const availableFields = form.getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));
  console.log('📋 Available PDF form fields:', JSON.stringify(availableFields, null, 2));

  // 4. Fill text fields using form API
  fillTextFields(form, formData as Record<string, string | undefined>, fontCache, fontOverrides);

  // 5. Fill image fields using form API
  await fillImageFields(pdfDoc, form, images);

  // 6. Save (do NOT flatten - keep fields editable)
  return pdfDoc.save();
}

export async function inspectTemplateFields(templateId: number): Promise<{ name: string; type: string }[]> {
  const templateBytes = await loadAssetBytes(`/templates/${TEMPLATE_FILES[0]}`);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  return form.getFields().map((f) => ({ name: f.getName(), type: f.constructor.name }));
}