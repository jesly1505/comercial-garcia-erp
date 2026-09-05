import prisma from '../utils/prisma';
import { z } from 'zod';
import { adjustProductStock } from './inventory.service';
import { MovementType, InvoiceStatus, ARStatus, PaymentMethod } from '@prisma/client';

export const createInvoiceSchema = z.object({
  customerId: z.number(),
  tax: z.preprocess((val) => Number(val), z.number().min(0, 'El impuesto no puede ser negativo')).optional().default(0),
  discount: z.preprocess((val) => Number(val), z.number().min(0, 'El descuento no puede ser negativo')).optional().default(0),
  paymentMethod: z.enum(['CONTADO', 'CREDITO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO', 'EFECTIVO']).optional().default('CONTADO'),
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
  // Estandarizar método de pago
  let pm: PaymentMethod = PaymentMethod.CONTADO;
  if (data.paymentMethod === 'CREDITO') pm = PaymentMethod.CREDITO;
  else if (data.paymentMethod === 'TARJETA') pm = PaymentMethod.TARJETA;
  else if (data.paymentMethod === 'TRANSFERENCIA') pm = PaymentMethod.TRANSFERENCIA;
  else if (data.paymentMethod === 'MIXTO') pm = PaymentMethod.MIXTO;

  return prisma.$transaction(async (tx) => {
    // 1. Validar Cliente
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || !customer.isActive) {
      throw new Error('Cliente inválido o inactivo');
    }

    let totalAmount = 0;
    const invoiceDetails = [];
    const invoiceNumber = `INV-${Date.now()}`;

    // 2. Procesar y Validar cada Producto usando el servicio de inventario centralizado
    for (const item of data.details) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      
      if (!product || !product.isActive) {
        throw new Error(`Producto ID ${item.productId} inválido o inactivo`);
      }

      // Descontar stock centralizadamente
      await adjustProductStock({
        productId: product.id,
        quantity: item.quantity,
        movementType: MovementType.VENTA,
        userId,
        reason: `Venta Factura ${invoiceNumber}`,
        referenceNumber: `FACT-${Date.now().toString().slice(-6)}-${product.id}`,
        tx
      });

      const unitPrice = Number(product.salePrice);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      invoiceDetails.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal
      });
    }

    // 3. Crear Factura Maestra
    const finalTotal = totalAmount + (data.tax || 0) - (data.discount || 0);
    
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        userId: userId,
        totalAmount: finalTotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        paymentMethod: pm,
        status: InvoiceStatus.ACTIVA,
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
    if (pm === PaymentMethod.CREDITO) {
      const days = data.creditDays && [8, 15, 30].includes(data.creditDays) ? data.creditDays : 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      await tx.accountsReceivable.create({
        data: {
          customerId: data.customerId,
          invoiceId: invoice.id,
          totalDebt: finalTotal,
          balance: finalTotal,
          status: ARStatus.PENDING,
          dueDate: dueDate
        }
      });
    } else {
      // CONTADO / TARJETA / TRANSFERENCIA
      const ar = await tx.accountsReceivable.create({
        data: {
          customerId: data.customerId,
          invoiceId: invoice.id,
          totalDebt: finalTotal,
          balance: 0,
          status: ARStatus.PAID
        }
      });

      await tx.payment.create({
        data: {
          accountReceivableId: ar.id,
          amount: finalTotal,
          paymentMethod: pm
        }
      });
    }

    return invoice;
  });
};

export const getInvoices = async (page = 1, limit = 50, search = '') => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { customer: { firstName: { contains: search } } },
      { customer: { lastName: { contains: search } } }
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issueDate: 'desc' },
      include: {
        customer: true,
        user: true,
        details: true
      }
    }),
    prisma.invoice.count({ where })
  ]);

  return {
    data: invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
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

export const voidInvoice = async (id: number, userId = 1) => {
  return prisma.$transaction(async (tx) => {
    // 1. Verificar Factura
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { details: true, accountsReceivable: { include: { payments: true } } }
    });

    if (!invoice) throw new Error('Factura no encontrada');
    if (invoice.status === InvoiceStatus.ANULADA) throw new Error('La factura ya está anulada');

    // 2. Cambiar estado
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ANULADA }
    });

    // 3. Devolver Inventario mediante el servicio centralizado
    for (const detail of invoice.details) {
      await adjustProductStock({
        productId: detail.productId,
        quantity: detail.quantity,
        movementType: MovementType.DEVOLUCION,
        userId,
        reason: `Anulación de Factura ${invoice.invoiceNumber}`,
        referenceNumber: `ANUL-${Date.now().toString().slice(-6)}-${detail.productId}`,
        tx
      });
    }

    // 4. Actualizar Cuentas por Cobrar
    for (const ar of invoice.accountsReceivable) {
      await tx.accountsReceivable.update({
        where: { id: ar.id },
        data: { status: ARStatus.CANCELLED, balance: 0 }
      });
    }

    return updatedInvoice;
  });
};
