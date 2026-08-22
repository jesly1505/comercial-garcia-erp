import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateToken);

// Solo usuarios con permiso settings:view o un nuevo permiso audit:view
// Usaremos settings:view temporalmente ya que la bitácora es administrativa
router.get('/', requirePermission('settings:view'), auditController.getAuditLogs);

export default router;
