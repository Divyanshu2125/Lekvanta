import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  AlertCircle,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface PaymentFormModalProps {
  initialType?: 'RECEIVED' | 'MADE';
  onClose: () => void;
  onSaved: () => void;
}

interface AllocationLine {
  id: string;
  referenceNumber: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  allocatedAmount: number;
  selected: boolean;
}

export default function PaymentFormModal({
  initialType = 'RECEIVED',
  onClose,
  onSaved,
}: PaymentFormModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [type, setType] = useState<'RECEIVED' | 'MADE'>(initialType);
  const [parties, setParties] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [method, setMethod] = useState<'CASH' | 'BANK' | 'UPI' | 'CHEQUE' | 'CARD' | 'NEFT' | 'RTGS'>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Unpaid invoices / bills for allocation
  const [dues, setDues] = useState<AllocationLine[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);

  // Fetch customers or suppliers based on type
  useEffect(() => {
    if (!businessId) return;
    setSelectedPartyId('');
    setDues([]);
    const endpoint = type === 'RECEIVED' ? 'customers' : 'suppliers';
    api.get(`/businesses/${businessId}/${endpoint}?limit=300`).then((res) => {
      if (res.success && res.data) {
        setParties(res.data);
      }
    });
  }, [businessId, type]);

  // Fetch outstanding dues when a party is selected
  const fetchPartyDues = useCallback(async (partyId: string) => {
    if (!businessId || !partyId) {
      setDues([]);
      return;
    }
    setDuesLoading(true);
    try {
      const partyType = type === 'RECEIVED' ? 'CUSTOMER' : 'SUPPLIER';
      const res = await api.get(`/businesses/${businessId}/payments/dues?partyType=${partyType}&partyId=${partyId}`);
      if (res.success && res.data) {
        const lines: AllocationLine[] = res.data.map((item: any) => ({
          id: item.id,
          referenceNumber: item.invoiceNumber || item.billNumber,
          date: item.invoiceDate || item.billDate,
          totalAmount: item.totalAmount,
          paidAmount: item.paidAmount,
          dueAmount: item.dueAmount,
          allocatedAmount: 0,
          selected: false,
        }));
        setDues(lines);
      }
    } catch (e) {
      console.error('Failed to load dues', e);
    } finally {
      setDuesLoading(false);
    }
  }, [businessId, type]);

  useEffect(() => {
    if (selectedPartyId) {
      fetchPartyDues(selectedPartyId);
    } else {
      setDues([]);
    }
  }, [selectedPartyId, fetchPartyDues]);

  // Auto-distribute amount across selected or all dues
  const handleAutoAllocate = () => {
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return;

    let remaining = numAmount;
    setDues((prev) =>
      prev.map((line) => {
        if (remaining <= 0) {
          return { ...line, allocatedAmount: 0, selected: false };
        }
        const alloc = Math.min(line.dueAmount, remaining);
        remaining -= alloc;
        return {
          ...line,
          allocatedAmount: alloc,
          selected: alloc > 0,
        };
      })
    );
  };

  const handleSelectLine = (idx: number, isSelected: boolean) => {
    setDues((prev) => {
      const copy = [...prev];
      const line = copy[idx];
      copy[idx] = {
        ...line,
        selected: isSelected,
        allocatedAmount: isSelected ? line.dueAmount : 0,
      };
      // Update the main amount input to sum of allocated amounts
      const totalAllocated = copy.reduce((s, l) => s + (l.selected ? l.allocatedAmount : 0), 0);
      if (totalAllocated > 0) setAmount(totalAllocated);
      return copy;
    });
  };

  const handleLineAmountChange = (idx: number, allocAmt: number) => {
    setDues((prev) => {
      const copy = [...prev];
      const line = copy[idx];
      const clamped = Math.min(Math.max(0, allocAmt), line.dueAmount);
      copy[idx] = {
        ...line,
        allocatedAmount: clamped,
        selected: clamped > 0,
      };
      const totalAllocated = copy.reduce((s, l) => s + l.allocatedAmount, 0);
      if (totalAllocated > 0) setAmount(totalAllocated);
      return copy;
    });
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const totalOutstanding = dues.reduce((s, l) => s + l.dueAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }

    setLoading(true);
    try {
      const activeAllocations = dues
        .filter((l) => l.allocatedAmount > 0)
        .map((l) => ({
          invoiceOrBillId: l.id,
          amount: l.allocatedAmount,
        }));

      const payload: any = {
        type,
        amount: numAmount,
        method,
        paymentDate: new Date(paymentDate).toISOString(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: activeAllocations.length > 0 ? activeAllocations : undefined,
      };

      if (type === 'RECEIVED' && selectedPartyId) {
        payload.customerId = selectedPartyId;
      } else if (type === 'MADE' && selectedPartyId) {
        payload.supplierId = selectedPartyId;
      }

      const res = await api.post(`/businesses/${businessId}/payments`, payload);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || res.message || 'Failed to record payment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shadow-xs',
                type === 'RECEIVED'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              )}
            >
              {type === 'RECEIVED' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {type === 'RECEIVED' ? 'Receive Payment (Customer Receipt)' : 'Make Payment (Supplier Payout)'}
              </h2>
              <p className="text-xs text-slate-500">
                Record payment and allocate against pending invoices or bills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType('RECEIVED')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all',
                type === 'RECEIVED'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <ArrowDownLeft size={14} />
              Customer Receipt (Inflow)
            </button>
            <button
              type="button"
              onClick={() => setType('MADE')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all',
                type === 'MADE'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <ArrowUpRight size={14} />
              Supplier Payment (Outflow)
            </button>
          </div>

          {/* Party Selection & Outstanding Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                {type === 'RECEIVED' ? 'Select Customer *' : 'Select Supplier *'}
              </label>
              {selectedParty && totalOutstanding > 0 && (
                <span className="text-[11px] font-bold text-rose-600">
                  Total Pending Dues: {formatCurrency(totalOutstanding)}
                </span>
              )}
            </div>

            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">
                — Choose {type === 'RECEIVED' ? 'Customer' : 'Supplier'} (or direct on-account) —
              </option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''} {p.gstin ? `• GST: ${p.gstin}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
                {dues.length > 0 && totalOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(totalOutstanding);
                      handleAutoAllocate();
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Pay Full Due ({formatCurrency(totalOutstanding)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                <option value="CASH">Cash in Hand</option>
                <option value="BANK">Bank Account / Transfer</option>
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="NEFT">NEFT / RTGS</option>
              </select>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Transaction #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Cheque#, UTR#, or UPI Ref..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Pending Invoices / Bills Allocation Table */}
          {selectedPartyId && dues.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" />
                  Allocate Against Unpaid {type === 'RECEIVED' ? 'Invoices' : 'Bills'} ({dues.length})
                </span>
                <button
                  type="button"
                  onClick={handleAutoAllocate}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg"
                >
                  Auto-Distribute
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-8"></th>
                      <th className="py-2 px-3">Doc #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-right">Pending Due</th>
                      <th className="py-2 px-3 text-right w-28">Allocate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dues.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={line.selected}
                            onChange={(e) => handleSelectLine(idx, e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {line.referenceNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {formatDate(line.date)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(line.totalAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(line.dueAmount)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={line.dueAmount}
                            step="any"
                            value={line.allocatedAmount || ''}
                            onChange={(e) =>
                              handleLineAmountChange(idx, parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment remarks or bank reference note..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50',
                type === 'RECEIVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              )}
            >
              <Check size={14} />
              {loading
                ? 'Recording...'
                : type === 'RECEIVED'
                ? 'Save Customer Receipt'
                : 'Save Supplier Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
