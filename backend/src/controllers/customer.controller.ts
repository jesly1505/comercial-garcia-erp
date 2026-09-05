import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../services/audit.service';

// Obtener todos los clientes (con paginación)
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { documentNumber: { contains: search } },
        { company: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (req.query.all === 'true') {
      const customers = await prisma.customer.findMany({
        where,
        orderBy: { firstName: 'asc' },
        include: {
          accountsReceivable: {
            where: { balance: { gt: 0 } }
          }
        }
      });
      res.json(customers);
      return;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        include: {
          accountsReceivable: {
            where: { balance: { gt: 0 } }
          }
        }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      data: customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener clientes', details: error.message });
  }
};

// Obtener cliente por ID con historiales
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id as string) },
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
    if (!data.firstName || !data.lastName || !data.documentNumber) {
      res.status(400).json({ error: 'Nombre, apellido y número de cédula/documento son requeridos' });
      return;
    }

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
      try {
        await logAudit({
          userId: user.userId,
          action: 'CREATE',
          tableName: 'customers',
          recordId: customer.id,
          description: `Cliente agregado: ${customer.firstName} ${customer.lastName}`
        });
      } catch (e) {
        console.error('Audit error:', e);
      }
    }

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear cliente' });
  }
};

// Actualizar cliente
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const customer = await prisma.customer.update({
      where: { id: parseInt(id as string) },
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
        creditLimit: data.creditLimit !== undefined ? data.creditLimit : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      }
    });

    const user = (req as any).user;
    if (user) {
      try {
        await logAudit({
          userId: user.userId,
          action: 'UPDATE',
          tableName: 'customers',
          recordId: customer.id,
          description: `Cliente editado: ${customer.firstName} ${customer.lastName}`
        });
      } catch (e) {
        console.error('Audit error:', e);
      }
    }

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar cliente' });
  }
};

// Eliminar cliente (Baja lógica o física según integridad)
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id as string);
    
    const count = await prisma.invoice.count({ where: { customerId } });
    
    if (count > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false }
      });
      
      const user = (req as any).user;
      if (user) {
        try {
          await logAudit({
            userId: user.userId,
            action: 'DELETE_LOGIC',
            tableName: 'customers',
            recordId: customerId,
            description: `Cliente desactivado lógicamente (ID: ${customerId})`
          });
        } catch (e) {
          console.error('Audit error:', e);
        }
      }

      res.json({ message: 'Cliente desactivado (no eliminado físicamente por integridad)' });
    } else {
      await prisma.customer.delete({ where: { id: customerId } });

      const user = (req as any).user;
      if (user) {
        try {
          await logAudit({
            userId: user.userId,
            action: 'DELETE',
            tableName: 'customers',
            recordId: customerId,
            description: `Cliente eliminado físicamente (ID: ${customerId})`
          });
        } catch (e) {
          console.error('Audit error:', e);
        }
      }

      res.json({ message: 'Cliente eliminado exitosamente' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar cliente' });
  }
};
