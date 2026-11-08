import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

export const getBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await prisma.business.findUnique({
    where: { id: req.businessId! },
  });
  if (!business) throw AppError.notFound('Business not found');
  sendSuccess(res, business);
});

export const updateBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await prisma.business.update({
    where: { id: req.businessId! },
    data: req.body,
  });
  sendSuccess(res, business, 'Business profile updated');
});

export const listUserBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const memberships = await prisma.businessUser.findMany({
    where: { userId: req.user!.userId },
    include: {
      business: true,
    },
  });

  sendSuccess(
    res,
    memberships.map((m) => ({
      ...m.business,
      role: m.role,
    }))
  );
});

export const createBusiness = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        ...req.body,
        businessUsers: {
          create: { userId, role: 'ADMIN' },
        },
      },
    });

    // Seed default accounts, tax rates, units
    await tx.taxRate.createMany({
      data: [
        { businessId: b.id, name: 'GST 0%', rate: 0 },
        { businessId: b.id, name: 'GST 5%', rate: 5 },
        { businessId: b.id, name: 'GST 12%', rate: 12 },
        { businessId: b.id, name: 'GST 18%', rate: 18, isDefault: true },
        { businessId: b.id, name: 'GST 28%', rate: 28 },
      ],
    });

    await tx.unit.createMany({
      data: [
        { businessId: b.id, name: 'Pieces', shortName: 'Pcs' },
        { businessId: b.id, name: 'Kilograms', shortName: 'Kg' },
        { businessId: b.id, name: 'Box', shortName: 'Box' },
        { businessId: b.id, name: 'Nos', shortName: 'Nos' },
      ],
    });

    return b;
  });

  sendCreated(res, business, 'Business created successfully');
});

