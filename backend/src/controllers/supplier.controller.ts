import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  company: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  ruc: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const data = supplierSchema.parse(req.body);
    
    // Check RUC unique if provided
    if (data.ruc) {
      const existing = await prisma.supplier.findUnique({ where: { ruc: data.ruc } });
      if (existing) {
        return res.status(400).json({ error: 'Ya existe un proveedor con este RUC' });
      }
    }

    const supplier = await prisma.supplier.create({
      data,
    });
    res.status(201).json(supplier);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const data = supplierSchema.parse(req.body);

    if (data.ruc) {
      const existing = await prisma.supplier.findUnique({ where: { ruc: data.ruc } });
      if (existing && existing.id !== Number(req.params.id)) {
        return res.status(400).json({ error: 'Ya existe otro proveedor con este RUC' });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(supplier);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    // Soft delete or real delete. We'll do real delete if no relations restrict it.
    // If there are purchase orders, it will fail due to referential integrity (Restrict).
    // In that case we can soft delete it.
    try {
      await prisma.supplier.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: 'Proveedor eliminado' });
    } catch (dbError: any) {
      if (dbError.code === 'P2003') {
        // Foreign key constraint failed, soft delete instead
        await prisma.supplier.update({
          where: { id: Number(req.params.id) },
          data: { isActive: false },
        });
        res.json({ message: 'Proveedor marcado como inactivo (tiene órdenes asociadas)' });
      } else {
        throw dbError;
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
