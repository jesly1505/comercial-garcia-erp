import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission, authorizeRole } from '../middlewares/role.middleware';

const router = Router();


// En usuarios dejamos authorizeRole ADMIN por seguridad adicional, o usamos requirePermission
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/toggle-status', userController.toggleUserStatus);
router.patch('/:id/reset-password', userController.resetPassword);
router.get('/roles', userController.getRoles);

export default router;
