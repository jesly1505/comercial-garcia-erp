import prisma from '../utils/prisma';

export interface AuditLogData {
  userId?: number;
  action: string;
  tableName: string; // Módulo
  recordId?: number;
  description: string;
  oldValues?: any;
  newValues?: any;
}

export const logAudit = async (data: AuditLogData) => {
  try {
    // Evitar que el registro de auditoría bloquee el hilo principal esperando su resultado.
    // Usamos promise pero no hacemos throw si falla, solo console.error
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        description: data.description,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      },
    });
  } catch (error) {
    console.error('Error guardando en la bitácora:', error);
  }
};
