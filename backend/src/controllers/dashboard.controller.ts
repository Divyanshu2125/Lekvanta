import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;

  // Date range for "Today"
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Run database aggregations concurrently
  const [
    todaySalesAgg,
    todayPurchasesAgg,
    allSalesAgg,
    allPurchasesAgg,
    cashAccount,
    bankAccount,
    allInvoices,
    allBills,
    lowStockItems,
    topSellingItemsRaw,
    recentSales,
    recentPurchases,
  ] = await Promise.all([
    // Today's Sales
    prisma.salesInvoice.aggregate({
      where: {
        businessId,
        invoiceDate: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    }),

    // Today's Purchases
    prisma.purchaseBill.aggregate({
      where: {
        businessId,
        billDate: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    }),

    // All-time sales total
    prisma.salesInvoice.aggregate({
      where: {
        businessId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, subtotal: true },
    }),

    // All-time purchases total
    prisma.purchaseBill.aggregate({
      where: {
        businessId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, subtotal: true },
    }),

    // Cash in Hand
    prisma.account.findFirst({
      where: { businessId, code: '1001' },
      include: { lines: true },
    }),

    // Bank Balance
    prisma.account.findFirst({
      where: { businessId, code: '1002' },
      include: { lines: true },
    }),

    // Receivables calculation
    prisma.salesInvoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'PAID'] },
      },
      select: { totalAmount: true, paidAmount: true },
    }),

    // Payables calculation
    prisma.purchaseBill.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'PAID'] },
      },
      select: { totalAmount: true, paidAmount: true },
    }),

    // Low stock items
    prisma.item.findMany({
      where: {
        businessId,
        deletedAt: null,
        trackInventory: true,
      },
      take: 10,
      orderBy: { currentStock: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStock: true,
        unit: { select: { shortName: true } },
      },
    }),

    // Top selling items
    prisma.salesInvoiceItem.groupBy({
      by: ['itemId', 'description'],
      where: {
        invoice: { businessId, deletedAt: null, status: { not: 'CANCELLED' } },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),

    // Recent Sales
    prisma.salesInvoice.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { invoiceDate: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),

    // Recent Purchases
    prisma.purchaseBill.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { billDate: 'desc' },
      take: 5,
      include: { supplier: { select: { name: true } } },
    }),
  ]);

  // Compute Receivables
  const totalReceivables = allInvoices.reduce(
    (acc, inv) => acc + Math.max(0, inv.totalAmount - inv.paidAmount),
    0
  );

  // Compute Payables
  const totalPayables = allBills.reduce(
    (acc, bill) => acc + Math.max(0, bill.totalAmount - bill.paidAmount),
    0
  );

  // Calculate Cash in Hand balance
  const cashBalance = cashAccount
    ? cashAccount.lines.reduce((acc, l) => acc + (l.debit - l.credit), 0)
    : 0;

  // Calculate Bank balance
  const bankBalance = bankAccount
    ? bankAccount.lines.reduce((acc, l) => acc + (l.debit - l.credit), 0)
    : 0;

  // Gross profit calculation
  const totalSalesVal = allSalesAgg._sum.subtotal || 0;
  const totalPurchaseVal = allPurchasesAgg._sum.subtotal || 0;
  const grossProfit = Math.max(0, totalSalesVal - totalPurchaseVal);

  // Merge recent transactions
  const combinedTransactions = [
    ...recentSales.map((s) => ({
      id: s.invoiceNumber,
      type: 'sale' as const,
      party: s.customer?.name || 'Cash Customer',
      date: s.invoiceDate.toISOString().split('T')[0],
      amount: s.totalAmount,
      status: s.status.toLowerCase(),
      createdAt: s.createdAt,
    })),
    ...recentPurchases.map((p) => ({
      id: p.billNumber,
      type: 'purchase' as const,
      party: p.supplier?.name || 'Cash Supplier',
      date: p.billDate.toISOString().split('T')[0],
      amount: p.totalAmount,
      status: p.status.toLowerCase(),
      createdAt: p.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);

  // Format low stock
  const formattedLowStock = lowStockItems
    .filter((item) => item.currentStock <= item.minStock)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku || '-',
      stock: item.currentStock,
      minStock: item.minStock,
      unit: item.unit?.shortName || 'Pcs',
    }));

  // Format top selling
  const formattedTopSelling = topSellingItemsRaw.map((item, idx) => ({
    id: item.itemId || String(idx),
    name: item.description,
    qty: item._sum.quantity || 0,
    revenue: item._sum.amount || 0,
    trend: 'up' as const,
  }));

  sendSuccess(res, {
    metrics: {
      todaySales: todaySalesAgg._sum.totalAmount || 0,
      todayPurchases: todayPurchasesAgg._sum.totalAmount || 0,
      grossProfit,
      cashInHand: cashBalance,
      bankBalance,
      receivables: totalReceivables,
      payables: totalPayables,
    },
    recentTransactions: combinedTransactions,
    lowStockItems: formattedLowStock,
    topSellingItems: formattedTopSelling,
  });
});

