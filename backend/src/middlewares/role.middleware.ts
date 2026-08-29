import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Se mantiene este para cosas que sean estrictamente exclusivas de rol (opcional)
export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Acceso no autorizado: Usuario no autenticado' });
      return;
    }
    if (!roles.includes((req.user as any).role)) {
      res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
      return;
    }
    next();
  };
};

export const requirePermission = (permissionCode: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Acceso no autorizado: Usuario no autenticado' });
        return;
      }

      // Si el usuario es ADMIN, también podemos dejarlo pasar directamente
      if ((req.user as any).role === 'ADMIN') {
        return next();
      }

      // Buscar si el rol tiene el permiso en la base de datos (tiempo real)
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: (req.user as any).roleId,
          permission: { code: permissionCode }
        }
      });

      if (!hasPermission) {
        res.status(403).json({ error: `Acceso denegado. Requiere el permiso: ${permissionCode}` });
        return;
      }

      next();
    } catch (error) {
      console.error('Error validating permission:', error);
      res.status(500).json({ error: 'Error interno validando permisos' });
    }
  };
};
