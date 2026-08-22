const ExcelJS = require('exceljs');
const path = require('path');

async function readExcel() {
  const filePath = path.join(__dirname, '../inventario Completo Productos_Completado.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log('Worksheets:', workbook.worksheets.map(ws => ws.name));
  const worksheet = workbook.getWorksheet('Inventario completo'); // or just loop through them
  if (workbook.worksheets[0]) {
     console.log('Row 8:', workbook.worksheets[0].getRow(8).values);
     console.log('Row 12:', workbook.worksheets[0].getRow(12).values);
  }
}

readExcel().catch(console.error);
