import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AppError } from '../utils/AppError';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

// ── Item Listing & Queries ────────────────────────────────────────────────────

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    categoryId,
    stockStatus, // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
    sortBy = 'name',
    sortOrder = 'asc',
    page = '1',
    limit = '50',
  } = req.query as Record<string, string>;

  const businessId = req.businessId!;
  const where: any = { businessId, deletedAt: null };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { barcode: { contains: search } },
      { hsnCode: { contains: search } },
    ];
  }

  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId;
  }

  // Stock Status filters
  if (stockStatus === 'out_of_stock') {
    where.currentStock = { lte: 0 };
  } else if (stockStatus === 'in_stock') {
    where.currentStock = { gt: 0 };
  }

  // Order By
  const validSortFields = ['name', 'sellingPrice', 'purchasePrice', 'currentStock', 'createdAt'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'name';
  const orderDirection = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [rawItems, totalCount] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, shortName: true } },
        taxRate: { select: { id: true, name: true, rate: true } },
      },
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    prisma.item.count({ where }),
  ]);

  // If low_stock filter is requested, filter items where currentStock <= minStock and currentStock > 0
  let items = rawItems;
  let total = totalCount;

  if (stockStatus === 'low_stock') {
    items = rawItems.filter((i) => i.currentStock <= i.minStock && i.currentStock > 0);
    total = items.length;
  }

  // Calculate low stock total for badge notification
  const allBusinessItems = await prisma.item.findMany({
    where: { businessId, deletedAt: null },
    select: { currentStock: true, minStock: true },
  });
  const lowStockCount = allBusinessItems.filter(
    (i) => i.currentStock <= i.minStock && i.currentStock > 0
  ).length;
  const outOfStockCount = allBusinessItems.filter((i) => i.currentStock <= 0).length;

  sendSuccess(res, items, undefined, 200, {
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
    lowStockCount,
    outOfStockCount,
  } as any);
});

export const getItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.item.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
    include: {
      category: true,
      unit: true,
      taxRate: true,
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });
  if (!item) throw AppError.notFound('Item not found');
  sendSuccess(res, item);
});

// ── Create & Update Item ──────────────────────────────────────────────────────

export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const businessId = req.businessId!;

  // Clean empty foreign key strings to null
  const cleanedData = {
    ...data,
    businessId,
    categoryId: data.categoryId?.trim() || null,
    unitId: data.unitId?.trim() || null,
    taxRateId: data.taxRateId?.trim() || null,
    sku: data.sku?.trim() || null,
    barcode: data.barcode?.trim() || null,
    hsnCode: data.hsnCode?.trim() || null,
    description: data.description?.trim() || null,
    purchasePrice: Number(data.purchasePrice || 0),
    sellingPrice: Number(data.sellingPrice || 0),
    openingStock: Number(data.openingStock || 0),
    minStock: Number(data.minStock || 0),
  };

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.item.create({
      data: {
        ...cleanedData,
        currentStock: cleanedData.openingStock,
      },
      include: {
        category: true,
        unit: true,
        taxRate: true,
      },
    });

    // Record StockMovement for opening stock if > 0
    if (cleanedData.openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          itemId: created.id,
          type: 'OPENING',
          quantity: cleanedData.openingStock,
          previousStock: 0,
          newStock: cleanedData.openingStock,
          notes: 'Opening stock balance',
        },
      });
    }

    return created;
  });

  sendCreated(res, item, 'Item created successfully');
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.item.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Item not found');

  const data = req.body;
  const cleanedData = {
    ...data,
    categoryId: data.categoryId !== undefined ? data.categoryId?.trim() || null : undefined,
    unitId: data.unitId !== undefined ? data.unitId?.trim() || null : undefined,
    taxRateId: data.taxRateId !== undefined ? data.taxRateId?.trim() || null : undefined,
    sku: data.sku !== undefined ? data.sku?.trim() || null : undefined,
    barcode: data.barcode !== undefined ? data.barcode?.trim() || null : undefined,
    hsnCode: data.hsnCode !== undefined ? data.hsnCode?.trim() || null : undefined,
    description: data.description !== undefined ? data.description?.trim() || null : undefined,
    purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
    sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
    minStock: data.minStock !== undefined ? Number(data.minStock) : undefined,
  };

  // We do NOT directly change currentStock through regular update; stock must use adjustStock
  delete (cleanedData as any).currentStock;
  delete (cleanedData as any).openingStock;

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data: cleanedData,
    include: {
      category: true,
      unit: true,
      taxRate: true,
    },
  });

  sendSuccess(res, updated, 'Item updated successfully');
});

