import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';
import fs from 'fs';

async function test() {
  const templateBytes = fs.readFileSync('./public/templates/Art_board_2×4.pdf');
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  
  form.getTextField('Type').setText('ارض تجارية سكنية');
  form.getTextField('Auction_name').setText('1400/ب/134');
  
  // Delete the existing AP stream for these fields so Acrobat regenerates them!
  form.getTextField('Type').acroField.dict.delete(PDFName.of('AP'));
  form.getTextField('Auction_name').acroField.dict.delete(PDFName.of('AP'));
  
  // Set image
  // form.getButton('Company_logo').setImage(...); // We know it works normally
  
  // Save with updateFieldAppearances: false
  const modified = await pdfDoc.save({ updateFieldAppearances: false });
  fs.writeFileSync('./test3-output.pdf', modified);
  console.log('Saved test3-output.pdf');
}
test();