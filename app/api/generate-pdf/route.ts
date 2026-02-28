import { NextRequest, NextResponse } from 'next/server';
import { generateBoard } from '@/lib/pdf-generator';
import { boardFormSchema } from '@/lib/validation';

export const runtime = 'nodejs';
// Allow up to 60 s for large-board PDF generation
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate body
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'طلب غير صالح (JSON غير صحيح)' },
        { status: 400 }
      );
    }

    const parsed = boardFormSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      );
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: messages },
        { status: 422 }
      );
    }

    const { templateId, formData, fontOverrides, images } = parsed.data;

    // 2. Generate PDF (reads fonts/templates from filesystem)
    const pdfBytes = await generateBoard({
      templateId,
      formData,
      fontOverrides: fontOverrides ?? undefined,
      images: {
        logo: images.logo,
        qr: images.qr || undefined,
      },
    });

    // 3. Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="nafeth-board-${templateId}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    console.error('[generate-pdf] Error:', err);

    const message =
      err instanceof Error ? err.message : 'خطأ غير متوقع في الخادم';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
