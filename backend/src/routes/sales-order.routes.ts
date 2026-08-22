import { Router } from 'express';
import { requirePermission } from '../middlewares/role.middleware';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus,
  convertToInvoice
} from '../controllers/sales-order.controller';

const router = Router();

router.post('/', requirePermission('sales_orders:create'), createOrder);
router.get('/', requirePermission('sales_orders:view'), getOrders);
router.get('/:id', requirePermission('sales_orders:view'), getOrderById);
router.put('/:id/status', requirePermission('sales_orders:edit'), updateStatus);
router.post('/:id/invoice', requirePermission('sales_orders:create'), convertToInvoice);

export default router;
