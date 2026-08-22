import prisma from '../utils/prisma';
import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  categoryId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional()
});

export const getProducts = async () => {
  return await prisma.product.findMany({
    include: { category: true, brand: true },
    orderBy: { id: 'asc' }
  });
};

export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true }
  });
  if (!product) throw new Error('Producto no encontrado');
  return product;
};

export const createProduct = async (data: z.infer<typeof productSchema>) => {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new Error('Ya existe un producto con este SKU');

  // Si no envían categoryId, creamos/asignamos una categoría por defecto "General"
  let catId = data.categoryId;
  if (!catId) {
    let defaultCat = await prisma.category.findFirst({ where: { name: 'General' } });
    if (!defaultCat) {
      defaultCat = await prisma.category.create({ data: { name: 'General' } });
    }
    catId = defaultCat.id;
  }

  return await prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      categoryId: catId,
      brandId: data.brandId || null,
      isActive: data.isActive ?? true
    },
    include: { category: true, brand: true }
  });
};

export const updateProduct = async (id: number, data: z.infer<typeof productSchema>) => {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing && existing.id !== id) {
    throw new Error('Ya existe otro producto con este SKU');
  }

  let catId = data.categoryId;
  if (!catId) {
    const existingProd = await getProductById(id);
    catId = existingProd.categoryId;
  }

  return await prisma.product.update({
    where: { id },
    data: {
      sku: data.sku,
      name: data.name,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      categoryId: catId,
      brandId: data.brandId || null,
      isActive: data.isActive
    },
    include: { category: true, brand: true }
  });
};

export const deleteProduct = async (id: number) => {
  return await prisma.product.update({
    where: { id },
    data: { isActive: false }
  });
};
