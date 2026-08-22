import { Router } from 'express';
import { requirePermission } from '../middlewares/role.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { 
  getRegisters, 
  getActiveSession, 
  openSession, 
  closeSession, 
  createMovement, 
  getHistory 
} from '../controllers/cash.controller';

const router = Router();

// Todas las rutas de caja requieren autenticación
router.use(authenticateToken);

router.get('/registers', requirePermission('cash:view'), getRegisters);
router.get('/active', requirePermission('cash:view'), getActiveSession);
router.get('/history', requirePermission('cash:view'), getHistory);
router.post('/open', requirePermission('cash:create'), openSession);
router.post('/:id/close', requirePermission('cash:create'), closeSession);
router.post('/:id/movement', requirePermission('cash:create'), createMovement);

export default router;
