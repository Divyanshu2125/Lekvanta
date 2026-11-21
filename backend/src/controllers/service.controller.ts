import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

// Default Quick Services catalog for Indian shopkeepers / xerox / printing centers
const DEFAULT_SERVICES = [
  { name: 'B&W Photocopy', code: 'bw-photocopy', category: 'PHOTOCOPY', unit: 'page', price: 2, taxRate: 0, icon: '📄' },
  { name: 'Color Photocopy', code: 'color-photocopy', category: 'PHOTOCOPY', unit: 'page', price: 10, taxRate: 0, icon: '📑' },
  { name: 'B&W Printing', code: 'bw-print', category: 'PRINTING', unit: 'page', price: 5, taxRate: 0, icon: '🖨️' },
  { name: 'Color Printing', code: 'color-print', category: 'PRINTING', unit: 'page', price: 15, taxRate: 0, icon: '🎨' },
  { name: 'Photo Printing', code: 'photo-print', category: 'PHOTO', unit: 'photo', price: 30, taxRate: 18, icon: '🖼️' },
  { name: 'Passport Photo', code: 'passport-photo', category: 'PHOTO', unit: 'set', price: 60, taxRate: 18, icon: '📸' },
  { name: 'Lamination', code: 'lamination', category: 'LAMINATION', unit: 'sheet', price: 20, taxRate: 18, icon: '🛡️' },
  { name: 'Spiral Binding', code: 'spiral-binding', category: 'BINDING', unit: 'book', price: 40, taxRate: 18, icon: '📚' },
  { name: 'Scanning', code: 'scanning', category: 'SCANNING', unit: 'page', price: 10, taxRate: 18, icon: '📱' },
  { name: 'PVC Card Printing', code: 'pvc-card', category: 'PRINTING', unit: 'card', price: 80, taxRate: 18, icon: '🪪' },
  { name: 'ID Card Printing', code: 'id-card', category: 'PRINTING', unit: 'card', price: 50, taxRate: 18, icon: '🏷️' },
  { name: 'Poster Printing', code: 'poster-print', category: 'PRINTING', unit: 'poster', price: 100, taxRate: 18, icon: '🖼️' },
  { name: 'Sticker Printing', code: 'sticker-print', category: 'PRINTING', unit: 'sticker', price: 25, taxRate: 18, icon: '🏷️' },
  { name: 'Typing Services', code: 'typing-services', category: 'TYPING', unit: 'page', price: 40, taxRate: 18, icon: '✍️' },
  { name: 'Online Form Filling', code: 'online-form', category: 'ONLINE_SERVICES', unit: 'form', price: 50, taxRate: 0, icon: '🌐' },
];

export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { category, search, activeOnly } = req.query as Record<string, string>;

  const where: any = { businessId };
  if (category) where.category = category;
  if (activeOnly === 'true') where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  let services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  // If shopkeeper has no services seeded yet, automatically seed the 15 standard defaults
  if (services.length === 0 && !search && !category) {
    await prisma.$transaction(
      DEFAULT_SERVICES.map((def) =>
        prisma.service.create({
          data: {
            businessId,
            name: def.name,
            code: def.code,
            category: def.category,
            unit: def.unit,
            price: def.price,
            taxRate: def.taxRate,
            icon: def.icon,
            isActive: true,
          },
        })
      )
    );

    services = await prisma.service.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  sendSuccess(res, services);
});

export const getService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, businessId: req.businessId! },
  });
  if (!service) throw AppError.notFound('Service not found');
  sendSuccess(res, service);
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const data = req.body;

  const service = await prisma.service.create({
    data: {
      businessId,
      name: data.name,
      code: data.code || null,
      category: data.category || 'OTHER',
      unit: data.unit || 'page',
      price: data.price ?? 0,
      taxRate: data.taxRate ?? 0,
      icon: data.icon || '⚡',
      description: data.description || null,
      isActive: data.isActive ?? true,
    },
  });

  sendCreated(res, service, 'Service created successfully');
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.businessId!;
  const data = req.body;

  const existing = await prisma.service.findFirst({ where: { id, businessId } });
  if (!existing) throw AppError.notFound('Service not found');

  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      code: data.code !== undefined ? data.code : existing.code,
      category: data.category !== undefined ? data.category : existing.category,
      unit: data.unit ?? existing.unit,
      price: data.price !== undefined ? data.price : existing.price,
      taxRate: data.taxRate !== undefined ? data.taxRate : existing.taxRate,
      icon: data.icon !== undefined ? data.icon : existing.icon,
      description: data.description !== undefined ? data.description : existing.description,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
    },
  });

  sendSuccess(res, updated, 'Service updated successfully');
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.businessId!;

  const existing = await prisma.service.findFirst({ where: { id, businessId } });
  if (!existing) throw AppError.notFound('Service not found');

  await prisma.service.delete({ where: { id } });
  sendSuccess(res, null, 'Service deleted successfully');
});
