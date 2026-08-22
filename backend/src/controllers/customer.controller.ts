import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const prisma = new PrismaClient();

// Obtener todos los clientes
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { firstName: 'asc' },
      include: {
        accountsReceivable: {
          where: { balance: { gt: 0 } }
        }
      }
    });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener clientes', details: error.message });
  }
};

// Obtener cliente por ID con historiales
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 10,
          include: { details: { include: { product: true } } }
        },
        accountsReceivable: {
          where: { balance: { gt: 0 } },
          include: { payments: true }
        }
      }
    });
    
    if (!customer) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cliente', details: error.message });
  }
};

// Crear nuevo cliente
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        ruc: data.ruc,
        documentNumber: data.documentNumber,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        municipality: data.municipality,
        department: data.department,
        creditLimit: data.creditLimit || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });

    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'CREATE',
        tableName: 'customers',
        recordId: customer.id,
        description: `Cliente agregado: ${customer.firstName} ${customer.lastName}`
      });
    }

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear cliente', details: error.message });
  }
};

// Actualizar cliente
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        ruc: data.ruc,
        documentNumber: data.documentNumber,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        municipality: data.municipality,
        department: data.department,
        creditLimit: data.creditLimit || 0,
        isActive: data.isActive,
      }
    });

    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'UPDATE',
        tableName: 'customers',
        recordId: customer.id,
        description: `Cliente editado: ${customer.firstName} ${customer.lastName}`
      });
    }

    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar cliente', details: error.message });
  }
};

// Eliminar cliente (Baja lógica o física según prefieran)
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verificamos si tiene facturas (para evitar borrarlo si hay historial)
    const count = await prisma.invoice.count({ where: { customerId: parseInt(id) }});
    
    if (count > 0) {
      // Baja lógica
      await prisma.customer.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      
      const user = (req as any).user;
      if (user) {
        await logAudit({
          userId: user.userId,
          action: 'DELETE_LOGIC',
          tableName: 'customers',
          recordId: parseInt(id),
          description: `Cliente desactivado lógicamente (ID: ${id})`
        });
      }

      res.json({ message: 'Cliente desactivado (no eliminado físicamente por integridad)' });
    } else {
      // Baja física
      await prisma.customer.delete({ where: { id: parseInt(id) } });

      const user = (req as any).user;
      if (user) {
        await logAudit({
          userId: user.userId,
          action: 'DELETE',
          tableName: 'customers',
          recordId: parseInt(id),
          description: `Cliente eliminado físicamente (ID: ${id})`
        });
      }

      res.json({ message: 'Cliente eliminado exitosamente' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar cliente', details: error.message });
  }
};
