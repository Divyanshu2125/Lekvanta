import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export const getChartOfAccounts = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const accounts = await prisma.account.findMany({
    where: { businessId },
    include: {
      lines: {
        select: { debit: true, credit: true },
      },
      parent: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ type: 'asc' }, { code: 'asc' }],
  });

  // Calculate live balances dynamically from journal lines (never hardcoded)
  const formatted = accounts.map((acc) => {
    const totalDebit = acc.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = acc.lines.reduce((s, l) => s + (l.credit || 0), 0);

    // Normal debit balance for ASSET & EXPENSE; Normal credit balance for LIABILITY, EQUITY & INCOME
    let balance = 0;
    if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    const { lines, ...rest } = acc;
    return {
      ...rest,
      totalDebit,
      totalCredit,
      balance,
    };
  });

  sendSuccess(res, formatted);
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { name, code, type, parentId } = req.body;

  if (code) {
    const existing = await prisma.account.findFirst({
      where: { businessId, code },
    });
    if (existing) {
      throw AppError.badRequest(`An account with code '${code}' already exists.`);
    }
  }

  const account = await prisma.account.create({
    data: {
      businessId,
      name,
      code: code || null,
      type,
      parentId: parentId || null,
      isSystem: false,
    },
  });
  sendCreated(res, account, 'Account created successfully');
});

// ── Journal Entries ───────────────────────────────────────────────────────────

export const listJournalEntries = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '50', from, to, search } = req.query as Record<string, string>;
  const where: any = { businessId: req.businessId! };

  if (from || to) {
    where.entryDate = {};
    if (from) where.entryDate.gte = new Date(from);
    if (to) where.entryDate.lte = new Date(to);
  }

  if (search) {
    where.OR = [
      { description: { contains: search } },
      { referenceType: { contains: search } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { id: true, name: true, code: true, type: true } },
          },
        },
      },
      orderBy: { entryDate: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.journalEntry.count({ where }),
  ]);

  sendSuccess(res, entries, undefined, 200, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const createManualJournalEntry = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { entryDate, description, lines } = req.body;

  // Validate balanced double-entry
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += Number(line.debit || 0);
    totalCredit += Number(line.credit || 0);
  }

  const discrepancy = Math.abs(totalDebit - totalCredit);
  if (discrepancy > 0.01) {
    throw AppError.badRequest(
      `Unbalanced journal entry: Total debits (₹${totalDebit.toFixed(2)}) must equal total credits (₹${totalCredit.toFixed(2)}). Difference is ₹${discrepancy.toFixed(2)}.`
    );
  }

  const entry = await prisma.journalEntry.create({
    data: {
      businessId,
      entryDate: new Date(entryDate),
      description,
      referenceType: 'Manual',
      lines: {
        create: lines.map((l: any) => ({
          accountId: l.accountId,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || null,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  sendCreated(res, entry, 'Manual journal entry recorded successfully');
});

// ── General Ledger ────────────────────────────────────────────────────────────

export const getGeneralLedger = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { accountId, from, to } = req.query as Record<string, string>;

  // Target account
  let account = null;
  if (accountId) {
    account = await prisma.account.findFirst({
      where: { id: accountId, businessId },
    });
  } else {
    // Default to Cash or first asset account
    account = await prisma.account.findFirst({
      where: { businessId, code: '1001' },
    });
    if (!account) {
      account = await prisma.account.findFirst({ where: { businessId } });
    }
  }

  if (!account) {
    sendSuccess(res, { account: null, openingBalance: 0, lines: [], closingBalance: 0 });
    return;
  }

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = to ? new Date(to) : new Date();

  // 1. Calculate opening balance prior to fromDate
  const priorLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: {
        businessId,
        entryDate: { lt: fromDate },
      },
    },
    select: { debit: true, credit: true },
  });

  const priorDebits = priorLines.reduce((s, l) => s + l.debit, 0);
  const priorCredits = priorLines.reduce((s, l) => s + l.credit, 0);
  const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
  const openingBalance = isDebitNormal ? priorDebits - priorCredits : priorCredits - priorDebits;

  // 2. Fetch lines within period
  const periodLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: {
        businessId,
        entryDate: { gte: fromDate, lte: toDate },
      },
    },
    include: {
      journalEntry: {
        select: {
          id: true,
          entryDate: true,
          description: true,
          referenceType: true,
          referenceId: true,
        },
      },
    },
    orderBy: {
      journalEntry: { entryDate: 'asc' },
    },
  });

  // 3. Compute running balance line by line
  let runningBalance = openingBalance;
  const ledgerLines = periodLines.map((line) => {
    if (isDebitNormal) {
      runningBalance += line.debit - line.credit;
    } else {
      runningBalance += line.credit - line.debit;
    }

    return {
      id: line.id,
      entryDate: line.journalEntry.entryDate,
      entryDescription: line.journalEntry.description,
      lineDescription: line.description,
      referenceType: line.journalEntry.referenceType,
      debit: line.debit,
      credit: line.credit,
      runningBalance,
    };
  });

  sendSuccess(res, {
    account: {
      id: account.id,
      name: account.name,
      code: account.code,
      type: account.type,
    },
    fromDate,
    toDate,
    openingBalance,
    lines: ledgerLines,
    closingBalance: runningBalance,
    totalPeriodDebits: periodLines.reduce((s, l) => s + l.debit, 0),
    totalPeriodCredits: periodLines.reduce((s, l) => s + l.credit, 0),
  });
});

