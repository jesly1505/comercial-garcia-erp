import prisma from '../utils/prisma';
import { z } from 'zod';

export const quotationItemSchema = z.object({
  productId: z.number(),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, 'La cantidad debe ser al menos 1')),
  unitPrice: z.preprocess((val) => Number(val), z.number().min(0, 'El precio no puede ser negativo')),
  discount: z.preprocess((val) => (val !== undefined && val !== null ? Number(val) : 0), z.number().min(0)).optional().default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.preprocess((val) => Number(val), z.number().min(1, 'El cliente es requerido')),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tax: z.preprocess((val) => (val !== undefined && val !== null ? Number(val) : 0), z.number().min(0)).optional().default(0),
  discount: z.preprocess((val) => (val !== undefined && val !== null ? Number(val) : 0), z.number().min(0)).optional().default(0),
  details: z.array(quotationItemSchema).min(1, 'Debe incluir al menos un producto'),
});

export const updateQuotationSchema = createQuotationSchema.partial().extend({
  status: z.enum(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'FACTURADA', 'VENCIDA', 'CANCELADA']).optional(),
});

export const generateQuotationNumber = async (): Promise<string> => {
  const count = await prisma.quotation.count();
  const nextNum = count + 1;
  return `COT-${String(nextNum).padStart(6, '0')}`;
};

export const createQuotation = async (userId: number, data: z.infer<typeof createQuotationSchema>) => {
  return prisma.$transaction(async (tx) => {
    // 1. Validar Cliente
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || !customer.isActive) {
      throw new Error('Cliente inválido o inactivo');
    }

    let calculatedSubtotal = 0;
    const quotationDetails = [];

    // 2. Procesar ítems
    for (const item of data.details) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        throw new Error(`Producto ID ${item.productId} inválido o inactivo`);
      }

      const itemDiscount = item.discount || 0;
      const itemSubtotal = (item.unitPrice * item.quantity) - itemDiscount;
      calculatedSubtotal += itemSubtotal;

      quotationDetails.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        subtotal: itemSubtotal > 0 ? itemSubtotal : 0,
      });
    }

    const quotationNumber = await generateQuotationNumber();
    const subtotal = calculatedSubtotal;
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const totalAmount = Math.max(0, subtotal + tax - discount);

    const validUntilDate = data.validUntil ? new Date(data.validUntil) : null;

    const quotation = await tx.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        userId,
        status: 'PENDIENTE',
        subtotal,
        tax,
        discount,
        totalAmount,
        validUntil: validUntilDate,
        notes: data.notes || null,
        details: {
          create: quotationDetails,
        },
      },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        details: {
          include: {
            product: true,
          },
        },
      },
    });

    return quotation;
  });
};

export const getQuotations = async (filters?: {
  status?: string;
  customerId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const where: any = {};

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    where.OR = [
      { quotationNumber: { contains: s } },
      { customer: { firstName: { contains: s } } },
      { customer: { lastName: { contains: s } } },
      { customer: { company: { contains: s } } },
    ];
  }

  return prisma.quotation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      details: {
        include: { product: true },
      },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
      },
    },
  });
};

export const getQuotationById = async (id: number) => {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      details: {
        include: {
          product: {
            include: { category: true, brand: true },
          },
        },
      },
      invoices: true,
    },
  });
};

export const updateQuotation = async (id: number, userId: number, data: z.infer<typeof createQuotationSchema>) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.quotation.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!existing) {
      throw new Error('Cotización no encontrada');
    }

    if (existing.status === 'FACTURADA') {
      throw new Error('No se puede modificar una cotización que ya ha sido facturada');
    }

    if (existing.status === 'CANCELADA') {
      throw new Error('No se puede modificar una cotización cancelada');
    }

    // 1. Eliminar detalles anteriores
    await tx.quotationDetail.deleteMany({
      where: { quotationId: id },
    });

    // 2. Procesar nuevos ítems
    let calculatedSubtotal = 0;
    const quotationDetails = [];

    for (const item of data.details) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        throw new Error(`Producto ID ${item.productId} inválido o inactivo`);
      }

      const itemDiscount = item.discount || 0;
      const itemSubtotal = (item.unitPrice * item.quantity) - itemDiscount;
      calculatedSubtotal += itemSubtotal;

      quotationDetails.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount,
        subtotal: itemSubtotal > 0 ? itemSubtotal : 0,
      });
    }

    const subtotal = calculatedSubtotal;
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const totalAmount = Math.max(0, subtotal + tax - discount);
    const validUntilDate = data.validUntil ? new Date(data.validUntil) : null;

    const updated = await tx.quotation.update({
      where: { id },
      data: {
        customerId: data.customerId,
        subtotal,
        tax,
        discount,
        totalAmount,
        validUntil: validUntilDate,
        notes: data.notes || null,
        details: {
          create: quotationDetails,
        },
      },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        details: { include: { product: true } },
      },
    });

    return updated;
  });
};

