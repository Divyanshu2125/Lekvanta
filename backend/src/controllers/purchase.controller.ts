import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

// ── GST Helper ────────────────────────────────────────────────────────────────

function calcPurchaseLine(
  quantity: number,
  unitPrice: number,
  discountPct: number,
  taxRate: number,
  isInterState: boolean
) {
  const gross = quantity * unitPrice;
  const discount = (gross * (discountPct || 0)) / 100;
  const taxable = gross - discount;
  const totalTax = (taxable * (taxRate || 0)) / 100;
  const cgst = isInterState ? 0 : totalTax / 2;
  const sgst = isInterState ? 0 : totalTax / 2;
  const igst = isInterState ? totalTax : 0;
  return { taxable, cgst, sgst, igst, totalTax, amount: taxable + totalTax, discount };
}

// ── Bill Numbering ─────────────────────────────────────────────────────────────

async function nextBillNumber(tx: any, businessId: string): Promise<string> {
  const business = await tx.business.update({
    where: { id: businessId },
    data: { purchaseCounter: { increment: 1 } },
    select: { purchasePrefix: true, purchaseCounter: true },
  });
  const prefix = business.purchasePrefix || 'PB';
  const seq = String(business.purchaseCounter).padStart(4, '0');
  return `${prefix}-${seq}`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const listPurchaseBills = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    supplierId,
    search,
    page = '1',
    limit = '50',
    from,
    to,
  } = req.query as Record<string, string>;

  const where: any = { businessId: req.businessId!, deletedAt: null };
  if (status && status !== 'ALL') where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (search) {
    where.OR = [
      { billNumber: { contains: search } },
      { supplier: { name: { contains: search } } },
    ];
  }
  if (from || to) {
    where.billDate = {};
    if (from) where.billDate.gte = new Date(from);
    if (to) where.billDate.lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bills, total] = await Promise.all([
    prisma.purchaseBill.findMany({
      where,
      include: { supplier: { select: { id: true, name: true, phone: true, email: true, gstin: true } } },
      orderBy: { billDate: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.purchaseBill.count({ where }),
  ]);

  sendSuccess(res, bills, undefined, 200, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const getPurchaseBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.purchaseBill.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
    include: {
      supplier: true,
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              hsnCode: true,
              unit: { select: { name: true, shortName: true } },
            },
          },
        },
      },
      payments: true,
      business: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gstin: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          logoUrl: true,
        },
      },
    },
  });
  if (!bill) throw AppError.notFound('Purchase bill not found');
  sendSuccess(res, bill);
});

