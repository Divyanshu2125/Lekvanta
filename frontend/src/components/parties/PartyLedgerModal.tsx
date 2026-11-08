import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CreditCard,
  History,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

interface PartyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  partyType: 'customer' | 'supplier';
  partyId: string | null;
}

export default function PartyLedgerModal({
  isOpen,
  onClose,
  businessId,
  partyType,
  partyId,
}: PartyLedgerModalProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'transactions' | 'payments'>('ledger');
  const [partyData, setPartyData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !partyId || !businessId) return;

    const fetchParty = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint =
          partyType === 'customer'
            ? `/businesses/${businessId}/customers/${partyId}`
            : `/businesses/${businessId}/suppliers/${partyId}`;
        const res = await api.get(endpoint);
        if (res.success && res.data) {
          setPartyData(res.data);
        } else {
          setError(res.error || 'Failed to fetch party details.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParty();
  }, [isOpen, partyId, businessId, partyType]);

  if (!isOpen || !partyId) return null;

  const isCustomer = partyType === 'customer';
  const balance = isCustomer ? partyData?.currentOutstanding || 0 : partyData?.currentPayable || 0;
  const balanceLabel = isCustomer
    ? balance > 0
      ? 'Receivable (Customer Owes You)'
      : balance < 0
      ? 'Advance Paid by Customer'
      : 'Settled (Zero Due)'
    : balance > 0
    ? 'Payable (You Owe Supplier)'
    : balance < 0
    ? 'Advance Paid to Supplier'
    : 'Settled (Zero Due)';

  // Export ledger to CSV
  const handleExportLedgerCsv = () => {
    if (!partyData?.ledger || partyData.ledger.length === 0) return;

    const headers = ['Date', 'Type', 'Reference No', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'];
    const rows = partyData.ledger.map((l: any) => [
      `"${new Date(l.date).toLocaleDateString('en-IN')}"`,
      l.type,
      `"${l.refNo}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      l.debit,
      l.credit,
      l.balance,
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${partyData.name.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-700 capitalize">
                {partyType}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{partyData?.name || 'Loading...'}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
              {partyData?.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" /> {partyData.phone}
                </span>
              )}
              {partyData?.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" /> {partyData.email}
                </span>
              )}
              {partyData?.gstin && (
                <span className="flex items-center gap-1 font-mono text-slate-600 font-medium">
                  <Building2 size={13} className="text-slate-400" /> GSTIN: {partyData.gstin}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLedgerCsv}
              disabled={!partyData?.ledger?.length}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <Download size={13} />
              <span>Export Ledger</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Balance Ribbon */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Current Outstanding Balance
              </p>
              <p
                className={cn(
                  'text-2xl font-bold mt-0.5',
                  balance > 0
                    ? isCustomer
                      ? 'text-indigo-600'
                      : 'text-rose-600'
                    : balance < 0
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                )}
              >
                {formatCurrency(Math.abs(balance))}
              </p>
            </div>
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                balance > 0
                  ? isCustomer
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {balanceLabel}
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div>
              <span className="text-slate-400">Opening Balance: </span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(partyData?.openingBalance || 0)}
              </span>
            </div>
            {isCustomer && partyData?.creditLimit > 0 && (
              <div>
                <span className="text-slate-400">Credit Limit: </span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(partyData.creditLimit)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition',
              activeTab === 'ledger'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <History size={14} />
            <span>Party Statement Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              'flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition',
              activeTab === 'transactions'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <FileText size={14} />
            <span>{isCustomer ? 'Sales Invoices' : 'Purchase Bills'} ({isCustomer ? partyData?.salesInvoices?.length || 0 : partyData?.purchaseBills?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={cn(
              'flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition',
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <CreditCard size={14} />
            <span>Payment History ({partyData?.payments?.length || 0})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading party ledger records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: PARTY STATEMENT LEDGER */}
              {activeTab === 'ledger' && (
                <div>
                  {!partyData?.ledger || partyData.ledger.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">No transactions recorded yet in this party ledger.</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                          <th className="pb-2.5">Date</th>
                          <th className="pb-2.5">Type</th>
                          <th className="pb-2.5">Reference #</th>
                          <th className="pb-2.5">Description</th>
                          <th className="pb-2.5 text-right">Debit (Dr)</th>
                          <th className="pb-2.5 text-right">Credit (Cr)</th>
                          <th className="pb-2.5 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {partyData.ledger.map((l: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 font-mono text-slate-500">
                              {new Date(l.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded font-medium text-[10px] uppercase',
                                  l.type === 'INVOICE'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : l.type === 'BILL'
                                    ? 'bg-purple-50 text-purple-700'
                                    : l.type === 'PAYMENT'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {l.type}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono font-medium text-slate-700">
                              {l.refNo}
                            </td>
                            <td className="py-2.5 text-slate-600 max-w-[200px] truncate">
                              {l.description}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-800">
                              {l.debit > 0 ? formatCurrency(l.debit) : '—'}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-800">
                              {l.credit > 0 ? formatCurrency(l.credit) : '—'}
                            </td>
                            <td className="py-2.5 text-right font-bold font-mono text-slate-900">
                              {formatCurrency(l.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 2: INVOICES / BILLS */}
              {activeTab === 'transactions' && (
                <div>
                  {(isCustomer ? partyData?.salesInvoices : partyData?.purchaseBills)?.length ===
                  0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">No invoices or bills generated for this party yet.</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                          <th className="pb-2.5">Number</th>
                          <th className="pb-2.5">Date</th>
                          <th className="pb-2.5 text-right">Total Amount</th>
                          <th className="pb-2.5 text-right">Paid Amount</th>
                          <th className="pb-2.5 text-right">Balance Due</th>
                          <th className="pb-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(isCustomer ? partyData.salesInvoices : partyData.purchaseBills).map(
                          (tx: any) => {
                            const due = Math.max(0, tx.totalAmount - (tx.paidAmount || 0));
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 font-mono font-bold text-slate-800">
                                  {tx.invoiceNumber || tx.billNumber}
                                </td>
                                <td className="py-2.5 text-slate-500 font-mono">
                                  {new Date(tx.invoiceDate || tx.billDate).toLocaleDateString(
                                    'en-IN'
                                  )}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-slate-800">
                                  {formatCurrency(tx.totalAmount)}
                                </td>
                                <td className="py-2.5 text-right text-emerald-600 font-semibold">
                                  {formatCurrency(tx.paidAmount || 0)}
                                </td>
                                <td className="py-2.5 text-right font-bold text-rose-600">
                                  {formatCurrency(due)}
                                </td>
                                <td className="py-2.5 text-center">
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                      tx.status === 'PAID'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : tx.status === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-700'
                                    )}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENT HISTORY */}
              {activeTab === 'payments' && (
                <div>
                  {partyData?.payments?.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <CreditCard size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">No payment records found for this party.</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                          <th className="pb-2.5">Date</th>
                          <th className="pb-2.5">Method</th>
                          <th className="pb-2.5">Reference</th>
                          <th className="pb-2.5">Notes</th>
                          <th className="pb-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {partyData.payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 font-mono text-slate-500">
                              {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {p.method}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-slate-700">{p.reference || '—'}</td>
                            <td className="py-2.5 text-slate-500 truncate max-w-[200px]">
                              {p.notes || '—'}
                            </td>
                            <td className="py-2.5 text-right font-bold text-emerald-600 text-sm">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

