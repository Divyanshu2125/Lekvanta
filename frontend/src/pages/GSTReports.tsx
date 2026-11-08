import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  AlertCircle,
  TrendingUp,
  Scale,
  Receipt,
  Printer,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

type GSTTab = 'SALES_REG' | 'PURCHASE_REG' | 'TAX_SUMMARY' | 'GSTR1' | 'GSTR3B';

export default function GSTReports() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [activeTab, setActiveTab] = useState<GSTTab>('SALES_REG');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Report datasets
  const [salesRegister, setSalesRegister] = useState<any>(null);
  const [purchaseRegister, setPurchaseRegister] = useState<any>(null);
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [gstr3bData, setGstr3bData] = useState<any>(null);

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
      if (activeTab === 'SALES_REG') {
        const res = await api.get(`/businesses/${businessId}/reports/gst/sales-register?${params.toString()}`);
        if (res.success) setSalesRegister(res.data);
      } else if (activeTab === 'PURCHASE_REG') {
        const res = await api.get(`/businesses/${businessId}/reports/gst/purchase-register?${params.toString()}`);
        if (res.success) setPurchaseRegister(res.data);
      } else if (activeTab === 'TAX_SUMMARY') {
        const res = await api.get(`/businesses/${businessId}/reports/gst/tax-summary?${params.toString()}`);
        if (res.success) setTaxSummary(res.data);
      } else if (activeTab === 'GSTR1') {
        const res = await api.get(`/businesses/${businessId}/reports/gst/gstr1?${params.toString()}`);
        if (res.success) setGstr1Data(res.data);
      } else if (activeTab === 'GSTR3B') {
        const res = await api.get(`/businesses/${businessId}/reports/gst/gstr3b?${params.toString()}`);
        if (res.success) setGstr3bData(res.data);
      }
    } catch (err) {
      console.error('Failed to load GST report', err);
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
    if (activeTab === 'SALES_REG' && salesRegister?.invoices) {
      const headers = ['Invoice#', 'Date', 'Customer', 'GSTIN', 'Type', 'Taxable', 'CGST', 'SGST', 'IGST', 'Tax', 'Total'];
      const rows = salesRegister.invoices.map((i: any) => [
        i.invoiceNumber,
        formatDate(i.invoiceDate),
        i.customerName,
        i.customerGstin || '-',
        i.isB2B ? 'B2B' : 'B2C',
        i.taxableValue.toFixed(2),
        i.cgst.toFixed(2),
        i.sgst.toFixed(2),
        i.igst.toFixed(2),
        i.totalTax.toFixed(2),
        i.totalAmount.toFixed(2),
      ]);
      exportCSV(`GST_Sales_Register_${financialYear}`, headers, rows);
    } else if (activeTab === 'PURCHASE_REG' && purchaseRegister?.bills) {
      const headers = ['Bill#', 'Date', 'Supplier', 'GSTIN', 'Taxable', 'Input CGST', 'Input SGST', 'Input IGST', 'Total ITC', 'Total'];
      const rows = purchaseRegister.bills.map((b: any) => [
        b.billNumber,
        formatDate(b.billDate),
        b.supplierName,
        b.supplierGstin || '-',
        b.taxableValue.toFixed(2),
        b.cgst.toFixed(2),
        b.sgst.toFixed(2),
        b.igst.toFixed(2),
        b.totalItc.toFixed(2),
        b.totalAmount.toFixed(2),
      ]);
      exportCSV(`GST_Purchase_Register_${financialYear}`, headers, rows);
    } else if (activeTab === 'GSTR1' && gstr1Data) {
      const headers = ['Table', 'Invoice#', 'Date', 'Recipient GSTIN', 'Place of Supply', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total'];
      const b2bRows = (gstr1Data.table4_B2B?.invoices || []).map((i: any) => [
        'Table 4 (B2B)',
        i.invoiceNumber,
        formatDate(i.invoiceDate),
        i.customer?.gstin || '-',
        i.igst > 0 ? 'Inter-State' : 'Intra-State',
        i.subtotal.toFixed(2),
        i.igst.toFixed(2),
        i.cgst.toFixed(2),
        i.sgst.toFixed(2),
        i.totalAmount.toFixed(2),
      ]);
      exportCSV(`GSTR1_Preparation_${financialYear}`, headers, b2bRows);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">GST Compliance & Registers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Indian GST Sales Register, Purchase ITC Register, Tax Summary, GSTR-1 & GSTR-3B workbooks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Download size={14} />
            Export to Excel / CSV
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

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs overflow-x-auto print:hidden">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'SALES_REG', label: 'GST Sales Register', icon: FileText },
            { id: 'PURCHASE_REG', label: 'GST Purchase Register', icon: Receipt },
            { id: 'TAX_SUMMARY', label: 'GST Tax Summary', icon: Scale },
            { id: 'GSTR1', label: 'GSTR-1 Preparation', icon: TrendingUp },
            { id: 'GSTR3B', label: 'GSTR-3B Preparation', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as GSTTab)}
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

      {/* Date & Period Controls */}
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

          <span className="text-xs text-slate-400 self-end pb-2">or custom dates:</span>

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
            placeholder="Search party or voucher#..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="flex items-center gap-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-900">
        <AlertCircle size={15} className="text-indigo-600 shrink-0" />
        <span>
          Lekvanta calculates statutory GST liabilities dynamically from verified sales and purchase vouchers. Export these workbooks for reconciliation and portal filing on <strong>gst.gov.in</strong>.
        </span>
      </div>

      {/* ── TAB 1: GST SALES REGISTER ─────────────────────────────────────── */}
      {activeTab === 'SALES_REG' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Taxable Outward Value</span>
              <p className="text-base font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(salesRegister?.summary?.totalTaxable || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Central Tax (CGST)</span>
              <p className="text-base font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(salesRegister?.summary?.totalCgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">State Tax (SGST)</span>
              <p className="text-base font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(salesRegister?.summary?.totalSgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Integrated Tax (IGST)</span>
              <p className="text-base font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(salesRegister?.summary?.totalIgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Gross Sales Invoice Value</span>
              <p className="text-base font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(salesRegister?.summary?.totalAmount || 0)}
              </p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">GSTIN</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {salesRegister?.invoices
                  ?.filter((i: any) =>
                    search.trim()
                      ? i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                        i.customerName.toLowerCase().includes(search.toLowerCase()) ||
                        (i.customerGstin && i.customerGstin.toLowerCase().includes(search.toLowerCase()))
                      : true
                  )
                  .map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{inv.customerGstin || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', inv.isB2B ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700')}>
                          {inv.isB2B ? 'B2B' : 'B2C'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(inv.taxableValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(inv.igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: GST PURCHASE REGISTER ─────────────────────────────────── */}
      {activeTab === 'PURCHASE_REG' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Taxable Inward Value</span>
              <p className="text-base font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(purchaseRegister?.summary?.totalTaxable || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">ITC CGST Claimed</span>
              <p className="text-base font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(purchaseRegister?.summary?.totalInputCgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">ITC SGST Claimed</span>
              <p className="text-base font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(purchaseRegister?.summary?.totalInputSgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">ITC IGST Claimed</span>
              <p className="text-base font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(purchaseRegister?.summary?.totalInputIgst || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Total Eligible ITC</span>
              <p className="text-base font-bold font-mono text-emerald-700 mt-1">
                {formatCurrency(purchaseRegister?.summary?.totalItc || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Bill #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Supplier GSTIN</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">Input CGST</th>
                  <th className="py-2.5 px-3 text-right">Input SGST</th>
                  <th className="py-2.5 px-3 text-right">Input IGST</th>
                  <th className="py-2.5 px-3 text-right">Total Bill Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseRegister?.bills
                  ?.filter((b: any) =>
                    search.trim()
                      ? b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
                        b.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                        (b.supplierGstin && b.supplierGstin.toLowerCase().includes(search.toLowerCase()))
                      : true
                  )
                  .map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{bill.billNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(bill.billDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{bill.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{bill.supplierGstin || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(bill.taxableValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(bill.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(bill.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(bill.igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(bill.totalAmount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: TAX SUMMARY ────────────────────────────────────────────── */}
      {activeTab === 'TAX_SUMMARY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Output Tax */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Output Liability (Sales)
              </span>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Central Tax (CGST)</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(taxSummary?.outputTax?.cgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">State Tax (SGST)</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(taxSummary?.outputTax?.sgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Integrated Tax (IGST)</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(taxSummary?.outputTax?.igst || 0)}</span>
                </div>
              </div>
              <div className="pt-2 border-t-2 border-slate-200 flex justify-between font-bold text-xs text-indigo-700">
                <span>Total Output Tax</span>
                <span className="font-mono text-sm">{formatCurrency(taxSummary?.outputTax?.total || 0)}</span>
              </div>
            </div>

            {/* Input Tax Credit */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Input Tax Credit (ITC - Purchases)
              </span>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">ITC CGST</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(taxSummary?.inputTaxCredit?.cgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">ITC SGST</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(taxSummary?.inputTaxCredit?.sgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">ITC IGST</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(taxSummary?.inputTaxCredit?.igst || 0)}</span>
                </div>
              </div>
              <div className="pt-2 border-t-2 border-slate-200 flex justify-between font-bold text-xs text-emerald-700">
                <span>Total ITC Available</span>
                <span className="font-mono text-sm">{formatCurrency(taxSummary?.inputTaxCredit?.total || 0)}</span>
              </div>
            </div>

            {/* Net Tax Payable */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Net GST Payable in Cash
              </span>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Net CGST Payable</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(taxSummary?.netPayable?.cgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Net SGST Payable</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(taxSummary?.netPayable?.sgst || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Net IGST Payable</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(taxSummary?.netPayable?.igst || 0)}</span>
                </div>
              </div>
              <div className="pt-2 border-t-2 border-slate-200 flex justify-between font-bold text-xs text-rose-700">
                <span>Total Net Cash Payable</span>
                <span className="font-mono text-sm">{formatCurrency(taxSummary?.netPayable?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: GSTR-1 PREPARATION ─────────────────────────────────────── */}
      {activeTab === 'GSTR1' && (
        <div className="space-y-6">
          {/* Table 4 B2B */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  Table 4: Taxable outward supplies to registered persons (B2B)
                </h3>
                <p className="text-[11px] text-slate-500">Invoices issued to customers with valid GSTIN</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                {gstr1Data?.table4_B2B?.count || 0} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Recipient GSTIN</th>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Invoice Date</th>
                    <th className="py-2 px-3 text-right">Taxable Value</th>
                    <th className="py-2 px-3 text-right">CGST</th>
                    <th className="py-2 px-3 text-right">SGST</th>
                    <th className="py-2 px-3 text-right">IGST</th>
                    <th className="py-2 px-3 text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstr1Data?.table4_B2B?.invoices?.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{inv.customer?.gstin}</td>
                      <td className="py-2 px-3 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.sgst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(inv.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12 HSN Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-2">
              Table 12: HSN-wise summary of outward supplies
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">HSN Code</th>
                    <th className="py-2 px-3">UQC</th>
                    <th className="py-2 px-3 text-right">Total Qty</th>
                    <th className="py-2 px-3 text-right">Taxable Value</th>
                    <th className="py-2 px-3 text-right">IGST</th>
                    <th className="py-2 px-3 text-right">CGST</th>
                    <th className="py-2 px-3 text-right">SGST</th>
                    <th className="py-2 px-3 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstr1Data?.table12_HSN?.map((h: any) => (
                    <tr key={h.hsnCode}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{h.hsnCode}</td>
                      <td className="py-2 px-3">{h.uqc}</td>
                      <td className="py-2 px-3 text-right font-mono">{h.totalQty}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(h.taxableValue)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(h.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(h.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(h.sgst)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(h.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: GSTR-3B PREPARATION ────────────────────────────────────── */}
      {activeTab === 'GSTR3B' && (
        <div className="space-y-6">
          {/* Table 3.1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-2">
              3.1 Details of Outward Supplies and inward supplies liable to reverse charge
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Nature of Supply</th>
                    <th className="py-2 px-3 text-right">Total Taxable Value</th>
                    <th className="py-2 px-3 text-right">Integrated Tax</th>
                    <th className="py-2 px-3 text-right">Central Tax</th>
                    <th className="py-2 px-3 text-right">State / UT Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstr3bData?.table3_1?.map((row: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.natureOfSupply}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.taxableValue)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.sgst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4 Eligible ITC */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-2">
              4. Eligible Input Tax Credit (ITC)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Details</th>
                    <th className="py-2 px-3 text-right">Integrated Tax</th>
                    <th className="py-2 px-3 text-right">Central Tax</th>
                    <th className="py-2 px-3 text-right">State / UT Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {gstr3bData?.table4_EligibleITC?.itcAvailable?.details}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                      {formatCurrency(gstr3bData?.table4_EligibleITC?.itcAvailable?.igst || 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                      {formatCurrency(gstr3bData?.table4_EligibleITC?.itcAvailable?.cgst || 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">
                      {formatCurrency(gstr3bData?.table4_EligibleITC?.itcAvailable?.sgst || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
