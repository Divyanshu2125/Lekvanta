import { Router } from 'express';
import {
  listPayments,
  getPayment,
  createPayment,
  deletePayment,
  getOutstandingDues,
} from '../controllers/payment.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPaymentSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listPayments);
router.get('/dues', getOutstandingDues);
router.post('/', validate(createPaymentSchema), createPayment);
router.get('/:id', getPayment);
router.delete('/:id', deletePayment);

export default router;
