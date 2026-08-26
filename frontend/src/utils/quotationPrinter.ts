import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateQuotationPDF = (quotation: any) => {
  if (!quotation) return null;

  const doc = new jsPDF();

  // Header / Branding
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55); // Dark gray
  doc.setFont('helvetica', 'bold');
  doc.text('COMERCIAL GARCÍA REYES S.A.', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Soluciones Comerciales e Industriales - RUC: J0310000001234', 105, 26, { align: 'center' });
  doc.text('Managua, Nicaragua | Tel: +505 2222-3333 | Email: ventas@comercialgarcia.com', 105, 31, { align: 'center' });

  // Divider line
  doc.setDrawColor(197, 155, 109); // Gold
  doc.setLineWidth(1);
  doc.line(14, 36, 196, 36);

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 40, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 40, 182, 28, 2, 2, 'S');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('COTIZACIÓN COMERCIAL', 18, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`No. Cotización: ${quotation.quotationNumber}`, 18, 55);
  doc.text(`Fecha de Emisión: ${new Date(quotation.createdAt).toLocaleDateString()}`, 18, 61);

  const validUntilText = quotation.validUntil 
    ? new Date(quotation.validUntil).toLocaleDateString() 
    : '15 días a partir de emisión';
  doc.text(`Válido hasta: ${validUntilText}`, 110, 55);

  const statusLabel = quotation.status || 'PENDIENTE';
  doc.setFont('helvetica', 'bold');
  if (statusLabel === 'APROBADA' || statusLabel === 'FACTURADA') {
    doc.setTextColor(16, 185, 129); // Green
  } else if (statusLabel === 'RECHAZADA' || statusLabel === 'CANCELADA') {
    doc.setTextColor(239, 68, 68); // Red
  } else {
    doc.setTextColor(217, 119, 6); // Amber
  }
  doc.text(`Estado: ${statusLabel}`, 110, 61);

  // Customer Info Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 72, 182, 24, 2, 2, 'F');
  doc.roundedRect(14, 72, 182, 24, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL CLIENTE', 18, 79);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const customerName = `${quotation.customer?.firstName || ''} ${quotation.customer?.lastName || ''}`.trim() || 'Cliente';
  doc.text(`Cliente: ${customerName}`, 18, 86);
  if (quotation.customer?.company) {
    doc.text(`Empresa: ${quotation.customer.company}`, 18, 91);
  }
  if (quotation.customer?.documentNumber) {
    doc.text(`Identificación/RUC: ${quotation.customer.documentNumber}`, 110, 86);
  }
  if (quotation.customer?.phone) {
    doc.text(`Teléfono: ${quotation.customer.phone}`, 110, 91);
  }

  // Items Table
  const tableData = quotation.details.map((d: any, index: number) => [
    index + 1,
    d.product?.sku || '-',
    d.product?.name || 'Producto',
    d.quantity,
    `C$${Number(d.unitPrice).toFixed(2)}`,
    d.discount > 0 ? `C$${Number(d.discount).toFixed(2)}` : '-',
    `C$${Number(d.subtotal).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 102,
    head: [['#', 'SKU', 'Descripción', 'Cant.', 'Precio Unit.', 'Desc.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [30, 41, 59], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left' },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 30 },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  // Notes & Conditions (Left side)
  let notesY = finalY + 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Términos y Condiciones:', 14, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  notesY += 5;
  doc.text('• Precios sujetos a disponibilidad de inventario.', 14, notesY);
  notesY += 4;
  doc.text('• Precios expresados en Córdobas (C$).', 14, notesY);
  notesY += 4;
  if (quotation.notes) {
    doc.text(`• Observaciones: ${quotation.notes}`, 14, notesY);
  }

  // Totals Summary Box (Right side)
  let totalsY = finalY + 8;
  const totalsX = 120;
  const totalsWidth = 76;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, totalsY, totalsWidth, 38, 2, 2, 'F');
  doc.roundedRect(totalsX, totalsY, totalsWidth, 38, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  let currentSubY = totalsY + 8;
  doc.text('Subtotal:', totalsX + 6, currentSubY);
  doc.text(`C$${Number(quotation.subtotal || 0).toFixed(2)}`, totalsX + totalsWidth - 6, currentSubY, { align: 'right' });

  if (quotation.discount > 0) {
    currentSubY += 6;
    doc.text('Descuento General:', totalsX + 6, currentSubY);
    doc.text(`-C$${Number(quotation.discount).toFixed(2)}`, totalsX + totalsWidth - 6, currentSubY, { align: 'right' });
  }

  if (quotation.tax > 0) {
    currentSubY += 6;
    doc.text('IVA (15%):', totalsX + 6, currentSubY);
    doc.text(`+C$${Number(quotation.tax).toFixed(2)}`, totalsX + totalsWidth - 6, currentSubY, { align: 'right' });
  }

  currentSubY += 8;
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 4, currentSubY - 2, totalsX + totalsWidth - 4, currentSubY - 2);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', totalsX + 6, currentSubY + 3);
  doc.text(`C$${Number(quotation.totalAmount || 0).toFixed(2)}`, totalsX + totalsWidth - 6, currentSubY + 3, { align: 'right' });

  // Footer Signature Lines
  const footerY = 265;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(25, footerY, 85, footerY);
  doc.line(125, footerY, 185, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Elaborado por: Comercial García Reyes S.A.', 55, footerY + 5, { align: 'center' });
  doc.text('Aceptado por el Cliente (Firma / Sello)', 155, footerY + 5, { align: 'center' });

  return doc;
};

export const downloadQuotationPDF = (quotation: any) => {
  const doc = generateQuotationPDF(quotation);
  if (doc) {
    doc.save(`${quotation.quotationNumber || 'cotizacion'}.pdf`);
  }
};

export const printQuotationTicket = (quotation: any) => {
  if (!quotation) return;

  const printWindow = window.open('', '_blank', 'width=340,height=650');
  if (!printWindow) {
    alert('Por favor permita las ventanas emergentes (popups) para imprimir');
    return;
  }

  const validUntilText = quotation.validUntil 
    ? new Date(quotation.validUntil).toLocaleDateString() 
    : '15 días';

  const html = `
    <html>
      <head>
        <title>Cotización ${quotation.quotationNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: 12px; margin: 0; padding: 12px; width: 300px; color: #1e293b; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .divider { border-top: 1px dashed #94a3b8; margin: 8px 0; }
          .flex-between { display: flex; justify-content: space-between; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { text-align: left; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #cbd5e1; }
          td { text-align: left; padding: 3px 0; font-size: 11px; }
          .right { text-align: right; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #f1f5f9; }
          .terms { font-size: 10px; color: #64748b; margin-top: 8px; line-height: 1.3; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px; letter-spacing: 0.5px;">COMERCIAL GARCÍA REYES</div>
        <div class="center" style="font-size: 10px; color: #64748b;">RUC: J0310000001234 | Tel: 2222-3333</div>
        <div class="center" style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #0284c7;">PROFORMA / COTIZACIÓN</div>
        <div class="divider"></div>
        <div class="flex-between"><span class="bold">No. Cotización:</span><span>${quotation.quotationNumber}</span></div>
        <div class="flex-between"><span>Fecha:</span><span>${new Date(quotation.createdAt).toLocaleDateString()}</span></div>
        <div class="flex-between"><span>Válido hasta:</span><span>${validUntilText}</span></div>
        <div class="flex-between"><span class="bold">Cliente:</span><span>${quotation.customer?.firstName || ''} ${quotation.customer?.lastName || ''}</span></div>
        ${quotation.customer?.company ? `<div class="flex-between"><span>Empresa:</span><span>${quotation.customer.company}</span></div>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Cant</th>
              <th>Descripción</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quotation.details.map((d: any) => `
              <tr>
                <td>${d.quantity}x</td>
                <td>${d.product?.name ? d.product.name.substring(0, 16) : 'Producto'}</td>
                <td class="right">C$${Number(d.subtotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="flex-between">
          <span>Subtotal:</span>
          <span>C$${Number(quotation.subtotal || 0).toFixed(2)}</span>
        </div>
        ${quotation.discount > 0 ? `
          <div class="flex-between" style="color: #dc2626;">
            <span>Descuento:</span>
            <span>-C$${Number(quotation.discount).toFixed(2)}</span>
          </div>
        ` : ''}
        ${quotation.tax > 0 ? `
          <div class="flex-between">
            <span>IVA (15%):</span>
            <span>+C$${Number(quotation.tax).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="flex-between bold" style="font-size: 14px; margin-top: 6px; border-top: 1px solid #1e293b; padding-top: 4px;">
          <span>TOTAL:</span>
          <span>C$${Number(quotation.totalAmount || 0).toFixed(2)}</span>
        </div>
        <div class="terms">
          * Precios y existencias sujetos a cambios sin previo aviso.<br/>
          * Esta cotización no reserva inventario hasta su facturación.
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 11px; margin-top: 6px;">¡Gracias por su preferencia!</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};
