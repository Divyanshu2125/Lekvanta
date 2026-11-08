import prisma from './prisma';

interface AuditParams {
  businessId?: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : undefined,
        newValues: params.newValues ? JSON.stringify(params.newValues) : undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    // Audit failures should never crash the main operation — just log
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}

