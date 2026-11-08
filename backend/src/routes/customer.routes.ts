import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listCustomers);
router.post('/', validate(createCustomerSchema), createCustomer);
router.get('/:id', getCustomer);
router.patch('/:id', validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;

