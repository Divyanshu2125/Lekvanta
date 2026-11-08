import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  IndianRupee,
  TrendingDown,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';

export default function Expenses() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setIsModalOpen(true);
    }
  }, [location.pathname]);

  const fetchExpenses = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await api.get(`/businesses/${businessId}/expenses?${params.toString()}`);
      if (res.success && res.data) {
        setExpenses(res.data);
        if (res.meta) {
          setTotalExpenses(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, categoryFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/expenses/${id}`);
      if (res.success) {
        fetchExpenses();
      } else {
        alert(res.error || res.message || 'Failed to delete expense');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.category?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.reference?.toLowerCase().includes(q)
    );
  });

  const totalAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Group by category for categories breakdown
  const categoryCounts: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + e.amount;
  });
  const topCategoryEntry = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record operational overheads, rent, utilities and track business spend
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={16} />
          Record Expense
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Expenses</span>
            <p className="text-xl font-bold text-rose-600 mt-1 font-mono">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Highest Category</span>
            <p className="text-base font-bold text-slate-800 mt-1 truncate max-w-[180px]">
              {topCategoryEntry ? topCategoryEntry[0] : 'None'}
            </p>
            {topCategoryEntry && (
              <span className="text-xs text-slate-400 font-mono">
                {formatCurrency(topCategoryEntry[1])}
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Tag size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Recorded Vouchers</span>
            <p className="text-xl font-bold text-slate-800 mt-1">{totalExpenses}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Receipt size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="w-full md:w-60">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {Object.keys(categoryCounts).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading expense entries...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-3">
              <Receipt size={26} className="text-rose-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No expenses recorded yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Keep your financial accounts accurate by logging overhead and business costs.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Record Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(e.expenseDate)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {e.description || '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {e.paymentMethod}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {e.reference || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        title="Delete Expense"
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({totalExpenses} expenses)
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

      {isModalOpen && (
        <ExpenseFormModal
          onClose={() => {
            setIsModalOpen(false);
            if (location.pathname.endsWith('/new')) navigate('/expenses', { replace: true });
          }}
          onSaved={() => {
            setIsModalOpen(false);
            if (location.pathname.endsWith('/new')) navigate('/expenses', { replace: true });
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
}
