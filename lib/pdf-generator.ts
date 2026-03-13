import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FIELD_SCHEMA,
  TEMPLATE_FILES,
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

// ─── Composite field names (multi-font) ──────────────────────────────
const COMPOSITE_FIELDS = new Set(['Start_day', 'End_day', 'Start_hour', 'End_hour']);

// ─── Runtime field info read from PDF template ──────────────────────
interface PDFFieldInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  colorR: number;
  colorG: number;
  colorB: number;
}

/**
 * Read field rectangle, font size, and color directly from the PDF template.
 * This way each template uses its OWN properties regardless of the schema.
 */
function readFieldInfoFromTemplate(
  form: ReturnType<PDFDocument['getForm']>
): Map<string, PDFFieldInfo> {
  const infoMap = new Map<string, PDFFieldInfo>();

  for (const field of form.getFields()) {
    const name = field.getName();
    try {
      const widgets = field.acroField.getWidgets();
      if (widgets.length === 0) continue;

      const rect = widgets[0].getRectangle();
      const da = (field.acroField as { getDefaultAppearance?: () => string })
        .getDefaultAppearance?.() || '';

      // Parse font name and size from DA: "/FontName size Tf"
      let fontSize = 0;
      let fontName = '';
      const tfMatch = da.match(/\/(\S+)\s+(\d+(?:\.\d+)?)\s+Tf/);
      if (tfMatch) {
        fontName = tfMatch[1];
        fontSize = parseFloat(tfMatch[2]);
      }

      // Parse color from DA: "r g b rg" or "r g b RG"
      let colorR = 1, colorG = 1, colorB = 1;
      const rgMatch = da.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/i);
      if (rgMatch) {
        colorR = parseFloat(rgMatch[1]);
        colorG = parseFloat(rgMatch[2]);
        colorB = parseFloat(rgMatch[3]);
      }

      infoMap.set(name, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontSize,
        fontName,
        colorR,
        colorG,
        colorB,
      });
    } catch {
      // Skip fields that can't be read
    }
  }

  return infoMap;
}

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

  // Collect ALL font families we might need
  for (const field of FIELD_SCHEMA.text_fields) {
    families.add(field.font.family);
    const mf = (field as Record<string, unknown>).multi_font as
      | { arabic_font: string; number_font: string }
      | undefined;
    if (mf) {
      families.add(mf.arabic_font);
      families.add(mf.number_font);
    }
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

// ─── Fill PDF Form Fields (regular text only) ────────────────────────

/**
 * Fill regular (non-composite) text form fields with user data.
 * Reads font size from the PDF template's own field properties,
 * falling back to schema values when not available.
 */
function fillTextFields(
  form: ReturnType<PDFDocument['getForm']>,
  formData: Record<string, string | undefined>,
  fontCache: FontCache,
  fieldInfoMap: Map<string, PDFFieldInfo>,
  fontOverrides?: FontOverride
): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    // Skip composite fields - they are drawn directly on the page
    if (COMPOSITE_FIELDS.has(fieldSpec.name)) continue;

    const rawValue = formData[fieldSpec.name as TextFieldName];
    if (!rawValue) continue;

    try {
      const textField = form.getTextField(fieldSpec.name);

      // Read field info from the template (actual properties)
      const templateInfo = fieldInfoMap.get(fieldSpec.name);

      // Determine which font to use by matching font name from template
      let fontFamily = fieldSpec.font.family;
      if (templateInfo?.fontName) {
        // Map template font name to our font families
        const mappedFamily = Object.keys(FONT_PATHS).find(
          (f) => templateInfo.fontName.includes(f.replace('-', ',')) ||
            templateInfo.fontName === f
        );
        if (mappedFamily) fontFamily = mappedFamily;
      }
      const font = fontCache[fontFamily as FontFamily];

      // Use font size from template, fallback to schema
      let fontSize = templateInfo?.fontSize || fieldSpec.font.size;
      if (fieldSpec.name === 'phone') {
        fontSize = fontOverrides?.phone || fontSize;
      }

      textField.setFontSize(fontSize);
      textField.setText(rawValue);

      if (font) {
        textField.updateAppearances(font);
      }

      console.log(`✅ Filled field "${fieldSpec.name}" with "${rawValue}" (${fontSize}pt, font=${fontFamily})`);
    } catch (err) {
      console.warn(`⚠️ Could not fill field "${fieldSpec.name}":`, err);
    }
  }
}

