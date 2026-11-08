import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const quickCreateItems = [
  { label: 'Sale Invoice', path: '/sales/new' },
  { label: 'Purchase Bill', path: '/purchases/new' },
  { label: 'Add Item', path: '/items/new' },
  { label: 'Add Party', path: '/parties/new' },
  { label: 'Record Expense', path: '/expenses/new' },
  { label: 'Receive Payment', path: '/payments/receive' },
];

export default function TopBar() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal, setSearchVal] = useState('');

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
            onClick={() => { setShowCreate(!showCreate); setShowProfile(false); }}
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

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* Business / Profile Menu */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowCreate(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-100 flex items-center justify-center">
              <Building2 size={14} className="text-indigo-600" />
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
                  onClick={() => setShowProfile(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User size={14} /> Profile
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
      {(showCreate || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowCreate(false); setShowProfile(false); }}
        />
      )}
    </header>
  );
}
