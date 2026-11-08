import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

// ── Date Range / Financial Year Helper ────────────────────────────────────────

function getDateRange(query: Record<string, string>) {
  const { from, to, financialYear } = query;

  if (from || to) {
    const range: any = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      range.lte = toDate;
    }
    return range;
  }

  if (financialYear) {
    // e.g. "2026-2027" -> 2026-04-01 to 2027-03-31
    const [startYearStr, endYearStr] = financialYear.split('-');
    const startYear = parseInt(startYearStr) || 2026;
    const endYear = parseInt(endYearStr) || startYear + 1;
    return {
      gte: new Date(`${startYear}-04-01T00:00:00.000Z`),
      lte: new Date(`${endYear}-03-31T23:59:59.999Z`),
    };
  }

  // Default to current calendar year
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), 0, 1),
    lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// GST REPORTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 1. GST Sales Register
 * Outward supplies listing with customer GSTIN, taxable, CGST, SGST, IGST breakdown
 */
export const getGSTSalesRegister = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      businessId,
      deletedAt: null,
      status: { not: 'CANCELLED' },
      invoiceDate: dateRange,
    },
    include: {
      customer: { select: { id: true, name: true, gstin: true, phone: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          taxRate: true,
          cgst: true,
          sgst: true,
          igst: true,
          amount: true,
        },
      },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;
  let totalAmount = 0;

  // Rate-wise summary map: 0%, 5%, 12%, 18%, 28%
  const rateSummary: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {
    0: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    5: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    12: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    18: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    28: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  };

  const rows = invoices.map((inv) => {
    totalTaxable += inv.subtotal;
    totalCgst += inv.cgst;
    totalSgst += inv.sgst;
    totalIgst += inv.igst;
    totalTax += inv.taxAmount;
    totalAmount += inv.totalAmount;

    for (const it of inv.items) {
      const rate = it.taxRate || 0;
      if (!rateSummary[rate]) {
        rateSummary[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      }
      const itemTaxable = it.quantity * it.unitPrice;
      rateSummary[rate].taxable += itemTaxable;
      rateSummary[rate].cgst += it.cgst;
      rateSummary[rate].sgst += it.sgst;
      rateSummary[rate].igst += it.igst;
      rateSummary[rate].total += it.amount;
    }

    const isB2B = Boolean(inv.customer?.gstin && inv.customer.gstin.trim().length === 15);
    const isInterState = inv.igst > 0;

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      invoiceType: inv.invoiceType,
      customerName: inv.customer?.name || 'Cash Customer',
      customerGstin: inv.customer?.gstin || null,
      isB2B,
      isInterState,
      placeOfSupply: isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)',
      taxableValue: inv.subtotal,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      totalTax: inv.taxAmount,
      roundOff: inv.roundOff,
      totalAmount: inv.totalAmount,
      status: inv.status,
    };
  });

  sendSuccess(res, {
    invoices: rows,
    summary: {
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      totalAmount,
      invoiceCount: rows.length,
      b2bCount: rows.filter((r) => r.isB2B).length,
      b2cCount: rows.filter((r) => !r.isB2B).length,
    },
    rateSummary,
  });
});

/**
 * 2. GST Purchase Register
 * Inward supplies listing with supplier GSTIN, taxable, Input Tax Credit (ITC) breakdown
 */
export const getGSTPurchaseRegister = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const bills = await prisma.purchaseBill.findMany({
    where: {
      businessId,
      deletedAt: null,
      status: { not: 'CANCELLED' },
      billDate: dateRange,
    },
    include: {
      supplier: { select: { id: true, name: true, gstin: true, phone: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          taxRate: true,
          cgst: true,
          sgst: true,
          igst: true,
          amount: true,
        },
      },
    },
    orderBy: { billDate: 'asc' },
  });

  let totalTaxable = 0;
  let totalInputCgst = 0;
  let totalInputSgst = 0;
  let totalInputIgst = 0;
  let totalItc = 0;
  let totalAmount = 0;

  const rows = bills.map((b) => {
    totalTaxable += b.subtotal;
    totalInputCgst += b.cgst;
    totalInputSgst += b.sgst;
    totalInputIgst += b.igst;
    totalItc += b.taxAmount;
    totalAmount += b.totalAmount;

    const isInterState = b.igst > 0;

    return {
      id: b.id,
      billNumber: b.billNumber,
      billDate: b.billDate,
      supplierName: b.supplier?.name || 'Cash Vendor',
      supplierGstin: b.supplier?.gstin || null,
      isInterState,
      placeOfSupply: isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)',
      taxableValue: b.subtotal,
      cgst: b.cgst,
      sgst: b.sgst,
      igst: b.igst,
      totalItc: b.taxAmount,
      totalAmount: b.totalAmount,
      status: b.status,
    };
  });

  sendSuccess(res, {
    bills: rows,
    summary: {
      totalTaxable,
      totalInputCgst,
      totalInputSgst,
      totalInputIgst,
      totalItc,
      totalAmount,
      billCount: rows.length,
    },
  });
});

