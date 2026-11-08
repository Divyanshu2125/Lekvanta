import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import customerRoutes from './customer.routes';
import supplierRoutes from './supplier.routes';
import itemRoutes from './item.routes';
import salesRoutes from './sales.routes';
import purchaseRoutes from './purchase.routes';
import paymentRoutes from './payment.routes';
import expenseRoutes from './expense.routes';
import accountingRoutes from './accounting.routes';
import dashboardRoutes from './dashboard.routes';
import reportsRoutes from './reports.routes';

const router = Router();

// Public routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Business routes
router.use('/businesses', businessRoutes);

// Nested business-scoped routes: /api/businesses/:businessId/*
router.use('/businesses/:businessId/customers', customerRoutes);
router.use('/businesses/:businessId/suppliers', supplierRoutes);
router.use('/businesses/:businessId/items', itemRoutes);
router.use('/businesses/:businessId/sales', salesRoutes);
router.use('/businesses/:businessId/sales-invoices', salesRoutes);
router.use('/businesses/:businessId/purchases', purchaseRoutes);
router.use('/businesses/:businessId/purchase-bills', purchaseRoutes);
router.use('/businesses/:businessId/payments', paymentRoutes);
router.use('/businesses/:businessId/expenses', expenseRoutes);
router.use('/businesses/:businessId/accounting', accountingRoutes);
router.use('/businesses/:businessId/dashboard', dashboardRoutes);
router.use('/businesses/:businessId/reports', reportsRoutes);

export default router;

