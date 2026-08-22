import { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { ZodError } from 'zod';
import { logAudit } from '../services/audit.service';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await invoiceService.getInvoices();
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.getInvoiceById(Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    // userId viene inyectado por el middleware de auth
    const userId = (req as any).user.userId;
    
    const validatedData = invoiceService.createInvoiceSchema.parse(req.body);
    const invoice = await invoiceService.createInvoice(userId, validatedData);
    
    await logAudit({
      userId,
      action: 'SALE', // Facturación
      tableName: 'invoices',
      recordId: invoice.id,
      description: `Venta realizada/Factura emitida: #${invoice.invoiceNumber || invoice.id}`,
      newValues: { total: invoice.totalAmount }
    });
    
    res.status(201).json(invoice);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const voidInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceService.voidInvoice(Number(req.params.id));
    
    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'VOID',
        tableName: 'invoices',
        recordId: invoice.id,
        description: `Factura anulada: #${invoice.invoiceNumber || invoice.id}`
      });
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