/**
 * 3. Tax Summary (CGST, SGST, IGST, Net Payable)
 */
export const getGSTTaxSummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const [invoices, bills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, invoiceDate: dateRange },
      select: { subtotal: true, cgst: true, sgst: true, igst: true, taxAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, billDate: dateRange },
      select: { subtotal: true, cgst: true, sgst: true, igst: true, taxAmount: true },
    }),
  ]);

  // Output Tax (Sales)
  const outputSalesTaxable = invoices.reduce((s, i) => s + i.subtotal, 0);
  const outputCgst = invoices.reduce((s, i) => s + i.cgst, 0);
  const outputSgst = invoices.reduce((s, i) => s + i.sgst, 0);
  const outputIgst = invoices.reduce((s, i) => s + i.igst, 0);
  const totalOutputTax = outputCgst + outputSgst + outputIgst;

  // Input Tax Credit (Purchases)
  const inputPurchaseTaxable = bills.reduce((s, b) => s + b.subtotal, 0);
  const itcCgst = bills.reduce((s, b) => s + b.cgst, 0);
  const itcSgst = bills.reduce((s, b) => s + b.sgst, 0);
  const itcIgst = bills.reduce((s, b) => s + b.igst, 0);
  const totalItc = itcCgst + itcSgst + itcIgst;

  // Net GST Liability = Output Tax - Input Tax Credit
  const netCgstPayable = Math.max(0, outputCgst - itcCgst);
  const netSgstPayable = Math.max(0, outputSgst - itcSgst);
  const netIgstPayable = Math.max(0, outputIgst - itcIgst);
  const totalNetGstPayable = netCgstPayable + netSgstPayable + netIgstPayable;

  const excessCgstCredit = Math.max(0, itcCgst - outputCgst);
  const excessSgstCredit = Math.max(0, itcSgst - outputSgst);
  const excessIgstCredit = Math.max(0, itcIgst - outputIgst);
  const totalExcessCredit = excessCgstCredit + excessSgstCredit + excessIgstCredit;

  sendSuccess(res, {
    outputTax: {
      taxableValue: outputSalesTaxable,
      cgst: outputCgst,
      sgst: outputSgst,
      igst: outputIgst,
      total: totalOutputTax,
    },
    inputTaxCredit: {
      taxableValue: inputPurchaseTaxable,
      cgst: itcCgst,
      sgst: itcSgst,
      igst: itcIgst,
      total: totalItc,
    },
    netPayable: {
      cgst: netCgstPayable,
      sgst: netSgstPayable,
      igst: netIgstPayable,
      total: totalNetGstPayable,
    },
    excessCreditCarriedForward: {
      cgst: excessCgstCredit,
      sgst: excessSgstCredit,
      igst: excessIgstCredit,
      total: totalExcessCredit,
    },
  });
});

/**
 * 4. GSTR-1 Preparation Report (Tables 4, 5, 7, 12, 13)
 */
