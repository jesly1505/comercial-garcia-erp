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
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        description: data.description,
        oldValues: data.oldValues !== undefined ? data.oldValues : undefined,
        newValues: data.newValues !== undefined ? data.newValues : undefined,
      },
    });
  } catch (error) {
    console.error('Error guardando en la bitácora:', error);
  }
};
