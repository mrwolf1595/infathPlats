# GitHub Copilot Instructions for Nafeth Board Generator

## Project Overview
Building a Next.js web application to generate large-format PDF auction boards (4m x 2m) for Nafeth (Saudi auction platform). Users fill a form, and the app overlays text/images on PDF templates.

---

## Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **PDF Generation**: `pdf-lib` + `@pdf-lib/fontkit`
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form + Zod validation
- **File Upload**: React Dropzone
- **QR Generation**: `qrcode` library

---

## Key Requirements

### 1. PDF Template System
- **6 different templates** (user selects one)
- Each template is a PDF file stored in `/public/templates/`
- Load base PDF and overlay text/images on specific coordinates
- **NO PDF form fields** - we overlay content programmatically

### 2. Field Configuration Reference
**CRITICAL**: Use these files as the single source of truth:
- `form_fields_schema.json` - Complete field specifications
- `form_fields_analysis.md` - Detailed documentation

**Key points from schema:**
- 14 text fields with exact positions (x, y coordinates in PDF points)
- 2 image fields (Company_logo, QRcode)
- Font sizes range from 12pt to 300pt
- Colors: white (RGB: 1,1,1) and dark blue (RGB: 0.082, 0.105, 0.266)
- Board dimensions: 11338.6 x 5669.29 points (4m x 2m)

### 3. Font Size Override
**User-specified fields for custom font sizes:**
- Only these fields can have font size > 300pt (up to 800pt+):
  - `Type` (نوع العقار) - default 300pt
  - `Auction_name` (اسم المزاد) - default 278pt
  - [User will specify 1-2 more fields]

**All other fields:**
- Use exact font sizes from `form_fields_schema.json`
- DO NOT allow user modification

### 4. Arabic Font Support
**Fonts used (in order of priority):**
1. LamaSans-Medium (7 fields)
2. RuaqArabic-Medium (4 fields)
3. Rubik-Medium (1 field)

**Font loading:**
```typescript
// Load Arabic fonts from /public/fonts/
const fontBytes = await fetch('/fonts/LamaSans-Medium.ttf').then(r => r.arrayBuffer());
pdfDoc.registerFontkit(fontkit);
const customFont = await pdfDoc.embedFont(fontBytes);
```

### 5. Text Rendering with RTL Support
**Critical for Arabic:**
```typescript
// Use pdf-lib's text positioning
page.drawText(arabicText, {
  x: fieldConfig.position.x,
  y: fieldConfig.position.y,
  size: fieldConfig.font.size,
  font: arabicFont,
  color: rgb(fieldConfig.color.r, fieldConfig.color.g, fieldConfig.color.b),
  // Right-to-left alignment for Arabic
});
```

---

## Project Structure

```
nafeth-board-generator/
├── app/
│   ├── page.tsx                 # Main form page
│   ├── api/
│   │   └── generate-pdf/
│   │       └── route.ts         # PDF generation endpoint
│   └── layout.tsx
│
├── components/
│   ├── TemplateSelector.tsx     # Choose from 6 templates
│   ├── FormFields.tsx           # Dynamic form based on schema
│   ├── FontSizeOverride.tsx     # Only for specified fields
│   ├── ImageUploader.tsx        # Logo & QR upload
│   └── PDFPreview.tsx           # Optional preview
│
├── lib/
│   ├── pdf-generator.ts         # Core PDF overlay logic
│   ├── field-schema.ts          # Type definitions from JSON
│   └── validation.ts            # Zod schemas
│
├── public/
│   ├── templates/
│   │   ├── template_1.pdf
│   │   ├── template_2.pdf
│   │   └── ... (6 total)
│   ├── fonts/
│   │   ├── LamaSans-Medium.ttf
│   │   ├── RuaqArabic-Medium.ttf
│   │   └── Rubik-Medium.ttf
│   └── schemas/
│       └── form_fields_schema.json  # REFERENCE FILE
│
└── package.json
```

---

## Implementation Guide

### Step 1: Load Schema
```typescript
// lib/field-schema.ts
import schemaJSON from '@/public/schemas/form_fields_schema.json';

export const FIELD_SCHEMA = schemaJSON;
export type TextField = typeof schemaJSON.text_fields[0];
export type ImageField = typeof schemaJSON.image_fields[0];
```

### Step 2: Dynamic Form Generation
```typescript
// components/FormFields.tsx
import { FIELD_SCHEMA } from '@/lib/field-schema';

export function FormFields() {
  const textFields = FIELD_SCHEMA.text_fields;
  
  return (
    <div>
      {textFields.map(field => (
        <div key={field.name}>
          <label>{field.label_ar}</label>
          <input 
            name={field.name}
            required={field.required}
            placeholder={field.label_en}
          />
        </div>
      ))}
    </div>
  );
}
```