// ── Stock Adjustment with StockMovement Ledger ───────────────────────────────

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.businessId!;
  const { adjustmentType, quantity, notes } = req.body;

  const item = await prisma.item.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!item) throw AppError.notFound('Item not found');

  const qty = Number(quantity);
  const delta = adjustmentType === 'ADD' ? qty : -qty;
  const previousStock = item.currentStock;
  const newStock = previousStock + delta;

  if (newStock < 0) {
    throw AppError.badRequest(
      `Cannot reduce stock below 0. Current stock is ${previousStock}, requested reduction is ${qty}.`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update currentStock
    const updated = await tx.item.update({
      where: { id },
      data: { currentStock: newStock },
      include: { category: true, unit: true, taxRate: true },
    });

    // 2. Record immutable StockMovement ledger entry
    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        itemId: id,
        type: 'ADJUSTMENT',
        quantity: delta,
        previousStock,
        newStock,
        notes: notes || `Manual stock ${adjustmentType === 'ADD' ? 'increase' : 'decrease'} of ${qty}`,
      },
    });

    return { updated, movement };
  });

  sendSuccess(res, result, `Stock adjusted successfully. New stock: ${newStock}`);
});

export const getItemMovements = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.businessId!;

  const movements = await prisma.stockMovement.findMany({
    where: { itemId: id, businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  sendSuccess(res, movements);
});

// ── Bulk CSV Import ──────────────────────────────────────────────────────────

export const importCsvItems = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body;
  const businessId = req.businessId!;

  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest('Please provide an array of items to import.');
  }

  let importedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of items) {
      if (!row.name || typeof row.name !== 'string') continue;

      const openingStock = Number(row.openingStock || row.stock || 0);
      const created = await tx.item.create({
        data: {
          businessId,
          name: row.name.trim(),
          sku: row.sku ? String(row.sku).trim() : null,
          barcode: row.barcode ? String(row.barcode).trim() : null,
          hsnCode: row.hsnCode ? String(row.hsnCode).trim() : null,
          purchasePrice: Number(row.purchasePrice || 0),
          sellingPrice: Number(row.sellingPrice || 0),
          openingStock,
          currentStock: openingStock,
          minStock: Number(row.minStock || 0),
        },
      });

      if (openingStock > 0) {
        await tx.stockMovement.create({
          data: {
            businessId,
            itemId: created.id,
            type: 'OPENING',
            quantity: openingStock,
            previousStock: 0,
            newStock: openingStock,
            notes: 'CSV Import opening stock',
          },
        });
      }
      importedCount++;
    }
  });

  sendSuccess(res, { importedCount }, `Successfully imported ${importedCount} items.`);
});

export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.item.findFirst({
    where: { id: req.params.id, businessId: req.businessId!, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Item not found');

  await prisma.item.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  sendNoContent(res);
});

// ── Categories, Units & Tax Rates ─────────────────────────────────────────────

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const cats = await prisma.itemCategory.findMany({
    where: { businessId: req.businessId! },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, cats);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await prisma.itemCategory.create({
    data: { ...req.body, businessId: req.businessId! },
  });
  sendCreated(res, cat, 'Category created');
});

export const listUnits = asyncHandler(async (req: Request, res: Response) => {
  const units = await prisma.unit.findMany({
    where: { businessId: req.businessId! },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, units);
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await prisma.unit.create({
    data: { ...req.body, businessId: req.businessId! },
  });
  sendCreated(res, unit, 'Unit created');
});

export const listTaxRates = asyncHandler(async (req: Request, res: Response) => {
  const rates = await prisma.taxRate.findMany({
    where: { businessId: req.businessId! },
    orderBy: { rate: 'asc' },
  });
  sendSuccess(res, rates);
});

export const createTaxRate = asyncHandler(async (req: Request, res: Response) => {
  const rate = await prisma.taxRate.create({
    data: { ...req.body, businessId: req.businessId! },
  });
  sendCreated(res, rate, 'Tax rate created');
});
