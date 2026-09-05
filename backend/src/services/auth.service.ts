import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { notifyAdmins } from './notification.service';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET no está configurado en las variables de entorno.');
  }
  return secret;
};

// Registro en memoria de intentos fallidos de login para prevención de fuerza bruta
interface LoginAttemptInfo {
  attempts: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptInfo>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email o usuario es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
});

export const loginUser = async (data: z.infer<typeof loginSchema>) => {
  const identifierKey = data.identifier.trim().toLowerCase();
  const attemptInfo = loginAttempts.get(identifierKey);

  // Verificar si la cuenta está bloqueada temporalmente
  if (attemptInfo && attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((attemptInfo.lockedUntil - Date.now()) / (60 * 1000));
    throw new Error(`Cuenta bloqueada temporalmente tras ${MAX_FAILED_ATTEMPTS} intentos fallidos. Intente de nuevo en ${minutesLeft} minuto(s).`);
  }

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
    // Registrar intento fallido
    registerFailedAttempt(identifierKey);
    throw new Error('Credenciales inválidas o usuario inactivo');
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    registerFailedAttempt(identifierKey);
    throw new Error('Credenciales inválidas');
  }

  // Limpiar intentos fallidos al tener éxito
  loginAttempts.delete(identifierKey);

  const permissions = user.role.rolePermissions.map(rp => rp.permission.code);
  const secret = getJwtSecret();

  const token = jwt.sign(
    { userId: user.id, roleId: user.roleId, role: user.role.name, permissions },
    secret,
    { expiresIn: '8h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    secret,
    { expiresIn: '7d' }
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
    refreshToken,
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

export const refreshTokens = async (refreshToken: string) => {
  const secret = getJwtSecret();
  let decoded: any;

  try {
    decoded = jwt.verify(refreshToken, secret);
  } catch (err) {
    throw new Error('Refresh token inválido o expirado');
  }

  if (!decoded || decoded.type !== 'refresh' || !decoded.userId) {
    throw new Error('Token no válido para renovación');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
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
    throw new Error('Usuario inactivo o no encontrado');
  }

  const permissions = user.role.rolePermissions.map(rp => rp.permission.code);

  const newToken = jwt.sign(
    { userId: user.id, roleId: user.roleId, role: user.role.name, permissions },
    secret,
    { expiresIn: '8h' }
  );

  const newRefreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    secret,
    { expiresIn: '7d' }
  );

  return {
    token: newToken,
    refreshToken: newRefreshToken,
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

function registerFailedAttempt(identifierKey: string) {
  const current = loginAttempts.get(identifierKey) || { attempts: 0 };
  current.attempts += 1;
  if (current.attempts >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOCK_TIME_MS;
  }
  loginAttempts.set(identifierKey, current);
}
