import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { notifyAdmins } from './notification.service';

const secret = process.env.JWT_SECRET || 'supersecret_fallback_key';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email o usuario es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const loginUser = async (data: z.infer<typeof loginSchema>) => {
  const user = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: data.identifier },
        { username: data.identifier }
      ]
    },
    include: { 
      role: {
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      } 
    }
  });

  if (!user || !user.isActive) {
    throw new Error('Credenciales inválidas o usuario inactivo');
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  const permissions = user.role.rolePermissions.map(rp => rp.permission.code);

  const token = jwt.sign(
    { userId: user.id, roleId: user.roleId, role: user.role.name, permissions },
    secret,
    { expiresIn: '8h' }
  );

  // Trigger notification if non-admin logs in
  if (user.role.name !== 'ADMIN') {
    notifyAdmins(
      'Nuevo inicio de sesión',
      `El usuario ${user.firstName} ${user.lastName} (${user.role.name}) ha iniciado sesión.`,
      'INFO'
    );
  }

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role.name,
      permissions
    }
  };
};
