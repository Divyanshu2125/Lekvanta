import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import prisma from '../services/prisma';

export interface AuthPayload {
  userId: string;
  email: string;
}

// Extend Express Request to carry auth info
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      businessId?: string;
    }
  }
}

/** Verifies JWT and attaches user to req.user */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or invalid authorization header'));
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    next(AppError.unauthorized('Token is invalid or expired'));
  }
}

/** Verifies that the user belongs to the businessId specified in route params or query */
export function requireBusiness(req: Request, _res: Response, next: NextFunction): void {
  const businessId = (req.params.businessId ?? req.query.businessId ?? req.body.businessId) as
    | string
    | undefined;

  if (!businessId) {
    return next(AppError.badRequest('businessId is required'));
  }

  req.businessId = businessId;
  next();
}

/** Middleware to verify current user is a member (any role) of the business */
export function requireBusinessMember(req: Request, _res: Response, next: NextFunction): void {
  const businessId = req.businessId;
  const userId = req.user?.userId;

  if (!businessId || !userId) {
    return next(AppError.unauthorized());
  }

  prisma.businessUser
    .findFirst({ where: { businessId, userId } })
    .then((membership) => {
      if (!membership) return next(AppError.forbidden('You are not a member of this business'));
      next();
    })
    .catch(next);
}

