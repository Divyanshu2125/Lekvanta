import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Descope } from '@descope/react-sdk';
import { useAuthStore } from '@/store/authStore';
import {
  Package,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, descopeLogin } = useAuthStore();

  const [authMethod, setAuthMethod] = useState<'descope' | 'password'>('descope');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const flowId = import.meta.env.VITE_DESCOPE_FLOW_ID || 'sign-in';
  const isSessionExpired = new URLSearchParams(location.search).get('expired') === '1';

  // Handle successful authentication from Descope Flow
  const handleDescopeSuccess = async (e: any) => {
    const sessionToken = e.detail?.sessionJwt;
    const descopeUser = e.detail?.user;

    if (!sessionToken) {
      setError('No session token returned by Descope.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await descopeLogin(sessionToken, descopeUser);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Failed to authenticate with Lekvanta.');
    }
  };

  const handleDescopeError = (err: any) => {
    console.error('Descope error:', err);
    setError(
      err?.detail?.errorMessage ||
      err?.message ||
      'Authentication error occurred. Please try again.'
    );
  };

  // Legacy / fallback password login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  const handleDemoFill = () => {
    setEmail('rajesh@sharmaelec.com');
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl shadow-md mb-3 text-white">
          <Package size={26} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to Lekvanta
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Multi-shop billing, inventory management &amp; GST compliance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 sm:px-8 border border-slate-200/80 rounded-2xl shadow-sm">
          {/* Auth Method Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAuthMethod('descope'); setError(null); }}
              className={cn(
                'py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all',
                authMethod === 'descope'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Sparkles size={14} className={authMethod === 'descope' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Google &amp; OTP</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setError(null); }}
              className={cn(
                'py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all',
                authMethod === 'password'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <KeyRound size={14} className={authMethod === 'password' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Password</span>
            </button>
          </div>

          {/* Session Expired Notice */}
          {isSessionExpired && !error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>Your session has expired. Please sign in to continue.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-indigo-600 font-medium">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Verifying session with Lekvanta…</span>
            </div>
          )}

          {/* 1. DESCOPE AUTH FLOW */}
          {!loading && authMethod === 'descope' && (
            <div className="descope-container py-1 min-h-[300px] flex items-center justify-center">
              <Descope
                flowId={flowId}
                onSuccess={handleDescopeSuccess}
                onError={handleDescopeError}
                theme="light"
              />
            </div>
          )}

          {/* 2. PASSWORD AUTH FALLBACK */}
          {!loading && authMethod === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
              >
                <span>Sign In with Password</span>
                <ArrowRight size={14} />
              </button>

              {/* Sample Credentials Autofill */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  <ShieldCheck size={13} className="text-slate-500" />
                  <span>Autofill Sample Shopkeeper Login</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Need a new shop account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            Create shop with Descope &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
