import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/prisma';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { createAuditLog } from '../services/audit';

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email } as object, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as any);
}

/** POST /api/auth/register — create user + first business */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    ownerName,
    email,
    password,
    phone,
    businessName,
    businessType,
    state,
    address,
    gstin,
    financialYear,
  } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user and their first business in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: ownerName,
        email,
        phone,
        passwordHash,
      },
    });

    const business = await tx.business.create({
      data: {
        name: businessName,
        type: businessType || 'RETAIL',
        state,
        address,
        phone,
        email,
        gstin: gstin || null,
        financialYear: financialYear || '2026-2027',
        businessUsers: {
          create: { userId: user.id, role: 'ADMIN' },
        },
      },
    });

    // Seed default chart of accounts for this business
    await seedDefaultAccounts(tx, business.id);
    // Seed default tax rates
    await seedDefaultTaxRates(tx, business.id);
    // Seed default units
    await seedDefaultUnits(tx, business.id);

    return { user, business };
  });

  const token = signToken(result.user.id, result.user.email);

  await createAuditLog({
    userId: result.user.id,
    action: 'CREATE',
    entityType: 'User',
    entityId: result.user.id,
    ipAddress: req.ip,
  });

  sendCreated(res, {
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone,
    },
    business: {
      id: result.business.id,
      name: result.business.name,
      type: result.business.type,
      state: result.business.state,
      address: result.business.address,
      gstin: result.business.gstin,
      financialYear: result.business.financialYear,
      role: 'ADMIN',
    },
  });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      businesses: {
        include: { business: true },
      },
    },
  });

  if (!user) throw AppError.unauthorized('Invalid email or password');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Invalid email or password');

  const token = signToken(user.id, user.email);

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
  });

  sendSuccess(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email },
    businesses: user.businesses.map((bu) => ({
      id: bu.business.id,
      name: bu.business.name,
      role: bu.role,
    })),
  });
});

/** GET /api/auth/me */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.userId },
    include: {
      businesses: {
        include: { business: { select: { id: true, name: true, gstin: true, logoUrl: true } } },
      },
    },
  });

  sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    businesses: user.businesses.map((bu) => ({
      ...bu.business,
      role: bu.role,
    })),
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedDefaultAccounts(tx: any, businessId: string) {
  const accounts = [
    // ASSETS
    { name: 'Cash in Hand',           type: 'ASSET',     code: '1001', isSystem: true },
    { name: 'Bank Accounts',          type: 'ASSET',     code: '1002', isSystem: true },
    { name: 'Accounts Receivable',    type: 'ASSET',     code: '1100', isSystem: true },
    { name: 'Stock / Inventory',      type: 'ASSET',     code: '1200', isSystem: true },
    // LIABILITIES
    { name: 'Accounts Payable',       type: 'LIABILITY', code: '2100', isSystem: true },
    { name: 'GST Payable (CGST)',     type: 'LIABILITY', code: '2201', isSystem: true },
    { name: 'GST Payable (SGST)',     type: 'LIABILITY', code: '2202', isSystem: true },
    { name: 'GST Payable (IGST)',     type: 'LIABILITY', code: '2203', isSystem: true },
    { name: 'GST Receivable (ITC)',   type: 'ASSET',     code: '1301', isSystem: true },
    // EQUITY
    { name: "Owner's Equity",         type: 'EQUITY',    code: '3001', isSystem: true },
    // INCOME
    { name: 'Sales Revenue',          type: 'INCOME',    code: '4001', isSystem: true },
    { name: 'Other Income',           type: 'INCOME',    code: '4002', isSystem: true },
    // EXPENSES
    { name: 'Cost of Goods Sold',     type: 'EXPENSE',   code: '5001', isSystem: true },
    { name: 'Purchase Expenses',      type: 'EXPENSE',   code: '5002', isSystem: true },
    { name: 'Operating Expenses',     type: 'EXPENSE',   code: '5100', isSystem: true },
    { name: 'Salary & Wages',         type: 'EXPENSE',   code: '5101', isSystem: true },
    { name: 'Rent',                   type: 'EXPENSE',   code: '5102', isSystem: true },
    { name: 'Utilities',              type: 'EXPENSE',   code: '5103', isSystem: true },
    { name: 'Miscellaneous Expense',  type: 'EXPENSE',   code: '5999', isSystem: true },
  ];

  await tx.account.createMany({
    data: accounts.map((a) => ({ ...a, businessId })),
  });
}

async function seedDefaultTaxRates(tx: any, businessId: string) {
  await tx.taxRate.createMany({
    data: [
      { businessId, name: 'GST 0%',   rate: 0 },
      { businessId, name: 'GST 5%',   rate: 5 },
      { businessId, name: 'GST 12%',  rate: 12 },
      { businessId, name: 'GST 18%',  rate: 18, isDefault: true },
      { businessId, name: 'GST 28%',  rate: 28 },
    ],
  });
}

async function seedDefaultUnits(tx: any, businessId: string) {
  await tx.unit.createMany({
    data: [
      { businessId, name: 'Pieces',    shortName: 'Pcs'  },
      { businessId, name: 'Kilograms', shortName: 'Kg'   },
      { businessId, name: 'Grams',     shortName: 'g'    },
      { businessId, name: 'Litres',    shortName: 'Ltr'  },
      { businessId, name: 'Metres',    shortName: 'm'    },
      { businessId, name: 'Box',       shortName: 'Box'  },
      { businessId, name: 'Packet',    shortName: 'Pkt'  },
      { businessId, name: 'Dozen',     shortName: 'Doz'  },
      { businessId, name: 'Nos',       shortName: 'Nos'  },
    ],
  });
}

