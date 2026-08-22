import { Router } from 'express';
import { requirePermission } from '../middlewares/role.middleware';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('invoices:view'), invoiceController.getInvoices);
router.get('/:id', requirePermission('invoices:view'), invoiceController.getInvoiceById);
router.post('/', requirePermission('invoices:create'), invoiceController.createInvoice);
router.patch('/:id/void', requirePermission('invoices:edit'), invoiceController.voidInvoice);

export default router;
