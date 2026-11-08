import React, { useState } from 'react';
import { X, ArrowDown, ArrowUp, AlertCircle, History } from 'lucide-react';
import { api } from '@/lib/api';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
  item: {
    id: string;
    name: string;
    sku?: string;
    currentStock: number;
    unit?: { shortName: string };
  } | null;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  item,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const currentStock = item.currentStock || 0;
  const delta = adjustmentType === 'ADD' ? quantity : -quantity;
  const newStock = Math.max(0, currentStock + delta);
  const unitName = item.unit?.shortName || 'Units';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('Adjustment quantity must be greater than 0.');
      return;
    }

    if (adjustmentType === 'REDUCE' && quantity > currentStock) {
      setError(`Cannot reduce stock below 0. Current stock is only ${currentStock} ${unitName}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/businesses/${businessId}/items/${item.id}/adjust-stock`, {
        adjustmentType,
        quantity,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to adjust stock.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Adjust Stock Quantity</h2>
            <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">{item.name}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current vs New Stock Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Current Stock
              </p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">
                {currentStock} <span className="text-xs font-normal text-slate-500">{unitName}</span>
              </p>
            </div>
            <div className="border-l border-slate-200">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                New Stock
              </p>
              <p
                className={`text-xl font-bold mt-0.5 ${
                  adjustmentType === 'ADD' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {newStock} <span className="text-xs font-normal text-slate-500">{unitName}</span>
              </p>
            </div>
          </div>

          {/* Action Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('ADD')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  adjustmentType === 'ADD'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUp size={14} className="text-emerald-600" />
                <span>Add Stock (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('REDUCE')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  adjustmentType === 'REDUCE'
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowDown size={14} className="text-rose-600" />
                <span>Reduce Stock (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to {adjustmentType === 'ADD' ? 'Add' : 'Deduct'} *
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity || ''}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              placeholder="Enter quantity"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Stock Movement Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical inventory count, Damaged in store, Sample"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          {/* Ledger notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50/70 text-[11px] text-indigo-800">
            <History size={14} className="shrink-0 text-indigo-600" />
            <span>This adjustment will automatically append an entry to the StockMovement ledger.</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-60 transition"
            >
              {loading ? 'Recording movement...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

