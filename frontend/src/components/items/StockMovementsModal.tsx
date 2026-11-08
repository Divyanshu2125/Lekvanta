import React, { useState, useEffect } from 'react';
import { X, History, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface StockMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  item: {
    id: string;
    name: string;
    sku?: string;
    currentStock: number;
    unit?: { shortName: string };
  } | null;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
}

const typeStyles: Record<string, { label: string; class: string }> = {
  OPENING: { label: 'Opening Stock', class: 'bg-slate-100 text-slate-700' },
  PURCHASE: { label: 'Purchase In', class: 'bg-emerald-50 text-emerald-700' },
  SALE: { label: 'Sale Out', class: 'bg-purple-50 text-purple-700' },
  ADJUSTMENT: { label: 'Adjustment', class: 'bg-blue-50 text-blue-700' },
  RETURN_IN: { label: 'Return In', class: 'bg-teal-50 text-teal-700' },
  RETURN_OUT: { label: 'Return Out', class: 'bg-amber-50 text-amber-700' },
};

export default function StockMovementsModal({
  isOpen,
  onClose,
  businessId,
  item,
}: StockMovementsModalProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item || !businessId) return;

    const fetchMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/businesses/${businessId}/items/${item.id}/movements`);
        if (res.success && res.data) {
          setMovements(res.data);
        } else {
          setError(res.error || 'Failed to fetch stock movements');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [isOpen, item, businessId]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <History size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Stock Movement Ledger</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[340px]">
                {item.name} {item.sku ? `(${item.sku})` : ''} • Current Stock: {item.currentStock}{' '}
                {item.unit?.shortName || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading stock movements ledger...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No stock movement entries recorded yet for this item.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                  <th className="pb-2.5">Date & Time</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5 text-right">Change</th>
                  <th className="pb-2.5 text-right">Prev ➔ New</th>
                  <th className="pb-2.5 pl-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  const typeInfo = typeStyles[m.type] || {
                    label: m.type,
                    class: 'bg-slate-100 text-slate-600',
                  };
                  const dateStr = new Date(m.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 text-slate-500 font-mono">{dateStr}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-medium text-[11px] ${typeInfo.class}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600 font-mono">
                        {m.previousStock} ➔ <span className="font-bold">{m.newStock}</span>
                      </td>
                      <td className="py-2.5 pl-4 text-slate-500 max-w-[200px] truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
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