export const createPurchaseBill = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const {
    items,
    isInterState = false,
    paidAmount = 0,
    paymentMethod = 'CASH',
    paymentReference,
    billNumber: customBillNumber,
    discountAmount = 0,
    roundOff = 0,
    ...billData
  } = req.body;

  const bill = await prisma.$transaction(async (tx) => {
    // Determine unique bill number
    let billNumber = customBillNumber?.trim();
    if (!billNumber) {
      billNumber = await nextBillNumber(tx, businessId);
    } else {
      const existing = await tx.purchaseBill.findFirst({
        where: { businessId, billNumber, deletedAt: null },
      });
      if (existing) {
        throw AppError.badRequest(`Bill number '${billNumber}' already exists.`);
      }
    }

    // Compute totals
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const lineItems = [];

    for (const line of items) {
      const { taxable, cgst, sgst, igst, amount } = calcPurchaseLine(
        line.quantity,
        line.unitPrice,
        line.discountPct ?? 0,
        line.taxRate ?? 0,
        isInterState
      );
      subtotal += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      lineItems.push({
        itemId: line.itemId || null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? 0,
        cgst,
        sgst,
        igst,
        amount,
      });
    }

    const taxAmount = totalCgst + totalSgst + totalIgst;
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount + roundOff);

    // Determine status
    let finalStatus = billData.status || 'RECEIVED';
    if (billData.status !== 'DRAFT') {
      if (paidAmount >= totalAmount && totalAmount > 0) {
        finalStatus = 'PAID';
      } else if (paidAmount > 0) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'RECEIVED'; // Credit purchase
      }
    }

    const supplierId = billData.supplierId || null;

    // Create the bill
    const created = await tx.purchaseBill.create({
      data: {
        businessId,
        supplierId,
        billNumber,
        billDate: new Date(billData.billDate),
        dueDate: billData.dueDate ? new Date(billData.dueDate) : null,
        status: finalStatus,
        subtotal,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        taxAmount,
        totalAmount,
        paidAmount: Math.min(paidAmount, totalAmount),
        notes: billData.notes || null,
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Record payment if initial payment was made and not draft
    if (paidAmount > 0 && finalStatus !== 'DRAFT') {
      await tx.payment.create({
        data: {
          businessId,
          type: 'MADE',
          supplierId,
          purchaseBillId: created.id,
          amount: Math.min(paidAmount, totalAmount),
          method: paymentMethod || 'CASH',
          paymentDate: new Date(billData.billDate),
          reference: paymentReference || `Payment for ${billNumber}`,
          notes: `Initial payment made during purchase recording`,
        },
      });
    }

    // Update stock only for confirmed bills (not DRAFT)
    const isConfirmed = finalStatus !== 'DRAFT';

    if (isConfirmed) {
      for (const line of lineItems) {
        if (!line.itemId) continue;
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.trackInventory) continue;

        const newStock = item.currentStock + line.quantity;
        await tx.item.update({
          where: { id: item.id },
          data: { currentStock: newStock, purchasePrice: line.unitPrice },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: item.id,
            type: 'PURCHASE',
            referenceId: created.id,
            referenceType: 'PurchaseBill',
            quantity: line.quantity,
            previousStock: item.currentStock,
            newStock,
            notes: `Purchase — Bill ${billNumber}`,
          },
        });
      }

      // Double-entry journal: Debit Purchases+ITC, Credit AP; then if paid: Debit AP, Credit Cash/Bank
      const apAccount    = await tx.account.findFirst({ where: { businessId, code: '2100' } });
      const stockAccount = await tx.account.findFirst({ where: { businessId, code: '1200' } });
      const itcAccount   = await tx.account.findFirst({ where: { businessId, code: '1301' } });
      const cashAccount  = await tx.account.findFirst({ where: { businessId, code: '1001' } });
      const bankAccount  = await tx.account.findFirst({ where: { businessId, code: '1002' } });

      if (apAccount && stockAccount) {
        const jeLines: any[] = [];
        const actualPaid = Math.min(paidAmount, totalAmount);
        const netPurchase = subtotal - discountAmount;

        // Debit: Purchases/Inventory
        jeLines.push({
          accountId: stockAccount.id,
          debit: netPurchase,
          credit: 0,
          description: `Purchases — ${billNumber}`,
        });

        // Debit: Input Tax Credit
        if (taxAmount > 0 && itcAccount) {
          jeLines.push({
            accountId: itcAccount.id,
            debit: taxAmount,
            credit: 0,
            description: `Input Tax Credit — ${billNumber}`,
          });
        }

        // Credit: Accounts Payable (full amount)
        jeLines.push({
          accountId: apAccount.id,
          debit: 0,
          credit: totalAmount,
          description: `AP — ${billNumber}`,
        });

        // If paid: Debit AP, Credit Cash/Bank
        if (actualPaid > 0) {
          const payAcc =
            (paymentMethod === 'BANK' || paymentMethod === 'UPI' || paymentMethod === 'NEFT') && bankAccount
              ? bankAccount
              : cashAccount || apAccount;

          jeLines.push({
            accountId: apAccount.id,
            debit: actualPaid,
            credit: 0,
            description: `AP Settlement — ${billNumber}`,
          });
          if (payAcc) {
            jeLines.push({
              accountId: payAcc.id,
              debit: 0,
              credit: actualPaid,
              description: `Payment (${paymentMethod}) — ${billNumber}`,
            });
          }
        }

        // Handle Round Off discrepancy if any
        let totalDebit = jeLines.reduce((s, l) => s + l.debit, 0);
        let totalCredit = jeLines.reduce((s, l) => s + l.credit, 0);
        const roundingDiff = totalDebit - totalCredit;

        if (Math.abs(roundingDiff) > 0.001) {
          const roundAcc = await tx.account.findFirst({ where: { businessId, code: '5900' } }) || stockAccount;
          if (roundAcc) {
            if (roundingDiff < 0) {
              jeLines.push({ accountId: roundAcc.id, debit: Math.abs(roundingDiff), credit: 0, description: 'Round Off' });
            } else {
              jeLines.push({ accountId: roundAcc.id, debit: 0, credit: roundingDiff, description: 'Round Off' });
            }
          }
        }

        // Create journal entry
        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(billData.billDate),
            description: `Purchase Bill ${billNumber}`,
            referenceId: created.id,
            referenceType: 'PurchaseBill',
            lines: { create: jeLines },
          },
        });
      }
    }

    return created;
  });

  sendCreated(res, bill, `Purchase bill ${bill.billNumber} recorded successfully`);
});

