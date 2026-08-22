import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { module, action, userId, startDate, endDate, search, skip = 0, take = 50 } = req.query;

    const where: any = {};

    if (module) where.tableName = String(module);
    if (action) where.action = String(action);
    if (userId) where.userId = Number(userId);
    if (search) where.description = { contains: String(search) };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(take),
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        }
      })
    ]);

    res.json({
      data: logs,
      meta: {
        total,
        skip: Number(skip),
        take: Number(take)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener bitácora' });
  }
};
