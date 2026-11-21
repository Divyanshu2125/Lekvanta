import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import prisma from '../services/prisma';
import { descopeClient } from '../services/descope';

export interface AuthPayload {
  userId: string;
  email: string;
  descopeUserId?: string;
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

/** 
 * Verifies authentication token (Descope Session JWT or local JWT)
 * and attaches verified user payload to req.user.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or invalid authorization header'));
  }

  const token = header.slice(7);

  // 1. Try local Lekvanta JWT verification first (fast in-memory check, 7-day validity)
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    if (decoded && decoded.userId) {
      req.user = decoded;
      return next();
    }
  } catch (localJwtErr) {
    // If local JWT fails (e.g. token is a Descope Session JWT or expired), fall back to Descope SDK below
  }

  // 2. Fallback to Descope session token validation
  try {
    const authInfo = await descopeClient.validateSession(token);
    if (authInfo && authInfo.token) {
      const descopeUserId = authInfo.token.sub;
      const claims = (authInfo.token as any).claims || (authInfo.token as any) || {};
      const email = ((authInfo.token as any).email || claims.email || '') as string;
      const name = ((authInfo.token as any).name || claims.name || '') as string;
      const phone = ((authInfo.token as any).phone || claims.phone || '') as string;
      const picture = ((authInfo.token as any).picture || claims.picture || '') as string;

      // Find user primarily by unique descopeUserId
      let user = await prisma.user.findFirst({
        where: { descopeUserId },
      });

      // If not found by descopeUserId, only match by email if that account has no descopeUserId attached
      if (!user && email) {
        user = await prisma.user.findFirst({
          where: {
            email,
            descopeUserId: null,
          },
        });
      }

      if (!user && (email || descopeUserId)) {
        // Auto-provision user if brand new
        const resolvedEmail = email || `${descopeUserId}@descope.user`;
        const resolvedName = name || (email ? email.split('@')[0] : 'Shop Owner');

        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: resolvedName,
              email: resolvedEmail,
              phone: phone || undefined,
              profilePhoto: picture || undefined,
              descopeUserId,
            },
          });

          // Create first default shop
          const business = await tx.business.create({
            data: {
              name: `${newUser.name}'s Shop`,
              type: 'RETAIL',
              email: newUser.email,
              phone: newUser.phone || undefined,
              businessUsers: {
                create: { userId: newUser.id, role: 'OWNER', status: 'ACTIVE' },
              },
            },
          });

          // Seed default accounts, tax rates, units
          const accounts = [
            { name: 'Cash in Hand',           type: 'ASSET',     code: '1001', isSystem: true },
            { name: 'Bank Accounts',          type: 'ASSET',     code: '1002', isSystem: true },
            { name: 'Accounts Receivable',    type: 'ASSET',     code: '1100', isSystem: true },
            { name: 'Stock / Inventory',      type: 'ASSET',     code: '1200', isSystem: true },
            { name: 'Accounts Payable',       type: 'LIABILITY', code: '2100', isSystem: true },
            { name: 'GST Payable (CGST)',     type: 'LIABILITY', code: '2201', isSystem: true },
            { name: 'GST Payable (SGST)',     type: 'LIABILITY', code: '2202', isSystem: true },
            { name: 'GST Payable (IGST)',     type: 'LIABILITY', code: '2203', isSystem: true },
            { name: 'GST Receivable (ITC)',   type: 'ASSET',     code: '1301', isSystem: true },
            { name: "Owner's Equity",         type: 'EQUITY',    code: '3001', isSystem: true },
            { name: 'Sales Revenue',          type: 'INCOME',    code: '4001', isSystem: true },
            { name: 'Other Income',           type: 'INCOME',    code: '4002', isSystem: true },
            { name: 'Cost of Goods Sold',     type: 'EXPENSE',   code: '5001', isSystem: true },
            { name: 'Purchase Expenses',      type: 'EXPENSE',   code: '5002', isSystem: true },
            { name: 'Operating Expenses',     type: 'EXPENSE',   code: '5100', isSystem: true },
            { name: 'Salary & Wages',         type: 'EXPENSE',   code: '5101', isSystem: true },
            { name: 'Rent',                   type: 'EXPENSE',   code: '5102', isSystem: true },
            { name: 'Utilities',              type: 'EXPENSE',   code: '5103', isSystem: true },
            { name: 'Miscellaneous Expense',  type: 'EXPENSE',   code: '5999', isSystem: true },
          ];
          await tx.account.createMany({
            data: accounts.map((a) => ({ ...a, businessId: business.id })),
          });

          await tx.taxRate.createMany({
            data: [
              { businessId: business.id, name: 'GST 0%',   rate: 0 },
              { businessId: business.id, name: 'GST 5%',   rate: 5 },
              { businessId: business.id, name: 'GST 12%',  rate: 12 },
              { businessId: business.id, name: 'GST 18%',  rate: 18, isDefault: true },
              { businessId: business.id, name: 'GST 28%',  rate: 28 },
            ],
          });

          await tx.unit.createMany({
            data: [
              { businessId: business.id, name: 'Pieces',    shortName: 'Pcs'  },
              { businessId: business.id, name: 'Kilograms', shortName: 'Kg'   },
              { businessId: business.id, name: 'Grams',     shortName: 'g'    },
              { businessId: business.id, name: 'Litres',    shortName: 'Ltr'  },
              { businessId: business.id, name: 'Metres',    shortName: 'm'    },
              { businessId: business.id, name: 'Box',       shortName: 'Box'  },
              { businessId: business.id, name: 'Packet',    shortName: 'Pkt'  },
              { businessId: business.id, name: 'Dozen',     shortName: 'Doz'  },
              { businessId: business.id, name: 'Nos',       shortName: 'Nos'  },
            ],
          });

          return newUser;
        }, { maxWait: 15000, timeout: 30000 });
      } else if (user && !user.descopeUserId) {
        // Link existing local account to this Descope identity
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            descopeUserId,
            ...(picture && !user.profilePhoto ? { profilePhoto: picture } : {}),
            ...(phone && !user.phone ? { phone } : {}),
          },
        });
      }

      if (user) {
        req.user = { userId: user.id, email: user.email, descopeUserId };
        return next();
      }
    }
  } catch (descopeErr) {
    // Both local JWT and Descope validation failed
  }

  return next(AppError.unauthorized('Token is invalid or expired'));
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

/** Middleware to verify user role in current business */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const businessId = req.businessId;
    const userId = req.user?.userId;

    if (!businessId || !userId) {
      return next(AppError.unauthorized());
    }

    prisma.businessUser
      .findFirst({ where: { businessId, userId } })
      .then((membership) => {
        if (!membership) return next(AppError.forbidden('You are not a member of this business'));
        if (!allowedRoles.includes(membership.role)) {
          return next(AppError.forbidden(`This action requires one of the following roles: ${allowedRoles.join(', ')}`));
        }
        next();
      })
      .catch(next);
  };
}

