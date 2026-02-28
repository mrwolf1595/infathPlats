import { z } from 'zod';
import { FIELD_SCHEMA, ALLOWED_FONT_OVERRIDES } from './types';

// ─── Build Zod schema dynamically from form_fields_schema.json ───────

/** Text field values — required fields are enforced, optional ones default to '' */
const textFieldShape: Record<string, z.ZodTypeAny> = {};

for (const field of FIELD_SCHEMA.text_fields) {
  if (field.required) {
    textFieldShape[field.name] = z
      .string({ required_error: `${field.label_ar} مطلوب` })
      .min(1, `${field.label_ar} مطلوب`);
  } else {
    textFieldShape[field.name] = z.string().optional().default('');
  }
}

export const textFieldsSchema = z.object(textFieldShape);

/** Font-size overrides — only the allowed fields, 50–800pt */
const fontOverrideShape: Record<string, z.ZodTypeAny> = {};

for (const name of ALLOWED_FONT_OVERRIDES) {
  fontOverrideShape[name] = z
    .number()
    .min(50, 'الحد الأدنى 50')
    .max(1000, 'الحد الأقصى 1000')
    .optional();
}

export const fontOverrideSchema = z.object(fontOverrideShape);

/** Image payloads — logo required, QR generated automatically */
export const imagesSchema = z.object({
  logo: z
    .string({ required_error: 'شعار الشركة مطلوب' })
    .min(1, 'شعار الشركة مطلوب'),
  qr: z.string().optional().default(''),
});

/** Full form payload */
export const boardFormSchema = z.object({
  templateId: z
    .number()
    .int()
    .min(1, 'اختر قالبًا')
    .max(1, 'القالب غير صالح'),
  formData: textFieldsSchema,
  fontOverrides: fontOverrideSchema.optional(),
  images: imagesSchema,
});

export type BoardFormValues = z.infer<typeof boardFormSchema>;
