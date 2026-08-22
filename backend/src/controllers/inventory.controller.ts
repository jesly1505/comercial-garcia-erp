import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const prisma = new PrismaClient();

// Registrar un movimiento de inventario (Kardex)
export const registerMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, movementType, quantity, notes, reason } = req.body;
    
    // Asumimos warehouseId = 1 (Principal) por defecto temporalmente
    const user = (req as any).user;
    let userId = user ? user.userId : 1; 
    let warehouseId = 1;

    // Verificar si existe la bodega, si no, crearla
    const warehouse = await prisma.warehouse.findFirst();
    if (warehouse) {
      warehouseId = warehouse.id;
    } else {
      const newWarehouse = await prisma.warehouse.create({ data: { name: 'Bodega Principal' } });
      warehouseId = newWarehouse.id;
    }

    // Verificar si el producto existe
    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty === 0) {
      res.status(400).json({ error: 'Cantidad inválida' });
      return;
    }

    // Determinar si suma o resta
    const type = String(movementType).toUpperCase();
    const isSum = ['COMPRA', 'DEVOLUCION', 'AJUSTE_ENTRADA'].includes(type);
    const isSub = ['VENTA', 'TRANSFERENCIA', 'AJUSTE_SALIDA'].includes(type);
    
    const stockBefore = product.currentStock;
    let newStock = stockBefore;

    if (isSum) {
      newStock += Math.abs(qty);
    } else if (isSub) {
      newStock -= Math.abs(qty);
      if (newStock < 0) {
        res.status(400).json({ error: 'Operación denegada: El stock no puede ser negativo.' });
        return;
      }
    } else if (type === 'AJUSTE') {
      newStock += qty; // si qty es + suma, si es - resta
      if (newStock < 0) {
        res.status(400).json({ error: 'Operación denegada: El stock no puede ser negativo.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Tipo de movimiento inválido' });
      return;
    }

    // Generar un referenceNumber automático basado en timestamp
    const referenceNumber = `MOV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

    // Ejecutar la actualización en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el movimiento
      const mov = await tx.inventoryMovement.create({
        data: {
          referenceNumber,
          productId: parseInt(productId),
          warehouseId,
          userId,
          movementType: type,
          quantity: Math.abs(qty),
          stockBefore,
          stockAfter: newStock,
          reason: reason || null,
          notes: notes || null
        }
      });

      // 2. Actualizar el stock del producto
      await tx.product.update({
        where: { id: parseInt(productId) },
        data: { currentStock: newStock }
      });

      // 3. Upsert Inventory records (relacion bodega-producto)
      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: parseInt(productId), warehouseId } }
      });
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newStock }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: parseInt(productId),
            warehouseId,
            quantity: newStock
          }
        });
      }

      return mov;
    });

    res.status(201).json(result);
    
    // Loguear asíncronamente
    if (user) {
      logAudit({
        userId,
        action: 'STOCK_CHANGE',
        tableName: 'inventory_movements',
        recordId: result.id,
        description: `Movimiento de inventario (${type}): ${qty} unidades del producto ${product.name}`,
        oldValues: { stock: stockBefore },
        newValues: { stock: newStock }
      });
    }
    
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar movimiento', details: error.message });
  }
};

// Obtener todo el historial de movimientos (Kardex)
export const getMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener historial', details: error.message });
  }
};

// Obtener alertas de stock bajo
export const getLowStockAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true
        // SQLite + Prisma no soporta comparar dos columnas (currentStock <= minStock) 
        // en la misma cláusula where de manera sencilla, lo filtraremos en JS.
      }
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
    res.status(500).json({ error: 'Error al actualizar movimiento', details: error.message });
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
    res.status(500).json({ error: 'Error al eliminar movimiento', details: error.message });
  }
};
