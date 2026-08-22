import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('suppliers:view'), getSuppliers);
router.get('/:id', requirePermission('suppliers:view'), getSupplierById);
router.post('/', requirePermission('suppliers:create'), createSupplier);
router.put('/:id', requirePermission('suppliers:edit'), updateSupplier);
router.delete('/:id', requirePermission('suppliers:delete'), deleteSupplier);

export default router;
