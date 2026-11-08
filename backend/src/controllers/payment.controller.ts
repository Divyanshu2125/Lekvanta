import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { type, method, customerId, supplierId, search, page = '1', limit = '50', from, to } =
    req.query as Record<string, string>;

  const where: any = { businessId: req.businessId! };
  if (type && type !== 'ALL') where.type = type;
  if (method && method !== 'ALL') where.method = method;
  if (customerId) where.customerId = customerId;
  if (supplierId) where.supplierId = supplierId;

  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { customer: { name: { contains: search } } },
      { supplier: { name: { contains: search } } },
      { salesInvoice: { invoiceNumber: { contains: search } } },
      { purchaseBill: { billNumber: { contains: search } } },
    ];
  }

  if (from || to) {
    where.paymentDate = {};
    if (from) where.paymentDate.gte = new Date(from);
    if (to) where.paymentDate.lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true } },
        purchaseBill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  sendSuccess(res, payments, undefined, 200, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.id, businessId: req.businessId! },
    include: {
      customer: true,
      supplier: true,
      salesInvoice: true,
      purchaseBill: true,
    },
  });

  if (!payment) throw AppError.notFound('Payment record not found');
  sendSuccess(res, payment);
});

export const getOutstandingDues = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { partyType, partyId } = req.query as Record<string, string>;

  if (partyType === 'CUSTOMER' && partyId) {
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        businessId,
        customerId: partyId,
        deletedAt: null,
        status: { in: ['SENT', 'PARTIAL'] },
      },
      orderBy: { invoiceDate: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    const dues = invoices.map((inv) => ({
      ...inv,
      dueAmount: Math.max(0, inv.totalAmount - inv.paidAmount),
    }));

    sendSuccess(res, dues);
    return;
  }

  if (partyType === 'SUPPLIER' && partyId) {
    const bills = await prisma.purchaseBill.findMany({
      where: {
        businessId,
        supplierId: partyId,
        deletedAt: null,
        status: { in: ['RECEIVED', 'PARTIAL'] },
      },
      orderBy: { billDate: 'asc' },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    const dues = bills.map((b) => ({
      ...b,
      dueAmount: Math.max(0, b.totalAmount - b.paidAmount),
    }));

    sendSuccess(res, dues);
    return;
  }

  sendSuccess(res, []);
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const {
    type,
    amount,
    method = 'CASH',
    paymentDate,
    reference,
    notes,
    customerId,
    supplierId,
    salesInvoiceId,
    purchaseBillId,
    allocations,
  } = req.body;

  const payment = await prisma.$transaction(async (tx) => {
    let targetInvoiceId = salesInvoiceId || null;
    let targetBillId = purchaseBillId || null;

    // 1. Process invoice allocations if receiving payment
    if (type === 'RECEIVED') {
      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        // Allocate according to explicit allocation breakdown
        for (const alloc of allocations) {
          const inv = await tx.salesInvoice.findFirst({
            where: { id: alloc.invoiceOrBillId, businessId, deletedAt: null },
          });
          if (inv) {
            const newPaid = inv.paidAmount + alloc.amount;
            const newStatus = newPaid >= inv.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : inv.status;
            await tx.salesInvoice.update({
              where: { id: inv.id },
              data: { paidAmount: newPaid, status: newStatus },
            });
            if (!targetInvoiceId) targetInvoiceId = inv.id;
          }
        }
      } else if (salesInvoiceId) {
        // Single linked sales invoice
        const inv = await tx.salesInvoice.findFirst({
          where: { id: salesInvoiceId, businessId, deletedAt: null },
        });
        if (inv) {
          const newPaid = inv.paidAmount + amount;
          const newStatus = newPaid >= inv.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : inv.status;
          await tx.salesInvoice.update({
            where: { id: inv.id },
            data: { paidAmount: newPaid, status: newStatus },
          });
        }
      } else if (customerId) {
        // Auto-allocate across customer's pending invoices from oldest to newest
        let remainingToAllocate = amount;
        const pendingInvoices = await tx.salesInvoice.findMany({
          where: {
            businessId,
            customerId,
            deletedAt: null,
            status: { in: ['SENT', 'PARTIAL'] },
          },
          orderBy: { invoiceDate: 'asc' },
        });

        for (const inv of pendingInvoices) {
          if (remainingToAllocate <= 0) break;
          const due = Math.max(0, inv.totalAmount - inv.paidAmount);
          if (due <= 0) continue;

          const allocAmount = Math.min(due, remainingToAllocate);
          const newPaid = inv.paidAmount + allocAmount;
          const newStatus = newPaid >= inv.totalAmount ? 'PAID' : 'PARTIAL';

          await tx.salesInvoice.update({
            where: { id: inv.id },
            data: { paidAmount: newPaid, status: newStatus },
          });

          if (!targetInvoiceId) targetInvoiceId = inv.id;
          remainingToAllocate -= allocAmount;
        }
      }
    }

    // 2. Process bill allocations if making payment to supplier
    if (type === 'MADE') {
      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        for (const alloc of allocations) {
          const bill = await tx.purchaseBill.findFirst({
            where: { id: alloc.invoiceOrBillId, businessId, deletedAt: null },
          });
          if (bill) {
            const newPaid = bill.paidAmount + alloc.amount;
            const newStatus = newPaid >= bill.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : bill.status;
            await tx.purchaseBill.update({
              where: { id: bill.id },
              data: { paidAmount: newPaid, status: newStatus },
            });
            if (!targetBillId) targetBillId = bill.id;
          }
        }
      } else if (purchaseBillId) {
        const bill = await tx.purchaseBill.findFirst({
          where: { id: purchaseBillId, businessId, deletedAt: null },
        });
        if (bill) {
          const newPaid = bill.paidAmount + amount;
          const newStatus = newPaid >= bill.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : bill.status;
          await tx.purchaseBill.update({
            where: { id: bill.id },
            data: { paidAmount: newPaid, status: newStatus },
          });
        }
      } else if (supplierId) {
        // Auto-allocate across supplier's pending purchase bills
        let remainingToAllocate = amount;
        const pendingBills = await tx.purchaseBill.findMany({
          where: {
            businessId,
            supplierId,
            deletedAt: null,
            status: { in: ['RECEIVED', 'PARTIAL'] },
          },
          orderBy: { billDate: 'asc' },
        });

        for (const bill of pendingBills) {
          if (remainingToAllocate <= 0) break;
          const due = Math.max(0, bill.totalAmount - bill.paidAmount);
          if (due <= 0) continue;

          const allocAmount = Math.min(due, remainingToAllocate);
          const newPaid = bill.paidAmount + allocAmount;
          const newStatus = newPaid >= bill.totalAmount ? 'PAID' : 'PARTIAL';

          await tx.purchaseBill.update({
            where: { id: bill.id },
            data: { paidAmount: newPaid, status: newStatus },
          });

          if (!targetBillId) targetBillId = bill.id;
          remainingToAllocate -= allocAmount;
        }
      }
    }

    // 3. Create the payment record
    const created = await tx.payment.create({
      data: {
        businessId,
        type,
        amount,
        method,
        paymentDate: new Date(paymentDate),
        reference: reference || null,
        notes: notes || null,
        customerId: customerId || null,
        supplierId: supplierId || null,
        salesInvoiceId: targetInvoiceId,
        purchaseBillId: targetBillId,
      },
      include: {
        customer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true } },
        purchaseBill: { select: { id: true, billNumber: true } },
      },
    });

    // 4. Double-entry general ledger posting
    const cashAccount = await tx.account.findFirst({ where: { businessId, code: '1001' } });
    const bankAccount = await tx.account.findFirst({ where: { businessId, code: '1002' } });
    const arAccount   = await tx.account.findFirst({ where: { businessId, code: '1100' } });
    const apAccount   = await tx.account.findFirst({ where: { businessId, code: '2100' } });

    const isBankMethod = ['BANK', 'UPI', 'CHEQUE', 'CARD', 'NEFT', 'RTGS'].includes(method);
    const monetaryAccount = (isBankMethod && bankAccount) ? bankAccount : (cashAccount || bankAccount);

    if (monetaryAccount && arAccount && apAccount) {
      if (type === 'RECEIVED') {
        // Customer receipt: Debit Cash/Bank, Credit Accounts Receivable
        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(paymentDate),
            description: `Payment received (${method}) — ${reference || created.id}`,
            referenceId: created.id,
            referenceType: 'Payment',
            lines: {
              create: [
                {
                  accountId: monetaryAccount.id,
                  debit: amount,
                  credit: 0,
                  description: `Receipt in ${monetaryAccount.name}`,
                },
                {
                  accountId: arAccount.id,
                  debit: 0,
                  credit: amount,
                  description: `Settlement of Accounts Receivable`,
                },
              ],
            },
          },
        });
      } else {
        // Supplier payout: Debit Accounts Payable, Credit Cash/Bank
        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(paymentDate),
            description: `Payment made (${method}) — ${reference || created.id}`,
            referenceId: created.id,
            referenceType: 'Payment',
            lines: {
              create: [
                {
                  accountId: apAccount.id,
                  debit: amount,
                  credit: 0,
                  description: `Settlement of Accounts Payable`,
                },
                {
                  accountId: monetaryAccount.id,
                  debit: 0,
                  credit: amount,
                  description: `Disbursement from ${monetaryAccount.name}`,
                },
              ],
            },
          },
        });
      }
    }

    return created;
  });

  sendCreated(res, payment, 'Payment recorded successfully');
});

