import { Router } from 'express';
import {
  getChartOfAccounts,
  createAccount,
  listJournalEntries,
  createManualJournalEntry,
  getGeneralLedger,
  getCashBook,
  getBankBook,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getAccountsReceivable,
  getAccountsPayable,
} from '../controllers/accounting.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createJournalEntrySchema, createAccountSchema } from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

router.get('/accounts', getChartOfAccounts);
router.post('/accounts', validate(createAccountSchema), createAccount);

router.get('/journal-entries', listJournalEntries);
router.post('/journal-entries', validate(createJournalEntrySchema), createManualJournalEntry);

router.get('/general-ledger', getGeneralLedger);
router.get('/cash-book', getCashBook);
router.get('/bank-book', getBankBook);
router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitAndLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/receivables', getAccountsReceivable);
router.get('/payables', getAccountsPayable);

export default router;
