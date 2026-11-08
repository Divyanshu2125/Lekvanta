import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  IndianRupee,
  Trash2,
  Copy,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import BillFormModal from '@/components/purchases/BillFormModal';
import BillDetailModal from '@/components/purchases/BillDetailModal';
import BillPrintModal from '@/components/purchases/BillPrintModal';
import RecordPaymentModal from '@/components/sales/RecordPaymentModal';

export default function Purchases() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [duplicateFromBill, setDuplicateFromBill] = useState<any | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [printBillId, setPrintBillId] = useState<string | null>(null);
  const [paymentBill, setPaymentBill] = useState<any | null>(null);

  // Auto-open modal if navigating to /purchases/new
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setIsCreateOpen(true);
    }
  }, [location.pathname]);

  const fetchBills = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/businesses/${businessId}/purchase-bills?${params.toString()}`);
      if (res.success && res.data) {
        setBills(res.data);
        if (res.meta) {
          setTotalBills(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch purchase bills', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, search, statusFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Cancel bill with automatic stock & accounting reversal
  const handleCancelBill = async (bill: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to cancel Purchase Bill ${bill.billNumber}?\n\nThis will safely:\n1. Mark the bill as CANCELLED\n2. Reverse the inward stock addition in warehouse inventory\n3. Reverse the double-entry accounting journal entries (Accounts Payable & Input Tax Credit)`
    );
    if (!confirmed) return;

    try {
      const res = await api.post(`/businesses/${businessId}/purchase-bills/${bill.id}/cancel`, {});
      if (res.success) {
        alert(res.message || 'Purchase bill cancelled and stock reversed.');
        fetchBills();
      } else {
        alert(res.error || res.message || 'Failed to cancel bill');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel bill');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this purchase bill record?')) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/purchase-bills/${id}`);
      if (res.success) {
        fetchBills();
      } else {
        alert(res.error || res.message || 'Failed to delete bill');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const totalPurchaseAmount = bills.reduce(
    (s, b) => (b.status !== 'CANCELLED' ? s + (b.totalAmount || 0) : s),
    0
  );
  const totalPaidAmount = bills.reduce(
    (s, b) => (b.status !== 'CANCELLED' ? s + (b.paidAmount || 0) : s),
    0
  );
  const totalDueAmount = Math.max(0, totalPurchaseAmount - totalPaidAmount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> PARTIAL
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban size={11} /> CANCELLED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText size={11} /> DRAFT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Purchase Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage vendor purchase bills, inward stock, input tax credit (ITC) & payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDuplicateFromBill(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} />
            Record Purchase Bill
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Inward Purchases</span>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalPurchaseAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <ShoppingCart size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Paid to Suppliers</span>
            <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totalPaidAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Pending Payables (AP)</span>
            <p className="text-xl font-bold text-rose-600 mt-1 font-mono">
              {formatCurrency(totalDueAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Registered Bills</span>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {totalBills} Bills
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by bill # or supplier name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'ALL', label: 'All Bills' },
              { id: 'RECEIVED', label: 'Received' },
              { id: 'PAID', label: 'Paid' },
              { id: 'PARTIAL', label: 'Partial' },
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
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  statusFilter === tab.id
                    ? 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading purchase bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
              <ShoppingCart size={26} className="text-purple-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No purchase bills found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Record inward stock purchases from suppliers to track your inventory and accounts payable.
            </p>
            <button
              onClick={() => {
                setDuplicateFromBill(null);
                setIsCreateOpen(true);
              }}
              className="mt-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <Plus size={14} />
              Add First Purchase Bill
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Tax Amount</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bills.map((bill) => {
                  const due = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));
                  return (
                    <tr
                      key={bill.id}
                      onClick={() => setSelectedBillId(bill.id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {bill.billNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(bill.billDate)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {bill.supplier?.name || 'Cash Supplier'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(bill.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(bill.taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(bill.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {due > 0 ? (
                          <span className="font-semibold text-rose-600">
                            {formatCurrency(due)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(bill.status)}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Print / View PDF */}
                          <button
                            onClick={() => setPrintBillId(bill.id)}
                            title="Print / View Purchase Voucher"
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Printer size={14} />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => setSelectedBillId(bill.id)}
                            title="View Purchase Bill Details"
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.get(`/businesses/${businessId}/purchase-bills/${bill.id}`);
                                if (res.success && res.data) {
                                  setDuplicateFromBill(res.data);
                                  setIsCreateOpen(true);
                                }
                              } catch (e) {
                                console.error('Failed to duplicate bill', e);
                              }
                            }}
                            title="Duplicate Bill"
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Record Payment */}
                          {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setPaymentBill(bill)}
                              title="Record Payment Made"
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <IndianRupee size={14} />
                            </button>
                          )}

                          {/* Cancel Bill (Stock Reversal) */}
                          {bill.status !== 'CANCELLED' && (
                            <button
                              onClick={(e) => handleCancelBill(bill, e)}
                              title="Cancel Bill & Reverse Stock"
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDelete(bill.id, e)}
                            title="Delete Bill"
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({totalBills} bills)
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bill Form Modal */}
      {isCreateOpen && (
        <BillFormModal
          initialBill={duplicateFromBill}
          onClose={() => {
            setIsCreateOpen(false);
            setDuplicateFromBill(null);
            if (location.pathname.endsWith('/new')) navigate('/purchases', { replace: true });
          }}
          onSaved={(savedBill, autoPrint) => {
            setIsCreateOpen(false);
            setDuplicateFromBill(null);
            if (location.pathname.endsWith('/new')) navigate('/purchases', { replace: true });
            fetchBills();
            if (autoPrint && savedBill?.id) {
              setPrintBillId(savedBill.id);
            }
          }}
        />
      )}

      {/* Bill Detail View Modal */}
      {selectedBillId && (
        <BillDetailModal
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
          onRefresh={fetchBills}
        />
      )}

      {/* Multi-format Print / PDF Modal */}
      {printBillId && (
        <BillPrintModal
          billId={printBillId}
          onClose={() => setPrintBillId(null)}
          onRefresh={fetchBills}
        />
      )}

      {/* Record Payment Made Modal */}
      {paymentBill && (
        <RecordPaymentModal
          type="MADE"
          invoiceOrBillId={paymentBill.id}
          partyName={paymentBill.supplier?.name || 'Supplier'}
          totalAmount={paymentBill.totalAmount}
          paidAmount={paymentBill.paidAmount}
          onClose={() => setPaymentBill(null)}
          onSuccess={() => {
            setPaymentBill(null);
            fetchBills();
          }}
        />
      )}
    </div>
  );
}
