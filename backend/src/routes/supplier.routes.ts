import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSupplierSchema, updateSupplierSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listSuppliers);
router.post('/', validate(createSupplierSchema), createSupplier);
router.get('/:id', getSupplier);
router.patch('/:id', validate(updateSupplierSchema), updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;

