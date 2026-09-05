import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { ARStatus, PaymentMethod } from '@prisma/client';

export const getAllReceivables = async (req: Request, res: Response) => {
  try {
    const { status, customerId } = req.query;
    
    const where: any = {};
    if (status) where.status = status as ARStatus;
    if (customerId) where.customerId = Number(customerId);

    const receivables = await prisma.accountsReceivable.findMany({
      where,
      include: {
        customer: true,
        invoice: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json(receivables);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cuentas por cobrar', details: error.message });
  }
};

export const getReceivablesByCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.id);

    const receivables = await prisma.accountsReceivable.findMany({
      where: { customerId },
      include: {
        invoice: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json(receivables);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cuentas del cliente', details: error.message });
  }
};

const registerPaymentSchema = z.object({
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  paymentMethod: z.enum(['CONTADO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO', 'CREDITO', 'EFECTIVO']).default('CONTADO')
});

export const registerPayment = async (req: Request, res: Response) => {
  try {
    const receivableId = Number(req.params.id);
    const { amount, paymentMethod } = registerPaymentSchema.parse(req.body);

    let pm: PaymentMethod = PaymentMethod.CONTADO;
    if (paymentMethod === 'TARJETA') pm = PaymentMethod.TARJETA;
    else if (paymentMethod === 'TRANSFERENCIA') pm = PaymentMethod.TRANSFERENCIA;
    else if (paymentMethod === 'MIXTO') pm = PaymentMethod.MIXTO;

    const result = await prisma.$transaction(async (tx) => {
      const receivable = await tx.accountsReceivable.findUnique({
        where: { id: receivableId }
      });

      if (!receivable) throw new Error('Cuenta por cobrar no encontrada');
      if (receivable.status === ARStatus.PAID) throw new Error('Esta cuenta ya está pagada en su totalidad');
      if (receivable.status === ARStatus.CANCELLED) throw new Error('Esta cuenta está anulada');

      const balanceNum = Number(receivable.balance);
      const totalDebtNum = Number(receivable.totalDebt);

      if (amount > balanceNum) {
        throw new Error(`El abono (C$${amount}) no puede ser mayor al saldo restante (C$${balanceNum})`);
      }

      // Crear el pago
      const payment = await tx.payment.create({
        data: {
          accountReceivableId: receivable.id,
          amount,
          paymentMethod: pm
        }
      });

      // Actualizar balance
      const newBalance = balanceNum - amount;
      const newStatus = newBalance <= 0 
        ? ARStatus.PAID 
        : (newBalance < totalDebtNum ? ARStatus.PARTIAL : receivable.status);

      const updatedReceivable = await tx.accountsReceivable.update({
        where: { id: receivable.id },
        data: {
          balance: newBalance,
          status: newStatus
        },
        include: {
          customer: true,
          invoice: true
        }
      });

      return { payment, updatedReceivable };
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Error de validación' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const receivableId = Number(req.params.id);

    const payments = await prisma.payment.findMany({
      where: { accountReceivableId: receivableId },
      orderBy: { paymentDate: 'desc' }
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener historial de pagos', details: error.message });
  }
};
