import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { logAudit } from '../services/audit.service';

const userSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido'),
  username: z.string().optional().nullable(),
  roleId: z.number().int(),
});

const createUserSchema = userSchema.extend({
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      res.status(400).json({ error: 'El correo ya está en uso' });
      return;
    }
    
    // Check if username already exists (if provided)
    if (data.username) {
      const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
      if (existingUsername) {
        res.status(400).json({ error: 'El usuario ya está en uso' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username || null,
        passwordHash,
        roleId: data.roleId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isActive: true,
        role: { select: { id: true, name: true } }
      }
    });
    
    const currentUser = (req as any).user;
    if (currentUser) {
      await logAudit({
        userId: currentUser.userId,
        action: 'CREATE',
        tableName: 'users',
        recordId: user.id,
        description: `Usuario creado: ${user.firstName} ${user.lastName} (${user.email})`
      });
    }
    
    res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = userSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Check if email changed and is in use
    if (user.email !== data.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingEmail) {
        res.status(400).json({ error: 'El correo ya está en uso' });
        return;
      }
    }

    // Check if username changed and is in use
    if (data.username && user.username !== data.username) {
      const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
      if (existingUsername) {
        res.status(400).json({ error: 'El usuario ya está en uso' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username || null,
        roleId: data.roleId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isActive: true,
        role: { select: { id: true, name: true } }
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Evitar que el admin se desactive a sí mismo (opcional, pero buena práctica)
    if (req.user && (req.user as any).userId === Number(id)) {
      res.status(400).json({ error: 'No puedes cambiar tu propio estado de activo/inactivo' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isActive: true,
        role: { select: { id: true, name: true } }
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { passwordHash },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
