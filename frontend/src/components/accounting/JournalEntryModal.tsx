import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, cn } from '@/lib/utils';

interface JournalEntryModalProps {
  onClose: () => void;
  onSaved: () => void;
}

interface JELine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export default function JournalEntryModal({ onClose, onSaved }: JournalEntryModalProps) {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JELine[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}/accounting/accounts`).then((res) => {
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    });
  }, [businessId]);

  const updateLine = (idx: number, patch: Partial<JELine>) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...patch };
      return updated;
    });
  };

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isBalanced) {
      setError(`Debits (₹${totalDebit}) and Credits (₹${totalCredit}) must be equal and non-zero.`);
      return;
    }

    if (lines.some((l) => !l.accountId)) {
      setError('Please select an account for all lines');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        entryDate: new Date(entryDate).toISOString(),
        description: description.trim() || 'Manual Journal Entry',
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      };

      const res = await api.post(`/businesses/${businessId}/accounting/journal-entries`, payload);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || res.message || 'Failed to record journal entry');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">New Journal Entry</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record manual debit and credit adjustments
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-lg">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description / Narration</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Month-end depreciation adjustment"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Lines Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Journal Lines</span>
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0, description: '' }])}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                <Plus size={13} /> Add Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <div className="col-span-5">Account Head</div>
                <div className="col-span-3 text-right">Debit (₹)</div>
                <div className="col-span-3 text-right">Credit (₹)</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">— Select Account —</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.code}] {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            debit: parseFloat(e.target.value) || 0,
                            credit: 0,
                          })
                        }
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ''}
                        onChange={(e) =>
                          updateLine(idx, {
                            credit: parseFloat(e.target.value) || 0,
                            debit: 0,
                          })
                        }
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Balance Indicator */}
              <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2.5 border-t border-slate-200 text-xs font-bold items-center">
                <div className="col-span-5 flex items-center gap-2">
                  <span>Totals</span>
                  {isBalanced ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Balanced
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Diff: ₹{diff.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="col-span-3 text-right font-mono text-indigo-600">
                  {formatCurrency(totalDebit)}
                </div>
                <div className="col-span-3 text-right font-mono text-indigo-600">
                  {formatCurrency(totalCredit)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isBalanced}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              <Check size={14} />
              {loading ? 'Recording...' : 'Post Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

