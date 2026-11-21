import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  Plus,
  Building2,
  LogOut,
  User,
  Settings,
  Database,
  Check,
  AlertTriangle,
  AlertCircle,
  Package,
  X,
  CheckCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

const quickCreateItems = [
  { label: '⚡ Quick Bill', path: '/sales/quick' },
  { label: '🛠️ Service Bill', path: '/sales/service' },
  { label: 'Sale Invoice', path: '/sales/new' },
  { label: 'Purchase Bill', path: '/purchases/new' },
  { label: 'Add Item', path: '/items/new' },
  { label: 'Add Party', path: '/parties/new' },
  { label: 'Record Expense', path: '/expenses/new' },
  { label: 'Receive Payment', path: '/payments/receive' },
];

interface NotificationItem {
  id: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  category: 'alert' | 'system';
  title: string;
  message: string;
  time: string;
  actionUrl?: string;
  actionLabel?: string;
}

export default function TopBar() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'unread'>('all');
  const [searchVal, setSearchVal] = useState('');

  const [rawNotifications, setRawNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('lekvanta_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('lekvanta_dismissed_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const {
    isBackendConnected,
    currentBusiness,
    businesses,
    user,
    setCurrentBusiness,
    logout,
  } = useAuthStore();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Fetch real alerts and notifications from backend
  const fetchNotifications = async () => {
    if (!currentBusiness?.id) return;
    setIsLoadingNotifs(true);
    try {
      const res = await api.get(`/businesses/${currentBusiness.id}/dashboard/summary`);
      const items: NotificationItem[] = [];

      if (res.success && res.data) {
        const { lowStockItems = [], metrics = {} } = res.data;

        // 1. Low stock alerts
        if (Array.isArray(lowStockItems)) {
          lowStockItems.forEach((item: any) => {
            items.push({
              id: `low-stock-${item.id}`,
              type: 'warning',
              category: 'alert',
              title: `Low Stock: ${item.name}`,
              message: `Only ${item.stock} ${item.unit || 'units'} left in stock (reorder level: ${item.minStock}).`,
              time: 'Stock Alert',
              actionUrl: '/items',
              actionLabel: 'Restock Item',
            });
          });
        }

        // 2. Pending receivables alert
        if (metrics.receivables && metrics.receivables > 0) {
          items.push({
            id: 'pending-receivables',
            type: 'alert',
            category: 'alert',
            title: 'Customer Payments Due',
            message: `You have ${formatCurrency(metrics.receivables)} in pending payments from customers.`,
            time: 'Payment Due',
            actionUrl: '/parties',
            actionLabel: 'View Debtors',
          });
        }

        // 3. Pending payables alert
        if (metrics.payables && metrics.payables > 0) {
          items.push({
            id: 'pending-payables',
            type: 'info',
            category: 'alert',
            title: 'Supplier Bills Due',
            message: `Total ${formatCurrency(metrics.payables)} pending for payment to suppliers.`,
            time: 'Bills Due',
            actionUrl: '/purchases',
            actionLabel: 'View Purchases',
          });
        }
      }

      // 4. Feature and system notices
      items.push({
        id: 'feature-quick-bill',
        type: 'info',
        category: 'system',
        title: '⚡ Quick Billing Available',
        message: 'Create fast retail bills without customer details and instant printing.',
        time: 'Tips',
        actionUrl: '/sales/quick',
        actionLabel: 'Try Quick Bill',
      });

      items.push({
        id: 'feature-service-bill',
        type: 'info',
        category: 'system',
        title: '🛠️ Service Billing Ready',
        message: 'Bill for photocopy, lamination, and typing services without reducing product inventory.',
        time: 'Tips',
        actionUrl: '/sales/service',
        actionLabel: 'Open Service Bill',
      });

      setRawNotifications(items);
    } catch {
      // Fallback notifications if backend call fails
      setRawNotifications([
        {
          id: 'welcome-lekvanta',
          type: 'info',
          category: 'system',
          title: 'Welcome to Lekvanta',
          message: 'Manage your retail shop, inventory, billing, and reports in one place.',
          time: 'System',
          actionUrl: '/dashboard',
          actionLabel: 'Dashboard',
        },
      ]);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentBusiness?.id]);

  // Filtered notifications list
  const activeNotifications = useMemo(() => {
    return rawNotifications.filter((n) => !dismissedIds.has(n.id));
  }, [rawNotifications, dismissedIds]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !readIds.has(n.id)).length;
  }, [activeNotifications, readIds]);

  const displayedNotifications = useMemo(() => {
    return activeNotifications.filter((n) => {
      if (activeTab === 'unread') return !readIds.has(n.id);
      if (activeTab === 'alerts') return n.category === 'alert';
      return true;
    });
  }, [activeNotifications, activeTab, readIds]);

  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    activeNotifications.forEach((n) => newSet.add(n.id));
    setReadIds(newSet);
    try {
      localStorage.setItem('lekvanta_read_notifications', JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const markAsRead = (id: string) => {
    const newSet = new Set(readIds);
    newSet.add(id);
    setReadIds(newSet);
    try {
      localStorage.setItem('lekvanta_read_notifications', JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    setDismissedIds(newSet);
    try {
      localStorage.setItem('lekvanta_dismissed_notifications', JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    markAsRead(n.id);
    setShowNotifications(false);
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 z-20">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search invoices, parties, items…"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 text-slate-700"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Backend Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
            isBackendConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          )}
          title={isBackendConnected ? 'Backend connected to SQLite via Prisma' : 'Connecting to local backend...'}
        >
          <Database size={13} className={isBackendConnected ? 'text-emerald-600' : 'text-amber-500'} />
          <span className="hidden md:inline">
            {isBackendConnected ? 'SQLite Live' : 'Connecting...'}
          </span>
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            )}
          />
        </div>

        {/* Quick Create */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setShowProfile(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            <span>Quick Create</span>
            <ChevronDown size={14} className={cn('transition-transform', showCreate && 'rotate-180')} />
          </button>
          {showCreate && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
              {quickCreateItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setShowCreate(false);
                    navigate(item.path);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowCreate(false);
              setShowProfile(false);
            }}
            title="Notifications"
            className={cn(
              'relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
              showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl py-0 z-50 overflow-hidden flex flex-col max-h-[520px]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={fetchNotifications}
                    title="Refresh"
                    disabled={isLoadingNotifs}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition"
                  >
                    <RefreshCw size={14} className={cn(isLoadingNotifs && 'animate-spin')} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2 py-1 hover:bg-indigo-50 rounded-md transition"
                    >
                      <CheckCheck size={14} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center px-4 pt-2 border-b border-slate-100 gap-4 text-xs font-medium text-slate-500">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'pb-2 border-b-2 transition -mb-px',
                    activeTab === 'all'
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent hover:text-slate-700'
                  )}
                >
                  All ({activeNotifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={cn(
                    'pb-2 border-b-2 transition -mb-px',
                    activeTab === 'alerts'
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent hover:text-slate-700'
                  )}
                >
                  Alerts ({activeNotifications.filter((n) => n.category === 'alert').length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={cn(
                    'pb-2 border-b-2 transition -mb-px',
                    activeTab === 'unread'
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent hover:text-slate-700'
                  )}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {displayedNotifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Sparkles size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No notifications in this view.</p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => {
                    const isRead = readIds.has(notif.id);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          'p-3.5 flex gap-3 items-start transition cursor-pointer relative group',
                          isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                        )}
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            notif.type === 'warning' && 'bg-amber-100 text-amber-700',
                            notif.type === 'alert' && 'bg-rose-100 text-rose-700',
                            notif.type === 'info' && 'bg-blue-100 text-blue-700',
                            notif.type === 'success' && 'bg-emerald-100 text-emerald-700'
                          )}
                        >
                          {notif.type === 'warning' && <AlertTriangle size={16} />}
                          {notif.type === 'alert' && <AlertCircle size={16} />}
                          {notif.type === 'info' && <Package size={16} />}
                          {notif.type === 'success' && <Sparkles size={16} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-xs font-semibold truncate',
                                isRead ? 'text-slate-700' : 'text-slate-900 font-bold'
                              )}
                            >
                              {notif.title}
                            </p>
                            {!isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                              {notif.time}
                            </span>
                            {notif.actionLabel && (
                              <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5 hover:underline">
                                {notif.actionLabel}
                                <ArrowRight size={11} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dismiss Button */}
                        <button
                          onClick={(e) => dismissNotification(e, notif.id)}
                          title="Dismiss"
                          className="absolute top-3 right-3 p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/items');
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                >
                  Manage Inventory &rarr;
                </button>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/sales');
                  }}
                  className="text-slate-500 hover:text-slate-800 hover:underline"
                >
                  View Invoices
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Business / Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowCreate(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 uppercase">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="w-full h-full rounded-md object-cover"
                />
              ) : (
                user?.name?.[0] || <Building2 size={14} className="text-indigo-600" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[140px]">
                {currentBusiness?.name || 'My Business'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {currentBusiness?.role || 'Admin'}
              </p>
            </div>
            <ChevronDown size={14} className={cn('text-slate-400 transition-transform', showProfile && 'rotate-180')} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
              {/* User details */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.name || 'Shop Owner'}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                {user?.phone && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{user.phone}</p>
                )}
              </div>

              {/* Businesses list / switcher */}
              {businesses.length > 1 && (
                <div className="py-2 border-b border-slate-100">
                  <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Switch Business
                  </p>
                  {businesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCurrentBusiness(b);
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span className="truncate">{b.name}</span>
                      {currentBusiness?.id === b.id && (
                        <Check size={14} className="text-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User size={14} /> Profile & Settings
                </button>
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={14} /> Business Settings
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close dropdowns on outside click */}
      {(showCreate || showProfile || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowCreate(false);
            setShowProfile(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}
