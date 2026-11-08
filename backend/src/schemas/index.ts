import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Mobile number must be at least 10 digits'),
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z
    .enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'MANUFACTURING', 'SERVICES'])
    .default('RETAIL'),
  state: z.string().min(2, 'State is required'),
  address: z.string().min(3, 'Address is required'),
  gstin: z.string().optional().or(z.literal('')),
  financialYear: z.string().default('2026-2027'),
});

export const createBusinessSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  type: z.enum(['RETAIL', 'WHOLESALE', 'MANUFACTURER', 'SERVICE']).optional(),
  invoicePrefix: z.string().max(10).optional(),
  purchasePrefix: z.string().max(10).optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  openingBalance: z.coerce.number().default(0),
  creditLimit: z.coerce.number().default(0),
  notes: z.string().optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  openingBalance: z.coerce.number().default(0),
  notes: z.string().optional().or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  hsnCode: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  unitId: z.string().optional().or(z.literal('')),
  taxRateId: z.string().optional().or(z.literal('')),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  openingStock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  trackInventory: z.boolean().default(true),
});

export const updateItemSchema = createItemSchema.partial();

export const adjustStockSchema = z.object({
  adjustmentType: z.enum(['ADD', 'REDUCE']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  itemId: z.string().uuid().optional().nullable().or(z.literal('')),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  hsnCode: z.string().optional().nullable().or(z.literal('')),
  unit: z.string().optional().nullable().or(z.literal('')),
  // CGST/SGST/IGST will be computed server-side
});

export const createSalesInvoiceSchema = z.object({
  customerId: z.string().uuid().optional().nullable().or(z.literal('')),
  invoiceNumber: z.string().optional().nullable().or(z.literal('')),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  invoiceType: z
    .enum(['TAX_INVOICE', 'BILL_OF_SUPPLY', 'RETAIL', 'ESTIMATE', 'QUOTATION'])
    .default('TAX_INVOICE'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  discountAmount: z.coerce.number().min(0).default(0),
  roundOff: z.coerce.number().default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CHEQUE', 'CARD', 'NEFT', 'RTGS']).optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must have at least one item'),
  isInterState: z.boolean().default(false), // true = IGST, false = CGST+SGST
});

export const updateSalesInvoiceSchema = createSalesInvoiceSchema.partial().omit({ items: true }).extend({
  items: z.array(invoiceItemSchema).min(1).optional(),
});

const billItemSchema = z.object({
  itemId: z.string().uuid().optional().nullable().or(z.literal('')),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  hsnCode: z.string().optional().nullable().or(z.literal('')),
  unit: z.string().optional().nullable().or(z.literal('')),
});

export const createPurchaseBillSchema = z.object({
  supplierId: z.string().uuid().optional().nullable().or(z.literal('')),
  billNumber: z.string().optional().nullable().or(z.literal('')),
  billDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['DRAFT', 'RECEIVED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CHEQUE', 'CARD', 'NEFT', 'RTGS']).optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  items: z.array(billItemSchema).min(1, 'Bill must have at least one item'),
  isInterState: z.boolean().default(false),
  discountAmount: z.coerce.number().min(0).default(0),
  roundOff: z.coerce.number().default(0),
});

export const updatePurchaseBillSchema = createPurchaseBillSchema.partial().omit({ items: true }).extend({
  items: z.array(billItemSchema).min(1).optional(),
});

const paymentAllocationItemSchema = z.object({
  invoiceOrBillId: z.string(),
  amount: z.coerce.number().positive(),
});

export const createPaymentSchema = z.object({
  type: z.enum(['RECEIVED', 'MADE']),
  customerId: z.string().uuid().optional().nullable().or(z.literal('')),
  supplierId: z.string().uuid().optional().nullable().or(z.literal('')),
  salesInvoiceId: z.string().uuid().optional().nullable().or(z.literal('')),
  purchaseBillId: z.string().uuid().optional().nullable().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK', 'UPI', 'CHEQUE', 'CARD', 'NEFT', 'RTGS']).default('CASH'),
  paymentDate: z.coerce.date(),
  reference: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  allocations: z.array(paymentAllocationItemSchema).optional().nullable(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  code: z.string().optional().nullable().or(z.literal('')),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  parentId: z.string().uuid().optional().nullable().or(z.literal('')),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  expenseDate: z.coerce.date(),
  description: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CHEQUE', 'CARD']).default('CASH'),
  reference: z.string().optional(),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.coerce.date(),
  description: z.string().min(1),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        debit: z.number().min(0).default(0),
        credit: z.number().min(0).default(0),
        description: z.string().optional(),
      })
    )
    .min(2, 'Journal entry must have at least 2 lines'),
});

export const createTaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  isDefault: z.boolean().default(false),
});

export const createUnitSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
});