export const updateQuotationStatus = async (id: number, status: string, userId: number) => {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error('Cotización no encontrada');

  if (existing.status === 'FACTURADA' && status !== 'FACTURADA') {
    throw new Error('No se puede cambiar el estado de una cotización ya facturada');
  }

  return prisma.quotation.update({
    where: { id },
    data: { status },
    include: {
      customer: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      details: { include: { product: true } },
    },
  });
};

export const convertQuotationToInvoice = async (
  quotationId: number,
  userId: number,
  options?: { paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'; creditDays?: number }
) => {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        details: { include: { product: true } },
      },
    });

    if (!quotation) {
      throw new Error('Cotización no encontrada');
    }

    if (quotation.status === 'FACTURADA') {
      throw new Error('Esta cotización ya fue convertida a Factura');
    }

    if (quotation.status === 'CANCELADA' || quotation.status === 'RECHAZADA') {
      throw new Error(`No se puede facturar una cotización en estado ${quotation.status}`);
    }

    // 1. Validar Stock disponible de todos los productos
    for (const detail of quotation.details) {
      if (!detail.product.isActive) {
        throw new Error(`El producto "${detail.product.name}" está inactivo`);
      }
      if (detail.product.currentStock < detail.quantity) {
        throw new Error(
          `Stock insuficiente para "${detail.product.name}". Requiere: ${detail.quantity}, Disponible: ${detail.product.currentStock}`
        );
      }
    }

    // 2. Descontar Inventario y Crear Movimientos
    for (const detail of quotation.details) {
      await tx.product.update({
        where: { id: detail.productId },
        data: { currentStock: detail.product.currentStock - detail.quantity },
      });

      // Si existe registro en almacén por defecto
      const inv = await tx.inventory.findFirst({
        where: { productId: detail.productId },
      });

      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: detail.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: detail.productId,
            warehouseId: inv.warehouseId,
            userId,
            movementType: 'OUT',
            quantity: detail.quantity,
            stockBefore: inv.quantity,
            stockAfter: Math.max(0, inv.quantity - detail.quantity),
            reason: `Conversión desde Cotización ${quotation.quotationNumber}`,
          },
        });
      }
    }

    // 3. Crear Factura
    const invoiceCount = await tx.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;
    const paymentMethod = options?.paymentMethod || 'EFECTIVO';

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        userId,
        totalAmount: quotation.totalAmount,
        tax: quotation.tax,
        discount: quotation.discount,
        paymentMethod,
        status: 'ACTIVA',
        details: {
          create: quotation.details.map((d: any) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            subtotal: d.subtotal,
          })),
        },
      },
      include: {
        details: { include: { product: true } },
        customer: true,
        user: true,
      },
    });

    // 4. Actualizar Estado de la Cotización
    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: 'FACTURADA' },
    });

    // 5. Cuentas por Cobrar / Pagos
    if (paymentMethod === 'CREDITO') {
      const days = options?.creditDays && [8, 15, 30].includes(options.creditDays) ? options.creditDays : 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      await tx.accountsReceivable.create({
        data: {
          customerId: quotation.customerId,
          invoiceId: invoice.id,
          totalDebt: quotation.totalAmount,
          balance: quotation.totalAmount,
          status: 'PENDING',
          dueDate,
        },
      });
    } else {
      const ar = await tx.accountsReceivable.create({
        data: {
          customerId: quotation.customerId,
          invoiceId: invoice.id,
          totalDebt: quotation.totalAmount,
          balance: 0,
          status: 'PAID',
        },
      });

      await tx.payment.create({
        data: {
          accountReceivableId: ar.id,
          amount: quotation.totalAmount,
          paymentMethod,
        },
      });
    }

    return invoice;
  });
};

export const deleteQuotation = async (id: number, userId: number) => {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error('Cotización no encontrada');

  if (existing.status === 'FACTURADA') {
    throw new Error('No se puede eliminar una cotización facturada');
  }

  return prisma.quotation.delete({
    where: { id },
  });
};
