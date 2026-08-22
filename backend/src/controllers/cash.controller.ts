import { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as cashService from '../services/cash.service';

export const getRegisters = async (req: Request, res: Response) => {
  try {
    const registers = await cashService.getCashRegisters();
    res.json(registers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const cashRegisterId = req.query.cashRegisterId ? Number(req.query.cashRegisterId) : undefined;
    const session = await cashService.getActiveSession(cashRegisterId);
    if (!session) {
      return res.status(200).json(null);
    }
    
    // Also attach the report so we have expected balance live
    const report = await cashService.getSessionReport(session.id);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const openSession = async (req: Request, res: Response) => {
  try {
    const data = cashService.openSessionSchema.parse(req.body);
    const userId = (req as any).user.userId;
    const session = await cashService.openSession(userId, data);
    res.status(201).json(session);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const sessionId = Number(req.params.id);
    const data = cashService.closeSessionSchema.parse(req.body);
    const session = await cashService.closeSession(sessionId, data);
    res.json(session);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const createMovement = async (req: Request, res: Response) => {
  try {
    const sessionId = Number(req.params.id);
    const data = cashService.createMovementSchema.parse(req.body);
    const movement = await cashService.createMovement(sessionId, data);
    res.status(201).json(movement);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ errors: (error as any).errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const history = await cashService.getSessionsHistory();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
