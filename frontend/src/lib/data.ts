// Sample data for the UI prototype

export const salesChartData = [
  { month: 'Apr', sales: 84000, purchases: 61000 },
  { month: 'May', sales: 96000, purchases: 74000 },
  { month: 'Jun', sales: 78000, purchases: 55000 },
  { month: 'Jul', sales: 1_10_000, purchases: 82000 },
  { month: 'Aug', sales: 1_25_000, purchases: 94000 },
  { month: 'Sep', sales: 1_08_000, purchases: 79000 },
  { month: 'Oct', sales: 1_34_000, purchases: 1_01_000 },
  { month: 'Nov', sales: 1_47_500, purchases: 1_12_000 },
];

export interface TransactionData {
  id: string;
  type: 'sale' | 'purchase';
  party: string;
  date: string;
  amount: number;
  status: string;
}

export const recentTransactions: TransactionData[] = [
  {
    id: 'INV-1042',
    type: 'sale',
    party: 'Sharma Enterprises',
    date: '02 Nov 2026',
    amount: 14750,
    status: 'paid',
  },
  {
    id: 'PUR-0318',
    type: 'purchase',
    party: 'Gupta Distributors',
    date: '02 Nov 2026',
    amount: 32400,
    status: 'unpaid',
  },
  {
    id: 'INV-1041',
    type: 'sale',
    party: 'Mehta & Sons',
    date: '01 Nov 2026',
    amount: 8600,
    status: 'paid',
  },
  {
    id: 'PUR-0317',
    type: 'purchase',
    party: 'Rajesh Traders',
    date: '01 Nov 2026',
    amount: 21900,
    status: 'partial',
  },
  {
    id: 'INV-1040',
    type: 'sale',
    party: 'Kumar Retail Pvt Ltd',
    date: '31 Oct 2026',
    amount: 5200,
    status: 'paid',
  },
  {
    id: 'INV-1039',
    type: 'sale',
    party: 'Patel Brothers',
    date: '31 Oct 2026',
    amount: 19300,
    status: 'unpaid',
  },
  {
    id: 'PUR-0316',
    type: 'purchase',
    party: 'Verma Wholesale',
    date: '30 Oct 2026',
    amount: 47600,
    status: 'paid',
  },
];

export const lowStockItems = [
  { id: 1, name: 'Samsung Galaxy M35 5G', sku: 'SAM-M35', stock: 2, minStock: 5, unit: 'Pcs' },
  { id: 2, name: 'Canon Printer Ink (Black)', sku: 'CAN-INK-B', stock: 4, minStock: 10, unit: 'Pcs' },
  { id: 3, name: 'A4 Paper Ream 500 Sheets', sku: 'PAP-A4-500', stock: 3, minStock: 20, unit: 'Pkt' },
  { id: 4, name: 'Logitech M100 Mouse', sku: 'LOG-M100', stock: 1, minStock: 5, unit: 'Pcs' },
  { id: 5, name: 'USB-C Cable 1.5m', sku: 'USB-C-15', stock: 6, minStock: 15, unit: 'Pcs' },
];

export interface TopSellingItemData {
  id: string | number;
  name: string;
  qty: number;
  revenue: number;
  trend: 'up' | 'down';
}

export const topSellingItems: TopSellingItemData[] = [
  { id: 1, name: 'iPhone 15 128GB', qty: 48, revenue: 2_40_000, trend: 'up' },
  { id: 2, name: 'JBL Flip 6 Speaker', qty: 37, revenue: 1_11_000, trend: 'up' },
  { id: 3, name: 'HP Laptop 15s', qty: 22, revenue: 1_54_000, trend: 'down' },
  { id: 4, name: 'Realme Buds Air 5', qty: 61, revenue: 73_200, trend: 'up' },
  { id: 5, name: 'Mi Power Bank 20000mAh', qty: 54, revenue: 54_000, trend: 'up' },
];

export const statCards = [
  {
    label: "Today's Sales",
    value: 47500,
    change: 12.4,
    positive: true,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50',
    iconName: 'TrendingUp',
  },
  {
    label: "Today's Purchase",
    value: 32400,
    change: -4.2,
    positive: false,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
    iconName: 'ShoppingCart',
  },
  {
    label: 'Gross Profit',
    value: 15100,
    change: 8.7,
    positive: true,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    iconName: 'BarChart2',
  },
  {
    label: 'Cash in Hand',
    value: 84200,
    change: 2.1,
    positive: true,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    iconName: 'Wallet',
  },
  {
    label: 'Receivables',
    value: 1_28_600,
    change: 5.3,
    positive: true,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    iconName: 'ArrowDownLeft',
  },
  {
    label: 'Payables',
    value: 94300,
    change: -1.8,
    positive: false,
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    iconName: 'ArrowUpRight',
  },
];

