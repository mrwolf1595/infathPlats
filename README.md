# 🎨 Nafeth Board Generator

Next.js application for generating large-format PDF auction boards (4m x 2m) for the Nafeth platform (Saudi auction system).

## 📋 Overview

This tool allows users to:
- Select from 6 pre-designed templates
- Fill in auction details via a web form
- Upload company logo and generate QR codes
- Customize font sizes for specific fields (up to 800pt)
- Generate production-ready PDF files for large-format printing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- GitHub Copilot (for development)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd nafeth-board-generator

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
nafeth-board-generator/
├── app/
│   ├── page.tsx                    # Main form page
│   ├── api/generate-pdf/
│   │   └── route.ts                # PDF generation API
│   └── layout.tsx
│
├── components/
│   ├── TemplateSelector.tsx        # Choose from 6 templates
│   ├── BoardForm.tsx               # Dynamic form based on schema
│   ├── FontSizeOverride.tsx        # Custom font size controls
│   ├── ImageUploader.tsx           # Logo & QR upload
│   └── PDFPreview.tsx              # Optional preview
│
├── lib/
│   ├── pdf-generator.ts            # Core PDF overlay logic ⭐
│   ├── types.ts                    # TypeScript definitions
│   └── validation.ts               # Zod schemas
│
├── public/
│   ├── templates/
│   │   ├── template_1.pdf          # 6 PDF templates
│   │   └── ...
│   ├── fonts/
│   │   ├── LamaSans-Medium.ttf     # Arabic fonts
│   │   ├── RuaqArabic-Medium.ttf
│   │   └── Rubik-Medium.ttf
│   └── schemas/
│       └── form_fields_schema.json # Field specifications ⭐⭐
│
├── COPILOT_PROMPT.md               # Instructions for GitHub Copilot
├── COPILOT_SETUP_GUIDE.md          # How to use Copilot
└── form_fields_analysis.md         # Field documentation
```

## 🎯 Key Features

### 1. Schema-Driven Form Generation
All form fields are generated dynamically from `form_fields_schema.json`:
- 14 text fields (auction info, property details)
- 2 image fields (logo, QR code)
- Exact positioning and styling specs

### 2. Advanced Font Support
- Arabic RTL text rendering
- Font sizes from 12pt to 800pt
- Custom font size override for:
  - `Type` (نوع العقار)
  - `Auction_name` (اسم المزاد)

### 3. Multiple Templates
Choose from 6 professionally designed templates, each with:
- 4m × 2m dimensions (large-format print)
- Consistent field layout
- Brand-specific styling

### 4. Image Handling
- Company logo upload (PNG/JPG)
- Automatic QR code generation
- Precise positioning on board

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **PDF Generation**: pdf-lib + @pdf-lib/fontkit
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS
- **File Upload**: React Dropzone
- **QR Codes**: qrcode library

## 📝 Development with GitHub Copilot

This project is optimized for GitHub Copilot. See `COPILOT_SETUP_GUIDE.md` for:
- How to configure Copilot for this project
- Example prompts for common tasks
- Best practices for AI-assisted development

**Quick start:**
1. Open `COPILOT_PROMPT.md` in VSCode
2. Use `@workspace` in Copilot Chat
3. Reference the schema: "Use form_fields_schema.json"

## 🎨 Field Schema Reference

All field specifications are in `public/schemas/form_fields_schema.json`:

```json
{
  "text_fields": [
    {
      "name": "Auction_name",
      "label_ar": "اسم المزاد",
      "position": { "x": 9133.26, "y": 903.90 },
      "size": { "width_pt": 1496.34, "height_pt": 939.00 },
      "font": { "family": "RuaqArabic-Medium", "size": 278 },
      "color": { "r": 0.082, "g": 0.105, "b": 0.266 },
      "required": true
    }
    // ... 13 more fields
  ],
  "image_fields": [ /* ... */ ]
}
```

**Key Properties:**
- `position`: X, Y coordinates in PDF points
- `size`: Width and height in points
- `font`: Family name and default size
- `color`: RGB values (0-1 range)
- `required`: Whether field is mandatory

## 🔧 Configuration

### Font Size Overrides
Only these fields allow custom font sizes (300-800pt):
- `Type` (نوع العقار)
- `Auction_name` (اسم المزاد)

All other fields use their default sizes from the schema.

### Template Management
To add a new template:
1. Export PDF (4m × 2m) from design software
2. Save as `public/templates/template_X.pdf`
3. Create corresponding schema (if layout differs)
4. Update template selector options

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## 📐 Coordinate System

**Important:** PDF coordinates start from bottom-left, but our schema uses top-left reference.

The `convertCoordinates()` function handles this:
```typescript
y_pdf = BOARD_HEIGHT - y_schema - field_height
```

## 🌐 Deployment

### Environment Variables
None required for basic functionality.

Optional:
- `NEXT_PUBLIC_API_URL`: For production API endpoint

### Build & Deploy
```bash
npm run build
npm start
```

Recommended platforms:
- **Vercel** (Next.js optimized)
- **Netlify**
- **Railway** (if you need backend processing)

## 📄 API Reference

### POST `/api/generate-pdf`

Generate a PDF board from form data.

**Request Body:**
```json
{
  "templateId": 1,
  "formData": {
    "Auction_name": "بيع فيلا سكنية",
    "Type": "فيلا",
    "Start_day": "2024/03/15",
    "End_day": "2024/03/22",
    // ... other fields
  },
  "fontOverrides": {
    "Type": 500,
    "Auction_name": 400
  },
  "images": {
    "logo": "data:image/png;base64,...",
    "qr": "data:image/png;base64,..."
  }
}
```

**Response:**
- Content-Type: `application/pdf`
- Body: PDF file (binary)

## 🐛 Troubleshooting

### Text not appearing
- Check font is loaded correctly
- Verify coordinates are within page bounds
- Ensure font size isn't too large for field

### Arabic text reversed
- Make sure using Arabic-capable fonts
- Check RTL text direction setting
- Verify font embedding

### Images not showing
- Confirm image is valid PNG/JPG
- Check base64 encoding is correct
- Verify position coordinates

## 📚 Resources

- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

[Your License Here]

## 🙏 Acknowledgments

- Nafeth platform team
- Saudi Ministry of Justice
- Arabic font creators

---

**Made with ❤️ for Saudi Arabia's auction execution system**
