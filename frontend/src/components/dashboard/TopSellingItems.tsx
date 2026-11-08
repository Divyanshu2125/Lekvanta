import { topSellingItems as defaultTopSelling } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

interface TopSellingItem {
  id: string | number;
  name: string;
  qty: number;
  revenue: number;
  trend: 'up' | 'down';
}

export default function TopSellingItems({
  items = defaultTopSelling,
}: {
  items?: TopSellingItem[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Top Selling Items</h3>
          <p className="text-xs text-slate-400 mt-0.5">This month</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          View all <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No sales data recorded yet for this month.
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-300 w-4">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.qty} units sold</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(item.revenue)}</p>
                {item.trend === 'up' ? (
                  <TrendingUp size={14} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={14} className="text-rose-500" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
