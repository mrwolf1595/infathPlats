import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';

async function test() {
    const templateBytes = fs.readFileSync('./public/templates/Art_board_2×4.pdf');
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const textF = form.getTextField('Type');
    textF.setText('ارض تجارية سكنية');
    textF.acroField.dict.delete(PDFName.of('AP'));

    // Save with updateFieldAppearances: false
    const modified = await pdfDoc.save({ updateFieldAppearances: false });
    fs.writeFileSync('./test4-output.pdf', modified);
    console.log('Saved test4-output.pdf successfully');
}
test();