// ── Cash Book ─────────────────────────────────────────────────────────────────

export const getCashBook = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { from, to } = req.query as Record<string, string>;

  const cashAccount = await prisma.account.findFirst({
    where: {
      businessId,
      OR: [{ code: '1001' }, { name: { contains: 'Cash' } }],
    },
  });

  if (!cashAccount) {
    sendSuccess(res, { openingBalance: 0, receipts: [], payments: [], lines: [], closingBalance: 0 });
    return;
  }

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = to ? new Date(to) : new Date();

  // Prior balance
  const prior = await prisma.journalEntryLine.findMany({
    where: {
      accountId: cashAccount.id,
      journalEntry: { businessId, entryDate: { lt: fromDate } },
    },
    select: { debit: true, credit: true },
  });
  const openingBalance = prior.reduce((s, l) => s + l.debit - l.credit, 0);

  // Period entries
  const periodLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: cashAccount.id,
      journalEntry: { businessId, entryDate: { gte: fromDate, lte: toDate } },
    },
    include: {
      journalEntry: {
        select: { id: true, entryDate: true, description: true, referenceType: true, referenceId: true },
      },
    },
    orderBy: { journalEntry: { entryDate: 'asc' } },
  });

  let runningBalance = openingBalance;
  const lines = periodLines.map((l) => {
    runningBalance += l.debit - l.credit;
    return {
      id: l.id,
      date: l.journalEntry.entryDate,
      particulars: l.description || l.journalEntry.description,
      type: l.debit > 0 ? 'RECEIPT' : 'PAYMENT',
      debit: l.debit,
      credit: l.credit,
      runningBalance,
    };
  });

  const totalReceipts = periodLines.reduce((s, l) => s + l.debit, 0);
  const totalDisbursements = periodLines.reduce((s, l) => s + l.credit, 0);

  sendSuccess(res, {
    account: cashAccount,
    openingBalance,
    lines,
    totalReceipts,
    totalDisbursements,
    closingBalance: runningBalance,
  });
});

// ── Bank Book ─────────────────────────────────────────────────────────────────

export const getBankBook = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { from, to } = req.query as Record<string, string>;

  const bankAccount = await prisma.account.findFirst({
    where: {
      businessId,
      OR: [{ code: '1002' }, { name: { contains: 'Bank' } }],
    },
  });

  if (!bankAccount) {
    sendSuccess(res, { openingBalance: 0, lines: [], closingBalance: 0 });
    return;
  }

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = to ? new Date(to) : new Date();

  // Prior balance
  const prior = await prisma.journalEntryLine.findMany({
    where: {
      accountId: bankAccount.id,
      journalEntry: { businessId, entryDate: { lt: fromDate } },
    },
    select: { debit: true, credit: true },
  });
  const openingBalance = prior.reduce((s, l) => s + l.debit - l.credit, 0);

  // Period entries
  const periodLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: bankAccount.id,
      journalEntry: { businessId, entryDate: { gte: fromDate, lte: toDate } },
    },
    include: {
      journalEntry: {
        select: { id: true, entryDate: true, description: true, referenceType: true, referenceId: true },
      },
    },
    orderBy: { journalEntry: { entryDate: 'asc' } },
  });

  let runningBalance = openingBalance;
  const lines = periodLines.map((l) => {
    runningBalance += l.debit - l.credit;
    return {
      id: l.id,
      date: l.journalEntry.entryDate,
      particulars: l.description || l.journalEntry.description,
      type: l.debit > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
      debit: l.debit,
      credit: l.credit,
      runningBalance,
    };
  });

  const totalDeposits = periodLines.reduce((s, l) => s + l.debit, 0);
  const totalWithdrawals = periodLines.reduce((s, l) => s + l.credit, 0);

  sendSuccess(res, {
    account: bankAccount,
    openingBalance,
    lines,
    totalDeposits,
    totalWithdrawals,
    closingBalance: runningBalance,
  });
});

