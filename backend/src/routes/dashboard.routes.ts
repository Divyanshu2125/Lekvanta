import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/summary', getDashboardSummary);

export default router;

