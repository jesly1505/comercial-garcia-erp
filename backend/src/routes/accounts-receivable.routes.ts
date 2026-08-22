import { Router } from 'express';
import * as arController from '../controllers/accounts-receivable.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Listar todas las cuentas por cobrar
router.get('/', requirePermission(['ADMIN', 'CASHIER']), arController.getAllReceivables);

// Listar por cliente
router.get('/customer/:id', requirePermission(['ADMIN', 'CASHIER']), arController.getReceivablesByCustomer);

// Registrar abono
router.post('/:id/payments', requirePermission(['ADMIN', 'CASHIER']), arController.registerPayment);

// Historial de abonos
router.get('/:id/payments', requirePermission(['ADMIN', 'CASHIER']), arController.getPaymentHistory);

export default router;
