import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileText,
  IndianRupee,
  Trash2,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import PaymentFormModal from '@/components/payments/PaymentFormModal';

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIVED' | 'MADE'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'RECEIVED' | 'MADE'>('RECEIVED');

  useEffect(() => {
    if (location.pathname.endsWith('/receive') || location.pathname.endsWith('/new')) {
      setModalType('RECEIVED');
      setIsModalOpen(true);
    } else if (location.pathname.endsWith('/pay') || location.pathname.endsWith('/made')) {
      setModalType('MADE');
      setIsModalOpen(true);
    }
  }, [location.pathname]);

  const fetchPayments = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (methodFilter !== 'ALL') params.append('method', methodFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/businesses/${businessId}/payments?${params.toString()}`);
      if (res.success && res.data) {
        setPayments(res.data);
        if (res.meta) {
          setTotalPayments(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, typeFilter, methodFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payment record?\n\nThis will safely:\n1. Reverse the allocated paid amounts on linked invoices or bills\n2. Reverse the double-entry accounting journal entries')) {
      return;
    }
    try {
      const res = await api.delete(`/businesses/${businessId}/payments/${id}`);
      if (res.success) {
        fetchPayments();
      } else {
        alert(res.error || res.message || 'Failed to delete payment');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment');
    }
  };

  const totalReceived = payments
    .filter((p) => p.type === 'RECEIVED')
    .reduce((s, p) => s + (p.amount || 0), 0);

  const totalMade = payments
    .filter((p) => p.type === 'MADE')
    .reduce((s, p) => s + (p.amount || 0), 0);

  const netCashFlow = totalReceived - totalMade;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments & Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer receipts, vendor payouts, payment allocations & double-entry settlements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalType('RECEIVED');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <ArrowDownLeft size={15} />
            Receive Payment
          </button>
          <button
            onClick={() => {
              setModalType('MADE');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <ArrowUpRight size={15} />
            Make Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Customer Receipts</span>
            <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totalReceived)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowDownLeft size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Supplier Payments</span>
            <p className="text-xl font-bold text-rose-600 mt-1 font-mono">
              {formatCurrency(totalMade)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Net Monetary Flow</span>
            <p
              className={cn(
                'text-xl font-bold mt-1 font-mono',
                netCashFlow >= 0 ? 'text-indigo-600' : 'text-amber-600'
              )}
            >
              {formatCurrency(netCashFlow)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Transactions Count</span>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {totalPayments} Records
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              placeholder="Search by party, ref or invoice..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Mode filter */}
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
              <option value="NEFT">NEFT / RTGS</option>
            </select>

            {/* Type tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'ALL', label: 'All Transfers' },
                { id: 'RECEIVED', label: 'Inward (Receipts)' },
                { id: 'MADE', label: 'Outward (Payments)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTypeFilter(tab.id as any);
                    setPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    typeFilter === tab.id
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
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <CreditCard size={26} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No payment records found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Record receipts from customers or payments made to vendors to update accounting books.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setModalType('RECEIVED');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                <ArrowDownLeft size={14} />
                Receive Payment
              </button>
              <button
                onClick={() => {
                  setModalType('MADE');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                <ArrowUpRight size={14} />
                Make Payment
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Ref / Linked Voucher</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => {
                  const partyName = p.customer?.name || p.supplier?.name || 'On Account';
                  const linkedDoc =
                    p.salesInvoice?.invoiceNumber ||
                    p.purchaseBill?.billNumber ||
                    p.reference ||
                    '-';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="py-3 px-4">
                        {p.type === 'RECEIVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft size={12} /> RECEIPT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight size={12} /> PAYMENT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {partyName}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {linkedDoc}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span
                          className={
                            p.type === 'RECEIVED' ? 'text-emerald-600' : 'text-rose-600'
                          }
                        >
                          {p.type === 'RECEIVED' ? '+' : '-'}
                          {formatCurrency(p.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          title="Delete Payment & Reverse Entry"
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
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
              Page {page} of {totalPages} ({totalPayments} payments)
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

      {isModalOpen && (
        <PaymentFormModal
          initialType={modalType}
          onClose={() => {
            setIsModalOpen(false);
            if (location.pathname.includes('/receive') || location.pathname.includes('/new') || location.pathname.includes('/pay') || location.pathname.includes('/made')) {
              navigate('/payments', { replace: true });
            }
          }}
          onSaved={() => {
            setIsModalOpen(false);
            if (location.pathname.includes('/receive') || location.pathname.includes('/new') || location.pathname.includes('/pay') || location.pathname.includes('/made')) {
              navigate('/payments', { replace: true });
            }
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}
