import { Router } from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener mis notificaciones
router.get('/', getMyNotifications);

// Marcar como leída una o todas (id = 'all')
router.put('/:id/read', markAsRead);

export default router;