// ─── Composite (Multi-Font) Text Rendering ──────────────────────────

interface TextSegment {
  text: string;
  font: PDFFont;
}

/**
 * Build the multi-font text segments for a composite field.
 */
function buildCompositeSegments(
  fieldSpec: (typeof FIELD_SCHEMA.text_fields)[number],
  rawValue: string,
  fontCache: FontCache
): TextSegment[] | null {
  const mf = (fieldSpec as Record<string, unknown>).multi_font as
    | {
      arabic_font: string;
      number_font: string;
      parts: { key: string; text: string; font_type: string; user_input?: boolean }[];
    }
    | undefined;

  if (!mf) return null;

  const arabicFont = fontCache[mf.arabic_font as FontFamily];
  const numberFont = fontCache[mf.number_font as FontFamily];

  if (!arabicFont || !numberFont) {
    console.warn(`⚠️ Missing fonts for composite field "${fieldSpec.name}"`);
    return null;
  }

  let userData: Record<string, string>;
  try {
    userData = JSON.parse(rawValue);
  } catch {
    console.warn(`⚠️ Invalid JSON for composite field "${fieldSpec.name}": ${rawValue}`);
    return null;
  }

  const segments: TextSegment[] = [];

  for (const part of mf.parts) {
    let text: string;
    if (part.user_input) {
      text = userData[part.key] || '';
    } else {
      text = part.text;
    }

    if (!text) continue;

    // Reverse date format: dd/mm/yyyy → yyyy/mm/dd
    if (part.key === 'date' && /^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [day, month, year] = text.split('/');
      text = `${year}/${month}/${day}`;
    }

    const font = part.font_type === 'arabic' ? arabicFont : numberFont;
    segments.push({ text, font });
  }

  return segments;
}

/**
 * Draw composite (multi-font) text fields directly on the PDF page.
 * Reads position, size, and font size from the actual PDF template fields.
 * Auto-scales font size down if the text would exceed the field width.
 */
