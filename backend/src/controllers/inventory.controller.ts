import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../services/audit.service';
import { adjustProductStock } from '../services/inventory.service';
import { MovementType } from '@prisma/client';

// Registrar un movimiento de inventario (Kardex)
export const registerMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, movementType, quantity, notes, reason, warehouseId } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || 1;

    if (!productId) {
      res.status(400).json({ error: 'El producto es requerido' });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty === 0) {
      res.status(400).json({ error: 'La cantidad debe ser un número válido distinto de cero' });
      return;
    }

    // Normalizar movementType
    const normalizedType = String(movementType).toUpperCase() as MovementType;
    if (!Object.values(MovementType).includes(normalizedType)) {
      res.status(400).json({ error: `Tipo de movimiento inválido: ${movementType}` });
      return;
    }

    const { movement, newStock, stockBefore } = await adjustProductStock({
      productId: parseInt(productId),
      warehouseId: warehouseId ? parseInt(warehouseId) : undefined,
      quantity: qty,
      movementType: normalizedType,
      userId,
      reason,
      notes
    });

    try {
      if (user) {
        await logAudit({
          userId,
          action: 'STOCK_CHANGE',
          tableName: 'inventory_movements',
          recordId: movement.id,
          description: `Movimiento de inventario (${normalizedType}): ${qty} unidades en producto ID ${productId}`,
          oldValues: { stock: stockBefore },
          newValues: { stock: newStock }
        });
      }
    } catch (auditErr) {
      console.error('Error logging audit for movement:', auditErr);
    }

    res.status(201).json(movement);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar movimiento' });
  }
};

// Obtener todo el historial de movimientos (Kardex) con paginación
export const getMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
        { reason: { contains: search } }
      ];
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          user: true,
          warehouse: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.inventoryMovement.count({ where })
    ]);

    res.json({
      data: movements,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener historial', details: error.message });
  }
};

// Obtener alertas de stock bajo
export const getLowStockAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, brand: true }
    });
    
    const alerts = products.filter(p => p.currentStock <= p.minStock);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener alertas', details: error.message });
  }
};

// Editar un movimiento (Solo notas o motivo)
export const updateMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const updated = await prisma.inventoryMovement.update({
      where: { id: parseInt(id as string) },
      data: { reason, notes }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar movimiento', details: error.message });
  }
};

// Eliminar un movimiento (Revierte el stock y borra el registro)
export const deleteMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.findUnique({
        where: { id: parseInt(id as string) },
        include: { product: true }
      });

      if (!movement) throw new Error('Movimiento no encontrado');

      const diff = movement.stockAfter - movement.stockBefore;
      const newStock = movement.product.currentStock - diff;

      if (newStock < 0) {
        throw new Error('No se puede eliminar porque dejaría el stock en negativo');
      }

      // Revertir el stock en el producto
      await tx.product.update({
        where: { id: movement.productId },
        data: { currentStock: newStock }
      });

      // Revertir el stock en la bodega
      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: movement.productId, warehouseId: movement.warehouseId } }
      });
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newStock }
        });
      }

      // Eliminar el movimiento
      await tx.inventoryMovement.delete({
        where: { id: parseInt(id as string) }
      });
    });

    res.json({ message: 'Movimiento eliminado y stock revertido correctamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar movimiento' });
  }
};
