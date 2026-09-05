import prisma from '../utils/prisma';
import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  costPrice: z.preprocess((val) => Number(val), z.number().min(0, 'El precio de costo debe ser >= 0')),
  salePrice: z.preprocess((val) => Number(val), z.number().min(0, 'El precio de venta debe ser >= 0')),
  currentStock: z.preprocess((val) => val !== undefined ? Number(val) : 0, z.number().int().min(0)).optional().default(0),
  minStock: z.preprocess((val) => val !== undefined ? Number(val) : 5, z.number().int().min(0)).optional().default(5),
  unit: z.string().optional().default('UNIDAD'),
  imageUrl: z.string().optional().nullable(),
  categoryId: z.preprocess((val) => val ? Number(val) : undefined, z.number().int().positive().optional()),
  brandId: z.preprocess((val) => val ? Number(val) : undefined, z.number().int().positive().optional().nullable()),
  isActive: z.boolean().optional().default(true)
});

export const updateProductSchema = productSchema.partial();

export const getProducts = async (page = 1, limit = 50, search = '', categoryId?: number) => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } }
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: { category: true, brand: true },
      orderBy: { id: 'asc' }
    }),
    prisma.product.count({ where })
  ]);

  return {
    data: products,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
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
      currentStock: data.currentStock ?? 0,
      minStock: data.minStock ?? 5,
      unit: data.unit ?? 'UNIDAD',
      imageUrl: data.imageUrl || null,
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
      currentStock: data.currentStock,
      minStock: data.minStock,
      unit: data.unit,
      imageUrl: data.imageUrl,
      categoryId: catId,
      brandId: data.brandId || null,
      isActive: data.isActive
    },
    include: { category: true, brand: true }
  });
};

export const deleteProduct = async (id: number) => {
  const invoices = await prisma.invoiceDetail.count({ where: { productId: id } });
  const movements = await prisma.inventoryMovement.count({ where: { productId: id } });

  if (invoices > 0 || movements > 0) {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  } else {
    return await prisma.product.delete({ where: { id } });
  }
};
