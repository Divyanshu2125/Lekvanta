import { Router } from 'express';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expense.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createExpenseSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/', listExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.delete('/:id', deleteExpense);

export default router;

