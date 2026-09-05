import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export const generateInvoicePDF = (invoice: any) => {
  if (!invoice) return null;
  
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('COMERCIAL GARCÍA', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('FACTURA', 105, 30, { align: 'center' });
  
  // Info
  doc.setFontSize(10);
  doc.text(`No. Factura: ${invoice.invoiceNumber}`, 14, 45);
  doc.text(`Fecha: ${new Date(invoice.issueDate).toLocaleString()}`, 14, 52);
  doc.text(`Cliente: ${invoice.customer?.firstName} ${invoice.customer?.lastName}`, 14, 59);
  doc.text(`Método de Pago: ${invoice.paymentMethod || 'CONTADO'}`, 14, 66);
  if (invoice.status === 'ANULADA') {
    doc.setTextColor(239, 68, 68); // Red
    doc.text(`ESTADO: ANULADA`, 140, 45);
    doc.setTextColor(0, 0, 0); // Reset
  }
  
  // Table
  const tableData = invoice.details.map((d: any) => [
    d.product?.name || 'Producto',
    d.quantity,
    `C$${Number(d.unitPrice || 0).toFixed(2)}`,
    `C$${Number(d.subtotal || 0).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 75;
  
  // Totals
  let currentY = finalY + 10;
  
  let subtotalBeforeDiscounts = Number(invoice.totalAmount || 0) - Number(invoice.tax || 0) + Number(invoice.discount || 0);

  doc.text(`Subtotal: C$${Number(subtotalBeforeDiscounts).toFixed(2)}`, 140, currentY);
  currentY += 7;

  if (Number(invoice.discount || 0) > 0) {
    doc.text(`Descuento: -C$${Number(invoice.discount || 0).toFixed(2)}`, 140, currentY);
    currentY += 7;
  }
  
  if (Number(invoice.tax || 0) > 0) {
    doc.text(`IVA (15%): +C$${Number(invoice.tax || 0).toFixed(2)}`, 140, currentY);
    currentY += 7;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: C$${Number(invoice.totalAmount || 0).toFixed(2)}`, 140, currentY);

  return doc;
};

export const downloadInvoicePDF = (invoice: any) => {
  const doc = generateInvoicePDF(invoice);
  if (doc) {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
};

export const printInvoiceTicket = (invoice: any) => {
  if (!invoice) return;
  
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    toast.error('Por favor permita las ventanas emergentes (popups) para imprimir');
    return;
  }

  let subtotalBeforeDiscounts = Number(invoice.totalAmount || 0) - Number(invoice.tax || 0) + Number(invoice.discount || 0);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; }
          .right { text-align: right; }
          .void-stamp { font-size: 16px; border: 2px solid #ef4444; color: #ef4444; padding: 5px; text-align: center; margin-bottom: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        ${invoice.status === 'ANULADA' ? '<div class="void-stamp">FACTURA ANULADA</div>' : ''}
        <div class="center bold" style="font-size: 16px;">COMERCIAL GARCÍA</div>
        <div class="center">RUC: 1234567890123</div>
        <div class="center">Managua, Nicaragua</div>
        <div class="divider"></div>
        <div><span class="bold">Factura:</span> ${invoice.invoiceNumber}</div>
        <div><span class="bold">Fecha:</span> ${new Date(invoice.issueDate).toLocaleString()}</div>
        <div><span class="bold">Cliente:</span> ${invoice.customer?.firstName} ${invoice.customer?.lastName}</div>
        <div><span class="bold">Pago:</span> ${invoice.paymentMethod || 'CONTADO'}</div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Cant</th>
              <th>Producto</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.details.map((d: any) => `
              <tr>
                <td>${d.quantity}</td>
                <td>${d.product?.name ? d.product.name.substring(0, 15) : 'Producto'}</td>
                <td class="right">C$${Number(d.subtotal || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="flex-between">
          <span>Subtotal:</span>
          <span>C$${Number(subtotalBeforeDiscounts).toFixed(2)}</span>
        </div>
        ${Number(invoice.discount || 0) > 0 ? `
          <div class="flex-between">
            <span>Descuento:</span>
            <span>-C$${Number(invoice.discount || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        ${Number(invoice.tax || 0) > 0 ? `
          <div class="flex-between">
            <span>IVA (15%):</span>
            <span>+C$${Number(invoice.tax || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="flex-between bold" style="font-size: 14px; margin-top: 5px;">
          <span>TOTAL:</span>
          <span>C$${Number(invoice.totalAmount || 0).toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="center">¡Gracias por su compra!</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};
