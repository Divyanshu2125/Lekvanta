import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { category, page = '1', limit = '50', from, to } = req.query as Record<string, string>;
  const where: any = { businessId: req.businessId! };
  if (category) where.category = category;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) where.expenseDate.lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.expense.count({ where }),
  ]);

  sendSuccess(res, expenses, undefined, 200, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const data = req.body;

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: { ...data, businessId },
    });

    // Journal Entry: Expense Dr, Cash/Bank Cr
    const expenseAccount = await tx.account.findFirst({
      where: { businessId, code: '5100' },
    });
    const cashAccount = await tx.account.findFirst({
      where: { businessId, code: '1001' },
    });

    if (expenseAccount && cashAccount) {
      await tx.journalEntry.create({
        data: {
          businessId,
          entryDate: data.expenseDate,
          description: `Expense: ${data.category} - ${data.description || ''}`,
          referenceId: created.id,
          referenceType: 'Expense',
          lines: {
            create: [
              { accountId: expenseAccount.id, debit: data.amount, credit: 0 },
              { accountId: cashAccount.id, debit: 0, credit: data.amount },
            ],
          },
        },
      });
    }

    return created;
  });

  sendCreated(res, expense, 'Expense recorded');
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id, businessId: req.businessId! },
  });
  if (!existing) throw AppError.notFound('Expense not found');
  await prisma.expense.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

