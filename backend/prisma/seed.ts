import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Lekvanta database with realistic sample business data...');

  // 1. Create User
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'rajesh@sharmaelec.com' },
    update: {},
    create: {
      email: 'rajesh@sharmaelec.com',
      name: 'Rajesh Sharma',
      passwordHash,
    },
  });

  // 2. Create Business
  const business = await prisma.business.create({
    data: {
      name: 'Sharma Electronics Pvt. Ltd.',
      phone: '+91 98765 43210',
      email: 'contact@sharmaelectronics.in',
      gstin: '27AABCU9603R1ZM',
      address: 'Shop 14, Galaxy Commercial Complex, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      type: 'RETAIL',
      invoicePrefix: 'INV',
      purchasePrefix: 'PUR',
      invoiceCounter: 1042,
      purchaseCounter: 318,
      businessUsers: {
        create: {
          userId: user.id,
          role: 'ADMIN',
        },
      },
    },
  });

  const businessId = business.id;

  // 3. Tax Rates
  const [tax18, tax12, tax5, tax0] = await Promise.all([
    prisma.taxRate.create({ data: { businessId, name: 'GST 18%', rate: 18, isDefault: true } }),
    prisma.taxRate.create({ data: { businessId, name: 'GST 12%', rate: 12 } }),
    prisma.taxRate.create({ data: { businessId, name: 'GST 5%', rate: 5 } }),
    prisma.taxRate.create({ data: { businessId, name: 'GST 0%', rate: 0 } }),
  ]);

  // 4. Units
  const [unitPcs, unitBox, unitPkt] = await Promise.all([
    prisma.unit.create({ data: { businessId, name: 'Pieces', shortName: 'Pcs' } }),
    prisma.unit.create({ data: { businessId, name: 'Box', shortName: 'Box' } }),
    prisma.unit.create({ data: { businessId, name: 'Packet', shortName: 'Pkt' } }),
  ]);

  // 5. Categories
  const [catMobiles, catAudio, catOffice, catAccessories] = await Promise.all([
    prisma.itemCategory.create({ data: { businessId, name: 'Smartphones & Tablets' } }),
    prisma.itemCategory.create({ data: { businessId, name: 'Audio & Speakers' } }),
    prisma.itemCategory.create({ data: { businessId, name: 'Office Supplies' } }),
    prisma.itemCategory.create({ data: { businessId, name: 'Computer Accessories' } }),
  ]);

  // 6. Chart of Accounts
  const [accCash, accBank, accAR, accInventory, accAP, accSales, accCOGS, accExp] = await Promise.all([
    prisma.account.create({ data: { businessId, name: 'Cash in Hand', type: 'ASSET', code: '1001', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'HDFC Current Account', type: 'ASSET', code: '1002', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Accounts Receivable', type: 'ASSET', code: '1100', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Stock / Inventory', type: 'ASSET', code: '1200', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Accounts Payable', type: 'LIABILITY', code: '2100', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Sales Revenue', type: 'INCOME', code: '4001', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Cost of Goods Sold', type: 'EXPENSE', code: '5001', isSystem: true } }),
    prisma.account.create({ data: { businessId, name: 'Operating Expenses', type: 'EXPENSE', code: '5100', isSystem: true } }),
  ]);

  // 7. Customers
  const [custSharma, custMehta, custPatel, custKumar] = await Promise.all([
    prisma.customer.create({
      data: {
        businessId,
        name: 'Sharma Enterprises',
        phone: '+91 98200 12345',
        email: 'info@sharmaenterprises.com',
        billingAddress: '42, Industrial Area, Thane, Maharashtra',
        gstin: '27AABCS1429B1Z1',
      },
    }),
    prisma.customer.create({
      data: {
        businessId,
        name: 'Mehta & Sons',
        phone: '+91 98211 23456',
        email: 'purchase@mehtasons.in',
        billingAddress: '10, Lamington Road, Mumbai',
        gstin: '27AABCM2314K1Z4',
      },
    }),
    prisma.customer.create({
      data: {
        businessId,
        name: 'Patel Brothers',
        phone: '+91 98222 34567',
        email: 'patelbrothers@gmail.com',
        billingAddress: 'Near Station, Kalyan West',
      },
    }),
    prisma.customer.create({
      data: {
        businessId,
        name: 'Kumar Retail Pvt Ltd',
        phone: '+91 98233 45678',
        email: 'accounts@kumarretail.com',
        billingAddress: 'Andheri East, Mumbai',
        gstin: '27AABCK7890L1Z9',
      },
    }),
  ]);

  // 8. Suppliers
  const [supGupta, supRajesh, supVerma] = await Promise.all([
    prisma.supplier.create({
      data: {
        businessId,
        name: 'Gupta Distributors',
        phone: '+91 99300 11111',
        email: 'sales@guptadist.in',
        address: 'Bhiwandi Warehousing Hub, Mumbai',
        gstin: '27AABCG5544R1ZV',
      },
    }),
    prisma.supplier.create({
      data: {
        businessId,
        name: 'Rajesh Traders',
        phone: '+91 99300 22222',
        email: 'rajesh.traders@yahoo.com',
        address: 'Dadar Market, Mumbai',
        gstin: '27AABCR9988M1ZO',
      },
    }),
    prisma.supplier.create({
      data: {
        businessId,
        name: 'Verma Wholesale',
        phone: '+91 99300 33333',
        email: 'orders@vermawholesale.com',
        address: 'Vashi APMC Market, Navi Mumbai',
        gstin: '27AABCV1234N1ZT',
      },
    }),
  ]);

  // 9. Items
  const items = await Promise.all([
    prisma.item.create({
      data: {
        businessId,
        categoryId: catMobiles.id,
        unitId: unitPcs.id,
        taxRateId: tax18.id,
        name: 'iPhone 15 128GB (Black)',
        sku: 'IPH-15-128',
        barcode: '890123450001',
        hsnCode: '8517',
        purchasePrice: 62000,
        sellingPrice: 74900,
        openingStock: 15,
        currentStock: 12,
        minStock: 3,
      },
    }),
    prisma.item.create({
      data: {
        businessId,
        categoryId: catAudio.id,
        unitId: unitPcs.id,
        taxRateId: tax18.id,
        name: 'JBL Flip 6 Portable Bluetooth Speaker',
        sku: 'JBL-FLIP-6',
        barcode: '890123450002',
        hsnCode: '8518',
        purchasePrice: 6800,
        sellingPrice: 9999,
        openingStock: 25,
        currentStock: 18,
        minStock: 5,
      },
    }),
    prisma.item.create({
      data: {
        businessId,
        categoryId: catMobiles.id,
        unitId: unitPcs.id,
        taxRateId: tax18.id,
        name: 'Samsung Galaxy M35 5G',
        sku: 'SAM-M35',
        barcode: '890123450003',
        hsnCode: '8517',
        purchasePrice: 14500,
        sellingPrice: 17999,
        openingStock: 8,
        currentStock: 2,
        minStock: 5,
      },
    }),
    prisma.item.create({
      data: {
        businessId,
        categoryId: catOffice.id,
        unitId: unitPcs.id,
        taxRateId: tax18.id,
        name: 'Canon Printer Ink GI-790 (Black)',
        sku: 'CAN-INK-B',
        barcode: '890123450004',
        hsnCode: '3215',
        purchasePrice: 420,
        sellingPrice: 599,
        openingStock: 20,
        currentStock: 4,
        minStock: 10,
      },
    }),
    prisma.item.create({
      data: {
        businessId,
        categoryId: catOffice.id,
        unitId: unitPkt.id,
        taxRateId: tax12.id,
        name: 'JK Copier A4 Paper Ream 500 Sheets',
        sku: 'PAP-A4-500',
        barcode: '890123450005',
        hsnCode: '4802',
        purchasePrice: 240,
        sellingPrice: 320,
        openingStock: 40,
        currentStock: 3,
        minStock: 20,
      },
    }),
    prisma.item.create({
      data: {
        businessId,
        categoryId: catAccessories.id,
        unitId: unitPcs.id,
        taxRateId: tax18.id,
        name: 'Logitech M100 Optical USB Mouse',
        sku: 'LOG-M100',
        barcode: '890123450006',
        hsnCode: '8471',
        purchasePrice: 280,
        sellingPrice: 450,
        openingStock: 15,
        currentStock: 1,
        minStock: 5,
      },
    }),
  ]);

  // 10. Sample Sales Invoices
  const now = new Date();
  await prisma.salesInvoice.create({
    data: {
      businessId,
      customerId: custSharma.id,
      invoiceNumber: 'INV-1042',
      invoiceDate: now,
      status: 'PAID',
      subtotal: 12500,
      cgst: 1125,
      sgst: 1125,
      taxAmount: 2250,
      totalAmount: 14750,
      paidAmount: 14750,
      items: {
        create: [
          {
            itemId: items[1].id,
            description: 'JBL Flip 6 Portable Bluetooth Speaker',
            quantity: 1,
            unitPrice: 9999,
            taxRate: 18,
            cgst: 899.91,
            sgst: 899.91,
            amount: 11798.82,
          },
        ],
      },
    },
  });

  await prisma.salesInvoice.create({
    data: {
      businessId,
      customerId: custMehta.id,
      invoiceNumber: 'INV-1041',
      invoiceDate: new Date(Date.now() - 86400000),
      status: 'PAID',
      subtotal: 7288,
      cgst: 656,
      sgst: 656,
      taxAmount: 1312,
      totalAmount: 8600,
      paidAmount: 8600,
      items: {
        create: [
          {
            itemId: items[3].id,
            description: 'Canon Printer Ink GI-790',
            quantity: 12,
            unitPrice: 599,
            taxRate: 18,
            cgst: 646.92,
            sgst: 646.92,
            amount: 8481.84,
          },
        ],
      },
    },
  });

  // 11. Sample Purchase Bills
  await prisma.purchaseBill.create({
    data: {
      businessId,
      supplierId: supGupta.id,
      billNumber: 'PUR-0318',
      billDate: now,
      status: 'RECEIVED',
      subtotal: 27457,
      cgst: 2471.5,
      sgst: 2471.5,
      taxAmount: 4943,
      totalAmount: 32400,
      paidAmount: 0,
      items: {
        create: [
          {
            itemId: items[2].id,
            description: 'Samsung Galaxy M35 5G',
            quantity: 2,
            unitPrice: 14500,
            taxRate: 18,
            cgst: 2610,
            sgst: 2610,
            amount: 34220,
          },
        ],
      },
    },
  });

  // 12. Sample Cash & Bank Journal lines (Opening Balances)
  await prisma.journalEntry.create({
    data: {
      businessId,
      entryDate: now,
      description: 'Opening Cash & Bank Balance',
      referenceType: 'Manual',
      lines: {
        create: [
          { accountId: accCash.id, debit: 84200, credit: 0, description: 'Cash in hand' },
          { accountId: accBank.id, debit: 250000, credit: 0, description: 'HDFC Bank' },
          { accountId: accInventory.id, debit: 185000, credit: 0, description: 'Opening Stock' },
          { accountId: accSales.id, debit: 0, credit: 519200, description: "Capital / Owner's Equity" },
        ],
      },
    },
  });

  console.log('✅ Lekvanta database seeded successfully!');
  console.log('🔑 Admin login: rajesh@sharmaelec.com | Password@123');
  console.log(`🏢 Business ID: ${businessId}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

