import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Business {
  id: string;
  name: string;
  role?: string;
  gstin?: string;
  type?: string;
  state?: string;
  address?: string;
  financialYear?: string;
}

export interface SignupData {
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessType: string;
  state: string;
  address: string;
  gstin?: string;
  financialYear: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  currentBusiness: Business | null;
  businesses: Business[];
  isBackendConnected: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  setCurrentBusiness: (business: Business) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('lekvanta_token'),
  user: null,
  currentBusiness: null,
  businesses: [],
  isBackendConnected: false,
  isLoading: true,

  initAuth: async () => {
    set({ isLoading: true });
    try {
      // 1. Health check
      const health = await api.get('/health');
      const isConnected = !!health.success && health.data?.database === 'connected';
      set({ isBackendConnected: isConnected });

      const token = localStorage.getItem('lekvanta_token');
      if (!token) {
        set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
        return;
      }

      // 2. Validate current session with backend
      const meRes = await api.get('/auth/me');
      if (meRes.success && meRes.data) {
        const businesses: Business[] = meRes.data.businesses || [];
        const savedBusinessId = localStorage.getItem('lekvanta_active_business');
        const activeBusiness =
          businesses.find((b) => b.id === savedBusinessId) || businesses[0] || null;

        set({
          token,
          user: {
            id: meRes.data.id,
            name: meRes.data.name,
            email: meRes.data.email,
            phone: meRes.data.phone,
          },
          businesses,
          currentBusiness: activeBusiness,
          isLoading: false,
        });
      } else {
        // Invalid or expired token
        localStorage.removeItem('lekvanta_token');
        localStorage.removeItem('lekvanta_active_business');
        set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
      }
    } catch {
      localStorage.removeItem('lekvanta_token');
      localStorage.removeItem('lekvanta_active_business');
      set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { token, user, businesses } = res.data;
      localStorage.setItem('lekvanta_token', token);
      const activeBusiness = businesses[0] || null;
      if (activeBusiness) {
        localStorage.setItem('lekvanta_active_business', activeBusiness.id);
      }

      set({
        token,
        user,
        businesses,
        currentBusiness: activeBusiness,
      });
      return { success: true };
    }
    return { success: false, error: res.error || 'Invalid email or password' };
  },

  signup: async (data: SignupData) => {
    const res = await api.post('/auth/register', data);
    if (res.success && res.data) {
      const { token, user, business } = res.data;
      localStorage.setItem('lekvanta_token', token);
      localStorage.setItem('lekvanta_active_business', business.id);

      set({
        token,
        user,
        businesses: [business],
        currentBusiness: business,
      });
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to create account and business' };
  },

  setCurrentBusiness: (business: Business) => {
    localStorage.setItem('lekvanta_active_business', business.id);
    set({ currentBusiness: business });
  },

  logout: () => {
    localStorage.removeItem('lekvanta_token');
    localStorage.removeItem('lekvanta_active_business');
    set({ token: null, user: null, currentBusiness: null, businesses: [] });
  },
}));
