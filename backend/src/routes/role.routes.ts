import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateToken);

// Permisos solo para administradores de roles
router.get('/', requirePermission('roles:view'), roleController.getRoles);
router.get('/permissions', requirePermission('roles:view'), roleController.getPermissions);
router.post('/', requirePermission('roles:manage'), roleController.createRole);
router.put('/:id', requirePermission('roles:manage'), roleController.updateRole);
router.patch('/:id/toggle-status', requirePermission('roles:manage'), roleController.toggleRoleStatus);
router.delete('/:id', requirePermission('roles:manage'), roleController.deleteRole);

export default router;
