import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';
import fs from 'fs';

async function test() {
  const templateBytes = fs.readFileSync('./public/templates/Art_board_2x4.pdf');
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  
  form.getTextField('Type').setText('ارض تجارية سكنية');
  form.getTextField('Auction_name').setText('تجربة');
  
  // Do NOT update appearances, do NOT flatten.
  // Set NeedAppearances
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);
  
  const modified = await pdfDoc.save();
  fs.writeFileSync('./test-output.pdf', modified);
  console.log('Saved test-output.pdf');
}
test();