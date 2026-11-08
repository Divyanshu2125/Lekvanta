import { Router } from 'express';
import {
  getBusinessProfile,
  updateBusinessProfile,
  listUserBusinesses,
  createBusiness,
} from '../controllers/business.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBusinessSchema, updateBusinessSchema } from '../schemas';

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

export default router;