export const getGSTR1Report = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const [invoices, business] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        invoiceDate: dateRange,
      },
      include: {
        customer: true,
        items: {
          include: {
            item: { select: { hsnCode: true, unit: { select: { shortName: true } } } },
          },
        },
      },
      orderBy: { invoiceDate: 'asc' },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, gstin: true, state: true },
    }),
  ]);

  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const cancelledInvoices = invoices.filter((i) => i.status === 'CANCELLED');

  // Table 4: B2B Invoices (Customers with GSTIN)
  const b2bInvoices = activeInvoices.filter(
    (inv) => inv.customer?.gstin && inv.customer.gstin.trim().length === 15
  );

  // Table 5: B2C Large (Inter-state unregistered with Invoice value > 2,50,000)
  const b2cLarge = activeInvoices.filter(
    (inv) =>
      (!inv.customer?.gstin || inv.customer.gstin.trim().length !== 15) &&
      inv.igst > 0 &&
      inv.totalAmount > 250000
  );

  // Table 7: B2C Small (Other unregistered sales)
  const b2cSmall = activeInvoices.filter(
    (inv) =>
      (!inv.customer?.gstin || inv.customer.gstin.trim().length !== 15) &&
      !(inv.igst > 0 && inv.totalAmount > 250000)
  );

  // Table 12: HSN Summary
  const hsnMap: Record<
    string,
    { hsnCode: string; uqc: string; totalQty: number; totalValue: number; taxableValue: number; igst: number; cgst: number; sgst: number }
  > = {};

  for (const inv of activeInvoices) {
    for (const it of inv.items) {
      const hsn = it.item?.hsnCode || 'OTHER';
      const uqc = it.item?.unit?.shortName || 'PCS';
      if (!hsnMap[hsn]) {
        hsnMap[hsn] = {
          hsnCode: hsn,
          uqc,
          totalQty: 0,
          totalValue: 0,
          taxableValue: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
        };
      }
      hsnMap[hsn].totalQty += it.quantity;
      hsnMap[hsn].totalValue += it.amount;
      hsnMap[hsn].taxableValue += it.quantity * it.unitPrice;
      hsnMap[hsn].igst += it.igst;
      hsnMap[hsn].cgst += it.cgst;
      hsnMap[hsn].sgst += it.sgst;
    }
  }

  // Table 13: Documents Issued
  const docSummary = {
    natureOfDocument: 'Invoices for outward supply',
    fromNumber: invoices[0]?.invoiceNumber || '-',
    toNumber: invoices[invoices.length - 1]?.invoiceNumber || '-',
    totalCount: invoices.length,
    cancelledCount: cancelledInvoices.length,
    netIssuedCount: activeInvoices.length,
  };

  sendSuccess(res, {
    business,
    table4_B2B: {
      count: b2bInvoices.length,
      taxableValue: b2bInvoices.reduce((s, i) => s + i.subtotal, 0),
      cgst: b2bInvoices.reduce((s, i) => s + i.cgst, 0),
      sgst: b2bInvoices.reduce((s, i) => s + i.sgst, 0),
      igst: b2bInvoices.reduce((s, i) => s + i.igst, 0),
      totalValue: b2bInvoices.reduce((s, i) => s + i.totalAmount, 0),
      invoices: b2bInvoices,
    },
    table5_B2CLarge: {
      count: b2cLarge.length,
      taxableValue: b2cLarge.reduce((s, i) => s + i.subtotal, 0),
      igst: b2cLarge.reduce((s, i) => s + i.igst, 0),
      totalValue: b2cLarge.reduce((s, i) => s + i.totalAmount, 0),
      invoices: b2cLarge,
    },
    table7_B2CSmall: {
      count: b2cSmall.length,
      taxableValue: b2cSmall.reduce((s, i) => s + i.subtotal, 0),
      cgst: b2cSmall.reduce((s, i) => s + i.cgst, 0),
      sgst: b2cSmall.reduce((s, i) => s + i.sgst, 0),
      igst: b2cSmall.reduce((s, i) => s + i.igst, 0),
      totalValue: b2cSmall.reduce((s, i) => s + i.totalAmount, 0),
    },
    table12_HSN: Object.values(hsnMap),
    table13_Docs: docSummary,
  });
});

/**
 * 5. GSTR-3B Preparation Report
 */
