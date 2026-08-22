import { Router } from 'express';
import { requirePermission } from '../middlewares/role.middleware';
import * as reportController from '../controllers/report.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// 1. Inventario / Productos
router.get('/inventory/pdf', requirePermission('reports:view'), reportController.getInventoryPdf);
router.get('/inventory/excel', requirePermission('reports:view'), reportController.getInventoryExcel);

// 2. Clientes
router.get('/customers/pdf', requirePermission('reports:view'), reportController.getCustomersPdf);
router.get('/customers/excel', requirePermission('reports:view'), reportController.getCustomersExcel);

// 3. Ventas
router.get('/sales/pdf', requirePermission('reports:view'), reportController.getSalesPdf);
router.get('/sales/excel', requirePermission('reports:view'), reportController.getSalesExcel);

// 4. Compras
router.get('/purchases/pdf', requirePermission('reports:view'), reportController.getPurchasesPdf);
router.get('/purchases/excel', requirePermission('reports:view'), reportController.getPurchasesExcel);

// 5. Caja
router.get('/cash/pdf', requirePermission('reports:view'), reportController.getCashPdf);
router.get('/cash/excel', requirePermission('reports:view'), reportController.getCashExcel);

// 6. Facturas
router.get('/invoices/pdf', requirePermission('reports:view'), reportController.getInvoicesPdf);
router.get('/invoices/excel', requirePermission('reports:view'), reportController.getInvoicesExcel);

// 7. Pedidos
router.get('/orders/pdf', requirePermission('reports:view'), reportController.getOrdersPdf);
router.get('/orders/excel', requirePermission('reports:view'), reportController.getOrdersExcel);

// 8. Movimientos
router.get('/movements/pdf', requirePermission('reports:view'), reportController.getMovementsPdf);
router.get('/movements/excel', requirePermission('reports:view'), reportController.getMovementsExcel);

// 9. Proveedores
router.get('/suppliers/pdf', requirePermission('reports:view'), reportController.getSuppliersPdf);
router.get('/suppliers/excel', requirePermission('reports:view'), reportController.getSuppliersExcel);

// 10. Agotados
router.get('/out-of-stock/pdf', requirePermission('reports:view'), reportController.getOutOfStockPdf);
router.get('/out-of-stock/excel', requirePermission('reports:view'), reportController.getOutOfStockExcel);

// 11. Bajo Stock
router.get('/low-stock/pdf', requirePermission('reports:view'), reportController.getLowStockPdf);
router.get('/low-stock/excel', requirePermission('reports:view'), reportController.getLowStockExcel);

// 12. Más vendidos
router.get('/best-sellers/pdf', requirePermission('reports:view'), reportController.getBestSellersPdf);
router.get('/best-sellers/excel', requirePermission('reports:view'), reportController.getBestSellersExcel);

// 13. Clientes con deuda
router.get('/debtors/pdf', requirePermission('reports:view'), reportController.getDebtorsPdf);
router.get('/debtors/excel', requirePermission('reports:view'), reportController.getDebtorsExcel);

export default router;