function fillCompositeFields(
  page: PDFPage,
  formData: Record<string, string | undefined>,
  fontCache: FontCache,
  fieldInfoMap: Map<string, PDFFieldInfo>
): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    if (!COMPOSITE_FIELDS.has(fieldSpec.name)) continue;

    const rawValue = formData[fieldSpec.name as TextFieldName];
    if (!rawValue) continue;

    const segments = buildCompositeSegments(fieldSpec, rawValue, fontCache);
    if (!segments || segments.length === 0) continue;

    // Read ACTUAL field properties from the PDF template
    const templateInfo = fieldInfoMap.get(fieldSpec.name);
    if (!templateInfo) {
      console.warn(`⚠️ No template field info for "${fieldSpec.name}", skipping`);
      continue;
    }

    // Use template color
    const color = rgb(templateInfo.colorR, templateInfo.colorG, templateInfo.colorB);

    // Use template field boundaries
    const fieldX = templateInfo.x;
    const fieldY = templateInfo.y;
    const fieldW = templateInfo.width;
    const fieldH = templateInfo.height;

    // Start with template font size
    let fontSize = templateInfo.fontSize || fieldSpec.font.size;
    const PADDING = fieldW * 0.05;
    const maxTextWidth = fieldW - PADDING * 2;

    // Measure helper
    const measure = (size: number) => {
      const g = size * 0.4;
      let tw = 0;
      const ws: number[] = [];
      for (const seg of segments) {
        const w = seg.font.widthOfTextAtSize(seg.text, size);
        ws.push(w);
        tw += w;
      }
      tw += g * (segments.length - 1);
      return { totalWidth: tw, segmentWidths: ws, gap: g };
    };

    let m = measure(fontSize);
    let { totalWidth, segmentWidths, gap } = m;

    // Auto-scale down if text overflows
    if (totalWidth > maxTextWidth) {
      const scale = maxTextWidth / totalWidth;
      fontSize = Math.floor(fontSize * scale);
      m = measure(fontSize);
      totalWidth = m.totalWidth;
      segmentWidths = m.segmentWidths;
      gap = m.gap;
      console.log(`📏 Auto-scaled "${fieldSpec.name}" font: ${templateInfo.fontSize}pt → ${fontSize}pt`);
    }

    // Center horizontally & vertically within the field box
    const centerX = fieldX + fieldW / 2;
    const startX = centerX + totalWidth / 2;
    const textY = fieldY + (fieldH - fontSize) / 2;

    // Draw segments RTL: first segment is rightmost
    let cursorX = startX;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const w = segmentWidths[i];
      cursorX -= w;

      page.drawText(seg.text, {
        x: cursorX,
        y: textY,
        size: fontSize,
        font: seg.font,
        color,
      });

      if (i < segments.length - 1) {
        cursorX -= gap;
      }
    }

    console.log(
      `✅ Drew composite "${fieldSpec.name}" (${fontSize}pt) in [x=${fieldX.toFixed(0)}, y=${fieldY.toFixed(0)}, w=${fieldW.toFixed(0)}, h=${fieldH.toFixed(0)}]`
    );
  }
}

// ─── Fill Image Fields ───────────────────────────────────────────────

async function fillImageFields(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  images: BoardImages
): Promise<void> {
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
 * - READS field properties (position, size, font size) from the template itself
 * - Fills regular text fields using form.getTextField().setText()
 * - Fills composite (multi-font) fields by drawing text directly on page
 * - Fills image fields using form.getButton().setImage()
 * - Each template uses its OWN properties automatically!
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
  console.log(`📄 Loading template: ${TEMPLATE_FILES[templateId - 1]}`);
  const templateBytes = await loadAssetBytes(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // 2. Embed fonts
  const fontCache = await loadFonts(pdfDoc);

  // 3. Get form & page
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPage(0);

  // 4. Read field properties from the template itself
  const fieldInfoMap = readFieldInfoFromTemplate(form);
  console.log(`📐 Read ${fieldInfoMap.size} field properties from template`);

  // Log available fields for debugging
  const availableFields = form.getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));
  console.log('📋 Available PDF form fields:', JSON.stringify(availableFields, null, 2));

  // 5. Fill regular text fields using form API
  fillTextFields(form, formData as Record<string, string | undefined>, fontCache, fieldInfoMap, fontOverrides);

  // 6. Fill composite (multi-font) text fields by drawing on page
  fillCompositeFields(page, formData as Record<string, string | undefined>, fontCache, fieldInfoMap);

  // 7. Fill image fields
  await fillImageFields(pdfDoc, form, images);

  // 8. Save with updateFieldAppearances: false
  //    We already called updateAppearances() on each regular field individually.
  //    The global update would crash on rich-text composite fields.
  return pdfDoc.save({ updateFieldAppearances: false });
}

export async function inspectTemplateFields(templateId: number): Promise<{ name: string; type: string }[]> {
  if (templateId < 1 || templateId > TEMPLATE_FILES.length) {
    throw new Error(`Invalid templateId "${templateId}".`);
  }
  const templateBytes = await loadAssetBytes(`/templates/${TEMPLATE_FILES[templateId - 1]}`);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  return form.getFields().map((f) => ({ name: f.getName(), type: f.constructor.name }));
}