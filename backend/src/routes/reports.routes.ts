import { Router } from 'express';
import {
  getGSTSalesRegister,
  getGSTPurchaseRegister,
  getGSTTaxSummary,
  getGSTR1Report,
  getGSTR3BReport,
  getDailySalesReport,
  getMonthlySalesReport,
  getPurchaseSummaryReport,
  getStockValuationReport,
  getLowStockReport,
  getCashFlowReport,
} from '../controllers/reports.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

// GST Reports
router.get('/gst/sales-register', getGSTSalesRegister);
router.get('/gst/purchase-register', getGSTPurchaseRegister);
router.get('/gst/tax-summary', getGSTTaxSummary);
router.get('/gst/gstr1', getGSTR1Report);
router.get('/gst/gstr3b', getGSTR3BReport);

// Business Analytics & Reports
router.get('/business/daily-sales', getDailySalesReport);
router.get('/business/monthly-sales', getMonthlySalesReport);
router.get('/business/purchase-summary', getPurchaseSummaryReport);
router.get('/business/stock-valuation', getStockValuationReport);
router.get('/business/low-stock', getLowStockReport);
router.get('/business/cash-flow', getCashFlowReport);

export default router;

