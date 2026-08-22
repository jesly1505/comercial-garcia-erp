import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const prisma = new PrismaClient();

// Utils: Lógica para aplicar los efectos de recibir una compra
const receivePurchaseInventory = async (tx: any, purchaseId: number, warehouseId: number = 1, userId: number = 1) => {
  const purchase = await tx.purchaseOrder.findUnique({
    where: { id: purchaseId },
    include: { details: { include: { product: true } } }
  });

  if (!purchase) throw new Error('Compra no encontrada');
  if (purchase.status === 'RECEIVED') throw new Error('Esta compra ya ha sido recibida anteriormente');

  for (const detail of purchase.details) {
    const product = detail.product;
    const stockBefore = product.currentStock;
    const stockAfter = stockBefore + detail.quantity;

    // 1. Actualizar costo y stock del producto
    await tx.product.update({
      where: { id: product.id },
      data: { 
        currentStock: stockAfter,
        costPrice: detail.unitCost // Opcional: Actualizamos el costo al costo más reciente de compra
      }
    });

    // 2. Upsert Inventory records (Bodega)
    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId } }
    });
    if (inventory) {
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: stockAfter }
      });
    } else {
      await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId,
          quantity: stockAfter
        }
      });
    }

    // 3. Crear el movimiento de inventario (Kardex)
    const referenceNumber = `COMPRA-${purchase.id}-${product.id}-${Date.now().toString().slice(-4)}`;
    await tx.inventoryMovement.create({
      data: {
        referenceNumber,
        productId: product.id,
        warehouseId,
        userId,
        movementType: 'COMPRA',
        quantity: detail.quantity,
        stockBefore,
        stockAfter,
        reason: `Recepción de orden de compra #${purchase.id}`,
        notes: `Factura prov: ${purchase.invoiceNumber || 'N/A'}`
      }
    });
  }

  // 4. Cambiar estado de la compra
  await tx.purchaseOrder.update({
    where: { id: purchase.id },
    data: { status: 'RECEIVED' }
  });
};

export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, invoiceNumber, details, status } = req.body;
    
    // details es un array de { productId, quantity, unitCost }
    if (!details || details.length === 0) {
      res.status(400).json({ error: 'La compra debe tener al menos un producto' });
      return;
    }

    const totalAmount = details.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Orden
      const purchase = await tx.purchaseOrder.create({
        data: {
          supplierId,
          invoiceNumber: invoiceNumber || null,
          totalAmount,
          status: 'PENDING', // Se crea pendiente por defecto
          details: {
            create: details.map((d: any) => ({
              productId: d.productId,
              quantity: d.quantity,
              unitCost: d.unitCost,
              subtotal: d.quantity * d.unitCost
            }))
          }
        }
      });

      // 2. Si viene marcada como RECEIVED desde la creación, la procesamos
      if (status === 'RECEIVED') {
        await receivePurchaseInventory(tx, purchase.id);
      } else if (status === 'CANCELLED') {
        await tx.purchaseOrder.update({
          where: { id: purchase.id },
          data: { status: 'CANCELLED' }
        });
      }

      const user = (req as any).user;
      if (user) {
        await logAudit({
          userId: user.userId,
          action: 'CREATE',
          tableName: 'purchases',
          recordId: purchase.id,
          description: `Compra registrada: #${purchase.id} - Proveedor ID: ${purchase.supplierId}`,
          newValues: { totalAmount: purchase.totalAmount, itemsCount: details.length }
        });
      }

      return purchase;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar la compra', details: error.message });
  }
};

export const getPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchases = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        details: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(purchases);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener las compras', details: error.message });
  }
};

export const getPurchaseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        supplier: true,
        details: {
          include: { product: true }
        }
      }
    });

    if (!purchase) {
      res.status(404).json({ error: 'Compra no encontrada' });
      return;
    }

    res.json(purchase);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la compra', details: error.message });
  }
};

export const updatePurchaseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'RECEIVED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }

    const currentPurchase = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(id as string) } });
    if (!currentPurchase) {
      res.status(404).json({ error: 'Compra no encontrada' });
      return;
    }

    // Reglas de negocio para estados
    if (currentPurchase.status === 'CANCELLED') {
      res.status(400).json({ error: 'No se puede modificar una compra cancelada' });
      return;
    }

    if (currentPurchase.status === 'RECEIVED' && status !== 'RECEIVED') {
      res.status(400).json({ error: 'No se puede revertir una compra que ya ha sido recibida y ha afectado el inventario' });
      return;
    }

    if (currentPurchase.status === 'PENDING' && status === 'RECEIVED') {
      // Procesar recepción (Afectar inventario)
      await prisma.$transaction(async (tx) => {
        await receivePurchaseInventory(tx, parseInt(id as string));
      });
      res.json({ message: 'Compra recibida y stock actualizado' });
      return;
    } else {
      // Solo cambiar estado (ej. PENDING a CANCELLED)
      const updated = await prisma.purchaseOrder.update({
        where: { id: parseInt(id as string) },
        data: { status }
      });
      res.json(updated);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar el estado de la compra', details: error.message });
  }
};

export const deletePurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const purchaseId = parseInt(id as string);

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseOrder.findUnique({
        where: { id: purchaseId },
        include: { details: { include: { product: true } } }
      });

      if (!purchase) throw new Error('Compra no encontrada');

      // Si la compra fue recibida, revertir el inventario
      if (purchase.status === 'RECEIVED') {
        const warehouseId = 1; // Asumimos bodega principal
        
        for (const detail of purchase.details) {
          const product = detail.product;
          const newStock = product.currentStock - detail.quantity;

          if (newStock < 0) {
            throw new Error(`Revertir la compra dejaría el stock del producto ${product.name} en negativo`);
          }

          // 1. Revertir stock del producto
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock }
          });

          // 2. Revertir stock de la bodega
          const inventory = await tx.inventory.findUnique({
            where: { productId_warehouseId: { productId: product.id, warehouseId } }
          });
          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newStock }
            });
          }

          // 3. Eliminar los movimientos de inventario asociados
          await tx.inventoryMovement.deleteMany({
            where: {
              referenceNumber: { startsWith: `COMPRA-${purchaseId}-${product.id}` }
            }
          });
        }
      }

      // Eliminar detalles y luego la orden de compra
      await tx.purchaseOrderDetail.deleteMany({ where: { purchaseOrderId: purchaseId } });
      await tx.purchaseOrder.delete({ where: { id: purchaseId } });
    });

    res.json({ message: 'Compra eliminada (y stock revertido si aplicaba)' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar la compra', details: error.message });
  }
};