### Step 3: Font Size Override Component
```typescript
// components/FontSizeOverride.tsx
const ALLOWED_CUSTOM_FONTS = ['Type', 'Auction_name']; // User specifies more

export function FontSizeOverride() {
  return (
    <div>
      <h3>تكبير الخط (اختياري)</h3>
      {ALLOWED_CUSTOM_FONTS.map(fieldName => (
        <div key={fieldName}>
          <label>{fieldName}</label>
          <input 
            type="number" 
            min={300} 
            max={800}
            placeholder="300"
          />
        </div>
      ))}
    </div>
  );
}
```

### Step 4: PDF Generation API
```typescript
// app/api/generate-pdf/route.ts
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function POST(req: Request) {
  const { templateId, formData, fontOverrides, images } = await req.json();
  
  // 1. Load template PDF
  const templatePath = `/templates/template_${templateId}.pdf`;
  const templateBytes = await fetch(templatePath).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  // 2. Register fonts
  pdfDoc.registerFontkit(fontkit);
  const fonts = await loadArabicFonts(pdfDoc);
  
  // 3. Get first page
  const page = pdfDoc.getPages()[0];
  
  // 4. Overlay text fields
  for (const field of FIELD_SCHEMA.text_fields) {
    const value = formData[field.name];
    if (!value) continue;
    
    // Check if font size is overridden
    const fontSize = fontOverrides[field.name] || field.font.size;
    
    page.drawText(value, {
      x: field.position.x,
      y: field.position.y,
      size: fontSize,
      font: fonts[field.font.family],
      color: rgb(field.color.r, field.color.g, field.color.b),
    });
  }
  
  // 5. Overlay images
  const logoImage = await pdfDoc.embedPng(images.logo);
  const qrImage = await pdfDoc.embedPng(images.qr);
  
  page.drawImage(logoImage, {
    x: FIELD_SCHEMA.image_fields[0].position.x,
    y: FIELD_SCHEMA.image_fields[0].position.y,
    width: FIELD_SCHEMA.image_fields[0].size.width_pt,
    height: FIELD_SCHEMA.image_fields[0].size.height_pt,
  });
  
  // 6. Save and return
  const pdfBytes = await pdfDoc.save();
  
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="board.pdf"',
    },
  });
}
```

---

## Critical Rules for Copilot

### ✅ DO:
- Read field positions/sizes from `form_fields_schema.json` - never hardcode
- Use exact font sizes from schema (except user-specified override fields)
- Support Arabic RTL text rendering
- Load fonts from `/public/fonts/`
- Validate all inputs with Zod
- Handle image uploads (logo, QR) with proper base64 encoding
- Generate QR codes dynamically using `qrcode` library

### ❌ DON'T:
- Modify PDF form fields (we overlay, not fill)
- Allow font size changes for fields not in ALLOWED_CUSTOM_FONTS
- Hardcode field positions or styles
- Use default PDF fonts (they don't support Arabic)
- Forget to convert coordinates (PDF uses bottom-left origin)

---

## Coordinate System Note
**PDF coordinates start from bottom-left**, but our schema uses top-left reference.
Convert Y-axis:
```typescript
const pdfY = pageHeight - field.position.y - field.size.height_pt;
```

---

## Testing Checklist
- [ ] All 14 text fields render at correct positions
- [ ] Arabic text displays correctly (RTL)
- [ ] Font size overrides work for specified fields only
- [ ] Logo and QR code images embed properly
- [ ] Output PDF matches 4m x 2m dimensions
- [ ] Works with all 6 templates

---

## Performance Optimization
- Lazy load PDF templates (only selected one)
- Cache embedded fonts across generations
- Use Web Workers for PDF generation if needed
- Compress images before embedding

---

## Example Usage Flow
1. User selects Template #1
2. Form auto-populates with fields from schema
3. User fills: auction name, dates, property details
4. User uploads company logo (PNG/JPG)
5. App auto-generates QR code from auction URL
6. User optionally increases font size for "Type" field to 500pt
7. Click "Generate Board"
8. API overlays all data on template PDF
9. Browser downloads final 4m x 2m PDF

---

## Additional Context
- Target users: Saudi law firms and auction execution offices
- Boards are printed on large-format printers
- Must support high-resolution output (300 DPI+)
- Arabic is primary language (all labels in Arabic)

---

**Reference Files:**
- `form_fields_schema.json` - Field specifications (PRIMARY REFERENCE)
- `form_fields_analysis.md` - Human-readable documentation
- Template PDFs - Background designs (in `/public/templates/`)

**Start by:**
1. Setting up Next.js project with TypeScript
2. Installing dependencies: `pdf-lib`, `@pdf-lib/fontkit`, `qrcode`, `react-hook-form`, `zod`
3. Creating the project structure above
4. Implementing the core PDF generation logic in `/lib/pdf-generator.ts`
