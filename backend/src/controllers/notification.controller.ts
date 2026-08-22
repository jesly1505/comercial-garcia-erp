import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: currentUser.userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limitamos a las últimas 50 para no saturar
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { id } = req.params;

    if (!currentUser) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    // Si id es "all", marcamos todas como leídas
    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId: currentUser.userId, isRead: false },
        data: { isRead: true }
      });
      res.json({ message: 'Todas las notificaciones marcadas como leídas' });
      return;
    }

    // De lo contrario, marcamos una específica
    const notificationId = Number(id);
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== currentUser.userId) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
