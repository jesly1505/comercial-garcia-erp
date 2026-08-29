import { Request, Response } from 'express';
import { logAudit } from '../services/audit.service';
import { notifyAdmins } from '../services/notification.service';
import { adjustProductStock } from '../services/inventory.service';
import prisma from '../utils/prisma';
import { SalesOrderStatus, InvoiceStatus, MovementType, PaymentMethod, ARStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  [SalesOrderStatus.PENDING]: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.CONFIRMED]: [SalesOrderStatus.SHIPPED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.SHIPPED]: [SalesOrderStatus.DELIVERED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.DELIVERED]: [],
  [SalesOrderStatus.CANCELLED]: []
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, details } = req.body;
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    if (!customerId || !details || details.length === 0) {
      res.status(400).json({ error: 'El ID de cliente y los detalles son requeridos' });
      return;
    }

    let totalAmount = 0;
    const orderDetails = details.map((detail: any) => {
      const subtotal = Number(detail.quantity) * Number(detail.unitPrice);
      totalAmount += subtotal;
      return {
        productId: parseInt(detail.productId),
        quantity: parseInt(detail.quantity),
        unitPrice: detail.unitPrice,
        subtotal
      };
    });

    const newOrder = await prisma.salesOrder.create({
      data: {
        customerId: parseInt(customerId),
        totalAmount,
        status: SalesOrderStatus.PENDING,
        details: {
          create: orderDetails
        }
      },
      include: {
        customer: true,
        details: true
      }
    });

    try {
      await logAudit({
        userId: user.userId,
        action: 'CREATE',
        tableName: 'sales_orders',
        recordId: newOrder.id,
        description: `Orden de venta creada #${newOrder.id} - Cliente: ${newOrder.customer.firstName} ${newOrder.customer.lastName}`,
        newValues: { totalAmount: Number(newOrder.totalAmount), itemsCount: newOrder.details.length }
      });

      await notifyAdmins(
        'Nuevo Pedido Creado',
        `El usuario ${user.username || user.userId} ha creado el pedido #${newOrder.id} por C$${newOrder.totalAmount}`,
        'INFO'
      );
    } catch (e) {
      console.error('Audit/Notification error in createOrder:', e);
    }

    res.status(201).json(newOrder);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear orden de venta' });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true
            }
          },
          details: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.salesOrder.count()
    ]);

    res.json({
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener pedidos', details: error.message });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        customer: true,
        details: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener pedido', details: error.message });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const targetStatus = String(req.body.status).toUpperCase() as SalesOrderStatus;

    const currentOrder = await prisma.salesOrder.findUnique({ where: { id: parseInt(id as string) } });
    if (!currentOrder) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    const allowed = VALID_TRANSITIONS[currentOrder.status];
    if (!allowed.includes(targetStatus)) {
      res.status(400).json({
        error: `Transición de estado inválida: No se puede cambiar de ${currentOrder.status} a ${targetStatus}. Transiciones permitidas: [${allowed.join(', ') || 'ninguna'}]`
      });
      return;
    }

    const order = await prisma.salesOrder.update({
      where: { id: parseInt(id as string) },
      data: { status: targetStatus }
    });

    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar estado del pedido' });
  }
};

export const convertToInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Usuario no autenticado para facturar pedido' });
      return;
    }

    const userId = user.userId;

    const order = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id as string) },
      include: { details: true }
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    if (order.status === SalesOrderStatus.CANCELLED) {
      res.status(400).json({ error: 'No se puede facturar un pedido cancelado' });
      return;
    }

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear factura
      const invoice = await tx.invoice.create({
        data: {
          salesOrderId: order.id,
          customerId: order.customerId,
          userId,
          invoiceNumber,
          totalAmount: order.totalAmount,
          status: InvoiceStatus.ACTIVA,
          paymentMethod: PaymentMethod.CONTADO,
          details: {
            create: order.details.map(d => ({
              productId: d.productId,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              subtotal: d.subtotal
            }))
          }
        }
      });

      // 2. Actualizar estado del pedido
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: SalesOrderStatus.DELIVERED }
      });

      // 3. Crear registro en CxC
      const ar = await tx.accountsReceivable.create({
        data: {
          customerId: order.customerId,
          invoiceId: invoice.id,
          totalDebt: order.totalAmount,
          balance: 0,
          status: ARStatus.PAID
        }
      });

      await tx.payment.create({
        data: {
          accountReceivableId: ar.id,
          amount: order.totalAmount,
          paymentMethod: PaymentMethod.CONTADO
        }
      });

      // 4. Descontar inventario centralizadamente
      for (const detail of order.details) {
        await adjustProductStock({
          productId: detail.productId,
          quantity: detail.quantity,
          movementType: MovementType.VENTA,
          userId,
          reason: `Factura ${invoiceNumber} desde Pedido #${order.id}`,
          referenceNumber: `FACT-${Date.now().toString().slice(-6)}-${detail.productId}`,
          tx
        });
      }

      return invoice;
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al convertir pedido en factura' });
  }
};
