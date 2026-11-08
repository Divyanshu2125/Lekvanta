import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Sales', path: '/sales', icon: TrendingUp },
  { label: 'Purchases', path: '/purchases', icon: ShoppingCart },
  { label: 'Items & Inventory', path: '/items', icon: Boxes },
  { label: 'Parties', path: '/parties', icon: Users },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Expenses', path: '/expenses', icon: Receipt },
  { label: 'Accounting', path: '/accounting', icon: BookOpen },
  { label: 'Reports', path: '/reports', icon: BarChart2 },
  { label: 'GST Reports', path: '/gst-reports', icon: FileText },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-none">Lekvanta</p>
              <p className="text-xs text-slate-400 mt-0.5">Business Suite</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.map(({ label, path, icon: Icon }) => {
            const isActive =
              path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  'sidebar-item',
                  isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-500'
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate">{label}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : (
            <span className="flex items-center gap-2 text-sm">
              <ChevronLeft size={18} />
              <span>Collapse</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

