import { Router } from 'express';
import { 
  createPurchase, 
  getPurchases, 
  getPurchaseById,
  updatePurchaseStatus,
  deletePurchase
} from '../controllers/purchase.controller';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.get('/', requirePermission('purchases:view'), getPurchases);
router.get('/:id', requirePermission('purchases:view'), getPurchaseById);
router.post('/', requirePermission('purchases:create'), createPurchase);
router.put('/:id/status', requirePermission('purchases:edit'), updatePurchaseStatus);
router.delete('/:id', requirePermission('purchases:delete'), deletePurchase);

export default router;
