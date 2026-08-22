import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { generatePDF } from '../utils/pdfGenerator';
import { generateExcel } from '../utils/excelGenerator';

// Helper functions for parsing dates from req.query
const getDateRange = (req: Request) => {
  const { startDate, endDate } = req.query;
  return {
    start: startDate ? new Date(startDate as string) : undefined,
    end: endDate ? new Date(endDate as string) : undefined
  };
};

const sendPdf = async (res: Response, title: string, filename: string, headers: string[], rows: any[][]) => {
  try {
    const pdfBuffer = await generatePDF(title, headers, rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error generando PDF: ' + error.message });
  }
};

const sendExcel = async (res: Response, sheetName: string, filename: string, columns: any[], data: any[]) => {
  try {
    const excelBuffer = await generateExcel(sheetName, columns, data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(excelBuffer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error generando Excel: ' + error.message });
  }
};

// 1. Inventario / Productos
export const getInventoryPdf = async (req: Request, res: Response) => {
  const data = await reportService.getInventoryReport();
  const headers = ['SKU', 'Nombre', 'Categoría', 'Marca', 'Costo', 'Precio', 'Stock', 'Activo'];
  const rows = data.map(i => [i.sku, i.name, i.category, i.brand, `$${i.cost}`, `$${i.price}`, i.stock, i.active]);
  await sendPdf(res, 'Reporte de Inventario', 'inventario.pdf', headers, rows);
};

export const getInventoryExcel = async (req: Request, res: Response) => {
  const data = await reportService.getInventoryReport();
  const columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Marca', key: 'brand', width: 20 },
    { header: 'Costo', key: 'cost', width: 15 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Stock', key: 'stock', width: 15 },
    { header: 'Activo', key: 'active', width: 10 },
  ];
  await sendExcel(res, 'Inventario', 'inventario.xlsx', columns, data);
};

// 2. Clientes
export const getCustomersPdf = async (req: Request, res: Response) => {
  const data = await reportService.getCustomersReport();
  const headers = ['Documento', 'Nombre / Razón Social', 'Correo', 'Teléfono', 'Activo'];
  const rows = data.map(c => [c.document, c.name, c.email, c.phone, c.active]);
  await sendPdf(res, 'Reporte de Clientes', 'clientes.pdf', headers, rows);
};

export const getCustomersExcel = async (req: Request, res: Response) => {
  const data = await reportService.getCustomersReport();
  const columns = [
    { header: 'Documento', key: 'document', width: 20 },
    { header: 'Nombre / Razón Social', key: 'name', width: 40 },
    { header: 'Correo', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'phone', width: 20 },
    { header: 'Activo', key: 'active', width: 10 },
  ];
  await sendExcel(res, 'Clientes', 'clientes.xlsx', columns, data);
};

// 3. Ventas
export const getSalesPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getSalesReport(start, end);
  const headers = ['N° Factura', 'Fecha', 'Cliente', 'Método', 'Total', 'Estado'];
  const rows = data.map(i => [i.invoiceNumber, i.date, i.customer, i.paymentMethod, `$${i.total}`, i.status]);
  await sendPdf(res, 'Reporte de Ventas', 'ventas.pdf', headers, rows);
};

export const getSalesExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getSalesReport(start, end);
  const columns = [
    { header: 'N° Factura', key: 'invoiceNumber', width: 15 },
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Cliente', key: 'customer', width: 30 },
    { header: 'Método', key: 'paymentMethod', width: 15 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
  ];
  await sendExcel(res, 'Ventas', 'ventas.xlsx', columns, data);
};

// 4. Compras
export const getPurchasesPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getPurchasesReport(start, end);
  const headers = ['ID', 'Fecha', 'Proveedor', 'N° Factura', 'Total', 'Estado'];
  const rows = data.map(p => [p.id, p.date, p.supplier, p.invoiceNumber, `$${p.total}`, p.status]);
  await sendPdf(res, 'Reporte de Compras', 'compras.pdf', headers, rows);
};

export const getPurchasesExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getPurchasesReport(start, end);
  const columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Proveedor', key: 'supplier', width: 30 },
    { header: 'N° Factura', key: 'invoiceNumber', width: 20 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
  ];
  await sendExcel(res, 'Compras', 'compras.xlsx', columns, data);
};

// 5. Caja
export const getCashPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getCashReport(start, end);
  const headers = ['Caja', 'Usuario', 'Apertura', 'Cierre', 'Monto Inicial', 'Monto Final', 'Estado'];
  const rows = data.map(s => [s.register, s.user, s.openedAt, s.closedAt, `$${s.openingBalance}`, `$${s.closingBalance}`, s.status]);
  await sendPdf(res, 'Arqueo de Caja', 'caja.pdf', headers, rows);
};

export const getCashExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getCashReport(start, end);
  const columns = [
    { header: 'Caja', key: 'register', width: 20 },
    { header: 'Usuario', key: 'user', width: 20 },
    { header: 'Apertura', key: 'openedAt', width: 20 },
    { header: 'Cierre', key: 'closedAt', width: 20 },
    { header: 'Monto Inicial', key: 'openingBalance', width: 15 },
    { header: 'Monto Final', key: 'closingBalance', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
  ];
  await sendExcel(res, 'Caja', 'caja.xlsx', columns, data);
};

// 6. Facturas (Reusa Ventas por ahora)
export const getInvoicesPdf = getSalesPdf;
export const getInvoicesExcel = getSalesExcel;

// 7. Pedidos
export const getOrdersPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getOrdersReport(start, end);
  const headers = ['Pedido', 'Fecha', 'Cliente', 'Total', 'Estado'];
  const rows = data.map(o => [o.orderId, o.date, o.customer, `$${o.total}`, o.status]);
  await sendPdf(res, 'Reporte de Pedidos', 'pedidos.pdf', headers, rows);
};

