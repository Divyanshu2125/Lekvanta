import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

// ── GST Helper ────────────────────────────────────────────────────────────────

function calcLineAmounts(
  quantity: number,
  unitPrice: number,
  discountPct: number,
  taxRate: number,
  isInterState: boolean,
  isNonGst: boolean = false
) {
  const gross = quantity * unitPrice;
  const discount = (gross * (discountPct || 0)) / 100;
  const taxable = gross - discount;
  const effectiveTaxRate = isNonGst ? 0 : (taxRate || 0);
  const totalTax = (taxable * effectiveTaxRate) / 100;

  const cgst = isInterState ? 0 : totalTax / 2;
  const sgst = isInterState ? 0 : totalTax / 2;
  const igst = isInterState ? totalTax : 0;
  const amount = taxable + totalTax;

  return { taxable, cgst, sgst, igst, totalTax, amount, discount };
}

// ── Invoice Numbering ─────────────────────────────────────────────────────────

async function nextInvoiceNumber(tx: any, businessId: string): Promise<string> {
  const business = await tx.business.update({
    where: { id: businessId },
    data: { invoiceCounter: { increment: 1 } },
    select: { invoicePrefix: true, invoiceCounter: true },
  });
  const prefix = business.invoicePrefix || 'INV';
  const seq = String(business.invoiceCounter).padStart(4, '0');
  return `${prefix}-${seq}`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const listSalesInvoices = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    customerId,
    invoiceType,
    search,
    page = '1',
    limit = '50',
    from,
    to,
  } = req.query as Record<string, string>;

  const where: any = { businessId: req.businessId!, deletedAt: null };
  if (status && status !== 'ALL') where.status = status;
  if (customerId) where.customerId = customerId;
  if (invoiceType && invoiceType !== 'ALL') where.invoiceType = invoiceType;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { customer: { name: { contains: search } } },
    ];
  }
  if (from || to) {
    where.invoiceDate = {};
    if (from) where.invoiceDate.gte = new Date(from);
    if (to) where.invoiceDate.lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, gstin: true } },
      },
      orderBy: { invoiceDate: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  sendSuccess(res, invoices, undefined, 200, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const getSalesInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
    include: {
      customer: true,
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

  if (!invoice) throw AppError.notFound('Invoice not found');
  sendSuccess(res, invoice);
});

export const createSalesInvoice = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const {
    items,
    isInterState = false,
    paidAmount = 0,
    paymentMethod = 'CASH',
    paymentReference,
    invoiceNumber: customInvoiceNumber,
    ...invoiceData
  } = req.body;

  const invoice = await prisma.$transaction(async (tx) => {
    // Determine unique invoice number
    let invoiceNumber = customInvoiceNumber?.trim();
    if (!invoiceNumber) {
      invoiceNumber = await nextInvoiceNumber(tx, businessId);
    } else {
      // Check for duplicate number
      const existing = await tx.salesInvoice.findFirst({
        where: { businessId, invoiceNumber, deletedAt: null },
      });
      if (existing) {
        throw AppError.badRequest(`Invoice number '${invoiceNumber}' already exists.`);
      }
    }

    const isNonGst = invoiceData.invoiceType === 'BILL_OF_SUPPLY';

    // Compute totals
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const lineItems = [];

    for (const line of items) {
      const { taxable, cgst, sgst, igst, amount } = calcLineAmounts(
        line.quantity,
        line.unitPrice,
        line.discountPct ?? 0,
        line.taxRate ?? 0,
        isInterState,
        isNonGst
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
        discountPct: line.discountPct ?? 0,
        taxRate: isNonGst ? 0 : (line.taxRate ?? 0),
        cgst,
        sgst,
        igst,
        amount,
      });
    }

    const taxAmount = totalCgst + totalSgst + totalIgst;
    const roundOff = invoiceData.roundOff ?? 0;
    const discountAmount = invoiceData.discountAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount + roundOff);

    // Determine initial status based on payment and invoice type
    const isQuotationOrEstimate = ['ESTIMATE', 'QUOTATION'].includes(invoiceData.invoiceType);
    let finalStatus = invoiceData.status || 'SENT';

    if (isQuotationOrEstimate) {
      finalStatus = invoiceData.status === 'SENT' ? 'SENT' : 'DRAFT';
    } else if (invoiceData.status !== 'DRAFT') {
      if (paidAmount >= totalAmount && totalAmount > 0) {
        finalStatus = 'PAID';
      } else if (paidAmount > 0) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'SENT'; // Credit sale
      }
    }

    const customerId = invoiceData.customerId || null;

    // Create invoice + line items
    const created = await tx.salesInvoice.create({
      data: {
        businessId,
        customerId,
        invoiceNumber,
        invoiceDate: new Date(invoiceData.invoiceDate),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        status: finalStatus,
        invoiceType: invoiceData.invoiceType || 'TAX_INVOICE',
        subtotal,
        discountAmount,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        taxAmount,
        roundOff,
        totalAmount,
        paidAmount: Math.min(paidAmount, totalAmount),
        notes: invoiceData.notes || null,
        terms: invoiceData.terms || null,
        items: { create: lineItems },
      },
      include: { items: true },
    });

    // Record payment if initial payment was made and not draft/estimate
    if (paidAmount > 0 && finalStatus !== 'DRAFT' && !isQuotationOrEstimate) {
      await tx.payment.create({
        data: {
          businessId,
          type: 'RECEIVED',
          customerId,
          salesInvoiceId: created.id,
          amount: Math.min(paidAmount, totalAmount),
          method: paymentMethod || 'CASH',
          paymentDate: new Date(invoiceData.invoiceDate),
          reference: paymentReference || `Payment for ${invoiceNumber}`,
          notes: `Initial payment received during invoice generation`,
        },
      });
    }

    // Update stock only for confirmed invoices (not DRAFT, not ESTIMATE, not QUOTATION)
    const isConfirmedSale = finalStatus !== 'DRAFT' && !isQuotationOrEstimate;

    if (isConfirmedSale) {
      for (const line of lineItems) {
        if (!line.itemId) continue;
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.trackInventory) continue;

        const newStock = item.currentStock - line.quantity;
        await tx.item.update({
          where: { id: item.id },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: item.id,
            type: 'SALE',
            referenceId: created.id,
            referenceType: 'SalesInvoice',
            quantity: -line.quantity,
            previousStock: item.currentStock,
            newStock,
            notes: `Sale — Invoice ${invoiceNumber}`,
          },
        });
      }

      // Record double-entry financial transaction
      const arAccount = await tx.account.findFirst({ where: { businessId, code: '1100' } }); // AR
      const cashAccount = await tx.account.findFirst({ where: { businessId, code: '1001' } }); // Cash
      const bankAccount = await tx.account.findFirst({ where: { businessId, code: '1002' } }); // Bank
      const salesAccount = await tx.account.findFirst({ where: { businessId, code: '4001' } }); // Sales
      const cgstAccount = await tx.account.findFirst({ where: { businessId, code: '2201' } });
      const sgstAccount = await tx.account.findFirst({ where: { businessId, code: '2202' } });
      const igstAccount = await tx.account.findFirst({ where: { businessId, code: '2203' } });

      if (salesAccount) {
        const jeLines: any[] = [];
        const actualPaid = Math.min(paidAmount, totalAmount);
        const balanceDue = totalAmount - actualPaid;

        // Debit: Cash/Bank for paid amount
        if (actualPaid > 0) {
          const receivingAcc = (paymentMethod === 'BANK' || paymentMethod === 'UPI' || paymentMethod === 'NEFT') && bankAccount
            ? bankAccount
            : (cashAccount || arAccount);

          if (receivingAcc) {
            jeLines.push({
              accountId: receivingAcc.id,
              debit: actualPaid,
              credit: 0,
              description: `Payment received (${paymentMethod}) — ${invoiceNumber}`,
            });
          }
        }

        // Debit: AR for remaining balance due
        if (balanceDue > 0 && arAccount) {
          jeLines.push({
            accountId: arAccount.id,
            debit: balanceDue,
            credit: 0,
            description: `Credit Sale (AR) — ${invoiceNumber}`,
          });
        }

        // Credit: Sales Revenue
        const netSales = subtotal - discountAmount;
        jeLines.push({
          accountId: salesAccount.id,
          debit: 0,
          credit: netSales,
          description: `Sales Revenue — ${invoiceNumber}`,
        });

        // Credit: Taxes
        if (totalCgst > 0 && cgstAccount) {
          jeLines.push({ accountId: cgstAccount.id, debit: 0, credit: totalCgst, description: 'Output CGST' });
        }
        if (totalSgst > 0 && sgstAccount) {
          jeLines.push({ accountId: sgstAccount.id, debit: 0, credit: totalSgst, description: 'Output SGST' });
        }
        if (totalIgst > 0 && igstAccount) {
          jeLines.push({ accountId: igstAccount.id, debit: 0, credit: totalIgst, description: 'Output IGST' });
        }

        // Handle Round Off discrepancy if any
        let totalDebit = jeLines.reduce((s, l) => s + l.debit, 0);
        let totalCredit = jeLines.reduce((s, l) => s + l.credit, 0);
        const roundingDiff = totalDebit - totalCredit;

        if (Math.abs(roundingDiff) > 0.001) {
          const roundAcc = await tx.account.findFirst({ where: { businessId, code: '5900' } }) || salesAccount;
          if (roundAcc) {
            if (roundingDiff < 0) {
              jeLines.push({ accountId: roundAcc.id, debit: Math.abs(roundingDiff), credit: 0, description: 'Round Off' });
            } else {
              jeLines.push({ accountId: roundAcc.id, debit: 0, credit: roundingDiff, description: 'Round Off' });
            }
          }
        }

        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(invoiceData.invoiceDate),
            description: `Sales Invoice ${invoiceNumber}`,
            referenceId: created.id,
            referenceType: 'SalesInvoice',
            lines: { create: jeLines },
          },
        });
      }
    }

    return created;
  });

  sendCreated(res, invoice, `Invoice ${invoice.invoiceNumber} generated successfully`);
});

