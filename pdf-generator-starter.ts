// lib/pdf-generator.ts
/**
 * Core PDF Generation Engine for Nafeth Board Generator
 * 
 * This file handles:
 * 1. Loading PDF templates (4m x 2m)
 * 2. Embedding Arabic fonts (LamaSans, RuaqArabic, Rubik)
 * 3. Overlaying text at exact positions from form_fields_schema.json
 * 4. Supporting font sizes up to 800pt (override default)
 * 5. Embedding images (logo, QR code)
 * 
 * Reference: public/schemas/form_fields_schema.json
 */

import { PDFDocument, PDFPage, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Import the field schema
import FIELD_SCHEMA from '@/public/schemas/form_fields_schema.json';

// Types
interface GenerateBoardOptions {
  templateId: number; // 1-6
  formData: Record<string, string>; // Field name → value
  fontOverrides?: Record<string, number>; // Field name → custom font size
  images: {
    logo?: string; // Base64 PNG/JPG
    qr?: string; // Base64 PNG
  };
}

interface FontCache {
  'LamaSans-Medium'?: PDFFont;
  'RuaqArabic-Medium'?: PDFFont;
  'Rubik-Medium'?: PDFFont;
}

// Constants from schema
const BOARD_WIDTH = FIELD_SCHEMA.board_info.dimensions.width_pt;
const BOARD_HEIGHT = FIELD_SCHEMA.board_info.dimensions.height_pt;
const ALLOWED_FONT_OVERRIDES = ['phone']; // User can customize these

/**
 * Load and embed Arabic fonts into PDF document
 */
async function loadFonts(pdfDoc: PDFDocument): Promise<FontCache> {
  // TODO: Implement font loading
  // 1. Fetch font files from /public/fonts/
  // 2. Register fontkit
  // 3. Embed each font
  // 4. Return font cache object
  
  pdfDoc.registerFontkit(fontkit);
  
  const fonts: FontCache = {};
  
  // Example:
  // const lamaSansBytes = await fetch('/fonts/LamaSans-Medium.ttf').then(r => r.arrayBuffer());
  // fonts['LamaSans-Medium'] = await pdfDoc.embedFont(lamaSansBytes);
  
  return fonts;
}

/**
 * Convert top-left coordinates to PDF bottom-left coordinates
 */
function convertCoordinates(x: number, y: number, height: number): { x: number; y: number } {
  // TODO: Implement coordinate conversion
  // PDF uses bottom-left origin, our schema uses top-left
  
  return {
    x,
    y: BOARD_HEIGHT - y - height,
  };
}

/**
 * Main PDF generation function
 */
export async function generateBoard(options: GenerateBoardOptions): Promise<Uint8Array> {
  const { templateId, formData, fontOverrides = {}, images } = options;
  
  try {
    // Step 1: Load template PDF
    // TODO: Load template from /public/templates/template_X.pdf
    const templateUrl = `/templates/template_${templateId}.pdf`;
    const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Step 2: Load fonts
    const fonts = await loadFonts(pdfDoc);
    
    // Step 3: Get first page (our board is single page)
    const page = pdfDoc.getPages()[0];
    
    // Step 4: Overlay text fields
    for (const field of FIELD_SCHEMA.text_fields) {
      const value = formData[field.name];
      if (!value) continue; // Skip empty fields
      
      // Determine font size (use override if allowed and provided)
      let fontSize = field.font.size;
      if (ALLOWED_FONT_OVERRIDES.includes(field.name) && fontOverrides[field.name]) {
        fontSize = fontOverrides[field.name];
      }
      
      // Get font
      const font = fonts[field.font.family as keyof FontCache];
      if (!font) {
        console.warn(`Font ${field.font.family} not loaded`);
        continue;
      }
      
      // Convert coordinates
      const coords = convertCoordinates(
        field.position.x,
        field.position.y,
        field.size.height_pt
      );
      
      // Draw text
      page.drawText(value, {
        x: coords.x,
        y: coords.y,
        size: fontSize,
        font: font,
        color: rgb(field.color.r, field.color.g, field.color.b),
        // TODO: Add maxWidth constraint and text wrapping if needed
      });
    }
    
    // Step 5: Overlay images
    if (images.logo) {
      // TODO: Decode base64, embed image, draw at Company_logo position
      const logoField = FIELD_SCHEMA.image_fields.find(f => f.name === 'Company_logo');
      if (logoField) {
        // Decode base64
        // Embed image
        // Draw image
      }
    }
    
    if (images.qr) {
      // TODO: Embed QR code at QRcode position
      const qrField = FIELD_SCHEMA.image_fields.find(f => f.name === 'QRcode');
      if (qrField) {
        // Similar to logo
      }
    }
    
    // Step 6: Save and return PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`Failed to generate board: ${error}`);
  }
}

/**
 * Helper: Generate QR code from URL
 */
export async function generateQRCode(url: string): Promise<string> {
  // TODO: Use qrcode library to generate QR as base64 PNG
  // import QRCode from 'qrcode';
  // return await QRCode.toDataURL(url);
  
  return ''; // Placeholder
}

/**
 * Helper: Validate form data against schema requirements
 */
export function validateFormData(data: Record<string, string>): { 
  valid: boolean; 
  errors: string[] 
} {
  // TODO: Check required fields from FIELD_SCHEMA.field_groups.essential
  const errors: string[] = [];
  
  const requiredFields = FIELD_SCHEMA.text_fields.filter(f => f.required);
  
  for (const field of requiredFields) {
    if (!data[field.name] || data[field.name].trim() === '') {
      errors.push(`${field.label_ar} مطلوب`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export types
export type { GenerateBoardOptions, FontCache };
