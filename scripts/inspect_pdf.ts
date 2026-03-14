import { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFString, PDFHexString, PDFRef } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

async function inspectPDF() {
    const pdfPath = path.join('k:', 'infathPlats', 'infathPlats', 'public', 'templates', 'Art_board_3×10.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n📋 Total fields found: ${fields.length}\n`);
    console.log('='.repeat(80));

    for (const field of fields) {
        const name = field.getName();
        const type = field.constructor.name;

        // Get the underlying PDF dictionary
        const dict = field.acroField.dict;

        console.log(`\n🔹 Field: "${name}"`);
        console.log(`   Type: ${type}`);

        // Get widget (first annotation)
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
            const widget = widgets[0];
            const widgetDict = widget.dict;

            // Get Rect (position/size)
            const rect = widgetDict.get(PDFName.of('Rect'));
            if (rect instanceof PDFArray) {
                const values = [];
                for (let i = 0; i < rect.size(); i++) {
                    const item = rect.get(i);
                    if (item instanceof PDFNumber) {
                        values.push(item.asNumber());
                    } else if (item instanceof PDFRef) {
                        const resolved = pdfDoc.context.lookup(item);
                        if (resolved instanceof PDFNumber) {
                            values.push(resolved.asNumber());
                        }
                    }
                }
                if (values.length === 4) {
                    console.log(`   Rect: [${values.map(v => v.toFixed(2)).join(', ')}]`);
                    console.log(`   Position: x=${values[0].toFixed(2)}, y=${values[1].toFixed(2)}`);
                    console.log(`   Size: width=${(values[2] - values[0]).toFixed(2)}, height=${(values[3] - values[1]).toFixed(2)}`);
                }
            }

            // Get Default Appearance (DA) - contains font info
            const da = dict.get(PDFName.of('DA')) || widgetDict.get(PDFName.of('DA'));
            if (da) {
                let daStr = '';
                if (da instanceof PDFString) {
                    daStr = da.asString();
                } else if (da instanceof PDFHexString) {
                    daStr = da.decodeText();
                } else {
                    daStr = da.toString();
                }
                console.log(`   DA (Default Appearance): ${daStr}`);
            }

            // Get text alignment (Q)
            const q = dict.get(PDFName.of('Q')) || widgetDict.get(PDFName.of('Q'));
            if (q instanceof PDFNumber) {
                const alignments = ['Left', 'Center', 'Right'];
                console.log(`   Alignment (Q): ${q.asNumber()} (${alignments[q.asNumber()] || 'Unknown'})`);
            }

            // Get MaxLen
            const maxLen = dict.get(PDFName.of('MaxLen'));
            if (maxLen instanceof PDFNumber) {
                console.log(`   MaxLen: ${maxLen.asNumber()}`);
            }

            // Get default value (V)
            const v = dict.get(PDFName.of('V'));
            if (v) {
                let vStr = '';
                if (v instanceof PDFString) {
                    vStr = v.asString();
                } else if (v instanceof PDFHexString) {
                    vStr = v.decodeText();
                } else {
                    vStr = v.toString();
                }
                console.log(`   Value (V): ${vStr}`);
            }

            // Get flags (Ff)
            const ff = dict.get(PDFName.of('Ff'));
            if (ff instanceof PDFNumber) {
                console.log(`   Flags (Ff): ${ff.asNumber()}`);
            }

            // Check for MK (appearance characteristics)
            const mk = widgetDict.get(PDFName.of('MK'));
            if (mk instanceof PDFDict) {
                console.log(`   MK (Appearance): present`);
            }
        }

        console.log('-'.repeat(60));
    }

    // Also get page size
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    console.log(`\n📐 Page Size: width=${width.toFixed(2)}, height=${height.toFixed(2)}`);
}

inspectPDF().catch(console.error);
