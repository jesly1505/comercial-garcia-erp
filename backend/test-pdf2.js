try {
  const PdfPrinter = require('pdfmake/src/printer');
  console.log('PdfPrinter type:', typeof PdfPrinter);
} catch (e) {
  console.error(e);
}
