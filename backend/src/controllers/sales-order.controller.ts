import { Request, Response } from 'express';
import { logAudit } from '../services/audit.service';
import { notifyAdmins, notifyUser } from '../services/notification.service';
import prisma from '../utils/prisma';

// Helper for sending error response
const handleError = (res: Response, error: any, message: string = 'Server error') => {
  console.error(`[SalesOrderController] ${message}:`, error);
  res.status(500).json({ error: message, details: error.message });
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, details } = req.body;
    // details should be an array of { productId, quantity, unitPrice }
    
    if (!customerId || !details || details.length === 0) {
      return res.status(400).json({ error: 'Customer ID and details are required' });
    }

    let totalAmount = 0;
    const orderDetails = details.map((detail: any) => {
      const subtotal = detail.quantity * detail.unitPrice;
      totalAmount += subtotal;
      return {
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        subtotal
      };
    });

    const newOrder = await prisma.salesOrder.create({
      data: {
        customerId,
        totalAmount,
        status: 'PENDING',
        details: {
          create: orderDetails
        }
      },
      include: {
        customer: true,
        details: true
      }
    });

    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'CREATE',
        tableName: 'sales_orders',
        recordId: newOrder.id,
        description: `Venta creada: Orden #${newOrder.id} - Cliente: ${newOrder.customer.firstName} ${newOrder.customer.lastName}`,
        newValues: { totalAmount: newOrder.totalAmount, itemsCount: newOrder.details.length }
      });
      await notifyAdmins(
        'Nuevo Pedido Creado',
        `El usuario ${user.username} ha creado el pedido #${newOrder.id} por $${newOrder.totalAmount}`,
        'INFO'
      );
    }

    res.status(201).json(newOrder);
  } catch (error) {
    handleError(res, error, 'Failed to create sales order');
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.salesOrder.findMany({
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
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch sales orders');
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        details: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }
    res.json(order);
  } catch (error) {
    handleError(res, error, 'Failed to fetch sales order');
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, IN_PROCESS, DELIVERED, CANCELED

    const order = await prisma.salesOrder.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json(order);
  } catch (error) {
    handleError(res, error, 'Failed to update sales order status');
  }
};

export const convertToInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id; // Assuming authMiddleware attaches user

    const order = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        details: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    if (order.status === 'CANCELED') {
      return res.status(400).json({ error: 'Cannot convert a canceled order' });
    }
    
    // We also need a user to tie the invoice to, default to 1 if not set for safety
    const finalUserId = userId || 1;

    // Generate unique invoice number
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    // Create Invoice inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Invoice
      const invoice = await tx.invoice.create({
        data: {
          salesOrderId: order.id,
          customerId: order.customerId,
          userId: finalUserId,
          invoiceNumber,
          totalAmount: order.totalAmount,
          status: 'ACTIVA',
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

      // 2. Update the SalesOrder status to INVOICED or DELIVERED
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'ENTREGADO' }
      });

      // 3. Deduct Inventory
      for (const detail of order.details) {
        // Find default warehouse inventory for product
        const inventory = await tx.inventory.findFirst({
          where: { productId: detail.productId }
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: detail.quantity } }
          });
          
          // Also update total stock in Product
          await tx.product.update({
            where: { id: detail.productId },
            data: { currentStock: { decrement: detail.quantity } }
          });

          // Log movement
          await tx.inventoryMovement.create({
            data: {
              productId: detail.productId,
              warehouseId: inventory.warehouseId,
              userId: finalUserId,
              movementType: 'OUT',
              quantity: detail.quantity,
              stockBefore: inventory.quantity,
              stockAfter: inventory.quantity - detail.quantity,
              reason: `Factura ${invoiceNumber}`,
            }
          });
        }
      }

      return invoice;
    });

    res.json(result);
  } catch (error) {
    handleError(res, error, 'Failed to convert sales order to invoice');
  }
};
