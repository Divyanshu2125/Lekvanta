import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statCards as defaultStatCards, recentTransactions as defaultTransactions, lowStockItems as defaultLowStock, topSellingItems as defaultTopSelling } from '@/lib/data';
import StatCard from '@/components/dashboard/StatCard';
import SalesChart from '@/components/dashboard/SalesChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import LowStockTable from '@/components/dashboard/LowStockTable';
import TopSellingItems from '@/components/dashboard/TopSellingItems';
import { Plus, FileText, ShoppingCart, Package, Users, Receipt, CreditCard, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

const quickActions = [
  { label: 'New Sale', icon: FileText, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', path: '/sales/new' },
  { label: 'New Purchase', icon: ShoppingCart, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100', path: '/purchases/new' },
  { label: 'Add Item', icon: Package, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', path: '/items/new' },
  { label: 'Add Party', icon: Users, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100', path: '/parties/new' },
  { label: 'Expense', icon: Receipt, color: 'bg-rose-50 text-rose-600 hover:bg-rose-100', path: '/expenses/new' },
  { label: 'Payment', icon: CreditCard, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', path: '/payments/receive' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentBusiness, isBackendConnected } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState(defaultStatCards);
  const [transactions, setTransactions] = useState(defaultTransactions);
  const [lowStock, setLowStock] = useState(defaultLowStock);
  const [topSelling, setTopSelling] = useState(defaultTopSelling);

  const fetchSummary = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${currentBusiness.id}/dashboard/summary`);
      if (res.success && res.data) {
        const m = res.data.metrics;
        setCards([
          {
            label: "Today's Sales",
            value: m.todaySales,
            change: 12.4,
            positive: true,
            colorClass: 'text-indigo-600',
            bgClass: 'bg-indigo-50',
            iconName: 'TrendingUp',
          },
          {
            label: "Today's Purchase",
            value: m.todayPurchases,
            change: -4.2,
            positive: false,
            colorClass: 'text-purple-600',
            bgClass: 'bg-purple-50',
            iconName: 'ShoppingCart',
          },
          {
            label: 'Gross Profit',
            value: m.grossProfit,
            change: 8.7,
            positive: true,
            colorClass: 'text-emerald-600',
            bgClass: 'bg-emerald-50',
            iconName: 'BarChart2',
          },
          {
            label: 'Cash in Hand',
            value: m.cashInHand,
            change: 2.1,
            positive: true,
            colorClass: 'text-amber-600',
            bgClass: 'bg-amber-50',
            iconName: 'Wallet',
          },
          {
            label: 'Receivables',
            value: m.receivables,
            change: 5.3,
            positive: true,
            colorClass: 'text-blue-600',
            bgClass: 'bg-blue-50',
            iconName: 'ArrowDownLeft',
          },
          {
            label: 'Payables',
            value: m.payables,
            change: -1.8,
            positive: false,
            colorClass: 'text-rose-600',
            bgClass: 'bg-rose-50',
            iconName: 'ArrowUpRight',
          },
        ]);

        setTransactions(res.data.recentTransactions || []);
        setLowStock(res.data.lowStockItems || []);
        setTopSelling(res.data.topSellingItems || []);
      }
    } catch (e) {
      console.error('Failed to load dashboard metrics from backend', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) {
      fetchSummary();
    }
  }, [currentBusiness?.id]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            {isBackendConnected && (
              <button
                onClick={fetchSummary}
                disabled={loading}
                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Refresh data from database"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400">Active Business</p>
          <p className="text-sm font-semibold text-slate-700">
            {currentBusiness?.name || 'Sharma Electronics Pvt. Ltd.'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ label, icon: Icon, color, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-colors ${color}`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <SalesChart />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockTable items={lowStock} />
        <TopSellingItems items={topSelling} />
      </div>

      {/* Transactions */}
      <RecentTransactions transactions={transactions} />
    </div>
  );
}
