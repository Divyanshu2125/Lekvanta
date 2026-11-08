import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Scale,
  Layers,
  TrendingUp,
  Landmark,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Users,
  Building2,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import AccountModal from '@/components/accounting/AccountModal';
import JournalEntryModal from '@/components/accounting/JournalEntryModal';

type AccountingTab =
  | 'ACCOUNTS'
  | 'LEDGER'
  | 'JOURNAL'
  | 'CASH_BOOK'
  | 'BANK_BOOK'
  | 'TRIAL_BALANCE'
  | 'PROFIT_LOSS'
  | 'BALANCE_SHEET'
  | 'RECEIVABLES'
  | 'PAYABLES';

export default function Accounting() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [activeTab, setActiveTab] = useState<AccountingTab>('ACCOUNTS');

  // Chart of accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('ALL');
  const [accountSearch, setAccountSearch] = useState('');

  // General Ledger state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerFrom, setLedgerFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [ledgerTo, setLedgerTo] = useState(new Date().toISOString().split('T')[0]);

  // Journal entries state
  const [entries, setEntries] = useState<any[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [jePage, setJePage] = useState(1);
  const [jeTotalPages, setJeTotalPages] = useState(1);
  const [jeTotal, setJeTotal] = useState(0);

  // Cash & Bank Book states
  const [cashBookData, setCashBookData] = useState<any>(null);
  const [bankBookData, setBankBookData] = useState<any>(null);

  // Trial Balance state
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);

  // P&L and Balance Sheet states
  const [pnlData, setPnlData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);

  // Receivables & Payables reports
  const [arReport, setArReport] = useState<any>(null);
  const [apReport, setApReport] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJeModalOpen, setIsJeModalOpen] = useState(false);

  // 1. Fetch Chart of Accounts
  const fetchAccounts = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/accounts`);
      if (res.success && res.data) {
        setAccounts(res.data);
        if (!selectedAccountId && res.data.length > 0) {
          setSelectedAccountId(res.data[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedAccountId]);

  // 2. Fetch General Ledger
  const fetchLedger = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      if (ledgerFrom) params.append('from', ledgerFrom);
      if (ledgerTo) params.append('to', ledgerTo);

      const res = await api.get(`/businesses/${businessId}/accounting/general-ledger?${params.toString()}`);
      if (res.success && res.data) {
        setLedgerData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedAccountId, ledgerFrom, ledgerTo]);

  // 3. Fetch Journal Entries
  const fetchJournalEntries = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/businesses/${businessId}/accounting/journal-entries?page=${jePage}&limit=25`
      );
      if (res.success && res.data) {
        setEntries(res.data);
        if (res.meta) {
          setJeTotal(res.meta.total || 0);
          setJeTotalPages(res.meta.totalPages || 1);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [businessId, jePage]);

  // 4. Fetch Cash Book
  const fetchCashBook = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/cash-book`);
      if (res.success && res.data) {
        setCashBookData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 5. Fetch Bank Book
  const fetchBankBook = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/bank-book`);
      if (res.success && res.data) {
        setBankBookData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 6. Fetch Trial Balance
  const fetchTrialBalance = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/trial-balance`);
      if (res.success && res.data) {
        setTrialBalanceData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 7. Fetch Profit & Loss
  const fetchProfitAndLoss = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/profit-loss`);
      if (res.success && res.data) {
        setPnlData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 8. Fetch Balance Sheet
  const fetchBalanceSheet = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/balance-sheet`);
      if (res.success && res.data) {
        setBalanceSheetData(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 9. Fetch Receivables (AR)
  const fetchReceivables = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/receivables`);
      if (res.success && res.data) {
        setArReport(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // 10. Fetch Payables (AP)
  const fetchPayables = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${businessId}/accounting/payables`);
      if (res.success && res.data) {
        setApReport(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Route active tab requests
  useEffect(() => {
    switch (activeTab) {
      case 'ACCOUNTS':
        fetchAccounts();
        break;
      case 'LEDGER':
        fetchAccounts();
        fetchLedger();
        break;
      case 'JOURNAL':
        fetchJournalEntries();
        break;
      case 'CASH_BOOK':
        fetchCashBook();
        break;
      case 'BANK_BOOK':
        fetchBankBook();
        break;
      case 'TRIAL_BALANCE':
        fetchTrialBalance();
        break;
      case 'PROFIT_LOSS':
        fetchProfitAndLoss();
        break;
      case 'BALANCE_SHEET':
        fetchBalanceSheet();
        break;
      case 'RECEIVABLES':
        fetchReceivables();
        break;
      case 'PAYABLES':
        fetchPayables();
        break;
    }
  }, [
    activeTab,
    fetchAccounts,
    fetchLedger,
    fetchJournalEntries,
    fetchCashBook,
    fetchBankBook,
    fetchTrialBalance,
    fetchProfitAndLoss,
    fetchBalanceSheet,
    fetchReceivables,
    fetchPayables,
  ]);

  const filteredAccounts = accounts.filter((acc) => {
    if (accountTypeFilter !== 'ALL' && acc.type !== accountTypeFilter) return false;
    if (accountSearch.trim()) {
      const q = accountSearch.toLowerCase();
      return (
        acc.name.toLowerCase().includes(q) ||
        (acc.code && acc.code.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">ASSET</span>;
      case 'LIABILITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">LIABILITY</span>;
      case 'EQUITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">EQUITY</span>;
      case 'INCOME':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INCOME</span>;
      case 'EXPENSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">EXPENSE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Double-Entry Accounting</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict double-entry general ledger, real-time books, financial statements & audit trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJeModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <BookOpen size={15} />
            + Manual Journal Entry
          </button>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Plus size={15} />
            + Add Account Head
          </button>
        </div>
      </div>

      {/* Main Tabbed Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'ACCOUNTS', label: 'Chart of Accounts', icon: Layers },
            { id: 'LEDGER', label: 'General Ledger', icon: BookOpen },
            { id: 'JOURNAL', label: 'Journal Entries', icon: FileText },
            { id: 'CASH_BOOK', label: 'Cash Book', icon: Coins },
            { id: 'BANK_BOOK', label: 'Bank Book', icon: Landmark },
            { id: 'TRIAL_BALANCE', label: 'Trial Balance', icon: Scale },
            { id: 'PROFIT_LOSS', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'BALANCE_SHEET', label: 'Balance Sheet', icon: PieChart },
            { id: 'RECEIVABLES', label: 'Receivables (AR)', icon: Users },
            { id: 'PAYABLES', label: 'Payables (AP)', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AccountingTab)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
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

      {/* ── TAB 1: CHART OF ACCOUNTS ────────────────────────────────────────── */}
      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Search account name or code..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-xl">
              {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountTypeFilter(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    accountTypeFilter === t
                      ? 'bg-white text-slate-800 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4 w-24">Code</th>
                  <th className="py-3 px-4">Account Head Name</th>
                  <th className="py-3 px-4">Group / Parent</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Total Debits (Dr)</th>
                  <th className="py-3 px-4 text-right">Total Credits (Cr)</th>
                  <th className="py-3 px-4 text-right">Live Calculated Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {acc.code || '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {acc.name}
                      {acc.isSystem && (
                        <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                          System
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {acc.parent?.name || 'Primary'}
                    </td>
                    <td className="py-3 px-4">{getAccountTypeBadge(acc.type)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(acc.totalDebit || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(acc.totalCredit || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(acc.balance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: GENERAL LEDGER ───────────────────────────────────────────── */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Select Account Ledger
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code ? `${a.code} - ` : ''}{a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={ledgerFrom}
                  onChange={(e) => setLedgerFrom(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={ledgerTo}
                  onChange={(e) => setLedgerTo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {ledgerData?.account && (
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-500">Closing Balance:</span>
                <p className="text-lg font-bold font-mono text-indigo-600">
                  {formatCurrency(ledgerData.closingBalance)}
                </p>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Opening Balance Row */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">
                Opening Balance as of {formatDate(ledgerFrom)}:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(ledgerData?.openingBalance || 0)}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-28">Date</th>
                  <th className="py-2.5 px-4">Particulars / Journal Entry</th>
                  <th className="py-2.5 px-4 w-32">Voucher Type</th>
                  <th className="py-2.5 px-4 text-right w-32">Debit (Dr)</th>
                  <th className="py-2.5 px-4 text-right w-32">Credit (Cr)</th>
                  <th className="py-2.5 px-4 text-right w-36">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ledgerData?.lines?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      No journal entries recorded for this account during the selected date range.
                    </td>
                  </tr>
                ) : (
                  ledgerData?.lines?.map((line: any) => (
                    <tr key={line.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(line.entryDate)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {line.entryDescription}
                        </span>
                        {line.lineDescription && (
                          <span className="text-[11px] text-slate-500">{line.lineDescription}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                          {line.referenceType || 'Journal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(line.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: JOURNAL ENTRIES ─────────────────────────────────────────── */}
      {activeTab === 'JOURNAL' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-32">Voucher Type</th>
                  <th className="py-3 px-4 text-right w-36">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {entries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const totalVoucherAmount = entry.lines.reduce(
                    (s: number, l: any) => s + (l.debit || 0),
                    0
                  );

                  return (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {entry.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {entry.referenceType || 'Manual'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(totalVoucherAmount)}
                        </td>
                      </tr>

                      {/* Expanded Double-entry Lines */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={5} className="p-4 pl-12">
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2 px-3">Account Head</th>
                                    <th className="py-2 px-3">Type</th>
                                    <th className="py-2 px-3">Line Particulars</th>
                                    <th className="py-2 px-3 text-right w-32">Debit (₹)</th>
                                    <th className="py-2 px-3 text-right w-32">Credit (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {entry.lines.map((line: any) => (
                                    <tr key={line.id}>
                                      <td className="py-2 px-3 font-semibold text-slate-800">
                                        {line.account?.code ? `${line.account.code} - ` : ''}
                                        {line.account?.name}
                                      </td>
                                      <td className="py-2 px-3">
                                        {getAccountTypeBadge(line.account?.type)}
                                      </td>
                                      <td className="py-2 px-3 text-slate-500">
                                        {line.description || '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CASH BOOK ───────────────────────────────────────────────── */}
      {activeTab === 'CASH_BOOK' && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Opening Cash in Hand</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(cashBookData?.openingBalance || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Cash Receipts (Dr)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                +{formatCurrency(cashBookData?.totalReceipts || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Closing Cash in Hand</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(cashBookData?.closingBalance || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Particulars</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Inward Receipts (Dr)</th>
                  <th className="py-2.5 px-4 text-right">Outward Payments (Cr)</th>
                  <th className="py-2.5 px-4 text-right">Cash Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cashBookData?.lines?.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatDate(l.date)}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{l.particulars}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', l.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                        {l.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold">
                      {l.debit > 0 ? `+${formatCurrency(l.debit)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-semibold">
                      {l.credit > 0 ? `-${formatCurrency(l.credit)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(l.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: BANK BOOK ───────────────────────────────────────────────── */}
      {activeTab === 'BANK_BOOK' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Opening Bank Balance</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(bankBookData?.openingBalance || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Bank Deposits (Dr)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                +{formatCurrency(bankBookData?.totalDeposits || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Closing Bank Balance</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(bankBookData?.closingBalance || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Particulars</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Deposits / Credits (Dr)</th>
                  <th className="py-2.5 px-4 text-right">Withdrawals / Outflow (Cr)</th>
                  <th className="py-2.5 px-4 text-right">Bank Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bankBookData?.lines?.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatDate(l.date)}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{l.particulars}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', l.type === 'DEPOSIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                        {l.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold">
                      {l.debit > 0 ? `+${formatCurrency(l.debit)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-semibold">
                      {l.credit > 0 ? `-${formatCurrency(l.credit)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(l.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: TRIAL BALANCE ───────────────────────────────────────────── */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="space-y-4">
          {/* Equilibrium Status Banner */}
          <div
            className={cn(
              'flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-semibold',
              trialBalanceData?.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            )}
          >
            {trialBalanceData?.isBalanced ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>
                  Trial Balance is strictly balanced: Total Debit Balances equal Total Credit Balances (₹
                  {trialBalanceData?.netDebitBalancesTotal?.toLocaleString('en-IN')}).
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-rose-600" />
                <span>
                  Ledger Discrepancy detected: Debits and Credits do not equal.
                </span>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4 w-24">Code</th>
                  <th className="py-3 px-4">Account Head</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4 text-right w-40">Debit Balance (Dr)</th>
                  <th className="py-3 px-4 text-right w-40">Credit Balance (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {trialBalanceData?.accounts?.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code || '-'}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{acc.name}</td>
                    <td className="py-2.5 px-4">{getAccountTypeBadge(acc.type)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      {acc.debitBalance > 0 ? formatCurrency(acc.debitBalance) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      {acc.creditBalance > 0 ? formatCurrency(acc.creditBalance) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider text-xs">
                    Grand Trial Balance Total
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-indigo-700">
                    {formatCurrency(trialBalanceData?.netDebitBalancesTotal || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-indigo-700">
                    {formatCurrency(trialBalanceData?.netCreditBalancesTotal || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 7: PROFIT & LOSS ───────────────────────────────────────────── */}
      {activeTab === 'PROFIT_LOSS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Revenue</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(pnlData?.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Gross Trading Profit</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {formatCurrency(pnlData?.grossProfit || 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Net Operating Profit</span>
              <p
                className={cn(
                  'text-xl font-bold font-mono mt-1',
                  (pnlData?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                )}
              >
                {formatCurrency(pnlData?.netProfit || 0)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-slate-100 pb-2">
                1. Revenue & Sales Incomes
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {pnlData?.revenues?.map((r: any) => (
                  <div key={r.id} className="py-2 flex justify-between">
                    <span className="text-slate-800 font-semibold">{r.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t-2 border-slate-200 flex justify-between font-bold text-xs text-slate-900">
                <span>Total Income</span>
                <span className="font-mono text-emerald-700">{formatCurrency(pnlData?.totalRevenue || 0)}</span>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 border-b border-slate-100 pb-2">
                2. Cost of Sales & Operating Expenses
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-1 text-[11px] font-bold text-slate-400 uppercase">Cost of Goods Sold</div>
                {pnlData?.cogsExpenses?.map((e: any) => (
                  <div key={e.id} className="py-1.5 flex justify-between pl-2">
                    <span className="text-slate-700">{e.name}</span>
                    <span className="font-mono">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
                <div className="py-1 text-[11px] font-bold text-slate-400 uppercase pt-2">Operating Expenses</div>
                {pnlData?.operatingExpenses?.map((e: any) => (
                  <div key={e.id} className="py-1.5 flex justify-between pl-2">
                    <span className="text-slate-700">{e.name}</span>
                    <span className="font-mono">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t-2 border-slate-200 flex justify-between font-bold text-xs text-slate-900">
                <span>Total Expenses (COGS + Operating)</span>
                <span className="font-mono text-rose-700">
                  {formatCurrency((pnlData?.totalCOGS || 0) + (pnlData?.totalOperatingExpenses || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: BALANCE SHEET ─────────────────────────────────────────── */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          <div
            className={cn(
              'flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-semibold',
              balanceSheetData?.isBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            )}
          >
            {balanceSheetData?.isBalanced ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Balance Sheet is strictly in equilibrium: Total Assets = Total Liabilities + Total Equity</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-rose-600" />
                <span>Balance Sheet requires reconciliation.</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-slate-100 pb-2">
                ASSETS
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {balanceSheetData?.assets?.map((a: any) => (
                  <div key={a.id} className="py-2 flex justify-between">
                    <span className="text-slate-800 font-semibold">{a.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(a.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t-2 border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-blue-700">{formatCurrency(balanceSheetData?.totalAssets || 0)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 border-b border-slate-100 pb-2">
                  LIABILITIES
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {balanceSheetData?.liabilities?.map((l: any) => (
                    <div key={l.id} className="py-2 flex justify-between">
                      <span className="text-slate-800 font-semibold">{l.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(l.balance)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-between font-bold text-xs text-slate-900">
                  <span>Total Liabilities</span>
                  <span className="font-mono text-amber-700">{formatCurrency(balanceSheetData?.totalLiabilities || 0)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 border-b border-slate-100 pb-2">
                  OWNER'S EQUITY & EARNINGS
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {balanceSheetData?.equities?.map((e: any) => (
                    <div key={e.id} className="py-2 flex justify-between">
                      <span className="text-slate-800 font-semibold">{e.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(e.balance)}</span>
                    </div>
                  ))}
                  <div className="py-2 flex justify-between text-emerald-700 font-semibold">
                    <span>Retained Earnings (Current Period Net Profit)</span>
                    <span className="font-mono font-bold">{formatCurrency(balanceSheetData?.currentPeriodProfit || 0)}</span>
                  </div>
                </div>
                <div className="pt-2 flex justify-between font-bold text-xs text-slate-900">
                  <span>Total Equity</span>
                  <span className="font-mono text-purple-700">{formatCurrency(balanceSheetData?.totalEquity || 0)}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-indigo-700">
                  {formatCurrency((balanceSheetData?.totalLiabilities || 0) + (balanceSheetData?.totalEquity || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 9: ACCOUNTS RECEIVABLE (AR) ─────────────────────────────────── */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Customer Receivables</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(arReport?.totalOutstandingReceivable || 0)}
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
                  <th className="py-2.5 px-4 text-right">Total Received</th>
                  <th className="py-2.5 px-4 text-center">Unpaid Invoices</th>
                  <th className="py-2.5 px-4 text-right">Current Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {arReport?.customers?.map((c: any) => (
                  <tr key={c.customerId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{c.customerName}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {c.phone || ''} {c.gstin ? `• ${c.gstin}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(c.totalInvoiced)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {c.pendingInvoicesCount} Invoices
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(c.currentOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 10: ACCOUNTS PAYABLE (AP) ──────────────────────────────────── */}
      {activeTab === 'PAYABLES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Supplier Payables</span>
              <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(apReport?.totalPendingPayable || 0)}
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
                  <th className="py-2.5 px-4">Supplier / Vendor Name</th>
                  <th className="py-2.5 px-4">Phone / GSTIN</th>
                  <th className="py-2.5 px-4 text-right">Total Purchased</th>
                  <th className="py-2.5 px-4 text-right">Total Disbursed</th>
                  <th className="py-2.5 px-4 text-center">Pending Bills</th>
                  <th className="py-2.5 px-4 text-right">Current Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {apReport?.suppliers?.map((s: any) => (
                  <tr key={s.supplierId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{s.supplierName}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {s.phone || ''} {s.gstin ? `• ${s.gstin}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(s.totalPurchased)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                      {formatCurrency(s.totalPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {s.pendingBillsCount} Bills
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(s.currentPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Creation Modal */}
      {isAccountModalOpen && (
        <AccountModal
          onClose={() => setIsAccountModalOpen(false)}
          onSaved={() => {
            setIsAccountModalOpen(false);
            fetchAccounts();
          }}
        />
      )}

      {/* Journal Entry Modal */}
      {isJeModalOpen && (
        <JournalEntryModal
          onClose={() => setIsJeModalOpen(false)}
          onSaved={() => {
            setIsJeModalOpen(false);
            fetchJournalEntries();
            fetchTrialBalance();
          }}
        />
      )}
    </div>
  );
}
