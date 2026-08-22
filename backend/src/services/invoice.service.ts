import prisma from '../utils/prisma';
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  customerId: z.number(),
  tax: z.preprocess((val) => Number(val), z.number().min(0, 'El impuesto no puede ser negativo')).optional().default(0),
  discount: z.preprocess((val) => Number(val), z.number().min(0, 'El descuento no puede ser negativo')).optional().default(0),
  paymentMethod: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']).optional().default('EFECTIVO'),
  creditDays: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().optional()),
  amountPaid: z.preprocess((val) => Number(val), z.number().min(0, 'El monto pagado no puede ser negativo')).optional(),
  details: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
    })
  ).min(1, 'Debe incluir al menos un producto'),
});

export const createInvoice = async (
  userId: number,
  data: z.infer<typeof createInvoiceSchema>
) => {
  // Utilizaremos una Transacción de Prisma para garantizar la consistencia
  return prisma.$transaction(async (tx) => {
    
    // 1. Validar Cliente
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || !customer.isActive) {
      throw new Error('Cliente inválido o inactivo');
    }

    let totalAmount = 0;
    const invoiceDetails = [];

    // 2. Procesar y Validar cada Producto
    for (const item of data.details) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      
      if (!product || !product.isActive) {
        throw new Error(`Producto ID ${item.productId} inválido o inactivo`);
      }
      if (product.currentStock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ${product.name}. Stock actual: ${product.currentStock}`);
      }

      // Restar stock
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: product.currentStock - item.quantity }
      });

      const subtotal = product.salePrice * item.quantity;
      totalAmount += subtotal;

      invoiceDetails.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal
      });
    }

    // 3. Crear Factura Maestra
    const invoiceNumber = `INV-${Date.now()}`;
    const finalTotal = totalAmount + (data.tax || 0) - (data.discount || 0);
    
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        userId: userId,
        totalAmount: finalTotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        paymentMethod: data.paymentMethod,
        details: {
          create: invoiceDetails
        }
      },
      include: {
        details: { include: { product: true } },
        customer: true,
        user: true
      }
    });

    // 4. Crear Cuentas por Cobrar y Pagos
    if (data.paymentMethod === 'CREDITO') {
      const days = data.creditDays && [8, 15, 30].includes(data.creditDays) ? data.creditDays : 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      await tx.accountsReceivable.create({
        data: {
          customerId: data.customerId,
          invoiceId: invoice.id,
          totalDebt: finalTotal,
          balance: finalTotal,
          status: 'PENDING',
          dueDate: dueDate
        }
      });
    } else {
      // CONTADO (Efectivo, Tarjeta, Transferencia)
      const ar = await tx.accountsReceivable.create({
        data: {
          customerId: data.customerId,
          invoiceId: invoice.id,
          totalDebt: finalTotal,
          balance: 0,
          status: 'PAID'
        }
      });

      await tx.payment.create({
        data: {
          accountReceivableId: ar.id,
          amount: finalTotal,
          paymentMethod: data.paymentMethod,
          // cashSessionId could be added here if implemented later
        }
      });
    }

    return invoice;
  });
};

export const getInvoices = async () => {
  return prisma.invoice.findMany({
    orderBy: { issueDate: 'desc' },
    include: {
      customer: true,
      user: true,
      details: true
    }
  });
};

export const getInvoiceById = async (id: number) => {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      user: true,
      details: {
        include: { product: true }
      }
    }
  });
};

export const voidInvoice = async (id: number) => {
  return prisma.$transaction(async (tx) => {
    // 1. Verificar Factura
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { details: true, accountsReceivable: { include: { payments: true } } }
    });

    if (!invoice) throw new Error('Factura no encontrada');
    if (invoice.status === 'ANULADA') throw new Error('La factura ya está anulada');

    // 2. Cambiar estado
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: { status: 'ANULADA' }
    });

    // 3. Devolver Inventario
    for (const detail of invoice.details) {
      await tx.product.update({
        where: { id: detail.productId },
        data: { currentStock: { increment: detail.quantity } }
      });
    }

    // 4. Anular Cuentas por Cobrar y Pagos Asociados
    for (const ar of invoice.accountsReceivable) {
      await tx.accountsReceivable.update({
        where: { id: ar.id },
        data: { status: 'VOIDED', balance: 0 }
      });

      // Eliminar los pagos de esta cuenta
      for (const payment of ar.payments) {
        await tx.payment.delete({
          where: { id: payment.id }
        });
      }
    }

    return updatedInvoice;
  });
};
