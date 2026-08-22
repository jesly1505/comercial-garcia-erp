import prisma from '../utils/prisma';
import { z } from 'zod';

export const openSessionSchema = z.object({
  cashRegisterId: z.number(),
  openingBalance: z.number().min(0, 'El saldo inicial no puede ser negativo')
});

export const closeSessionSchema = z.object({
  closingBalance: z.number().min(0, 'El saldo de cierre no puede ser negativo')
});

export const createMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.number().positive('El monto debe ser positivo'),
  description: z.string().min(1, 'La descripción es requerida')
});

// Registrar Cajas (si no hay, crear una por defecto)
export const ensureDefaultCashRegister = async () => {
  const count = await prisma.cashRegister.count();
  if (count === 0) {
    await prisma.cashRegister.create({
      data: { name: 'Caja Principal' }
    });
  }
};

export const getCashRegisters = async () => {
  await ensureDefaultCashRegister();
  return prisma.cashRegister.findMany();
};

// Obtener la sesión activa de un usuario (o de una caja)
export const getActiveSession = async (cashRegisterId?: number) => {
  const whereClause: any = { status: 'OPEN' };
  if (cashRegisterId) {
    whereClause.cashRegisterId = cashRegisterId;
  }
  
  return prisma.cashSession.findFirst({
    where: whereClause,
    include: {
      user: true,
      cashRegister: true,
      movements: true
    }
  });
};

// Abrir Sesión
export const openSession = async (userId: number, data: z.infer<typeof openSessionSchema>) => {
  // Verificar que la caja no esté ya abierta
  const existingSession = await prisma.cashSession.findFirst({
    where: { cashRegisterId: data.cashRegisterId, status: 'OPEN' }
  });

  if (existingSession) {
    throw new Error('La caja ya se encuentra abierta');
  }

  return prisma.cashSession.create({
    data: {
      cashRegisterId: data.cashRegisterId,
      userId,
      openingBalance: data.openingBalance,
      status: 'OPEN'
    },
    include: {
      cashRegister: true
    }
  });
};

// Generar reporte de Arqueo para una sesión
export const getSessionReport = async (sessionId: number) => {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: {
      movements: true,
      payments: true,
      user: true,
      cashRegister: true
    }
  });

  if (!session) throw new Error('Sesión no encontrada');

  // Sumar ingresos manuales
  const totalIn = session.movements
    .filter((m: any) => m.type === 'IN')
    .reduce((sum: number, m: any) => sum + m.amount, 0);

  // Sumar egresos manuales
  const totalOut = session.movements
    .filter((m: any) => m.type === 'OUT')
    .reduce((sum: number, m: any) => sum + m.amount, 0);

  // Sumar ventas en efectivo
  // Solo contamos pagos de facturas que fueron en efectivo
  // En nuestro sistema, los invoices de contado se registran al crear (no siempre tienen "Payment")
  // Así que busquemos Invoices creadas por este usuario en el rango de tiempo de esta sesión
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.userId,
      paymentMethod: 'EFECTIVO',
      status: 'ACTIVA',
      issueDate: {
        gte: session.openedAt,
        lte: session.closedAt || new Date()
      }
    }
  });

  const totalSalesCash = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);

  const expectedBalance = session.openingBalance + totalIn + totalSalesCash - totalOut;

  return {
    session,
    totalIn,
    totalOut,
    totalSalesCash,
    expectedBalance,
    difference: session.closingBalance !== null ? session.closingBalance - expectedBalance : null
  };
};

// Cerrar Sesión
export const closeSession = async (sessionId: number, data: z.infer<typeof closeSessionSchema>) => {
  const report = await getSessionReport(sessionId);

  if (report.session.status === 'CLOSED') {
    throw new Error('Esta sesión de caja ya está cerrada');
  }

  return prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closingBalance: data.closingBalance,
      expectedBalance: report.expectedBalance
    }
  });
};

// Crear Movimiento Manual
export const createMovement = async (sessionId: number, data: z.infer<typeof createMovementSchema>) => {
  const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
  
  if (!session || session.status === 'CLOSED') {
    throw new Error('No hay una sesión de caja activa para registrar el movimiento');
  }

  return prisma.cashMovement.create({
    data: {
      cashSessionId: sessionId,
      type: data.type,
      amount: data.amount,
      description: data.description
    }
  });
};

// Historial de Sesiones
export const getSessionsHistory = async () => {
  return prisma.cashSession.findMany({
    orderBy: { openedAt: 'desc' },
    include: {
      user: true,
      cashRegister: true
    }
  });
};