export const updatePurchaseBill = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.purchaseBill.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Purchase bill not found');
  if (existing.status === 'CANCELLED') throw AppError.badRequest('Cannot edit a cancelled bill');

  const updated = await prisma.purchaseBill.update({
    where: { id: req.params.id },
    data: req.body,
  });
  sendSuccess(res, updated, 'Bill updated');
});

export const cancelPurchaseBill = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const billId = req.params.id;

  const bill = await prisma.purchaseBill.findFirst({
    where: { id: billId, businessId, deletedAt: null },
    include: { items: true, payments: true },
  });

  if (!bill) throw AppError.notFound('Purchase bill not found');
  if (bill.status === 'CANCELLED') throw AppError.badRequest('Bill is already cancelled');

  await prisma.$transaction(async (tx) => {
    const wasConfirmed = bill.status !== 'DRAFT';

    // 1. Reverse stock movements if this was a confirmed bill
    if (wasConfirmed) {
      for (const line of bill.items) {
        if (!line.itemId) continue;
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.trackInventory) continue;

        const restoredStock = item.currentStock - line.quantity;
        await tx.item.update({
          where: { id: item.id },
          data: { currentStock: Math.max(0, restoredStock) },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: item.id,
            type: 'RETURN_OUT',
            referenceId: bill.id,
            referenceType: 'PurchaseBill',
            quantity: -line.quantity,
            previousStock: item.currentStock,
            newStock: Math.max(0, restoredStock),
            notes: `Stock reversed from cancelled purchase ${bill.billNumber}`,
          },
        });
      }

      // 2. Reverse accounting journal entries
      const originalJe = await tx.journalEntry.findFirst({
        where: { businessId, referenceId: bill.id, referenceType: 'PurchaseBill' },
        include: { lines: true },
      });

      if (originalJe && originalJe.lines.length > 0) {
        const reversalLines = originalJe.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.credit,
          credit: l.debit,
          description: `Reversal: ${l.description || 'Bill cancelled'}`,
        }));

        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(),
            description: `Reversal of Purchase Bill ${bill.billNumber}`,
            referenceId: bill.id,
            referenceType: 'PurchaseBillReversal',
            lines: { create: reversalLines },
          },
        });
      }
    }

    // 3. Mark bill as cancelled
    await tx.purchaseBill.update({
      where: { id: billId },
      data: { status: 'CANCELLED' },
    });
  });

  sendSuccess(res, null, 'Purchase bill cancelled. Stock and financial ledgers have been safely reversed.');
});

export const deletePurchaseBill = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.purchaseBill.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Purchase bill not found');
  await prisma.purchaseBill.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  sendNoContent(res);
});
