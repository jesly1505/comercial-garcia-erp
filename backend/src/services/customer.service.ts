import prisma from '../utils/prisma';
import { z } from 'zod';

export const customerSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  documentNumber: z.string().min(1, 'El documento es requerido'),
  company: z.string().optional().nullable(),
  ruc: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  creditLimit: z.preprocess((val) => val !== undefined ? Number(val) : 0, z.number().min(0)).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const getCustomers = async (page = 1, limit = 50, search = '') => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { documentNumber: { contains: search } },
      { company: { contains: search } }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { firstName: 'asc' }
    }),
    prisma.customer.count({ where })
  ]);

  return {
    data: customers,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
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
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      documentNumber: data.documentNumber,
      company: data.company || null,
      ruc: data.ruc || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      address: data.address || null,
      municipality: data.municipality || null,
      department: data.department || null,
      creditLimit: data.creditLimit || 0,
      isActive: data.isActive ?? true
    }
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
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      documentNumber: data.documentNumber,
      company: data.company || null,
      ruc: data.ruc || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      address: data.address || null,
      municipality: data.municipality || null,
      department: data.department || null,
      creditLimit: data.creditLimit,
      isActive: data.isActive
    }
  });
};

export const deleteCustomer = async (id: number) => {
  return await prisma.customer.update({
    where: { id },
    data: { isActive: false }
  });
};
