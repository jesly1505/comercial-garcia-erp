import { Request, Response } from 'express';
import { loginUser, loginSchema, refreshTokens, refreshSchema } from '../services/auth.service';
import { ZodError } from 'zod';
import { logAudit } from '../services/audit.service';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await loginUser(validatedData);
    
    await logAudit({
      userId: result.user.id,
      action: 'LOGIN',
      tableName: 'auth',
      description: 'Inicio de sesión exitoso'
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Error de validación' });
    } else {
      res.status(401).json({ error: error.message });
    }
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshTokens(refreshToken);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues?.[0]?.message || 'Datos de renovación inválidos' });
    } else {
      res.status(401).json({ error: error.message });
    }
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'LOGOUT',
        tableName: 'auth',
        description: 'Cierre de sesión'
      });
    }
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};
