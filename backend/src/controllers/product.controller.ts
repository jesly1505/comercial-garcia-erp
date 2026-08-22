import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const prisma = new PrismaClient();

// Obtener todos los productos
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

// Crear nuevo producto
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    
    // Asumiremos la categoría 1 por defecto por ahora (hasta tener módulo de categorías)
    let categoryId = 1;
    const categoryExists = await prisma.category.findUnique({ where: { id: 1 } });
    if (!categoryExists) {
      const newCat = await prisma.category.create({ data: { name: 'General' } });
      categoryId = newCat.id;
    }

    const product = await prisma.product.create({
      data: {
        categoryId,
        sku: data.sku,
        name: data.name,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        currentStock: data.currentStock || 0,
        minStock: data.minStock || 5,
        unit: data.unit || 'UNIDAD',
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });

    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'CREATE',
        tableName: 'products',
        recordId: product.id,
        description: `Producto creado: ${product.name} (SKU: ${product.sku})`
      });
    }

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear producto', details: error.message });
  }
};

// Actualizar producto
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const oldProduct = await prisma.product.findUnique({ where: { id: parseInt(id as string) } });

    const product = await prisma.product.update({
      where: { id: parseInt(id as string) },
      data: {
        sku: data.sku,
        name: data.name,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        currentStock: data.currentStock,
        minStock: data.minStock,
        unit: data.unit,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      }
    });

    const user = (req as any).user;
    if (user && oldProduct) {
      if (oldProduct.salePrice !== product.salePrice) {
        await logAudit({
          userId: user.userId,
          action: 'PRICE_CHANGE',
          tableName: 'products',
          recordId: product.id,
          description: `Cambio de precio de producto: ${product.name}`,
          oldValues: { salePrice: oldProduct.salePrice },
          newValues: { salePrice: product.salePrice }
        });
      }
      
      await logAudit({
        userId: user.userId,
        action: 'UPDATE',
        tableName: 'products',
        recordId: product.id,
        description: `Producto modificado: ${product.name}`
      });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar producto', details: error.message });
  }
};

// Eliminar producto
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Baja lógica si hay movimientos o detalles de factura
    const invoices = await prisma.invoiceDetail.count({ where: { productId: parseInt(id as string) } });
    const movements = await prisma.inventoryMovement.count({ where: { productId: parseInt(id as string) } });
    
    if (invoices > 0 || movements > 0) {
      await prisma.product.update({
        where: { id: parseInt(id as string) },
        data: { isActive: false }
      });
      res.json({ message: 'Producto desactivado (no eliminado físicamente por integridad)' });
    } else {
      await prisma.product.delete({ where: { id: parseInt(id as string) } });
      
      const user = (req as any).user;
      if (user) {
        await logAudit({
          userId: user.userId,
          action: 'DELETE',
          tableName: 'products',
          recordId: parseInt(id as string),
          description: `Producto eliminado ID: ${id}`
        });
      }

      res.json({ message: 'Producto eliminado exitosamente' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar producto', details: error.message });
  }
};
