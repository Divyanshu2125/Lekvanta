import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

export const getBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await prisma.business.findUnique({
    where: { id: req.businessId! },
    include: {
      bankAccounts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!business) throw AppError.notFound('Business not found');
  sendSuccess(res, business);
});

export const updateBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await prisma.business.update({
    where: { id: req.businessId! },
    data: req.body,
    include: {
      bankAccounts: {
        where: { deletedAt: null },
      },
    },
  });
  sendSuccess(res, business, 'Business profile updated successfully');
});

export const listUserBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const memberships = await prisma.businessUser.findMany({
    where: { userId: req.user!.userId, status: 'ACTIVE' },
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
          create: { userId, role: 'OWNER', status: 'ACTIVE' },
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

// ── Bank Accounts Management ──────────────────────────────────────────────────

export const listBankAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await prisma.bankAccount.findMany({
    where: { businessId: req.businessId!, deletedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  });
  sendSuccess(res, accounts);
});

export const createBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { accountHolder, bankName, accountNumber, ifscCode, branchName, accountType, upiId, qrCodeUrl, isPrimary } = req.body;

  const count = await prisma.bankAccount.count({ where: { businessId, deletedAt: null } });
  const shouldBePrimary = isPrimary || count === 0;

  if (shouldBePrimary) {
    await prisma.bankAccount.updateMany({
      where: { businessId },
      data: { isPrimary: false },
    });
  }

  const account = await prisma.bankAccount.create({
    data: {
      businessId,
      accountHolder,
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      branchName: branchName || null,
      accountType: accountType || 'CURRENT',
      upiId: upiId || null,
      qrCodeUrl: qrCodeUrl || null,
      isPrimary: shouldBePrimary,
    },
  });

  sendCreated(res, account, 'Bank account added successfully');
});

export const updateBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const id = req.params.id;

  const existing = await prisma.bankAccount.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Bank account not found');

  if (req.body.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: { businessId },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...req.body,
      ifscCode: req.body.ifscCode ? req.body.ifscCode.toUpperCase() : undefined,
    },
  });

  sendSuccess(res, updated, 'Bank account updated successfully');
});

export const deleteBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const id = req.params.id;

  const existing = await prisma.bankAccount.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Bank account not found');

  await prisma.bankAccount.update({
    where: { id },
    data: { deletedAt: new Date(), isPrimary: false },
  });

  // If deleted account was primary, set another active account as primary
  if (existing.isPrimary) {
    const nextAccount = await prisma.bankAccount.findFirst({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (nextAccount) {
      await prisma.bankAccount.update({
        where: { id: nextAccount.id },
        data: { isPrimary: true },
      });
    }
  }

  sendSuccess(res, null, 'Bank account removed successfully');
});

export const setPrimaryBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const id = req.params.id;

  const existing = await prisma.bankAccount.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Bank account not found');

  await prisma.bankAccount.updateMany({
    where: { businessId },
    data: { isPrimary: false },
  });

  const updated = await prisma.bankAccount.update({
    where: { id },
    data: { isPrimary: true },
  });

  sendSuccess(res, updated, 'Primary bank account updated');
});

// ── User / Team Members Management ───────────────────────────────────────────

export const listBusinessUsers = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const members = await prisma.businessUser.findMany({
    where: { businessId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profilePhoto: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  sendSuccess(
    res,
    members.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      profilePhoto: m.user.profilePhoto,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    }))
  );
});

export const addBusinessUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const { name, email, phone, password, role, status } = req.body;

  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    // Check if already in business
    const existingMembership = await prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });
    if (existingMembership) {
      throw AppError.badRequest('This user is already a member of this business.');
    }
  } else {
    // Create new user account
    const passwordHash = await bcrypt.hash(password || 'Lekvanta@123', 10);
    user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        passwordHash,
      },
    });
  }

  const membership = await prisma.businessUser.create({
    data: {
      businessId,
      userId: user.id,
      role: role || 'CASHIER',
      status: status || 'ACTIVE',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
    },
  });

  sendCreated(
    res,
    {
      membershipId: membership.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.createdAt,
    },
    'Team member added successfully'
  );
});

export const updateBusinessUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const membershipId = req.params.membershipId;
  const { role, status, name, phone } = req.body;

  const membership = await prisma.businessUser.findFirst({
    where: { id: membershipId, businessId },
  });
  if (!membership) throw AppError.notFound('Member not found in this business');

  // Prevent demoting the last owner
  if (membership.role === 'OWNER' && role && role !== 'OWNER') {
    const ownerCount = await prisma.businessUser.count({
      where: { businessId, role: 'OWNER', status: 'ACTIVE' },
    });
    if (ownerCount <= 1) {
      throw AppError.badRequest('Cannot change role of the sole business Owner.');
    }
  }

  const updatedMembership = await prisma.businessUser.update({
    where: { id: membershipId },
    data: {
      role: role || undefined,
      status: status || undefined,
    },
  });

  if (name || phone !== undefined) {
    await prisma.user.update({
      where: { id: membership.userId },
      data: {
        name: name || undefined,
        phone: phone !== undefined ? phone : undefined,
      },
    });
  }

  const updated = await prisma.businessUser.findUnique({
    where: { id: membershipId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  sendSuccess(
    res,
    {
      membershipId: updated!.id,
      userId: updated!.user.id,
      name: updated!.user.name,
      email: updated!.user.email,
      phone: updated!.user.phone,
      role: updated!.role,
      status: updated!.status,
    },
    'Member details updated'
  );
});

export const removeBusinessUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const membershipId = req.params.membershipId;

  const membership = await prisma.businessUser.findFirst({
    where: { id: membershipId, businessId },
  });
  if (!membership) throw AppError.notFound('Member not found');

  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.businessUser.count({
      where: { businessId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw AppError.badRequest('Cannot remove the sole business Owner.');
    }
  }

  await prisma.businessUser.delete({
    where: { id: membershipId },
  });

  sendSuccess(res, null, 'Member removed from business');
});

export const resetBusinessUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.businessId!;
  const membershipId = req.params.membershipId;
  const { newPassword } = req.body;

  const membership = await prisma.businessUser.findFirst({
    where: { id: membershipId, businessId },
  });
  if (!membership) throw AppError.notFound('Member not found');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: membership.userId },
    data: { passwordHash },
  });

  sendSuccess(res, null, 'Password reset successfully');
});