export const getGSTR3BReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const [invoices, bills, business] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, invoiceDate: dateRange },
    }),
    prisma.purchaseBill.findMany({
      where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, billDate: dateRange },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, gstin: true, state: true },
    }),
  ]);

  // 3.1 Outward supplies
  const taxableSupplies = invoices.filter((i) => i.invoiceType !== 'BILL_OF_SUPPLY');
  const zeroRatedOrExempt = invoices.filter((i) => i.invoiceType === 'BILL_OF_SUPPLY');

  const table3_1_a = {
    natureOfSupply: 'Outward taxable supplies (other than zero rated, nil rated and exempted)',
    taxableValue: taxableSupplies.reduce((s, i) => s + i.subtotal, 0),
    igst: taxableSupplies.reduce((s, i) => s + i.igst, 0),
    cgst: taxableSupplies.reduce((s, i) => s + i.cgst, 0),
    sgst: taxableSupplies.reduce((s, i) => s + i.sgst, 0),
    cess: 0,
  };

  const table3_1_c = {
    natureOfSupply: 'Other outward supplies (Nil rated, exempted / Non-GST)',
    taxableValue: zeroRatedOrExempt.reduce((s, i) => s + i.subtotal, 0),
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0,
  };

  // 4. Eligible ITC
  const itcAvailableAllOther = {
    details: '(5) All other ITC (Inward purchases from registered suppliers)',
    igst: bills.reduce((s, b) => s + b.igst, 0),
    cgst: bills.reduce((s, b) => s + b.cgst, 0),
    sgst: bills.reduce((s, b) => s + b.sgst, 0),
    cess: 0,
  };

  // 6.1 Payment of Tax
  const netCgst = Math.max(0, table3_1_a.cgst - itcAvailableAllOther.cgst);
  const netSgst = Math.max(0, table3_1_a.sgst - itcAvailableAllOther.sgst);
  const netIgst = Math.max(0, table3_1_a.igst - itcAvailableAllOther.igst);

  sendSuccess(res, {
    business,
    table3_1: [table3_1_a, table3_1_c],
    table4_EligibleITC: {
      itcAvailable: itcAvailableAllOther,
      itcReversed: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      netItc: itcAvailableAllOther,
    },
    table6_1_PaymentOfTax: {
      cgstTaxPayable: table3_1_a.cgst,
      cgstPaidThroughITC: Math.min(table3_1_a.cgst, itcAvailableAllOther.cgst),
      cgstPaidCash: netCgst,
      sgstTaxPayable: table3_1_a.sgst,
      sgstPaidThroughITC: Math.min(table3_1_a.sgst, itcAvailableAllOther.sgst),
      sgstPaidCash: netSgst,
      igstTaxPayable: table3_1_a.igst,
      igstPaidThroughITC: Math.min(table3_1_a.igst, itcAvailableAllOther.igst),
      igstPaidCash: netIgst,
      totalNetCashPayable: netCgst + netSgst + netIgst,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// BUSINESS REPORTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 6. Daily Sales Trend
 */
export const getDailySalesReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const invoices = await prisma.salesInvoice.findMany({
    where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, invoiceDate: dateRange },
    orderBy: { invoiceDate: 'asc' },
    select: {
      invoiceDate: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const dailyMap: Record<
    string,
    { date: string; invoiceCount: number; taxable: number; tax: number; totalSales: number; totalCollected: number; balanceDue: number }
  > = {};

  for (const inv of invoices) {
    const dayStr = inv.invoiceDate.toISOString().split('T')[0];
    if (!dailyMap[dayStr]) {
      dailyMap[dayStr] = {
        date: dayStr,
        invoiceCount: 0,
        taxable: 0,
        tax: 0,
        totalSales: 0,
        totalCollected: 0,
        balanceDue: 0,
      };
    }
    dailyMap[dayStr].invoiceCount += 1;
    dailyMap[dayStr].taxable += inv.subtotal;
    dailyMap[dayStr].tax += inv.taxAmount;
    dailyMap[dayStr].totalSales += inv.totalAmount;
    dailyMap[dayStr].totalCollected += inv.paidAmount;
    dailyMap[dayStr].balanceDue += Math.max(0, inv.totalAmount - inv.paidAmount);
  }

  const days = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  sendSuccess(res, {
    days,
    totalSales: days.reduce((s, d) => s + d.totalSales, 0),
    totalCollected: days.reduce((s, d) => s + d.totalCollected, 0),
    totalDue: days.reduce((s, d) => s + d.balanceDue, 0),
    totalInvoices: days.reduce((s, d) => s + d.invoiceCount, 0),
  });
});

/**
 * 7. Monthly Sales Trend
 */
export const getMonthlySalesReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const invoices = await prisma.salesInvoice.findMany({
    where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, invoiceDate: dateRange },
    orderBy: { invoiceDate: 'asc' },
    select: {
      invoiceDate: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const monthlyMap: Record<
    string,
    { month: string; label: string; count: number; taxable: number; tax: number; total: number; collected: number }
  > = {};

  for (const inv of invoices) {
    const d = new Date(inv.invoiceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });

    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, label, count: 0, taxable: 0, tax: 0, total: 0, collected: 0 };
    }
    monthlyMap[key].count += 1;
    monthlyMap[key].taxable += inv.subtotal;
    monthlyMap[key].tax += inv.taxAmount;
    monthlyMap[key].total += inv.totalAmount;
    monthlyMap[key].collected += inv.paidAmount;
  }

  const months = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  sendSuccess(res, {
    months,
    grandTotal: months.reduce((s, m) => s + m.total, 0),
    grandCollected: months.reduce((s, m) => s + m.collected, 0),
  });
});

/**
 * 8. Purchase Summary
 */
