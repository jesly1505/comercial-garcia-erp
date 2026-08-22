import { Router } from 'express';
import { getSettings, updateSettings, exportDatabase } from '../controllers/settings.controller';
import { authenticateToken, checkAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de configuración requieren autenticación
router.use(authenticateToken);

// Cualquier usuario (según lógica de negocio, o solo admin) puede leer la configuración
router.get('/', getSettings);

// Solo el administrador puede modificar configuraciones
router.put('/', checkAdmin, updateSettings);

// Exportar base de datos
router.get('/export', checkAdmin, exportDatabase);

export default router;
