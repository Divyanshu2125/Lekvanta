import { Router } from 'express';
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller';
import { authenticate, requireBusiness, requireBusinessMember, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createServiceSchema, updateServiceSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireBusiness);
router.use(requireBusinessMember);

router.get('/', listServices);
router.get('/:id', getService);
router.post('/', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(createServiceSchema), createService);
router.put('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(updateServiceSchema), updateService);
router.delete('/:id', requireRole(['OWNER', 'ADMIN']), deleteService);

export default router;
