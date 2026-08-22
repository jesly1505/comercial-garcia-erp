import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

export const getAllReceivables = async (req: Request, res: Response) => {
  try {
    const receivables = await prisma.accountsReceivable.findMany({
      include: {
        customer: true,
        invoice: true
      },
      orderBy: [
        { status: 'asc' }, // PENDING first typically
        { invoice: { issueDate: 'desc' } }
      ]
    });
    res.json(receivables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getReceivablesByCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.id);
    const receivables = await prisma.accountsReceivable.findMany({
      where: { customerId },
      include: {
        invoice: true
      },
      orderBy: { invoice: { issueDate: 'desc' } }
    });
    res.json(receivables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const registerPaymentSchema = z.object({
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  paymentMethod: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE'])
});

export const registerPayment = async (req: Request, res: Response) => {
  try {
    const receivableId = Number(req.params.id);
    const { amount, paymentMethod } = registerPaymentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const receivable = await tx.accountsReceivable.findUnique({
        where: { id: receivableId }
      });

      if (!receivable) throw new Error('Cuenta por cobrar no encontrada');
      if (receivable.status === 'PAID') throw new Error('Esta cuenta ya está pagada en su totalidad');
      if (receivable.status === 'VOIDED') throw new Error('Esta cuenta está anulada');

      if (amount > receivable.balance) {
        throw new Error(`El abono (C$${amount}) no puede ser mayor al saldo restante (C$${receivable.balance})`);
      }

      // Crear el pago
      const payment = await tx.payment.create({
        data: {
          accountReceivableId: receivable.id,
          amount,
          paymentMethod
        }
      });

      // Actualizar balance
      const newBalance = receivable.balance - amount;
      const newStatus = newBalance <= 0 ? 'PAID' : (newBalance < receivable.totalDebt ? 'PARTIAL' : receivable.status);

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
      res.status(400).json({ errors: (error as any).errors });
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
    res.status(500).json({ error: error.message });
  }
};