export const getPurchaseSummaryReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const bills = await prisma.purchaseBill.findMany({
    where: { businessId, deletedAt: null, status: { not: 'CANCELLED' }, billDate: dateRange },
    include: { supplier: { select: { name: true } } },
    orderBy: { billDate: 'desc' },
  });

  const totalPurchases = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDue = Math.max(0, totalPurchases - totalPaid);
  const totalTaxable = bills.reduce((s, b) => s + b.subtotal, 0);
  const totalTax = bills.reduce((s, b) => s + b.taxAmount, 0);

  sendSuccess(res, {
    totalPurchases,
    totalPaid,
    totalDue,
    totalTaxable,
    totalTax,
    billCount: bills.length,
    bills,
  });
});

/**
 * 9. Stock Summary & Valuation Report
 */
export const getStockValuationReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;

  const items = await prisma.item.findMany({
    where: { businessId, deletedAt: null },
    include: {
      category: { select: { name: true } },
      unit: { select: { shortName: true } },
    },
    orderBy: { name: 'asc' },
  });

  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;

  const itemReports = items.map((it) => {
    const costValue = it.currentStock * it.purchasePrice;
    const retailValue = it.currentStock * it.sellingPrice;
    const potentialMargin = retailValue - costValue;
    const isLowStock = it.trackInventory && it.currentStock <= it.minStock;

    if (isLowStock) lowStockCount += 1;
    totalCostValuation += costValue;
    totalRetailValuation += retailValue;

    return {
      id: it.id,
      name: it.name,
      sku: it.sku,
      barcode: it.barcode,
      hsnCode: it.hsnCode,
      category: it.category?.name || 'Uncategorized',
      unit: it.unit?.shortName || 'Pcs',
      currentStock: it.currentStock,
      minStock: it.minStock,
      purchasePrice: it.purchasePrice,
      sellingPrice: it.sellingPrice,
      costValuation: costValue,
      retailValuation: retailValue,
      potentialProfit: potentialMargin,
      isLowStock,
    };
  });

  sendSuccess(res, {
    items: itemReports,
    totalItems: items.length,
    totalCostValuation,
    totalRetailValuation,
    potentialGrossProfit: totalRetailValuation - totalCostValuation,
    lowStockCount,
  });
});

/**
 * 10. Low Stock Alerts Report
 */
export const getLowStockReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;

  const items = await prisma.item.findMany({
    where: {
      businessId,
      deletedAt: null,
      trackInventory: true,
    },
    include: {
      category: { select: { name: true } },
      unit: { select: { shortName: true } },
    },
    orderBy: { currentStock: 'asc' },
  });

  const lowStockItems = items
    .filter((it) => it.currentStock <= it.minStock)
    .map((it) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      category: it.category?.name || 'General',
      currentStock: it.currentStock,
      minStock: it.minStock,
      reorderShortage: Math.max(0, it.minStock - it.currentStock),
      unit: it.unit?.shortName || 'Pcs',
      purchasePrice: it.purchasePrice,
      estimatedReorderCost: Math.max(0, it.minStock - it.currentStock) * it.purchasePrice,
    }));

  sendSuccess(res, {
    lowStockItems,
    count: lowStockItems.length,
    totalReorderCost: lowStockItems.reduce((s, it) => s + it.estimatedReorderCost, 0),
  });
});

/**
 * 11. Cash Flow Report (Operational Monetary Inflows vs Outflows)
 */
export const getCashFlowReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const dateRange = getDateRange(req.query as Record<string, string>);

  const [inwardPayments, outwardPayments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId, type: 'RECEIVED', paymentDate: dateRange },
      select: { amount: true, method: true, paymentDate: true, reference: true },
    }),
    prisma.payment.findMany({
      where: { businessId, type: 'MADE', paymentDate: dateRange },
      select: { amount: true, method: true, paymentDate: true, reference: true },
    }),
    prisma.expense.findMany({
      where: { businessId, expenseDate: dateRange },
      select: { amount: true, category: true, paymentMethod: true, expenseDate: true, description: true },
    }),
  ]);

  const totalCustomerReceipts = inwardPayments.reduce((s, p) => s + p.amount, 0);
  const totalSupplierPayouts = outwardPayments.reduce((s, p) => s + p.amount, 0);
  const totalDirectExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const totalInflow = totalCustomerReceipts;
  const totalOutflow = totalSupplierPayouts + totalDirectExpenses;
  const netCashFlow = totalInflow - totalOutflow;

  sendSuccess(res, {
    totalInflow,
    totalCustomerReceipts,
    totalOutflow,
    totalSupplierPayouts,
    totalDirectExpenses,
    netCashFlow,
    receiptsCount: inwardPayments.length,
    payoutsCount: outwardPayments.length,
    expensesCount: expenses.length,
  });
});

