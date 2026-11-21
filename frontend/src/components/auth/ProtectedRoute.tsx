import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Package } from 'lucide-react';

export default function ProtectedRoute() {
  const { token, user, isLoading, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Only verify if token exists in storage but user profile is not yet in state
    if (token && !user) {
      initAuth();
    }
  }, [token, user, initAuth]);

  // Safety fallback: Never leave user stuck on verifying session for more than 8 seconds
  useEffect(() => {
    if (token && !user && isLoading) {
      const timer = setTimeout(() => {
        localStorage.removeItem('lekvanta_token');
        localStorage.removeItem('lekvanta_active_business');
        useAuthStore.setState({ token: null, user: null, isLoading: false });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [token, user, isLoading]);

  const handleManualLogin = () => {
    localStorage.removeItem('lekvanta_token');
    localStorage.removeItem('lekvanta_active_business');
    useAuthStore.setState({ token: null, user: null, isLoading: false });
  };

  // 1. If user is authenticated and profile is ready, render app immediately
  if (token && user) {
    return <Outlet />;
  }

  // 2. If no token exists, immediately redirect to login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Only if token exists but user profile is actively being verified from backend
  if (isLoading && !user) {
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

  return <Outlet />;
}

