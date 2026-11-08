import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  Search,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  IndianRupee,
  Trash2,
  Copy,
  Printer,
  Receipt,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import InvoiceFormModal from '@/components/sales/InvoiceFormModal';
import InvoicePrintModal from '@/components/sales/InvoicePrintModal';
import RecordPaymentModal from '@/components/sales/RecordPaymentModal';

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [duplicateFromInvoice, setDuplicateFromInvoice] = useState<any | null>(null);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);

  // Auto-open modal if navigating to /sales/new
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setIsCreateOpen(true);
    }
  }, [location.pathname]);

  const fetchInvoices = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('invoiceType', typeFilter);

      const res = await api.get(`/businesses/${businessId}/sales-invoices?${params.toString()}`);
      if (res.success && res.data) {
        setInvoices(res.data);
        if (res.meta) {
          setTotalInvoices(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sales invoices', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Cancel invoice with automatic stock & accounting reversal
  const handleCancelInvoice = async (inv: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to cancel Invoice ${inv.invoiceNumber}?\n\nThis will safely:\n1. Mark the invoice as CANCELLED\n2. Reverse its stock reduction in the inventory ledger\n3. Reverse its financial accounting journal entries`
    );
    if (!confirmed) return;

    try {
      const res = await api.post(`/businesses/${businessId}/sales-invoices/${inv.id}/cancel`);
      if (res.success) {
        alert(res.message || 'Invoice successfully cancelled and ledgers reversed.');
        fetchInvoices();
      } else {
        alert(res.error || res.message || 'Failed to cancel invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/sales-invoices/${id}`);
      if (res.success) {
        fetchInvoices();
      } else {
        alert(res.error || res.message || 'Failed to delete invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/businesses/${businessId}/sales-invoices/${id}`);
      if (res.success && res.data) {
        setDuplicateFromInvoice(res.data);
        setIsCreateOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch invoice for duplicate', err);
    }
  };

  // Metrics
  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const totalSalesAmount = activeInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const totalPaidAmount = activeInvoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
  const totalDueAmount = Math.max(0, totalSalesAmount - totalPaidAmount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> PARTIAL
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban size={11} /> CANCELLED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            DRAFT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            CREDIT SALE
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'TAX_INVOICE':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">GST INVOICE</span>;
      case 'BILL_OF_SUPPLY':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">BILL OF SUPPLY</span>;
      case 'RETAIL':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">RETAIL</span>;
      case 'ESTIMATE':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">ESTIMATE</span>;
      case 'QUOTATION':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">QUOTATION</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales & POS Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            GST tax invoices, retail POS billing, estimates, quotations and customer receipts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDuplicateFromInvoice(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} />
            Create Invoice / Quick Bill
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Gross Sales Value</span>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalSalesAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Payments Collected</span>
            <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totalPaidAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
            <p className="text-xl font-bold text-amber-600 mt-1 font-mono">
              {formatCurrency(totalDueAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Invoices Count</span>
            <p className="text-xl font-bold text-slate-800 mt-1">{totalInvoices}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice # or customer name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'ALL', label: 'All Invoices' },
              { id: 'TAX_INVOICE', label: 'Tax Invoices' },
              { id: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
              { id: 'RETAIL', label: 'Retail' },
              { id: 'ESTIMATE', label: 'Estimates' },
              { id: 'QUOTATION', label: 'Quotations' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  typeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'PAID', label: 'Paid' },
              { id: 'PARTIAL', label: 'Partial' },
              { id: 'SENT', label: 'Credit / Sent' },
              { id: 'DRAFT', label: 'Draft' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <FileText size={26} className="text-indigo-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No sales invoices found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Generate GST compliant sales invoices, record POS receipts, or print thermal slips.
            </p>
            <button
              onClick={() => {
                setDuplicateFromInvoice(null);
                setIsCreateOpen(true);
              }}
              className="mt-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => {
                  const due = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setPrintInvoiceId(inv.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(inv.invoiceType)}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {inv.customer?.name || 'Cash Customer'}
                        </span>
                        {inv.customer?.phone && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {inv.customer.phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(inv.taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {due > 0 ? (
                          <span className="font-semibold text-rose-600">{formatCurrency(due)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Print & View */}
                          <button
                            onClick={() => setPrintInvoiceId(inv.id)}
                            title="Print Invoice (A4 / A5 / POS 80mm / 58mm)"
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            <Printer size={14} />
                          </button>

                          {/* Record Payment */}
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              title="Record Payment"
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <IndianRupee size={14} />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={(e) => handleDuplicate(inv.id, e)}
                            title="Duplicate Invoice"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Cancel Invoice with Stock & Accounting Reversal */}
                          {inv.status !== 'CANCELLED' && (
                            <button
                              onClick={(e) => handleCancelInvoice(inv, e)}
                              title="Cancel Invoice (Reverses stock & accounting)"
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Ban size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDelete(inv.id, e)}
                            title="Delete"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({totalInvoices} invoices)
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Form Modal */}
      {isCreateOpen && (
        <InvoiceFormModal
          initialInvoice={duplicateFromInvoice}
          onClose={() => {
            setIsCreateOpen(false);
            setDuplicateFromInvoice(null);
            if (location.pathname.endsWith('/new')) navigate('/sales', { replace: true });
          }}
          onSaved={(savedInvoice, autoPrint) => {
            setIsCreateOpen(false);
            setDuplicateFromInvoice(null);
            if (location.pathname.endsWith('/new')) navigate('/sales', { replace: true });
            fetchInvoices();
            if (autoPrint && savedInvoice?.id) {
              setPrintInvoiceId(savedInvoice.id);
            }
          }}
        />
      )}

      {/* Print & Format Modal (A4, A5, 80mm, 58mm) */}
      {printInvoiceId && (
        <InvoicePrintModal
          invoiceId={printInvoiceId}
          onClose={() => setPrintInvoiceId(null)}
          onRefresh={fetchInvoices}
        />
      )}

      {/* Payment Recording Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          type="RECEIVED"
          invoiceOrBillId={paymentInvoice.id}
          partyName={paymentInvoice.customer?.name || 'Customer'}
          totalAmount={paymentInvoice.totalAmount}
          paidAmount={paymentInvoice.paidAmount}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={() => {
            setPaymentInvoice(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