// ── Trial Balance ─────────────────────────────────────────────────────────────

export const getTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const accounts = await prisma.account.findMany({
    where: { businessId },
    include: {
      lines: {
        select: { debit: true, credit: true },
      },
    },
    orderBy: [{ code: 'asc' }, { name: 'asc' }],
  });

  let grandTotalDebits = 0;
  let grandTotalCredits = 0;
  let netDebitBalancesTotal = 0;
  let netCreditBalancesTotal = 0;

  const trialBalance = accounts.map((acc) => {
    const totalDebit = acc.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = acc.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    const diff = totalDebit - totalCredit;

    grandTotalDebits += totalDebit;
    grandTotalCredits += totalCredit;

    let debitBalance = 0;
    let creditBalance = 0;

    if (diff > 0) {
      debitBalance = diff;
      netDebitBalancesTotal += debitBalance;
    } else if (diff < 0) {
      creditBalance = Math.abs(diff);
      netCreditBalancesTotal += creditBalance;
    }

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit,
      totalCredit,
      debitBalance,
      creditBalance,
    };
  });

  const isBalanced = Math.abs(netDebitBalancesTotal - netCreditBalancesTotal) < 0.01;

  sendSuccess(res, {
    accounts: trialBalance,
    grandTotalDebits,
    grandTotalCredits,
    netDebitBalancesTotal,
    netCreditBalancesTotal,
    isBalanced,
  });
});

// ── Profit & Loss Statement (Income Statement) ────────────────────────────────

export const getProfitAndLoss = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { from, to } = req.query as Record<string, string>;

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  // 1. Incomes
  const incomeAccounts = await prisma.account.findMany({
    where: { businessId, type: 'INCOME' },
    include: {
      lines: {
        where: Object.keys(dateFilter).length > 0 ? { journalEntry: { entryDate: dateFilter } } : undefined,
        select: { debit: true, credit: true },
      },
    },
  });

  // 2. Expenses
  const expenseAccounts = await prisma.account.findMany({
    where: { businessId, type: 'EXPENSE' },
    include: {
      lines: {
        where: Object.keys(dateFilter).length > 0 ? { journalEntry: { entryDate: dateFilter } } : undefined,
        select: { debit: true, credit: true },
      },
    },
  });

  const revenues = incomeAccounts.map((acc) => {
    const totalCredit = acc.lines.reduce((s, l) => s + l.credit, 0);
    const totalDebit = acc.lines.reduce((s, l) => s + l.debit, 0);
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      amount: totalCredit - totalDebit,
    };
  });

  const expenses = expenseAccounts.map((acc) => {
    const totalDebit = acc.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = acc.lines.reduce((s, l) => s + l.credit, 0);
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      amount: totalDebit - totalCredit,
      isCOGS: acc.code === '5001' || acc.code === '5002',
    };
  });

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const cogsExpenses = expenses.filter((e) => e.isCOGS);
  const operatingExpenses = expenses.filter((e) => !e.isCOGS);

  const totalCOGS = cogsExpenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;

  const totalOperatingExpenses = operatingExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalOperatingExpenses;

  sendSuccess(res, {
    totalRevenue,
    revenues,
    totalCOGS,
    cogsExpenses,
    grossProfit,
    totalOperatingExpenses,
    operatingExpenses,
    netProfit,
  });
});

// ── Balance Sheet ─────────────────────────────────────────────────────────────

