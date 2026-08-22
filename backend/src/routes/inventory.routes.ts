import { Router } from 'express';
import { 
  registerMovement, 
  getMovements, 
  getLowStockAlerts,
  updateMovement,
  deleteMovement
} from '../controllers/inventory.controller';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.get('/movements', requirePermission('inventory:view'), getMovements);
router.post('/movements', requirePermission('inventory:create'), registerMovement);
router.put('/movements/:id', requirePermission('inventory:edit'), updateMovement);
router.delete('/movements/:id', requirePermission('inventory:delete'), deleteMovement);

router.get('/alerts', requirePermission('inventory:view'), getLowStockAlerts);

export default router;
