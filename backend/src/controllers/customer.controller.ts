import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

/** GET /api/businesses/:businessId/customers */
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
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

  const [rawCustomers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        salesInvoices: {
          where: { deletedAt: null, status: { not: 'CANCELLED' } },
          select: { totalAmount: true, paidAmount: true },
        },
      },
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  // Compute live currentOutstanding for each customer from real transactions
  const customers = rawCustomers.map((c) => {
    const invoiceDue = c.salesInvoices.reduce(
      (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
      0
    );
    const currentOutstanding = (c.openingBalance || 0) + invoiceDue;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      billingAddress: c.billingAddress,
      gstin: c.gstin,
      openingBalance: c.openingBalance,
      creditLimit: c.creditLimit,
      currentOutstanding,
      invoiceCount: c.salesInvoices.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  // Calculate total receivables across all customers
  const allCustomers = await prisma.customer.findMany({
    where: { businessId: businessId!, deletedAt: null },
    include: {
      salesInvoices: {
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, paidAmount: true },
      },
    },
  });

  const totalReceivables = allCustomers.reduce((acc, c) => {
    const due = c.salesInvoices.reduce(
      (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
      0
    );
    const outstanding = (c.openingBalance || 0) + due;
    return acc + (outstanding > 0 ? outstanding : 0);
  }, 0);

  sendSuccess(res, customers, undefined, 200, {
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
    totalReceivables,
  } as any);
});

/** GET /api/businesses/:businessId/customers/:id */
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
    include: {
      salesInvoices: {
        where: { deletedAt: null },
        orderBy: { invoiceDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
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

  if (!customer) throw AppError.notFound('Customer not found');

  // Compute outstanding balance
  const invoiceDue = customer.salesInvoices
    .filter((inv) => inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);
  const currentOutstanding = (customer.openingBalance || 0) + invoiceDue;

  // Build Chronological Party Ledger
  interface LedgerEntry {
    date: string;
    type: 'OPENING' | 'INVOICE' | 'PAYMENT';
    refNo: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }

  const rawEntries: { date: Date; type: 'OPENING' | 'INVOICE' | 'PAYMENT'; refNo: string; description: string; debit: number; credit: number }[] = [];

  // 1. Opening Balance
  if (customer.openingBalance !== 0) {
    rawEntries.push({
      date: customer.createdAt,
      type: 'OPENING',
      refNo: 'OPENING',
      description: 'Opening Balance',
      debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
      credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
    });
  }

  // 2. Sales Invoices (Debits to customer receivable)
  for (const inv of customer.salesInvoices) {
    if (inv.status === 'CANCELLED') continue;
    rawEntries.push({
      date: new Date(inv.invoiceDate),
      type: 'INVOICE',
      refNo: inv.invoiceNumber,
      description: `Sales Invoice #${inv.invoiceNumber} (${inv.status})`,
      debit: inv.totalAmount,
      credit: 0,
    });
  }

  // 3. Payments Received (Credits against customer receivable)
  for (const p of customer.payments) {
    rawEntries.push({
      date: new Date(p.paymentDate),
      type: 'PAYMENT',
      refNo: p.reference || 'PAYMENT',
      description: `Payment Received (${p.method})${p.notes ? ' - ' + p.notes : ''}`,
      debit: 0,
      credit: p.amount,
    });
  }

  // Sort ascending by date for running balance calculation
  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const ledger: LedgerEntry[] = rawEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
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
    ...customer,
    currentOutstanding,
    ledger: ledger.reverse(), // most recent first for UI
  });
});

/** POST /api/businesses/:businessId/customers */
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.create({
    data: {
      ...req.body,
      businessId: req.businessId!,
      openingBalance: Number(req.body.openingBalance || 0),
      creditLimit: Number(req.body.creditLimit || 0),
    },
  });
  sendCreated(res, customer, 'Customer created successfully');
});

/** PATCH /api/businesses/:businessId/customers/:id */
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Customer not found');

  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      openingBalance: req.body.openingBalance !== undefined ? Number(req.body.openingBalance) : undefined,
      creditLimit: req.body.creditLimit !== undefined ? Number(req.body.creditLimit) : undefined,
    },
  });
  sendSuccess(res, updated, 'Customer updated successfully');
});

/** DELETE /api/businesses/:businessId/customers/:id (soft delete) */
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Customer not found');

  await prisma.customer.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  sendNoContent(res);
});
