import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { logAudit } from '../services/audit.service';
import path from 'path';
import fs from 'fs';

const settingsSchema = z.object({
  companyName: z.string().min(1, 'El nombre de la empresa es requerido'),
  logoBase64: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  invoiceAutoNumber: z.boolean(),
  orderAutoNumber: z.boolean(),
  movementAutoNumber: z.boolean(),
  defaultMinStock: z.number().int().min(0),
  theme: z.string().min(1)
});

// Helper para obtener/crear la configuración singleton
const getOrCreateSettings = async () => {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {} // Usa defaults de Prisma
    });
  }
  return settings;
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = settingsSchema.parse(req.body);
    const existingSettings = await getOrCreateSettings();

    const updatedSettings = await prisma.companySettings.update({
      where: { id: existingSettings.id },
      data: {
        companyName: data.companyName,
        logoBase64: data.logoBase64,
        address: data.address,
        phone: data.phone,
        email: data.email,
        currency: data.currency,
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        invoiceAutoNumber: data.invoiceAutoNumber,
        orderAutoNumber: data.orderAutoNumber,
        movementAutoNumber: data.movementAutoNumber,
        defaultMinStock: data.defaultMinStock,
        theme: data.theme
      }
    });

    const currentUser = (req as any).user;
    if (currentUser) {
      await logAudit({
        userId: currentUser.userId,
        action: 'UPDATE',
        tableName: 'company_settings',
        recordId: updatedSettings.id,
        description: 'Se actualizó la configuración global del sistema'
      });
    }

    res.json(updatedSettings);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Error de validación', errors: error.issues });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const exportDatabase = async (req: Request, res: Response) => {
  try {
    // La base de datos de Prisma SQLite suele estar en prisma/dev.db
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: 'Base de datos no encontrada' });
      return;
    }

    const currentUser = (req as any).user;
    if (currentUser) {
      await logAudit({
        userId: currentUser.userId,
        action: 'EXPORT',
        tableName: 'system',
        description: 'Se descargó una copia de seguridad de la base de datos'
      });
    }

    res.download(dbPath, `backup_erp_${new Date().toISOString().split('T')[0]}.db`);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
