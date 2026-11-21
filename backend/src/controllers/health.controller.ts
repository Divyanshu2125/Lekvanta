import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../services/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  const responsePayload = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    version: '0.1.0',
    name: 'Lekvanta API',
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.connected ? 'connected' : 'disconnected',
      type: dbHealth.databaseType,
      host: dbHealth.host,
      ssl: dbHealth.ssl,
      latencyMs: dbHealth.latencyMs,
      ...(dbHealth.error ? { message: dbHealth.error } : {}),
    },
  };

  sendSuccess(res, responsePayload, dbHealth.connected ? 'Service is healthy' : 'Database connection unavailable', dbHealth.connected ? 200 : 503);
});
