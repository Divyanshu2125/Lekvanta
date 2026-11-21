import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

export interface MonthlyTrend {
  month: string;
  sales: number;
  purchases: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 capitalize">{entry.dataKey}:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesChart({
  data = [],
  loading = false,
}: {
  data?: MonthlyTrend[];
  loading?: boolean;
}) {
  // If no data passed, default to empty 6 months with 0s
  const defaultMonths = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const chartData = data.length > 0 ? data : defaultMonths.map((m) => ({ month: m, sales: 0, purchases: 0 }));
  const hasActivity = chartData.some((d) => d.sales > 0 || d.purchases > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Sales & Purchase Overview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
        </div>
        {!hasActivity && (
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            No transactions yet
          </span>
        )}
      </div>

      {!hasActivity ? (
        <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-lg bg-slate-50/50 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <BarChart3 size={20} />
          </div>
          <p className="text-sm font-medium text-slate-600">No sales or purchase data recorded yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            As you create sales invoices and purchase bills for this business, your monthly trend will automatically appear here.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              name="Sales"
              stroke="#4F46E5"
              strokeWidth={2}
              fill="url(#colorSales)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="purchases"
              name="Purchases"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#colorPurchases)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