export const updateSalesInvoice = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.salesInvoice.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Invoice not found');
  if (existing.status === 'PAID') throw AppError.badRequest('Cannot edit a fully paid invoice');
  if (existing.status === 'CANCELLED') throw AppError.badRequest('Cannot edit a cancelled invoice');

  const updated = await prisma.salesInvoice.update({
    where: { id: req.params.id },
    data: { ...req.body },
  });
  sendSuccess(res, updated, 'Invoice updated');
});

export const cancelSalesInvoice = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const invoiceId = req.params.id;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, businessId, deletedAt: null },
    include: { items: true, payments: true },
  });

  if (!invoice) throw AppError.notFound('Invoice not found');
  if (invoice.status === 'CANCELLED') throw AppError.badRequest('Invoice is already cancelled');

  await prisma.$transaction(async (tx) => {
    const wasConfirmed = invoice.status !== 'DRAFT' && !['ESTIMATE', 'QUOTATION'].includes(invoice.invoiceType);

    // 1. Reverse stock movements if this was a confirmed invoice
    if (wasConfirmed) {
      for (const line of invoice.items) {
        if (!line.itemId) continue;
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.trackInventory) continue;

        const restoredStock = item.currentStock + line.quantity;
        await tx.item.update({
          where: { id: item.id },
          data: { currentStock: restoredStock },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: item.id,
            type: 'RETURN_IN',
            referenceId: invoice.id,
            referenceType: 'SalesInvoice',
            quantity: line.quantity,
            previousStock: item.currentStock,
            newStock: restoredStock,
            notes: `Stock restored from cancelled invoice ${invoice.invoiceNumber}`,
          },
        });
      }

      // 2. Reverse accounting journal entries
      const originalJe = await tx.journalEntry.findFirst({
        where: { businessId, referenceId: invoice.id, referenceType: 'SalesInvoice' },
        include: { lines: true },
      });

      if (originalJe && originalJe.lines.length > 0) {
        // Create an exact reversing journal entry (swapping debit and credit)
        const reversalLines = originalJe.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.credit,
          credit: l.debit,
          description: `Reversal: ${l.description || 'Invoice cancelled'}`,
        }));

        await tx.journalEntry.create({
          data: {
            businessId,
            entryDate: new Date(),
            description: `Reversal of Sales Invoice ${invoice.invoiceNumber}`,
            referenceId: invoice.id,
            referenceType: 'SalesInvoiceReversal',
            lines: { create: reversalLines },
          },
        });
      }
    }

    // 3. Mark invoice as cancelled
    await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });
  });

  sendSuccess(res, null, 'Invoice cancelled. Stock and financial ledgers have been safely reversed.');
});

export const deleteSalesInvoice = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.salesInvoice.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Invoice not found');
  await prisma.salesInvoice.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  sendNoContent(res);
});
