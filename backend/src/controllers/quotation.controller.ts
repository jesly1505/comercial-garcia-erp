import { Request, Response } from 'express';
import * as quotationService from '../services/quotation.service';
import { ZodError } from 'zod';
import { logAudit } from '../services/audit.service';
import { notifyAdmins } from '../services/notification.service';

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId, search, startDate, endDate } = req.query;
    const quotations = await quotationService.getQuotations({
      status: status as string,
      customerId: customerId ? Number(customerId) : undefined,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(quotations);
  } catch (error: any) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones: ' + error.message });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await quotationService.getQuotationById(Number(req.params.id));
    if (!quotation) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }
    res.json(quotation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId || 1;
    const validatedData = quotationService.createQuotationSchema.parse(req.body);
    const quotation = await quotationService.createQuotation(userId, validatedData);

    await logAudit({
      userId,
      action: 'CREATE',
      tableName: 'quotations',
      recordId: quotation.id,
      description: `Cotización creada: ${quotation.quotationNumber} - Cliente: ${quotation.customer.firstName} ${quotation.customer.lastName}`,
      newValues: { total: quotation.totalAmount, items: quotation.details.length },
    });

    await notifyAdmins(
      'Nueva Cotización Creada',
      `Se emitió la cotización ${quotation.quotationNumber} por C$${quotation.totalAmount.toFixed(2)} para ${quotation.customer.firstName} ${quotation.customer.lastName}.`,
      'INFO'
    );

    res.status(201).json(quotation);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).user?.userId || 1;
    const validatedData = quotationService.createQuotationSchema.parse(req.body);
    const updated = await quotationService.updateQuotation(id, userId, validatedData);

    await logAudit({
      userId,
      action: 'UPDATE',
      tableName: 'quotations',
      recordId: updated.id,
      description: `Cotización actualizada: ${updated.quotationNumber}`,
      newValues: { total: updated.totalAmount },
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).user?.userId || 1;
    const { status } = req.body;

    if (!['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }

    const updated = await quotationService.updateQuotationStatus(id, status, userId);

    await logAudit({
      userId,
      action: 'STATUS_CHANGE',
      tableName: 'quotations',
      recordId: updated.id,
      description: `Estado de cotización ${updated.quotationNumber} cambiado a: ${status}`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const convertToInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).user?.userId || 1;
    const { paymentMethod, creditDays } = req.body;

    const invoice = await quotationService.convertQuotationToInvoice(id, userId, {
      paymentMethod,
      creditDays,
    });

    await logAudit({
      userId,
      action: 'CONVERT_TO_INVOICE',
      tableName: 'quotations',
      recordId: id,
      description: `Cotización convertida a factura: #${invoice.invoiceNumber}`,
      newValues: { invoiceId: invoice.id, totalAmount: invoice.totalAmount },
    });

    await notifyAdmins(
      'Cotización Facturada',
      `La cotización ID #${id} ha sido convertida a la Factura #${invoice.invoiceNumber}`,
      'SUCCESS'
    );

    res.json({
      message: 'Cotización convertida a factura con éxito',
      invoice,
    });
  } catch (error: any) {
    console.error('Error al convertir cotización a factura:', error);
    res.status(400).json({ error: error.message });
  }
};

export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).user?.userId || 1;

    await quotationService.deleteQuotation(id, userId);

    await logAudit({
      userId,
      action: 'DELETE',
      tableName: 'quotations',
      recordId: id,
      description: `Cotización #${id} eliminada`,
    });

    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
