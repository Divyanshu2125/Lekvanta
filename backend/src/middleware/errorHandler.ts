import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { isDev } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors (AppError): predictable, safe to return to client
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    sendError(res, `Validation error: ${messages}`, 400);
    return;
  }

  // Prisma known request errors
  if ((err as any).code) {
    const code = (err as any).code as string;
    if (code === 'P2002') {
      // Unique constraint violation
      sendError(res, 'A record with this value already exists.', 409);
      return;
    }
    if (code === 'P2025') {
      // Record not found
      sendError(res, 'Record not found.', 404);
      return;
    }
  }

  // Unknown / programming errors: log and return generic message
  console.error('[ERROR]', err);
  sendError(
    res,
    isDev ? err.message : 'Something went wrong. Please try again.',
    500
  );
}

/** Wraps an async route handler so that thrown errors are forwarded to errorHandler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

