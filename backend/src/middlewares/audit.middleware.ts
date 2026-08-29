import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const auditLogMiddleware = (tableName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    const userId = req.user?.userId;
    const action = req.method; // POST, PUT, DELETE

    if (!['POST', 'PUT', 'DELETE'].includes(action)) {
      return next(); // Solo auditar modificaciones
    }

    // Interceptar la respuesta para capturar el éxito y el ID del registro modificado
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && userId) {
        // Enviar el log de forma asíncrona sin bloquear la respuesta al cliente
        prisma.auditLog.create({
          data: {
            userId: userId,
            action: action,
            tableName: tableName,
            recordId: body?.id ? Number(body.id) : null,
            newValues: req.body ? req.body : undefined,
          }
        }).catch(err => console.error('Error al guardar audit log:', err));
      }
      return originalSend.call(this, body);
    };

    next();
  };
};