export const getBalanceSheet = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { asOfDate } = req.query as Record<string, string>;

  const dateFilter = asOfDate ? { lte: new Date(asOfDate) } : undefined;

  const accounts = await prisma.account.findMany({
    where: { businessId },
    include: {
      lines: {
        where: dateFilter ? { journalEntry: { entryDate: dateFilter } } : undefined,
        select: { debit: true, credit: true },
      },
    },
  });

  const assets: any[] = [];
  const liabilities: any[] = [];
  const equities: any[] = [];

  let totalRevenue = 0;
  let totalExpense = 0;

  for (const acc of accounts) {
    const totalDebit = acc.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = acc.lines.reduce((s, l) => s + l.credit, 0);

    if (acc.type === 'ASSET') {
      const balance = totalDebit - totalCredit;
      assets.push({ id: acc.id, code: acc.code, name: acc.name, balance });
    } else if (acc.type === 'LIABILITY') {
      const balance = totalCredit - totalDebit;
      liabilities.push({ id: acc.id, code: acc.code, name: acc.name, balance });
    } else if (acc.type === 'EQUITY') {
      const balance = totalCredit - totalDebit;
      equities.push({ id: acc.id, code: acc.code, name: acc.name, balance });
    } else if (acc.type === 'INCOME') {
      totalRevenue += totalCredit - totalDebit;
    } else if (acc.type === 'EXPENSE') {
      totalExpense += totalDebit - totalCredit;
    }
  }

  // Net Profit for the period (Retained earnings addition to Equity)
  const currentPeriodProfit = totalRevenue - totalExpense;

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const baseEquity = equities.reduce((s, e) => s + e.balance, 0);
  const totalEquity = baseEquity + currentPeriodProfit;

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05;

  sendSuccess(res, {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equities,
    baseEquity,
    currentPeriodProfit,
    totalEquity,
    isBalanced,
  });
});

// ── Accounts Receivable (AR) Report ───────────────────────────────────────────

export const getAccountsReceivable = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;

  const customers = await prisma.customer.findMany({
    where: { businessId, deletedAt: null },
    include: {
      salesInvoices: {
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const report = customers
    .map((cust) => {
      const totalInvoiced = cust.salesInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
      const totalPaid = cust.salesInvoices.reduce((s, inv) => s + inv.paidAmount, 0);
      const currentOutstanding = cust.openingBalance + (totalInvoiced - totalPaid);

      const pendingInvoices = cust.salesInvoices.filter(
        (inv) => inv.status !== 'PAID' && inv.totalAmount > inv.paidAmount
      );

      return {
        customerId: cust.id,
        customerName: cust.name,
        phone: cust.phone,
        email: cust.email,
        gstin: cust.gstin,
        openingBalance: cust.openingBalance,
        totalInvoiced,
        totalPaid,
        currentOutstanding,
        pendingInvoicesCount: pendingInvoices.length,
        oldestPendingInvoice: pendingInvoices[0] || null,
      };
    })
    .filter((c) => Math.abs(c.currentOutstanding) > 0.01);

  const totalOutstandingReceivable = report.reduce((s, c) => s + c.currentOutstanding, 0);

  sendSuccess(res, {
    customers: report,
    totalOutstandingReceivable,
    totalDebtorsCount: report.length,
  });
});

// ── Accounts Payable (AP) Report ──────────────────────────────────────────────

export const getAccountsPayable = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;

  const suppliers = await prisma.supplier.findMany({
    where: { businessId, deletedAt: null },
    include: {
      purchaseBills: {
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const report = suppliers
    .map((sup) => {
      const totalPurchased = sup.purchaseBills.reduce((s, b) => s + b.totalAmount, 0);
      const totalPaid = sup.purchaseBills.reduce((s, b) => s + b.paidAmount, 0);
      const currentPayable = sup.openingBalance + (totalPurchased - totalPaid);

      const pendingBills = sup.purchaseBills.filter(
        (b) => b.status !== 'PAID' && b.totalAmount > b.paidAmount
      );

      return {
        supplierId: sup.id,
        supplierName: sup.name,
        phone: sup.phone,
        email: sup.email,
        gstin: sup.gstin,
        openingBalance: sup.openingBalance,
        totalPurchased,
        totalPaid,
        currentPayable,
        pendingBillsCount: pendingBills.length,
        oldestPendingBill: pendingBills[0] || null,
      };
    })
    .filter((s) => Math.abs(s.currentPayable) > 0.01);

  const totalPendingPayable = report.reduce((s, sup) => s + sup.currentPayable, 0);

  sendSuccess(res, {
    suppliers: report,
    totalPendingPayable,
    totalCreditorsCount: report.length,
  });
});