export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const paymentId = req.params.id;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, businessId },
  });

  if (!payment) throw AppError.notFound('Payment record not found');

  await prisma.$transaction(async (tx) => {
    // 1. Reverse linked sales invoice paidAmount if linked
    if (payment.salesInvoiceId) {
      const inv = await tx.salesInvoice.findUnique({ where: { id: payment.salesInvoiceId } });
      if (inv) {
        const newPaid = Math.max(0, inv.paidAmount - payment.amount);
        const newStatus = newPaid >= inv.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'SENT';
        await tx.salesInvoice.update({
          where: { id: inv.id },
          data: { paidAmount: newPaid, status: newStatus },
        });
      }
    }

    // 2. Reverse linked purchase bill paidAmount if linked
    if (payment.purchaseBillId) {
      const bill = await tx.purchaseBill.findUnique({ where: { id: payment.purchaseBillId } });
      if (bill) {
        const newPaid = Math.max(0, bill.paidAmount - payment.amount);
        const newStatus = newPaid >= bill.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'RECEIVED';
        await tx.purchaseBill.update({
          where: { id: bill.id },
          data: { paidAmount: newPaid, status: newStatus },
        });
      }
    }

    // 3. Delete linked journal entries
    const je = await tx.journalEntry.findFirst({
      where: { businessId, referenceId: payment.id, referenceType: 'Payment' },
    });
    if (je) {
      await tx.journalEntryLine.deleteMany({ where: { journalEntryId: je.id } });
      await tx.journalEntry.delete({ where: { id: je.id } });
    }

    // 4. Delete the payment record
    await tx.payment.delete({ where: { id: payment.id } });
  });

  sendNoContent(res);
});
