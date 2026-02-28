import schemaJSON from '@/public/schemas/form_fields_schema.json';

// ─── Schema Constants ────────────────────────────────────────────────
export const FIELD_SCHEMA = schemaJSON;

export const BOARD_WIDTH = FIELD_SCHEMA.board_info.dimensions.width_pt; // 11338.6
export const BOARD_HEIGHT = FIELD_SCHEMA.board_info.dimensions.height_pt; // 5669.29

/** Fields that allow user font-size override (up to 1000pt) */
export const ALLOWED_FONT_OVERRIDES = ['phone'] as const;

// ─── Inferred Types from Schema ──────────────────────────────────────

/** A single text field entry from form_fields_schema.json */
export type TextField = (typeof schemaJSON.text_fields)[number];

/** A single image field entry from form_fields_schema.json */
export type ImageField = (typeof schemaJSON.image_fields)[number];

/** Union of all text field `name` values */
export type TextFieldName = TextField['name'];

/** Union of all image field `name` values */
export type ImageFieldName = ImageField['name'];

/** Union of field names that support font-size override */
export type FontOverrideFieldName = (typeof ALLOWED_FONT_OVERRIDES)[number];

/** Font family names used across the schema */
export type FontFamily = TextField['font']['family'];

// ─── Form Input Types ────────────────────────────────────────────────

/** User-supplied text values keyed by field name */
export type BoardFormData = {
  [K in TextFieldName]?: string;
};

/** Optional font-size overrides (only for allowed fields) */
export type FontOverride = {
  [K in FontOverrideFieldName]?: number;
};

/** Base64-encoded image payloads */
export interface BoardImages {
  /** Company logo as base64 PNG/JPG */
  logo?: string;
  /** QR code as base64 PNG */
  qr?: string;
}

// ─── PDF Generation Options ──────────────────────────────────────────

/** Full payload sent to the PDF generation API */
export interface GenerateBoardOptions {
  /** Template ID (1–6) */
  templateId: number;
  /** Text field values */
  formData: BoardFormData;
  /** Custom font sizes for allowed fields */
  fontOverrides?: FontOverride;
  /** Uploaded / generated images */
  images: BoardImages;
}

// ─── Font Cache ──────────────────────────────────────────────────────

import type { PDFFont } from 'pdf-lib';

/** Cached embedded PDF fonts keyed by family name */
export type FontCache = {
  [K in FontFamily]?: PDFFont;
};

// ─── API Response Types ──────────────────────────────────────────────

/** Validation result returned by validateFormData() */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Color descriptor from the schema (RGB 0–1 range) */
export interface FieldColor {
  r: number;
  g: number;
  b: number;
  name: string;
}

/** Position descriptor from the schema (PDF points) */
export interface FieldPosition {
  x: number;
  y: number;
}

/** Size descriptor from the schema */
export interface FieldSize {
  width_pt: number;
  height_pt: number;
  width_cm: number;
  height_cm: number;
}