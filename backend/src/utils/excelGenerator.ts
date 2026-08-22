import ExcelJS from 'exceljs';

export const generateExcel = async (
  title: string,
  columns: { header: string; key: string; width: number }[],
  data: any[]
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // Title Row
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Reporte: ${title}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle (Date)
  worksheet.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`);
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `Fecha de generación: ${new Date().toLocaleString()}`;
  dateCell.font = { italic: true };
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]); // Blank row

  // Data Headers
  worksheet.columns = columns;
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' } // Azul corporativo
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Data Rows
  data.forEach(item => {
    worksheet.addRow(item);
  });

  // Autofiltro
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
};
