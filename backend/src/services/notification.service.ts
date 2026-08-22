import prisma from '../utils/prisma';

type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

/**
 * Crea una notificación para un usuario específico
 */
export const notifyUser = async (userId: number, title: string, message: string, type: NotificationType = 'INFO') => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        isRead: false
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification for user', userId, error);
  }
};

/**
 * Crea una notificación para todos los administradores
 */
export const notifyAdmins = async (title: string, message: string, type: NotificationType = 'INFO') => {
  try {
    // Buscar todos los usuarios que tengan un rol con nombre 'ADMIN' (o admin)
    const admins = await prisma.user.findMany({
      where: {
        role: {
          name: 'ADMIN' // Asumiendo que el nombre del rol es 'ADMIN'
        },
        isActive: true
      },
      select: { id: true }
    });

    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        userId: admin.id,
        title,
        message,
        type,
        isRead: false
      }));

      await prisma.notification.createMany({
        data: notifications
      });
    }
  } catch (error) {
    console.error('Error creating notification for admins', error);
  }
};
