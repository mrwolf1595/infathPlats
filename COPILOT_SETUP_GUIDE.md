# VSCode Workspace Settings for GitHub Copilot

Create this file in your project root: `.vscode/settings.json`

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": true,
    "markdown": true,
    "typescript": true,
    "typescriptreact": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "inlineSuggest.enable": true
  },
  "files.associations": {
    "*.md": "markdown",
    "COPILOT_PROMPT.md": "markdown"
  },
  "editor.quickSuggestions": {
    "comments": true,
    "strings": true,
    "other": true
  },
  "editor.suggestOnTriggerCharacters": true,
  "editor.acceptSuggestionOnEnter": "on",
  "editor.tabCompletion": "on",
  "github.copilot.editor.enableAutoCompletions": true
}
```

---

# How to Use This Prompt with GitHub Copilot

## Step 1: Setup Project
```bash
# Create Next.js project
npx create-next-app@latest nafeth-board-generator --typescript --tailwind --app

cd nafeth-board-generator

# Install dependencies
npm install pdf-lib @pdf-lib/fontkit qrcode
npm install -D @types/qrcode

# For forms
npm install react-hook-form zod @hookform/resolvers
npm install react-dropzone
```

## Step 2: Add Reference Files
Create folder structure:
```bash
mkdir -p public/templates public/fonts public/schemas
mkdir -p lib components app/api/generate-pdf
```

Copy the generated files:
- Put `form_fields_schema.json` in `public/schemas/`
- Put `form_fields_analysis.md` in project root (for reference)
- Put `COPILOT_PROMPT.md` in project root

## Step 3: Configure Copilot
1. Open `COPILOT_PROMPT.md` in VSCode
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: "Copilot: Set Instructions for Copilot"
4. Select the `COPILOT_PROMPT.md` file

**OR** create `.github/copilot-instructions.md` in your repo root with the same content.

## Step 4: Start Coding with Copilot

### Method 1: Inline Comments
Open a new file and write:
```typescript
// Create PDF generator that loads template PDF, embeds Arabic fonts,
// and overlays text fields based on form_fields_schema.json
// Use pdf-lib and support font sizes up to 800pt
```
Then press Enter, and Copilot will generate the code!

### Method 2: Copilot Chat
Open Copilot Chat panel (`Ctrl+Shift+I`) and ask:
```
Create the PDF generation API route in app/api/generate-pdf/route.ts
Use the specifications from form_fields_schema.json
Support Arabic fonts and allow font size override for Type and Auction_name fields
```

### Method 3: Use Copilot Workspace
Type `@workspace` in Copilot Chat:
```
@workspace Create the complete form component that reads fields from 
public/schemas/form_fields_schema.json and renders them dynamically
```

---

# Quick Start Commands for Copilot

## Generate Core Files

### 1. Type Definitions
Create `lib/types.ts` and write:
```typescript
// Import field schema JSON and create TypeScript types
// Include TextField, ImageField, BoardData, FontOverride types
```

### 2. PDF Generator
Create `lib/pdf-generator.ts` and write:
```typescript
// Create generateBoard function that:
// 1. Loads PDF template
// 2. Embeds Arabic fonts from /public/fonts
// 3. Overlays text at positions from schema
// 4. Handles font size overrides for Type and Auction_name
// 5. Embeds logo and QR images
// 6. Returns PDF as Uint8Array
```

### 3. Form Component
Create `components/BoardForm.tsx` and write:
```typescript
// Create React form component using react-hook-form
// Read fields from form_fields_schema.json
// Group fields: essential, property_details, auction_info
// Add validation with zod
// Include template selector (1-6)
// Add font size override inputs for Type and Auction_name only
```

### 4. API Route
Create `app/api/generate-pdf/route.ts` and write:
```typescript
// Create Next.js API route POST handler
// Accept: templateId, formData, fontOverrides, images (logo, qr)
// Use pdf-generator.ts to create PDF
// Return PDF as download
```

---

# Testing Prompts

After generating code, use these to test:

## Test PDF Generation
```typescript
// Create test function that generates a sample board
// Use mock data from form_fields_schema.json
// Template 1, with sample Arabic text
// Font size 500pt for Type field
// Include sample logo and QR code
```

## Test Arabic Fonts
```typescript
// Create test to verify Arabic fonts load correctly
// Check if LamaSans, RuaqArabic, Rubik are embedded
// Test RTL text rendering
```

## Test Coordinate System
```typescript
// Create visualization function that shows field positions
// Convert PDF coordinates to canvas/HTML for preview
// Highlight where each field will appear
```

---

# Common Copilot Prompts During Development

### When stuck:
```
// Explain why this text is not appearing at the correct position
// [paste your code]
```

### For debugging:
```
// Add console logs to show:
// - Loaded font names
// - Field positions before/after conversion
// - Image dimensions
```

### For optimization:
```
// Refactor this to cache embedded fonts
// Use async/await properly
// Add error handling for missing fonts
```

### For styling:
```
// Style this form with Tailwind CSS
// Use card layout, group related fields
// Add Arabic RTL support
// Make it responsive
```

---

# Pro Tips for Copilot

1. **Always reference the schema:**
   ```typescript
   // Use FIELD_SCHEMA from form_fields_schema.json
   ```

2. **Be specific about constraints:**
   ```typescript
   // Only allow font override for fields: ['Type', 'Auction_name']
   // Max font size: 800pt
   ```

3. **Mention the docs:**
   ```typescript
   // Refer to form_fields_analysis.md for field descriptions
   ```

4. **Ask for examples:**
   ```
   Show me an example of overlaying Arabic text at position x=9127, y=3165
   with font size 94pt using pdf-lib
   ```

5. **Request validation:**
   ```typescript
   // Add Zod schema to validate:
   // - Required fields: auction_name, type, start_day, end_day
   // - Phone must be Saudi format
   // - Area must be number with unit
   ```

---

# Folder Structure for Reference

Place these files so Copilot can find them:

```
nafeth-board-generator/
├── COPILOT_PROMPT.md           ← Main instruction file
├── form_fields_analysis.md      ← Human docs (reference)
├── public/
│   └── schemas/
│       └── form_fields_schema.json  ← PRIMARY SOURCE
└── .vscode/
    └── settings.json            ← Copilot settings
```

---

# Final Checklist Before Starting

- [ ] `COPILOT_PROMPT.md` in project root
- [ ] `form_fields_schema.json` in `public/schemas/`
- [ ] VSCode GitHub Copilot extension installed
- [ ] `.vscode/settings.json` configured
- [ ] Next.js project initialized
- [ ] Dependencies installed (`pdf-lib`, etc.)
- [ ] Arabic fonts downloaded in `public/fonts/`
- [ ] Template PDFs ready in `public/templates/`

**Now you're ready! Start coding and let Copilot help you! 🚀**
