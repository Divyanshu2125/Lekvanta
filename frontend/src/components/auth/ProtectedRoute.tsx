import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Package } from 'lucide-react';

export default function ProtectedRoute() {
  const { token, user, isLoading, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Only verify once if token exists but user not loaded
    if (token && !user) {
      initAuth();
    }
  }, [token, user, initAuth]);

  // Safety fallback: Never leave user stuck on verifying session for more than 4 seconds
  useEffect(() => {
    if (isLoading && token) {
      const timer = setTimeout(() => {
        localStorage.removeItem('lekvanta_token');
        localStorage.removeItem('lekvanta_active_business');
        useAuthStore.setState({ token: null, user: null, isLoading: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, token]);

  const handleManualLogin = () => {
    localStorage.removeItem('lekvanta_token');
    localStorage.removeItem('lekvanta_active_business');
    useAuthStore.setState({ token: null, user: null, isLoading: false });
  };

  if (isLoading && token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center animate-pulse shadow-sm">
          <Package size={24} className="text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
        <button
          onClick={handleManualLogin}
          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium mt-1"
        >
          Taking too long? Go to Login &rarr;
        </button>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

