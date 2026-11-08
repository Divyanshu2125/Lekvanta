import { Router } from 'express';
import {
  listSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  cancelSalesInvoice,
  deleteSalesInvoice,
} from '../controllers/sales.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSalesInvoiceSchema, updateSalesInvoiceSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listSalesInvoices);
router.post('/', validate(createSalesInvoiceSchema), createSalesInvoice);
router.get('/:id', getSalesInvoice);
router.patch('/:id', validate(updateSalesInvoiceSchema), updateSalesInvoice);
router.post('/:id/cancel', cancelSalesInvoice);
router.delete('/:id', deleteSalesInvoice);

export default router;

