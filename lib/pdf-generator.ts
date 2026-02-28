import { PDFDocument, PDFPage, PDFFont, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FIELD_SCHEMA,
  BOARD_HEIGHT,
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
  'Rubik-Medium': '/fonts/Rubik-Medium.ttf',
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

// ─── Coordinate Conversion ───────────────────────────────────────────

/**
 * Convert from top-left origin (schema) to bottom-left origin (PDF).
 */
function convertY(schemaY: number, fieldHeight: number): number {
  return BOARD_HEIGHT - schemaY - fieldHeight;
}

// ─── Text Drawing Helpers ────────────────────────────────────────────

/**
 * Draw centered text at a given position.
 */
function drawCenteredText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: PDFFont,
  color: { r: number; g: number; b: number }
): void {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const centeredX = x - textWidth / 2;

  page.drawText(text, {
    x: centeredX,
    y,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Split "مزاد سهيل تبوك" into ["مزاد", "سهيل تبوك"].
 */
function splitAuctionName(text: string): [string, string] {
  const parts = text.trim().split(/\s+/);
  if (parts[0] === 'مزاد' && parts.length > 1) {
    return ['مزاد', parts.slice(1).join(' ')];
  }
  return [text, ''];
}

/**
 * Split "عمارة سكنية - تجارية" into ["عمارة", "سكنية - تجارية"].
 * Only if >2 words.
 */
function splitTypeIfNeeded(text: string): { lines: string[]; useLargeFont: boolean } {
  const words = text.trim().split(/\s+/);
  if (words.length > 2) {
    return {
      lines: [words[0], words.slice(1).join(' ')],
      useLargeFont: true,
    };
  }
  return { lines: [text], useLargeFont: false };
}

// ─── Text Field Rendering ────────────────────────────────────────────

function overlayTextFields(
  page: PDFPage,
  formData: Record<string, string | undefined>,
  fontCache: FontCache,
  fontOverrides?: FontOverride
): void {
  for (const fieldSpec of FIELD_SCHEMA.text_fields) {
    const rawValue = formData[fieldSpec.name as TextFieldName];
    if (!rawValue) continue;

    const font = fontCache[fieldSpec.font.family as FontFamily];
    if (!font) {
      console.warn(`Font not loaded for "${fieldSpec.font.family}"`);
      continue;
    }

    let fontSize = fieldSpec.font.size;
    
    // Override for phone field
    if (fieldSpec.name === 'phone') {
      fontSize = fontOverrides?.phone || 808;
    }

    // Calculate center X position
    const fieldCenterX = fieldSpec.position.x + fieldSpec.size.width_pt / 2;
    
    // Convert Y coordinate
    const baseY = convertY(fieldSpec.position.y, fieldSpec.size.height_pt);

    // Special handling for Auction_name
    if (fieldSpec.name === 'Auction_name') {
      const [line1, line2] = splitAuctionName(rawValue);
      
      if (line2) {
        // Two lines
        const lineHeight = fontSize * 1.2;
        const y1 = baseY + fieldSpec.size.height_pt / 2 + lineHeight / 4;
        const y2 = baseY + fieldSpec.size.height_pt / 2 - lineHeight / 1.5;
        
        drawCenteredText(page, line1, fieldCenterX, y1, fontSize, font, fieldSpec.color);
        drawCenteredText(page, line2, fieldCenterX, y2, fontSize, font, fieldSpec.color);
      } else {
        // Single line
        const y = baseY + fieldSpec.size.height_pt / 2 - fontSize / 3;
        drawCenteredText(page, line1, fieldCenterX, y, fontSize, font, fieldSpec.color);
      }
      continue;
    }

    // Special handling for Type field
    if (fieldSpec.name === 'Type') {
      const { lines, useLargeFont } = splitTypeIfNeeded(rawValue);
      const typeFontSize = useLargeFont ? 400 : fontSize;
      
      if (lines.length === 2) {
        const lineHeight = typeFontSize * 1.2;
        const y1 = baseY + fieldSpec.size.height_pt / 2 + lineHeight / 4;
        const y2 = baseY + fieldSpec.size.height_pt / 2 - lineHeight / 1.5;
        
        drawCenteredText(page, lines[0], fieldCenterX, y1, typeFontSize, font, fieldSpec.color);
        drawCenteredText(page, lines[1], fieldCenterX, y2, typeFontSize, font, fieldSpec.color);
      } else {
        const y = baseY + fieldSpec.size.height_pt / 2 - typeFontSize / 3;
        drawCenteredText(page, lines[0], fieldCenterX, y, typeFontSize, font, fieldSpec.color);
      }
      continue;
    }

    // All other fields: single line, centered
    const y = baseY + fieldSpec.size.height_pt / 2 - fontSize / 3;
    drawCenteredText(page, rawValue, fieldCenterX, y, fontSize, font, fieldSpec.color);
  }
}

// ─── Image Drawing ───────────────────────────────────────────────────

async function overlayImages(
  pdfDoc: PDFDocument,
  page: PDFPage,
  images: BoardImages
): Promise<void> {
  // Logo
  if (images.logo) {
    const logoSpec = FIELD_SCHEMA.image_fields.find(f => f.name === 'Company_logo');
    if (logoSpec) {
      const imageBytes = base64ToUint8Array(images.logo);
      const image = isJpeg(images.logo)
        ? await pdfDoc.embedJpg(imageBytes)
        : await pdfDoc.embedPng(imageBytes);

      const x = logoSpec.position.x;
      const y = convertY(logoSpec.position.y, logoSpec.size.height_pt);

      page.drawImage(image, {
        x,
        y,
        width: logoSpec.size.width_pt,
        height: logoSpec.size.height_pt,
      });
    }
  }

  // QR Code
  if (images.qr) {
    const qrSpec = FIELD_SCHEMA.image_fields.find(f => f.name === 'QRcode');
    if (qrSpec) {
      const imageBytes = base64ToUint8Array(images.qr);
      const image = await pdfDoc.embedPng(imageBytes);

      const x = qrSpec.position.x;
      const y = convertY(qrSpec.position.y, qrSpec.size.height_pt);

      page.drawImage(image, {
        x,
        y,
        width: qrSpec.size.width_pt,
        height: qrSpec.size.height_pt,
      });
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
 * Generate PDF by overlaying text and images on a template.
 * 
 * This approach:
 * - Loads the template PDF as a flat background
 * - Draws text at exact coordinates with perfect centering
 * - Draws images at exact positions
 * - No form fields = no alignment issues!
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

  // 3. Get first page
  const page = pdfDoc.getPages()[0];

  // 4. Overlay text fields
  overlayTextFields(page, formData as Record<string, string | undefined>, fontCache, fontOverrides);

  // 5. Overlay images
  await overlayImages(pdfDoc, page, images);

  // 6. Save
  return pdfDoc.save();
}

export async function inspectTemplateFields(templateId: number): Promise<{ name: string; type: string }[]> {
  const templateBytes = await loadAssetBytes(`/templates/template_${templateId}.pdf`);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  return form.getFields().map((f) => ({ name: f.getName(), type: f.constructor.name }));
}