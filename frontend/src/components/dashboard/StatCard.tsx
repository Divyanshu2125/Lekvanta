import {
  TrendingUp, ShoppingCart, BarChart2, Wallet, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  TrendingUp,
  ShoppingCart,
  BarChart2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
};

interface StatCardProps {
  label: string;
  value: number;
  change: number;
  positive: boolean;
  colorClass: string;
  bgClass: string;
  iconName: string;
}

export default function StatCard({
  label,
  value,
  change,
  positive,
  colorClass,
  bgClass,
  iconName,
}: StatCardProps) {
  const Icon = iconMap[iconName];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(value)}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bgClass)}>
          {Icon && <Icon size={18} className={colorClass} />}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded',
            positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'
          )}
        >
          {positive ? '+' : ''}{change}%
        </span>
        <span className="text-xs text-slate-400">vs yesterday</span>
      </div>
    </div>
  );
}
