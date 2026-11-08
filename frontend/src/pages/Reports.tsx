import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Search,
  DollarSign,
  Package,
  Users,
  Building2,
  Coins,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

type BusinessTab =
  | 'DAILY_SALES'
  | 'MONTHLY_SALES'
  | 'PURCHASES'
  | 'PROFIT_ANALYSIS'
  | 'STOCK_VALUATION'
  | 'LOW_STOCK'
  | 'CUSTOMER_DUES'
  | 'SUPPLIER_DUES'
  | 'CASH_FLOW';

export default function Reports() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [activeTab, setActiveTab] = useState<BusinessTab>('DAILY_SALES');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Datasets
  const [dailySales, setDailySales] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState<any>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<any>(null);
  const [profitAnalysis, setProfitAnalysis] = useState<any>(null);
  const [stockValuation, setStockValuation] = useState<any>(null);
  const [lowStockData, setLowStockData] = useState<any>(null);
  const [customerDues, setCustomerDues] = useState<any>(null);
  const [supplierDues, setSupplierDues] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);

  const fetchReport = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (fromDate && toDate) {
      params.append('from', fromDate);
      params.append('to', toDate);
    } else if (financialYear) {
      params.append('financialYear', financialYear);
    }

    try {
      if (activeTab === 'DAILY_SALES') {
        const res = await api.get(`/businesses/${businessId}/reports/business/daily-sales?${params.toString()}`);
        if (res.success) setDailySales(res.data);
      } else if (activeTab === 'MONTHLY_SALES') {
        const res = await api.get(`/businesses/${businessId}/reports/business/monthly-sales?${params.toString()}`);
        if (res.success) setMonthlySales(res.data);
      } else if (activeTab === 'PURCHASES') {
        const res = await api.get(`/businesses/${businessId}/reports/business/purchase-summary?${params.toString()}`);
        if (res.success) setPurchaseSummary(res.data);
      } else if (activeTab === 'PROFIT_ANALYSIS') {
        const res = await api.get(`/businesses/${businessId}/accounting/profit-loss?${params.toString()}`);
        if (res.success) setProfitAnalysis(res.data);
      } else if (activeTab === 'STOCK_VALUATION') {
        const res = await api.get(`/businesses/${businessId}/reports/business/stock-valuation`);
        if (res.success) setStockValuation(res.data);
      } else if (activeTab === 'LOW_STOCK') {
        const res = await api.get(`/businesses/${businessId}/reports/business/low-stock`);
        if (res.success) setLowStockData(res.data);
      } else if (activeTab === 'CUSTOMER_DUES') {
        const res = await api.get(`/businesses/${businessId}/accounting/receivables`);
        if (res.success) setCustomerDues(res.data);
      } else if (activeTab === 'SUPPLIER_DUES') {
        const res = await api.get(`/businesses/${businessId}/accounting/payables`);
        if (res.success) setSupplierDues(res.data);
      } else if (activeTab === 'CASH_FLOW') {
        const res = await api.get(`/businesses/${businessId}/reports/business/cash-flow?${params.toString()}`);
        if (res.success) setCashFlowData(res.data);
      }
    } catch (err) {
      console.error('Failed to load business report', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, activeTab, financialYear, fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeTab === 'DAILY_SALES' && dailySales?.days) {
      const headers = ['Date', 'Invoices Count', 'Taxable Sales', 'Tax', 'Total Sales', 'Collected', 'Due'];
      const rows = dailySales.days.map((d: any) => [
        d.date,
        d.invoiceCount,
        d.taxable.toFixed(2),
        d.tax.toFixed(2),
        d.totalSales.toFixed(2),
        d.totalCollected.toFixed(2),
        d.balanceDue.toFixed(2),
      ]);
      exportCSV(`Daily_Sales_${financialYear}`, headers, rows);
    } else if (activeTab === 'STOCK_VALUATION' && stockValuation?.items) {
      const headers = ['SKU', 'Item Name', 'Category', 'Stock Qty', 'Unit', 'Purchase Rate', 'Selling Price', 'Cost Valuation', 'Retail Valuation'];
      const rows = stockValuation.items.map((it: any) => [
        it.sku || '-',
        it.name,
        it.category,
        it.currentStock,
        it.unit,
        it.purchasePrice.toFixed(2),
        it.sellingPrice.toFixed(2),
        it.costValuation.toFixed(2),
        it.retailValuation.toFixed(2),
      ]);
      exportCSV(`Stock_Valuation_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else if (activeTab === 'PURCHASES' && purchaseSummary?.bills) {
      const headers = ['Bill#', 'Date', 'Supplier', 'Taxable', 'Tax Amount', 'Total Bill', 'Paid', 'Due', 'Status'];
      const rows = purchaseSummary.bills.map((b: any) => [
        b.billNumber,
        formatDate(b.billDate),
        b.supplier?.name || 'Cash Vendor',
        b.subtotal.toFixed(2),
        b.taxAmount.toFixed(2),
        b.totalAmount.toFixed(2),
        b.paidAmount.toFixed(2),
        Math.max(0, b.totalAmount - b.paidAmount).toFixed(2),
        b.status,
      ]);
      exportCSV(`Purchase_Summary_${financialYear}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Intelligence & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational sales performance, inventory valuation, profitability & working capital analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Download size={14} />
            Export to Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs overflow-x-auto print:hidden">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'DAILY_SALES', label: 'Daily Sales', icon: Calendar },
            { id: 'MONTHLY_SALES', label: 'Monthly Sales', icon: BarChart2 },
            { id: 'PURCHASES', label: 'Purchase Summary', icon: Layers },
            { id: 'PROFIT_ANALYSIS', label: 'Gross & Net Profit', icon: TrendingUp },
            { id: 'STOCK_VALUATION', label: 'Stock Valuation', icon: Package },
            { id: 'LOW_STOCK', label: 'Low Stock Alerts', icon: AlertTriangle },
            { id: 'CUSTOMER_DUES', label: 'Customer Dues (AR)', icon: Users },
            { id: 'SUPPLIER_DUES', label: 'Supplier Dues (AP)', icon: Building2 },
            { id: 'CASH_FLOW', label: 'Cash Flow Analysis', icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as BusinessTab)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Financial Year</label>
            <select
              value={financialYear}
              onChange={(e) => {
                setFinancialYear(e.target.value);
                setFromDate('');
                setToDate('');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="2026-2027">FY 2026-2027</option>
              <option value="2025-2026">FY 2025-2026</option>
              <option value="2024-2025">FY 2024-2025</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 self-end pb-2">or dates:</span>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report lines..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* ── TAB 1: DAILY SALES ────────────────────────────────────────────── */}
      {activeTab === 'DAILY_SALES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Sales Volume</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(dailySales?.totalSales || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Invoices Issued</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {dailySales?.totalInvoices || 0} Bills
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Amount Collected</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(dailySales?.totalCollected || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Balance Pending</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(dailySales?.totalDue || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Sales Date</th>
                  <th className="py-2.5 px-4 text-center">Bills Count</th>
                  <th className="py-2.5 px-4 text-right">Taxable Turnover</th>
                  <th className="py-2.5 px-4 text-right">GST Collected</th>
                  <th className="py-2.5 px-4 text-right">Total Daily Sales</th>
                  <th className="py-2.5 px-4 text-right">Amount Received</th>
                  <th className="py-2.5 px-4 text-right">Credit / Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dailySales?.days?.map((d: any) => (
                  <tr key={d.date} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{formatDate(d.date)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                        {d.invoiceCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(d.taxable)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatCurrency(d.tax)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(d.totalSales)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">{formatCurrency(d.totalCollected)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-semibold">{formatCurrency(d.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONTHLY SALES ──────────────────────────────────────────── */}
      {activeTab === 'MONTHLY_SALES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-right">Taxable Turnover</th>
                  <th className="py-3 px-4 text-right">Tax Value</th>
                  <th className="py-3 px-4 text-right">Gross Sales Turnover</th>
                  <th className="py-3 px-4 text-right">Amount Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {monthlySales?.months?.map((m: any) => (
                  <tr key={m.month} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.label}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                        {m.count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(m.taxable)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(m.tax)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700 text-sm">{formatCurrency(m.total)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600">{formatCurrency(m.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PURCHASE SUMMARY ───────────────────────────────────────── */}
      {activeTab === 'PURCHASES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Purchases</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(purchaseSummary?.totalPurchases || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Purchase Bills</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {purchaseSummary?.billCount || 0} Bills
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Amount Paid</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(purchaseSummary?.totalPaid || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Balance Payable</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(purchaseSummary?.totalDue || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Bill #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4 text-right">Taxable</th>
                  <th className="py-2.5 px-4 text-right">Tax Amount</th>
                  <th className="py-2.5 px-4 text-right">Total Bill</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                  <th className="py-2.5 px-4 text-right">Due</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseSummary?.bills
                  ?.filter((b: any) =>
                    search.trim()
                      ? b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
                        b.supplier?.name?.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.billNumber}</td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(b.billDate)}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{b.supplier?.name || 'Cash Vendor'}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(b.subtotal)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatCurrency(b.taxAmount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(b.totalAmount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600">{formatCurrency(b.paidAmount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-semibold">
                        {formatCurrency(Math.max(0, b.totalAmount - b.paidAmount))}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          b.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                          b.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        )}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: PROFIT ANALYSIS ────────────────────────────────────────── */}
      {activeTab === 'PROFIT_ANALYSIS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Sales Revenue</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(profitAnalysis?.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Profit (Margin)</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(profitAnalysis?.grossProfit || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Net Period Profit</span>
              <p
                className={cn(
                  'text-xl font-bold font-mono mt-1',
                  (profitAnalysis?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                )}
              >
                {formatCurrency(profitAnalysis?.netProfit || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Profit & Loss Financial Equation
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="font-semibold text-slate-800">(+) Total Revenue & Inflows</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatCurrency(profitAnalysis?.totalRevenue || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="font-semibold text-slate-800">(-) Cost of Goods Sold (Purchases / Stock Inward)</span>
                <span className="font-mono text-rose-600">
                  -{formatCurrency(profitAnalysis?.totalCOGS || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-50 px-3 rounded-xl font-bold text-slate-900">
                <span>(=) Gross Profit</span>
                <span className="font-mono text-indigo-600">
                  {formatCurrency(profitAnalysis?.grossProfit || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="font-semibold text-slate-800">(-) Total Operating & Overhead Expenses</span>
                <span className="font-mono text-rose-600">
                  -{formatCurrency(profitAnalysis?.totalOperatingExpenses || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-200 text-sm font-black text-slate-900">
                <span>(=) Net Operating Profit</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(profitAnalysis?.netProfit || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: STOCK VALUATION ────────────────────────────────────────── */}
      {activeTab === 'STOCK_VALUATION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Catalog Items</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {stockValuation?.totalItems || 0} Products
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Valuation at Cost (Purchase Price)</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(stockValuation?.totalCostValuation || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Valuation at Retail (Selling Price)</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(stockValuation?.totalRetailValuation || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Unrealized Potential Margin</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(stockValuation?.potentialGrossProfit || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Stock Qty</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Sale Price</th>
                  <th className="py-2.5 px-3 text-right">Cost Valuation</th>
                  <th className="py-2.5 px-3 text-right">Retail Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockValuation?.items
                  ?.filter((it: any) =>
                    search.trim()
                      ? it.name.toLowerCase().includes(search.toLowerCase()) ||
                        (it.sku && it.sku.toLowerCase().includes(search.toLowerCase()))
                      : true
                  )
                  .map((it: any) => (
                    <tr key={it.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{it.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{it.sku || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{it.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {it.currentStock} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.purchasePrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.sellingPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        {formatCurrency(it.costValuation)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(it.retailValuation)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: LOW STOCK ──────────────────────────────────────────────── */}
      {activeTab === 'LOW_STOCK' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Items Below Minimum Threshold</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {lowStockData?.count || 0} Products Need Reordering
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500">Estimated Reorder Capital</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(lowStockData?.totalReorderCost || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Current Stock</th>
                  <th className="py-2.5 px-4 text-right">Min Stock</th>
                  <th className="py-2.5 px-4 text-right">Shortage</th>
                  <th className="py-2.5 px-4 text-right">Est. Reorder Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {lowStockData?.lowStockItems?.map((it: any) => (
                  <tr key={it.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{it.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{it.sku || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{it.category}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                      {it.currentStock} {it.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{it.minStock}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600">
                      {it.reorderShortage} {it.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.estimatedReorderCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: CUSTOMER DUES (AR) ─────────────────────────────────────── */}
      {activeTab === 'CUSTOMER_DUES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Customer Receivables</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(customerDues?.totalOutstandingReceivable || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">Phone / GSTIN</th>
                  <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Total Collected</th>
                  <th className="py-2.5 px-4 text-center">Unpaid Bills</th>
                  <th className="py-2.5 px-4 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customerDues?.customers?.map((c: any) => (
                  <tr key={c.customerId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{c.customerName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{c.phone || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(c.totalInvoiced)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">{formatCurrency(c.totalPaid)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                        {c.pendingInvoicesCount} Invoices
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(c.currentOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 8: SUPPLIER DUES (AP) ─────────────────────────────────────── */}
      {activeTab === 'SUPPLIER_DUES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Supplier Payables</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(supplierDues?.totalPendingPayable || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Building2 size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Supplier Name</th>
                  <th className="py-2.5 px-4">Phone / GSTIN</th>
                  <th className="py-2.5 px-4 text-right">Total Purchased</th>
                  <th className="py-2.5 px-4 text-right">Total Disbursed</th>
                  <th className="py-2.5 px-4 text-center">Pending Bills</th>
                  <th className="py-2.5 px-4 text-right">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {supplierDues?.suppliers?.map((s: any) => (
                  <tr key={s.supplierId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{s.supplierName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{s.phone || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(s.totalPurchased)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">{formatCurrency(s.totalPaid)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                        {s.pendingBillsCount} Bills
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(s.currentPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 9: CASH FLOW ANALYSIS ─────────────────────────────────────── */}
      {activeTab === 'CASH_FLOW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Monetary Inflows</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                +{formatCurrency(cashFlowData?.totalInflow || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Monetary Outflows</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                -{formatCurrency(cashFlowData?.totalOutflow || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Net Operational Cash Flow</span>
              <p
                className={cn(
                  'text-xl font-bold font-mono mt-1',
                  (cashFlowData?.netCashFlow || 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'
                )}
              >
                {formatCurrency(cashFlowData?.netCashFlow || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Cash Flow Breakdown
            </h3>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-700">Customer Receipts & Cash Inflows ({cashFlowData?.receiptsCount || 0} transactions)</span>
              <span className="font-mono font-bold text-emerald-600">+{formatCurrency(cashFlowData?.totalCustomerReceipts || 0)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-700">Supplier Settlements & Payouts ({cashFlowData?.payoutsCount || 0} transactions)</span>
              <span className="font-mono text-rose-600">-{formatCurrency(cashFlowData?.totalSupplierPayouts || 0)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-700">Direct Business Expenses ({cashFlowData?.expensesCount || 0} vouchers)</span>
              <span className="font-mono text-rose-600">-{formatCurrency(cashFlowData?.totalDirectExpenses || 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-slate-200 font-extrabold text-sm text-slate-900">
              <span>Net Period Cash Flow</span>
              <span className="font-mono text-indigo-700">{formatCurrency(cashFlowData?.netCashFlow || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
