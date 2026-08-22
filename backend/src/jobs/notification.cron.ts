import cron from 'node-cron';
import prisma from '../utils/prisma';
import { notifyAdmins, notifyUser } from '../services/notification.service';
import { startOfDay } from 'date-fns';

/**
 * Inicia todas las tareas programadas en segundo plano
 */
export const startCronJobs = () => {
  console.log('Iniciando tareas en segundo plano (Cron Jobs)...');

  // Ejecutar cada minuto (para pruebas). En producción sería: '0 8 * * *' (diario a las 8am)
  cron.schedule('0 8,20 * * *', async () => {
    console.log('Ejecutando rutina de revisión de alertas automáticas...');
    
    await checkLowStock();
    await checkPendingReceivables();
  });
};

/**
 * Revisa el inventario y alerta si hay productos por debajo del stock mínimo
 */
const checkLowStock = async () => {
  try {
    // Prisma no permite comparar dos campos directamente en el 'where' en SQLite de forma sencilla sin query cruda,
    // así que traemos todos los productos activos y filtramos en memoria (o usamos $queryRaw).
    // Para simplificar, lo haremos en memoria si la cantidad es manejable, 
    // pero idealmente deberíamos usar una base de datos más robusta o un filtro SQL.
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, currentStock: true, minStock: true }
    });

    const lowStockProducts = activeProducts.filter(p => p.currentStock <= p.minStock);

    if (lowStockProducts.length > 0) {
      const message = `Hay ${lowStockProducts.length} producto(s) con stock mínimo o agotado. Revise el reporte de inventario para reabastecer.`;
      
      // En un sistema real usaríamos debounce o banderas en DB, aquí notificamos.
      await notifyAdmins('Alerta de Stock Bajo', message, 'WARNING');
    }
  } catch (error) {
    console.error('Error al revisar stock bajo:', error);
  }
};

/**
 * Revisa las Cuentas por Cobrar y alerta de fechas de vencimiento
 */
const checkPendingReceivables = async () => {
  try {
    const today = new Date();
    
    // Buscar cuentas por cobrar pendientes cuya fecha de vencimiento es hoy o ya pasó
    const pendingAccounts = await prisma.accountsReceivable.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lte: today
        }
      },
      include: {
        customer: true,
        invoice: true
      }
    });

    for (const account of pendingAccounts) {
      const isOverdue = account.dueDate ? account.dueDate < startOfDay(today) : false;
      const title = isOverdue ? 'Cobro Vencido' : 'Cobro Programado para Hoy';
      const message = `El cliente ${account.customer.firstName} ${account.customer.lastName} tiene un saldo pendiente de C$${account.balance} de la factura ${account.invoice.invoiceNumber}.`;
      
      // Notificar al vendedor que hizo la venta
      await notifyUser(account.invoice.userId, title, message, isOverdue ? 'ERROR' : 'WARNING');
      
      // Notificar a los administradores
      await notifyAdmins(`Alerta de Cartera: ${title}`, message, isOverdue ? 'ERROR' : 'WARNING');
    }
  } catch (error) {
    console.error('Error al revisar cuentas por cobrar:', error);
  }
};
