import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

/** GET /api/businesses/:businessId/suppliers */
export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const { businessId } = req;
  const { search, page = '1', limit = '50', sortBy = 'name', sortOrder = 'asc' } = req.query as Record<string, string>;

  const where = {
    businessId: businessId!,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
            { gstin: { contains: search } },
          ],
        }
      : {}),
  };

  const validSortFields = ['name', 'createdAt'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'name';
  const orderDirection = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [rawSuppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        purchaseBills: {
          where: { deletedAt: null, status: { not: 'CANCELLED' } },
          select: { totalAmount: true, paidAmount: true },
        },
      },
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    prisma.supplier.count({ where }),
  ]);

  // Compute live currentPayable for each supplier
  const suppliers = rawSuppliers.map((s) => {
    const billDue = s.purchaseBills.reduce(
      (sum, bill) => sum + Math.max(0, bill.totalAmount - bill.paidAmount),
      0
    );
    const currentPayable = (s.openingBalance || 0) + billDue;

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gstin: s.gstin,
      openingBalance: s.openingBalance,
      currentPayable,
      billsCount: s.purchaseBills.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  // Calculate total payables across all suppliers
  const allSuppliers = await prisma.supplier.findMany({
    where: { businessId: businessId!, deletedAt: null },
    include: {
      purchaseBills: {
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, paidAmount: true },
      },
    },
  });

  const totalPayables = allSuppliers.reduce((acc, s) => {
    const due = s.purchaseBills.reduce(
      (sum, bill) => sum + Math.max(0, bill.totalAmount - bill.paidAmount),
      0
    );
    const payable = (s.openingBalance || 0) + due;
    return acc + (payable > 0 ? payable : 0);
  }, 0);

  sendSuccess(res, suppliers, undefined, 200, {
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
    totalPayables,
  } as any);
});

/** GET /api/businesses/:businessId/suppliers/:id */
export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
    include: {
      purchaseBills: {
        where: { deletedAt: null },
        orderBy: { billDate: 'desc' },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        select: {
          id: true,
          amount: true,
          method: true,
          paymentDate: true,
          reference: true,
          notes: true,
        },
      },
    },
  });

  if (!supplier) throw AppError.notFound('Supplier not found');

  // Compute payable balance
  const billDue = supplier.purchaseBills
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Math.max(0, b.totalAmount - b.paidAmount), 0);
  const currentPayable = (supplier.openingBalance || 0) + billDue;

  // Build Chronological Party Ledger
  interface LedgerEntry {
    date: string;
    type: 'OPENING' | 'BILL' | 'PAYMENT';
    refNo: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }

  const rawEntries: { date: Date; type: 'OPENING' | 'BILL' | 'PAYMENT'; refNo: string; description: string; debit: number; credit: number }[] = [];

  // 1. Opening Balance (Credit to supplier payable)
  if (supplier.openingBalance !== 0) {
    rawEntries.push({
      date: supplier.createdAt,
      type: 'OPENING',
      refNo: 'OPENING',
      description: 'Opening Balance',
      debit: supplier.openingBalance < 0 ? Math.abs(supplier.openingBalance) : 0,
      credit: supplier.openingBalance > 0 ? supplier.openingBalance : 0,
    });
  }

  // 2. Purchase Bills (Credit to supplier payable)
  for (const bill of supplier.purchaseBills) {
    if (bill.status === 'CANCELLED') continue;
    rawEntries.push({
      date: new Date(bill.billDate),
      type: 'BILL',
      refNo: bill.billNumber,
      description: `Purchase Bill #${bill.billNumber} (${bill.status})`,
      debit: 0,
      credit: bill.totalAmount,
    });
  }

  // 3. Payments Made (Debit reducing supplier payable)
  for (const p of supplier.payments) {
    rawEntries.push({
      date: new Date(p.paymentDate),
      type: 'PAYMENT',
      refNo: p.reference || 'PAYMENT',
      description: `Payment Made (${p.method})${p.notes ? ' - ' + p.notes : ''}`,
      debit: p.amount,
      credit: 0,
    });
  }

  // Sort ascending by date for running balance calculation
  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const ledger: LedgerEntry[] = rawEntries.map((entry) => {
    runningBalance += entry.credit - entry.debit; // positive = payable to supplier
    return {
      date: entry.date.toISOString(),
      type: entry.type,
      refNo: entry.refNo,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      balance: runningBalance,
    };
  });

  sendSuccess(res, {
    ...supplier,
    currentPayable,
    ledger: ledger.reverse(), // most recent first for UI
  });
});

/** POST /api/businesses/:businessId/suppliers */
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.create({
    data: {
      ...req.body,
      businessId: req.businessId!,
      openingBalance: Number(req.body.openingBalance || 0),
    },
  });
  sendCreated(res, supplier, 'Supplier created successfully');
});

/** PATCH /api/businesses/:businessId/suppliers/:id */
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.supplier.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Supplier not found');

  const updated = await prisma.supplier.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      openingBalance: req.body.openingBalance !== undefined ? Number(req.body.openingBalance) : undefined,
    },
  });
  sendSuccess(res, updated, 'Supplier updated successfully');
});

/** DELETE /api/businesses/:businessId/suppliers/:id (soft delete) */
export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.supplier.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Supplier not found');

  await prisma.supplier.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  sendNoContent(res);
});
