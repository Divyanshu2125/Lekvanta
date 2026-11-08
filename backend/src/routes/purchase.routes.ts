import { Router } from 'express';
import {
  listPurchaseBills,
  getPurchaseBill,
  createPurchaseBill,
  updatePurchaseBill,
  cancelPurchaseBill,
  deletePurchaseBill,
} from '../controllers/purchase.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPurchaseBillSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listPurchaseBills);
router.post('/', validate(createPurchaseBillSchema), createPurchaseBill);
router.get('/:id', getPurchaseBill);
router.patch('/:id', updatePurchaseBill);
router.post('/:id/cancel', cancelPurchaseBill);
router.delete('/:id', deletePurchaseBill);

export default router;
