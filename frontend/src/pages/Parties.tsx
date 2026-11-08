import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Edit2,
  Trash2,
  History,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import CustomerModal, { CustomerData } from '@/components/parties/CustomerModal';
import SupplierModal, { SupplierData } from '@/components/parties/SupplierModal';
import PartyLedgerModal from '@/components/parties/PartyLedgerModal';

export default function Parties() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');

  // Customer states
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState(0);

  // Supplier states
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'zero'>('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerParty, setLedgerParty] = useState<{ id: string; type: 'customer' | 'supplier' } | null>(null);

  // Auto-open modal on /parties/new or /parties/customers/new or /parties/suppliers/new
  useEffect(() => {
    if (location.pathname.includes('supplier')) {
      setActiveTab('suppliers');
      if (location.pathname.endsWith('/new')) setIsSupplierModalOpen(true);
    } else if (location.pathname.endsWith('/new')) {
      setActiveTab('customers');
      setIsCustomerModalOpen(true);
    }
  }, [location.pathname]);

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });
      const res = await api.get(`/businesses/${businessId}/customers?${params.toString()}`);
      if (res.success && res.data) {
        setCustomers(res.data);
        if (res.meta) {
          setTotalCustomers(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
          setTotalReceivables((res.meta as any).totalReceivables || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, page, sortBy, sortOrder]);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });
      const res = await api.get(`/businesses/${businessId}/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        setSuppliers(res.data);
        if (res.meta) {
          setTotalSuppliers(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
          setTotalPayables((res.meta as any).totalPayables || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, page, sortBy, sortOrder]);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else {
      fetchSuppliers();
    }
  }, [activeTab, fetchCustomers, fetchSuppliers]);

  // Handle Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/customers/${id}`);
      if (res.success) fetchCustomers();
    } catch (err) {
      console.error('Delete customer error', err);
    }
  };

  // Handle Delete Supplier
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    try {
      const res = await api.delete(`/businesses/${businessId}/suppliers/${id}`);
      if (res.success) fetchSuppliers();
    } catch (err) {
      console.error('Delete supplier error', err);
    }
  };

  // Filtered lists by balance
  const filteredCustomers = customers.filter((c) => {
    if (balanceFilter === 'due') return c.currentOutstanding > 0;
    if (balanceFilter === 'zero') return c.currentOutstanding === 0;
    return true;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (balanceFilter === 'due') return s.currentPayable > 0;
    if (balanceFilter === 'zero') return s.currentPayable === 0;
    return true;
  });

  const isCustomerTab = activeTab === 'customers';

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parties Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your customers, suppliers, credit terms, and real-time ledger statements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isCustomerTab ? (
            <button
              onClick={() => {
                setEditingCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus size={15} />
              <span>Add Customer</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus size={15} />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-nav Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab('customers');
            setPage(1);
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition',
            isCustomerTab
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Users size={14} />
          <span>Customers ({totalCustomers})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('suppliers');
            setPage(1);
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition',
            !isCustomerTab
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Building2 size={14} />
          <span>Suppliers ({totalSuppliers})</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isCustomerTab ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCustomers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Receivables
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {formatCurrency(totalReceivables)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Active Dues Pending
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {customers.filter((c) => c.currentOutstanding > 0).length} Customers
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle size={20} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Suppliers
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalSuppliers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Building2 size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Payables
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {formatCurrency(totalPayables)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <TrendingDown size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Bills Due for Payment
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {suppliers.filter((s) => s.currentPayable > 0).length} Suppliers
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <CreditCard size={20} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${isCustomerTab ? 'customers' : 'suppliers'} by name, phone, GSTIN...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Balance Filter */}
          <select
            value={balanceFilter}
            onChange={(e: any) => setBalanceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Balances</option>
            <option value="due">{isCustomerTab ? 'Has Dues (Receivable)' : 'Has Bills (Payable)'}</option>
            <option value="zero">Zero Due / Settled</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="name">Sort: Name</option>
            <option value="createdAt">Sort: Recently Added</option>
          </select>

          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
            title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown size={14} />
          </button>
        </div>
      </div>

      {/* TABLE 1: CUSTOMERS */}
      {isCustomerTab && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-3 px-4">Customer Name & GSTIN</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Billing Address</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Current Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading customers...</span>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No customers found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {search ? 'Try clearing your search terms.' : 'Add your first customer to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const hasDue = c.currentOutstanding > 0;
                    const isAdvance = c.currentOutstanding < 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition group">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 text-sm">{c.name}</p>
                          {c.gstin ? (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              GSTIN: {c.gstin}
                            </p>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Unregistered</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {c.phone && (
                            <p className="text-slate-700 font-medium flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" /> {c.phone}
                            </p>
                          )}
                          {c.email && (
                            <p className="text-slate-400 text-[11px] truncate max-w-[160px] mt-0.5 flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" /> {c.email}
                            </p>
                          )}
                          {!c.phone && !c.email && <span className="text-slate-400">—</span>}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">
                          {c.billingAddress || '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'Unlimited'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <p
                            className={cn(
                              'font-bold text-sm',
                              hasDue ? 'text-indigo-600' : isAdvance ? 'text-emerald-600' : 'text-slate-700'
                            )}
                          >
                            {formatCurrency(Math.abs(c.currentOutstanding))}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {hasDue ? 'Due (Receivable)' : isAdvance ? 'Advance' : 'Settled'}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {hasDue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Payment Due
                            </span>
                          ) : isAdvance ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Advance
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                              <CheckCircle2 size={11} /> Clear
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Ledger */}
                            <button
                              type="button"
                              onClick={() => {
                                setLedgerParty({ id: c.id, type: 'customer' });
                                setIsLedgerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View Party Statement & Invoices"
                            >
                              <History size={14} />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomer(c);
                                setIsCustomerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit customer"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(c.id, c.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete customer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCustomers > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              <p>
                Showing <span className="font-semibold text-slate-700">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">{Math.min(page * 20, totalCustomers)}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalCustomers}</span> customers
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
                >
                  Previous
                </button>
                <span className="px-2.5 py-1 font-semibold text-indigo-700 bg-indigo-50 rounded-lg">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE 2: SUPPLIERS */}
      {!isCustomerTab && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-3 px-4">Supplier Name & GSTIN</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Office / Warehouse Address</th>
                  <th className="py-3 px-4 text-right">Bills Tracked</th>
                  <th className="py-3 px-4 text-right">Current Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading suppliers...</span>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No suppliers found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {search ? 'Try clearing your search terms.' : 'Add your first supplier / vendor to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const hasPayable = s.currentPayable > 0;
                    const isAdvance = s.currentPayable < 0;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition group">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
                          {s.gstin ? (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              GSTIN: {s.gstin}
                            </p>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Unregistered</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {s.phone && (
                            <p className="text-slate-700 font-medium flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" /> {s.phone}
                            </p>
                          )}
                          {s.email && (
                            <p className="text-slate-400 text-[11px] truncate max-w-[160px] mt-0.5 flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" /> {s.email}
                            </p>
                          )}
                          {!s.phone && !s.email && <span className="text-slate-400">—</span>}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">
                          {s.address || '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {s.billsCount || 0} Bills
                        </td>

                        <td className="py-3 px-4 text-right">
                          <p
                            className={cn(
                              'font-bold text-sm',
                              hasPayable ? 'text-rose-600' : isAdvance ? 'text-emerald-600' : 'text-slate-700'
                            )}
                          >
                            {formatCurrency(Math.abs(s.currentPayable))}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {hasPayable ? 'Payable (You Owe)' : isAdvance ? 'Advance Paid' : 'Settled'}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {hasPayable ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Payment Due
                            </span>
                          ) : isAdvance ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Advance
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                              <CheckCircle2 size={11} /> Clear
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Ledger */}
                            <button
                              type="button"
                              onClick={() => {
                                setLedgerParty({ id: s.id, type: 'supplier' });
                                setIsLedgerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View Party Statement & Purchase Bills"
                            >
                              <History size={14} />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(s);
                                setIsSupplierModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit supplier"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s.id, s.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete supplier"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalSuppliers > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              <p>
                Showing <span className="font-semibold text-slate-700">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">{Math.min(page * 20, totalSuppliers)}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalSuppliers}</span> suppliers
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
                >
                  Previous
                </button>
                <span className="px-2.5 py-1 font-semibold text-indigo-700 bg-indigo-50 rounded-lg">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {businessId && (
        <>
          <CustomerModal
            isOpen={isCustomerModalOpen}
            onClose={() => {
              setIsCustomerModalOpen(false);
              setEditingCustomer(null);
              if (location.pathname.endsWith('/new')) navigate('/parties', { replace: true });
            }}
            onSuccess={() => {
              fetchCustomers();
              if (location.pathname.endsWith('/new')) navigate('/parties', { replace: true });
            }}
            businessId={businessId}
            customerToEdit={editingCustomer}
          />

          <SupplierModal
            isOpen={isSupplierModalOpen}
            onClose={() => {
              setIsSupplierModalOpen(false);
              setEditingSupplier(null);
              if (location.pathname.endsWith('/new')) navigate('/parties', { replace: true });
            }}
            onSuccess={() => {
              fetchSuppliers();
              if (location.pathname.endsWith('/new')) navigate('/parties', { replace: true });
            }}
            businessId={businessId}
            supplierToEdit={editingSupplier}
          />

          <PartyLedgerModal
            isOpen={isLedgerModalOpen}
            onClose={() => {
              setIsLedgerModalOpen(false);
              setLedgerParty(null);
            }}
            businessId={businessId}
            partyType={ledgerParty?.type || 'customer'}
            partyId={ledgerParty?.id || null}
          />
        </>
      )}
    </div>
  );
}
