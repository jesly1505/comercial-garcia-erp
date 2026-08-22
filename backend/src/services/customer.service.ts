import prisma from '../utils/prisma';
import { z } from 'zod';

export const customerSchema = z.object({
  documentNumber: z.string().min(1, 'El documento es requerido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const getCustomers = async () => {
  return await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });
};

export const getCustomerById = async (id: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id }
  });
  if (!customer) throw new Error('Cliente no encontrado');
  return customer;
};

export const createCustomer = async (data: z.infer<typeof customerSchema>) => {
  const existing = await prisma.customer.findUnique({
    where: { documentNumber: data.documentNumber }
  });
  if (existing) throw new Error('Ya existe un cliente con este documento');

  return await prisma.customer.create({
    data
  });
};

export const updateCustomer = async (id: number, data: z.infer<typeof customerSchema>) => {
  const existing = await prisma.customer.findUnique({
    where: { documentNumber: data.documentNumber }
  });
  if (existing && existing.id !== id) {
    throw new Error('Ya existe otro cliente con este documento');
  }

  return await prisma.customer.update({
    where: { id },
    data
  });
};

export const deleteCustomer = async (id: number) => {
  return await prisma.customer.update({
    where: { id },
    data: { isActive: false }
  });
};
