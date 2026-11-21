import { Router } from 'express';
import {
  getBusinessProfile,
  updateBusinessProfile,
  listUserBusinesses,
  createBusiness,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setPrimaryBankAccount,
  listBusinessUsers,
  addBusinessUser,
  updateBusinessUser,
  removeBusinessUser,
  resetBusinessUserPassword,
} from '../controllers/business.controller';
import { authenticate, requireBusiness, requireBusinessMember, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createBusinessSchema,
  updateBusinessSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
  createBusinessUserSchema,
  updateBusinessUserSchema,
  resetUserPasswordSchema,
} from '../schemas';

const router = Router();

router.use(authenticate);

router.get('/', listUserBusinesses);
router.post('/', validate(createBusinessSchema), createBusiness);
router.get('/:businessId', requireBusiness, requireBusinessMember, getBusinessProfile);
router.patch(
  '/:businessId',
  requireBusiness,
  requireBusinessMember,
  validate(updateBusinessSchema),
  updateBusinessProfile
);

// ── Bank Accounts ─────────────────────────────────────────────────────────────
router.get('/:businessId/bank-accounts', requireBusiness, requireBusinessMember, listBankAccounts);
router.post(
  '/:businessId/bank-accounts',
  requireBusiness,
  requireBusinessMember,
  validate(createBankAccountSchema),
  createBankAccount
);
router.patch(
  '/:businessId/bank-accounts/:id',
  requireBusiness,
  requireBusinessMember,
  validate(updateBankAccountSchema),
  updateBankAccount
);
router.delete('/:businessId/bank-accounts/:id', requireBusiness, requireBusinessMember, deleteBankAccount);
router.post('/:businessId/bank-accounts/:id/set-primary', requireBusiness, requireBusinessMember, setPrimaryBankAccount);

// ── User / Team Management ───────────────────────────────────────────────────
router.get('/:businessId/users', requireBusiness, requireBusinessMember, listBusinessUsers);
router.post(
  '/:businessId/users',
  requireBusiness,
  requireBusinessMember,
  requireRole(['OWNER', 'ADMIN']),
  validate(createBusinessUserSchema),
  addBusinessUser
);
router.patch(
  '/:businessId/users/:membershipId',
  requireBusiness,
  requireBusinessMember,
  requireRole(['OWNER', 'ADMIN']),
  validate(updateBusinessUserSchema),
  updateBusinessUser
);
router.delete(
  '/:businessId/users/:membershipId',
  requireBusiness,
  requireBusinessMember,
  requireRole(['OWNER', 'ADMIN']),
  removeBusinessUser
);
router.post(
  '/:businessId/users/:membershipId/reset-password',
  requireBusiness,
  requireBusinessMember,
  requireRole(['OWNER', 'ADMIN']),
  validate(resetUserPasswordSchema),
  resetBusinessUserPassword
);

export default router;

