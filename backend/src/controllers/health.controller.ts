import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  // Ping the database
  await prisma.$queryRaw`SELECT 1`;

  sendSuccess(res, {
    status: 'ok',
    version: '0.1.0',
    name: 'Lekvanta API',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

