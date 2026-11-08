import { lowStockItems as defaultLowStock } from '@/lib/data';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LowStockItem {
  id: string | number;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  unit: string;
}

export default function LowStockTable({
  items = defaultLowStock,
}: {
  items?: LowStockItem[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800">Low Stock Alert</h3>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          View all <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="space-y-2.5">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            All items are adequately stocked. No alerts!
          </p>
        ) : (
          items.map((item) => {
            const pct = Math.round((item.stock / (item.minStock || 1)) * 100);
            const critical = pct <= 40;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sku}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        critical ? 'text-rose-600' : 'text-amber-600'
                      )}
                    >
                      {item.stock} {item.unit}
                    </p>
                    <p className="text-[10px] text-slate-400">Min: {item.minStock}</p>
                  </div>
                  <div className="w-12">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          critical ? 'bg-rose-500' : 'bg-amber-400'
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