export const getOrdersExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getOrdersReport(start, end);
  const columns = [
    { header: 'Pedido', key: 'orderId', width: 15 },
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Cliente', key: 'customer', width: 30 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
  ];
  await sendExcel(res, 'Pedidos', 'pedidos.xlsx', columns, data);
};

// 8. Movimientos
export const getMovementsPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getMovementsReport(start, end);
  const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Bodega', 'Razón'];
  const rows = data.map(m => [m.date, m.product, m.type, m.quantity, m.warehouse, m.reason]);
  await sendPdf(res, 'Reporte de Movimientos', 'movimientos.pdf', headers, rows);
};

export const getMovementsExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getMovementsReport(start, end);
  const columns = [
    { header: 'Fecha', key: 'date', width: 20 },
    { header: 'Producto', key: 'product', width: 30 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Cantidad', key: 'quantity', width: 10 },
    { header: 'Bodega', key: 'warehouse', width: 20 },
    { header: 'Usuario', key: 'user', width: 20 },
    { header: 'Razón', key: 'reason', width: 20 },
  ];
  await sendExcel(res, 'Movimientos', 'movimientos.xlsx', columns, data);
};

// 9. Proveedores
export const getSuppliersPdf = async (req: Request, res: Response) => {
  const data = await reportService.getSuppliersReport();
  const headers = ['Código', 'Nombre', 'Contacto', 'Teléfono', 'Email', 'Activo'];
  const rows = data.map(s => [s.code, s.name, s.contact, s.phone, s.email, s.active]);
  await sendPdf(res, 'Reporte de Proveedores', 'proveedores.pdf', headers, rows);
};

export const getSuppliersExcel = async (req: Request, res: Response) => {
  const data = await reportService.getSuppliersReport();
  const columns = [
    { header: 'Código', key: 'code', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Contacto', key: 'contact', width: 25 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Activo', key: 'active', width: 10 },
  ];
  await sendExcel(res, 'Proveedores', 'proveedores.xlsx', columns, data);
};

// 10. Agotados
export const getOutOfStockPdf = async (req: Request, res: Response) => {
  const data = await reportService.getOutOfStockReport();
  const headers = ['SKU', 'Nombre', 'Categoría', 'Marca', 'Stock'];
  const rows = data.map(p => [p.sku, p.name, p.category, p.brand, p.stock]);
  await sendPdf(res, 'Productos Agotados', 'agotados.pdf', headers, rows);
};

export const getOutOfStockExcel = async (req: Request, res: Response) => {
  const data = await reportService.getOutOfStockReport();
  const columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Marca', key: 'brand', width: 20 },
    { header: 'Stock', key: 'stock', width: 10 },
  ];
  await sendExcel(res, 'Agotados', 'agotados.xlsx', columns, data);
};

// 11. Bajo Stock
export const getLowStockPdf = async (req: Request, res: Response) => {
  const data = await reportService.getLowStockReport();
  const headers = ['SKU', 'Nombre', 'Stock', 'Mínimo'];
  const rows = data.map(p => [p.sku, p.name, p.stock, p.minStock]);
  await sendPdf(res, 'Productos con Bajo Stock', 'bajostock.pdf', headers, rows);
};

export const getLowStockExcel = async (req: Request, res: Response) => {
  const data = await reportService.getLowStockReport();
  const columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Stock Actual', key: 'stock', width: 15 },
    { header: 'Stock Mínimo', key: 'minStock', width: 15 },
  ];
  await sendExcel(res, 'BajoStock', 'bajostock.xlsx', columns, data);
};

// 12. Más vendidos
export const getBestSellersPdf = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getBestSellersReport(start, end);
  const headers = ['SKU', 'Nombre', 'Cantidad Vendida', 'Ingresos Generados'];
  const rows = data.map(p => [p.sku, p.name, p.quantitySold, `$${p.totalRevenue}`]);
  await sendPdf(res, 'Productos Más Vendidos', 'masvendidos.pdf', headers, rows);
};

export const getBestSellersExcel = async (req: Request, res: Response) => {
  const { start, end } = getDateRange(req);
  const data = await reportService.getBestSellersReport(start, end);
  const columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Cantidad Vendida', key: 'quantitySold', width: 20 },
    { header: 'Ingresos Generados', key: 'totalRevenue', width: 20 },
  ];
  await sendExcel(res, 'MasVendidos', 'masvendidos.xlsx', columns, data);
};

// 13. Clientes con deuda
export const getDebtorsPdf = async (req: Request, res: Response) => {
  const data = await reportService.getDebtorsReport();
  const headers = ['Cliente', 'N° Factura', 'Deuda Total', 'Saldo Restante', 'Vencimiento'];
  const rows = data.map(d => [d.customer, d.invoiceNumber, `$${d.totalDebt}`, `$${d.balance}`, d.dueDate]);
  await sendPdf(res, 'Clientes con Deuda', 'deudores.pdf', headers, rows);
};

export const getDebtorsExcel = async (req: Request, res: Response) => {
  const data = await reportService.getDebtorsReport();
  const columns = [
    { header: 'Cliente', key: 'customer', width: 30 },
    { header: 'N° Factura', key: 'invoiceNumber', width: 15 },
    { header: 'Deuda Total', key: 'totalDebt', width: 15 },
    { header: 'Saldo Restante', key: 'balance', width: 15 },
    { header: 'Vencimiento', key: 'dueDate', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
  ];
  await sendExcel(res, 'Deudores', 'deudores.xlsx', columns, data);
};
