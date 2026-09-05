import { Request, Response } from 'express';
import { 
  getProducts as getProductsService, 
  getProductById as getProductByIdService, 
  createProduct as createProductService, 
  updateProduct as updateProductService, 
  deleteProduct as deleteProductService,
  productSchema 
} from '../services/product.service';
import { logAudit } from '../services/audit.service';
import { ZodError } from 'zod';

// Obtener todos los productos (con paginación y búsqueda opcional)
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

    // Si el cliente pide lista plana sin paginación (ej: dropdowns)
    if (req.query.all === 'true') {
      const result = await getProductsService(1, 10000, search, categoryId);
      res.json(result.data);
      return;
    }

    const result = await getProductsService(page, limit, search, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

// Obtener producto por ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await getProductByIdService(parseInt(id as string));
    res.json(product);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Producto no encontrado' });
  }
};

// Crear nuevo producto con validación Zod
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = productSchema.parse(req.body);
    const product = await createProductService(validatedData);

    const user = (req as any).user;
    if (user) {
      try {
        await logAudit({
          userId: user.userId,
          action: 'CREATE',
          tableName: 'products',
          recordId: product.id,
          description: `Producto creado: ${product.name} (SKU: ${product.sku})`
        });
      } catch (auditErr) {
        console.error('Error logging audit for product create:', auditErr);
      }
    }

    res.status(201).json(product);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Error de validación' });
    } else {
      res.status(400).json({ error: error.message || 'Error al crear producto' });
    }
  }
};

// Actualizar producto con validación Zod
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = productSchema.parse(req.body);
    const product = await updateProductService(parseInt(id as string), validatedData);

    const user = (req as any).user;
    if (user) {
      try {
        await logAudit({
          userId: user.userId,
          action: 'UPDATE',
          tableName: 'products',
          recordId: product.id,
          description: `Producto modificado: ${product.name}`
        });
      } catch (auditErr) {
        console.error('Error logging audit for product update:', auditErr);
      }
    }

    res.json(product);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Error de validación' });
    } else {
      res.status(400).json({ error: error.message || 'Error al actualizar producto' });
    }
  }
};

// Eliminar producto
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await deleteProductService(parseInt(id as string));

    const user = (req as any).user;
    if (user) {
      try {
        await logAudit({
          userId: user.userId,
          action: 'DELETE',
          tableName: 'products',
          recordId: parseInt(id as string),
          description: `Producto eliminado o desactivado ID: ${id}`
        });
      } catch (auditErr) {
        console.error('Error logging audit for product delete:', auditErr);
      }
    }

    res.json({ message: 'Producto procesado correctamente', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar producto' });
  }
};
