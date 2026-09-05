import { Router } from 'express';
import * as arController from '../controllers/accounts-receivable.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Listar todas las cuentas por cobrar
router.get('/', requirePermission('accounts_receivable:view'), arController.getAllReceivables);

// Listar por cliente
router.get('/customer/:id', requirePermission('accounts_receivable:view'), arController.getReceivablesByCustomer);

// Registrar abono
router.post('/:id/payments', requirePermission('accounts_receivable:create'), arController.registerPayment);

// Historial de abonos
router.get('/:id/payments', requirePermission('accounts_receivable:view'), arController.getPaymentHistory);

export default router;
