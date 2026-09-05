import prisma from '../utils/prisma';
import { MovementType, Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface StockAdjustmentParams {
  productId: number;
  warehouseId?: number;
  quantity: number;
  movementType: MovementType;
  userId: number;
  reason?: string;
  notes?: string;
  referenceNumber?: string;
  tx?: Prisma.TransactionClient;
}

export const adjustProductStock = async (params: StockAdjustmentParams) => {
  const db = params.tx || prisma;

  // Obtener o asignar bodega por defecto
  let warehouseId = params.warehouseId;
  if (!warehouseId) {
    const warehouse = await db.warehouse.findFirst();
    if (warehouse) {
      warehouseId = warehouse.id;
    } else {
      const newWarehouse = await db.warehouse.create({ data: { name: 'Bodega Principal' } });
      warehouseId = newWarehouse.id;
    }
  }

  // Verificar producto
  const product = await db.product.findUnique({ where: { id: params.productId } });
  if (!product) {
    throw new Error(`Producto con ID ${params.productId} no encontrado`);
  }

  const qty = Math.abs(params.quantity);
  const type = params.movementType;
  const isAddition = type === MovementType.ENTRADA || type === MovementType.COMPRA || type === MovementType.DEVOLUCION;
  const isSubtraction = type === MovementType.SALIDA || type === MovementType.VENTA;

  const stockBefore = product.currentStock;
  let newStock = stockBefore;

  if (isAddition) {
    newStock += qty;
  } else if (isSubtraction) {
    newStock -= qty;
    if (newStock < 0) {
      throw new Error(`Stock insuficiente para el producto "${product.name}". Disponible: ${stockBefore}, Solicitado: ${qty}`);
    }
  } else if (type === MovementType.AJUSTE) {
    newStock = params.quantity >= 0 ? stockBefore + qty : stockBefore - qty;
    if (newStock < 0) {
      throw new Error(`Ajuste denegado: El stock no puede ser negativo.`);
    }
  }

  const refNumber = params.referenceNumber || `MOV-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

  // 1. Crear el registro en inventario movements
  const movement = await db.inventoryMovement.create({
    data: {
      referenceNumber: refNumber,
      productId: params.productId,
      warehouseId,
      userId: params.userId,
      movementType: type,
      quantity: qty,
      stockBefore,
      stockAfter: newStock,
      reason: params.reason || null,
      notes: params.notes || null
    }
  });

  // 2. Actualizar stock en tabla de productos
  await db.product.update({
    where: { id: params.productId },
    data: { currentStock: newStock }
  });

  // 3. Upsert en tabla Inventory
  await db.inventory.upsert({
    where: {
      productId_warehouseId: { productId: params.productId, warehouseId }
    },
    update: { quantity: newStock },
    create: {
      productId: params.productId,
      warehouseId,
      quantity: newStock
    }
  });

  return { movement, newStock, stockBefore };
};
